/**
 * Currencies an invoice can be billed in.
 * (Mirror of backend/src/utils/currency.js: the API rejects anything else.)
 */
export const DEFAULT_CURRENCY = 'SGD';

export const INVOICE_CURRENCIES = [
  { code: 'SGD', label: 'SGD - Singapore Dollar' },
  { code: 'MYR', label: 'MYR - Malaysian Ringgit' },
  { code: 'AED', label: 'AED - UAE Dirham' },
];

/** `value` as one of the invoice currencies, else the default (SGD). */
export function invoiceCurrency(value) {
  const code = String(value || '').trim().toUpperCase();
  return INVOICE_CURRENCIES.some((c) => c.code === code) ? code : DEFAULT_CURRENCY;
}
