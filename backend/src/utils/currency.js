/**
 * Currency symbols for the amounts printed on documents. A currency without an
 * entry here is shown by its code (e.g. "EUR").
 */
const SYMBOLS = {
  SGD: 'S$',
};

/** Symbol written before an amount in `currency` (the company's default currency code). */
function currencySymbol(currency) {
  const code = String(currency || '').trim().toUpperCase();
  return SYMBOLS[code] || code;
}

module.exports = { currencySymbol };
