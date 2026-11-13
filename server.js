const path = require('path');
const fs = require('fs');

// Add backend/node_modules to module resolution paths so dependencies are resolved
// whether npm install ran in root or in backend/
const backendNodeModules = path.join(__dirname, 'backend', 'node_modules');
if (fs.existsSync(backendNodeModules) && !module.paths.includes(backendNodeModules)) {
  module.paths.unshift(backendNodeModules);
}

// Load environment variables from root .env or backend/.env
const rootEnv = path.join(__dirname, '.env');
const backendEnv = path.join(__dirname, 'backend', '.env');
try {
  const dotenv = require('dotenv');
  if (fs.existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv });
  } else if (fs.existsSync(backendEnv)) {
    dotenv.config({ path: backendEnv });
  } else {
    dotenv.config();
  }
} catch {
  // If dotenv is not installed yet, continue
}

// Delegate to the main Express server
require('./backend/server.js');
