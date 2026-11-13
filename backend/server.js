require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'infinity-crm-secret-da41d4f289e9d0410ad09455e84f577c4b591e63b7ad3f1cd13ea561f0b743f1';
  if (isProduction) {
    console.warn('[config] Warning: JWT_SECRET was not set in environment. Using fallback secret.');
  }
}

const { connect, getPool, close, databaseName, config: dbConfig } = require('./src/config/db');
const authRoutes = require('./src/routes/auth');
const dashboardRoutes = require('./src/routes/dashboard');
const customerRoutes = require('./src/routes/customers');
const productRoutes = require('./src/routes/products');
const invoiceRoutes = require('./src/routes/invoices');
const quotationRoutes = require('./src/routes/quotations');
const reportRoutes = require('./src/routes/reports');
const roleRoutes = require('./src/routes/roles');
const permissionRoutes = require('./src/routes/permissions');
const userRoutes = require('./src/routes/users');
const settingsRoutes = require('./src/routes/settings');

const app = express();

// Behind Render's / Cloudflare's proxy the client IP arrives in X-Forwarded-For;
// trusting one hop makes rate limiting and HTTPS detection work.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({
  // The API serves JSON and PDFs; CSP is only meaningful for the HTML app, which
  // Cloudflare Pages serves. Allow the PDF/blob responses to be read cross-origin.
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(compression({ threshold: 1024 }));

/* ---- CORS: only the configured frontend origins (comma separated, wildcards allowed) ---- */
const allowedOrigins = String(process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((value) => value.trim().replace(/\/+$/, ''))
  .filter(Boolean);
const originMatchers = allowedOrigins.map((entry) => {
  if (!entry.includes('*')) return (origin) => origin === entry;
  const pattern = new RegExp(`^${entry.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^.]+')}$`, 'i');
  return (origin) => pattern.test(origin);
});
const isLocalOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

function originAllowed(origin) {
  if (!origin) return true; // same-origin page, curl, server-to-server
  if (originMatchers.some((matches) => matches(origin))) return true;
  if (!isProduction && (isLocalOrigin(origin) || !allowedOrigins.length)) return true;
  return false;
}

app.use(cors({
  origin: (origin, callback) => callback(null, originAllowed(origin)),
  credentials: true,
  exposedHeaders: ['Content-Disposition', 'ETag'],
}));

app.use(express.json({ limit: '1mb' }));

/* ---- Rate limits: tight on login, generous elsewhere ---- */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please wait 15 minutes and try again.' },
});
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1500,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many requests. Please slow down.' },
});
app.use('/api/auth/login', loginLimiter);
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/company-settings', settingsRoutes);

async function health(_req, res) {
  let dbOk = false;
  try {
    const p = getPool();
    if (p) {
      await p.query('SELECT 1');
      dbOk = true;
    }
  } catch (_err) {
    dbOk = false;
  }
  res.json({
    status: 'ok',
    database: dbOk ? 'connected' : 'connecting_or_unreachable',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
}
app.get('/health', health);
app.get('/api/health', health);

app.use('/api', (_req, res) => res.status(404).json({ message: 'Endpoint not found' }));

// Serve the React build when it exists next to the API (single-host setups).
const fs = require('fs');
const candidatePaths = [
  path.join(__dirname, '..', 'frontend', 'dist'),
  path.join(process.cwd(), 'frontend', 'dist'),
  path.join(__dirname, '..', 'client', 'dist'),
  path.join(process.cwd(), 'dist'),
];
const clientPath = candidatePaths.find((p) => fs.existsSync(p)) || candidatePaths[0];

app.use('/assets', express.static(path.join(clientPath, 'assets'), {
  maxAge: '1y',
  immutable: true,
}));

app.use(express.static(clientPath, {
  maxAge: 0,
  etag: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
}));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(clientPath, 'index.html'), (err) => {
    if (err) res.status(404).json({ message: 'This server hosts the API only. Open the frontend URL instead.' });
  });
});

const DB_DOWN_CODES = new Set(['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENOTFOUND']);

app.use((err, _req, res, _next) => {
  // Never log err.sql: mysql2 includes the full statement with bound values.
  console.error(`[error] ${err.code || ''} ${err.message}`);
  if (!isProduction && err.stack) console.error(err.stack);

  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
    return res.status(409).json({ message: 'This record is still used by existing records and cannot be deleted.' });
  }
  if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    return res.status(409).json({ message: 'That value already exists.' });
  }
  if (DB_DOWN_CODES.has(err.code)) {
    return res.status(503).json({ message: 'Cannot reach the database. Check the DB_* settings and that MySQL is running.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON body.' });
  }

  res.status(err.status || 500).json({ message: isProduction && !err.status ? 'Internal server error' : (err.message || 'Internal server error') });
});

const PORT = Number(process.env.PORT) || 5000;

const MAX_DB_RETRIES = Number(process.env.DB_CONNECT_RETRIES) || 5;
const BASE_RETRY_DELAY_MS = 2000;

async function connectWithRetry() {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt++) {
    try {
      await connect();
      await getPool().query('SELECT 1');
      const { host, port, ssl } = dbConfig();
      console.log(`[db] connected to MySQL database ${databaseName()} at ${host}:${port}${ssl ? ' (TLS)' : ''}`);
      return true; // success
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_DB_RETRIES) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1); // 2s, 4s, 8s, 16s, 32s
        console.warn(`[db] connection attempt ${attempt}/${MAX_DB_RETRIES} failed (${err.code || err.message}). Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        try { await close(); } catch { /* pool may not exist */ }
      }
    }
  }
  console.error('\n[db] Could not connect to MySQL after ' + MAX_DB_RETRIES + ' attempts.');
  console.error(`     ${lastErr?.code || ''} ${lastErr?.message}`);
  console.error('     Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME in environment settings.\n');
  return false;
}

async function start() {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[api] Infinity CRM API listening on port ${PORT}${isProduction ? ' (production)' : ` - http://localhost:${PORT}`}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[api] Port ${PORT} is already in use - another server is still running.`);
      console.error('      Stop it, then start again.');
      process.exit(1);
    }
    throw err;
  });

  // Connect to database in background so the web process never crashes on startup
  connectWithRetry()
    .then(async (ok) => {
      if (!ok) return;
      try {
        const { seedDefaults } = require('./src/utils/seedHelper');
        await seedDefaults();
        console.log('[seed] default roles, permissions, settings and admin user verified');
      } catch (seedErr) {
        console.warn('[seed] warning: auto-seed had error:', seedErr.message);
      }
    })
    .catch((err) => {
      console.error('[db] DB connection error:', err.message);
    });

  // Graceful shutdown: stop taking requests, let in-flight ones finish, close the pool.
  const shutdown = (signal) => {
    console.log(`[api] ${signal} received, shutting down`);
    server.close(async () => {
      await close();
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 10000).unref();
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

start();
