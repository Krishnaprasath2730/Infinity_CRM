const { query, queryOne } = require('../utils/db');
const { cached } = require('../utils/cache');
const { gstOnly, ownerScope } = require('../utils/authz');
const { GST_PRODUCT_WHERE } = require('../utils/gst');
const { INVOICE_CURRENCIES, invoiceCurrency } = require('../utils/currency');

const TTL_MS = 20000;

/**
 * Build the dashboard numbers for one scope. Invoice figures (counts, revenue,
 * recent list, payment breakdown) are limited to what the caller may see:
 *  - gstScoped: GST-only invoices (roles with gst_invoices.* only)
 *  - ownerId:   invoices created by this user (roles without invoices.view_all)
 */
async function buildSummary({ gstScoped, ownerId }) {
  const conditions = ['i.is_deleted = 0'];
  const params = [];
  if (gstScoped) conditions.push('i.is_gst_only = 1');
  if (ownerId) { conditions.push('i.created_by = ?'); params.push(ownerId); }
  const invoiceWhere = conditions.join(' AND ');

  const [customers, products, stats, money, recent, breakdown, settings] = await Promise.all([
    queryOne('SELECT COUNT(*) AS n FROM customers'),
    queryOne(`SELECT COUNT(*) AS n FROM products ${gstScoped ? `WHERE ${GST_PRODUCT_WHERE}` : ''}`),
    queryOne(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(i.is_gst_bill), 0) AS gstBills,
              COALESCE(SUM(i.paid_amount), 0) AS revenue,
              COALESCE(SUM(i.due_amount), 0) AS outstanding
         FROM invoices i WHERE ${invoiceWhere}`,
      params
    ),
    // Revenue and outstanding per currency: amounts in different currencies are not added together.
    query(
      `SELECT i.currency, COALESCE(SUM(i.paid_amount), 0) AS revenue, COALESCE(SUM(i.due_amount), 0) AS outstanding
         FROM invoices i WHERE ${invoiceWhere} GROUP BY i.currency`,
      params
    ),
    query(
      `SELECT i.id, i.invoice_no, i.invoice_date, i.sub_amount, i.due_amount, i.currency, i.payment_status, i.status, c.companyname
         FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id
        WHERE ${invoiceWhere}
        ORDER BY i.invoice_date DESC, i.id DESC
        LIMIT 6`,
      params
    ),
    query(
      `SELECT COALESCE(i.payment_status, 'Unspecified') AS payment_status, COUNT(*) AS count
         FROM invoices i WHERE ${invoiceWhere}
        GROUP BY COALESCE(i.payment_status, 'Unspecified')`,
      params
    ),
    queryOne('SELECT default_currency FROM company_settings ORDER BY id LIMIT 1'),
  ]);

  const mainCurrency = invoiceCurrency({ currency: settings?.default_currency });
  const byCurrency = new Map();
  for (const row of money) {
    const code = invoiceCurrency(row);
    const entry = byCurrency.get(code) || { revenue: 0, outstanding: 0 };
    entry.revenue += Number(row.revenue || 0);
    entry.outstanding += Number(row.outstanding || 0);
    byCurrency.set(code, entry);
  }

  return {
    scope: gstScoped ? 'gst' : (ownerId ? 'own' : 'all'),
    totalClients: Number(customers?.n || 0),
    totalProducts: Number(products?.n || 0),
    totalInvoices: Number(stats?.total || 0),
    totalGstBills: Number(stats?.gstBills || 0),
    // Figures for the main currency (the company default when invoices can use it, else SGD)...
    totalRevenue: (byCurrency.get(mainCurrency)?.revenue || 0).toFixed(2),
    totalOutstanding: (byCurrency.get(mainCurrency)?.outstanding || 0).toFixed(2),
    currency: mainCurrency,
    // ...and for every currency that has invoices, main currency first.
    revenueByCurrency: [mainCurrency, ...INVOICE_CURRENCIES.filter((code) => code !== mainCurrency)]
      .filter((code) => code === mainCurrency || byCurrency.has(code))
      .map((code) => ({
        currency: code,
        revenue: (byCurrency.get(code)?.revenue || 0).toFixed(2),
        outstanding: (byCurrency.get(code)?.outstanding || 0).toFixed(2),
      })),
    recentInvoices: recent,
    paymentBreakdown: breakdown.map((row) => ({ payment_status: row.payment_status, count: Number(row.count) })),
  };
}

async function summary(req, res) {
  const scope = { gstScoped: gstOnly(req, 'view'), ownerId: ownerScope(req) };
  // One cache entry per scope; all are dropped by invalidate('dashboard:').
  const key = `dashboard:summary:${scope.gstScoped ? 'gst' : 'all'}:${scope.ownerId ? `u${scope.ownerId}` : 'everyone'}`;
  res.json(await cached(key, TTL_MS, () => buildSummary(scope)));
}

module.exports = { summary };
