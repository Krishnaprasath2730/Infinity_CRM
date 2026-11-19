/**
 * Currencies an invoice can be billed in, and the symbols printed before amounts.
 * (Mirrored for the invoice form in frontend/src/utils/currency.js.)
 */
const DEFAULT_CURRENCY = 'SGD';
const INVOICE_CURRENCIES = ['SGD', 'MYR', 'AED'];

// A currency without an entry here is shown by its code (e.g. "AED").
const SYMBOLS = {
  SGD: 'S$',
  MYR: 'RM',
};

const clean = (value) => String(value || '').trim().toUpperCase();

/** Symbol written before an amount in `currency`. */
function currencySymbol(currency) {
  const code = clean(currency);
  return SYMBOLS[code] || code;
}

/** True when `value` is one of the currencies an invoice may use. */
function isInvoiceCurrency(value) {
  return INVOICE_CURRENCIES.includes(clean(value));
}

/**
 * Currency code of an invoice row. Invoices written before currencies existed,
 * or holding an unknown code, count as the default currency.
 */
function invoiceCurrency(invoice) {
  const code = clean(invoice?.currency);
  return INVOICE_CURRENCIES.includes(code) ? code : DEFAULT_CURRENCY;
}

/**
 * Totals of `rows` per currency, in the order of INVOICE_CURRENCIES and only
 * for currencies that occur: [{ currency, count, total }]. Amounts in different
 * currencies are never added together.
 */
function totalsByCurrency(rows, amountOf = (row) => row.sub_amount) {
  const totals = new Map();
  for (const row of rows || []) {
    const currency = invoiceCurrency(row);
    const entry = totals.get(currency) || { currency, count: 0, total: 0 };
    entry.count += 1;
    entry.total += Number(amountOf(row)) || 0;
    totals.set(currency, entry);
  }
  return INVOICE_CURRENCIES.filter((code) => totals.has(code)).map((code) => {
    const entry = totals.get(code);
    return { ...entry, total: Math.round(entry.total * 100) / 100 };
  });
}

module.exports = {
  DEFAULT_CURRENCY,
  INVOICE_CURRENCIES,
  currencySymbol,
  isInvoiceCurrency,
  invoiceCurrency,
  totalsByCurrency,
};
