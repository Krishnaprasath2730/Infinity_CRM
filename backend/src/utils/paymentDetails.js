/**
 * Payment instructions printed at the bottom of an invoice (Company Settings).
 * Shared by the PDF and the Excel export so both read the text the same way.
 */

/** "Label: value" line -> [label, value]; any other line -> null. */
function parseDetailLine(line) {
  const match = /^([^:]{1,32}):\s*(\S.*)$/.exec(line);
  if (!match || match[2].startsWith('//')) return null; // not a URL such as https://...
  return [match[1].trim(), match[2].trim()];
}

module.exports = { parseDetailLine };
