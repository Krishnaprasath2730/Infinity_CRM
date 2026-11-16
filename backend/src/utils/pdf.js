const fs = require('fs');
const path = require('path');
const PdfPrinter = require('pdfmake');
const { resolveSections, resolveVisibility, toLines, visibleItems, visibleTotal, lineTotal } = require('./quotationSections');
const { parseDetailLine } = require('./paymentDetails');
const { currencySymbol } = require('./currency');

const FONT_DIR = path.join(__dirname, '..', 'assets', 'fonts');
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo.png');

/* ---- Pre-compute asset buffers at module load (once, not per PDF) ---- */
let logoBase64 = null;

try {
  if (fs.existsSync(LOGO_PATH)) {
    logoBase64 = `data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString('base64')}`;
  }
} catch (err) {
  console.error('[pdf] Failed to read asset logos:', err.message);
}

const fonts = {
  Lato: {
    normal: fs.readFileSync(path.join(FONT_DIR, 'Lato-Regular.ttf')),
    bold: fs.readFileSync(path.join(FONT_DIR, 'Lato-Bold.ttf')),
    italics: fs.readFileSync(path.join(FONT_DIR, 'Lato-Italic.ttf')),
    bolditalics: fs.readFileSync(path.join(FONT_DIR, 'Lato-BoldItalic.ttf')),
  },
  Roboto: {
    normal: fs.readFileSync(path.join(FONT_DIR, 'Roboto-Regular.ttf')),
    bold: fs.readFileSync(path.join(FONT_DIR, 'Roboto-Medium.ttf')),
    italics: fs.readFileSync(path.join(FONT_DIR, 'Roboto-Italic.ttf')),
    bolditalics: fs.readFileSync(path.join(FONT_DIR, 'Roboto-MediumItalic.ttf')),
  },
};

// Singleton printer – reuse across all PDF generations with in-memory fonts
const printer = new PdfPrinter(fonts);

/* ---- Color palette (matches master reference PDF exactly) ---- */
const PURPLE = '#0070eb';
const INK = '#343a40';
const MUTED = '#717684';

function money(value) {
  return Number(value || 0).toFixed(2);
}

function formatDate(d) {
  if (!d) return '—';
  if (typeof d === 'string') {
    const raw = d.slice(0, 10);
    const parts = raw.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Build a PDF from a doc definition and return the full buffer.
 * Use this when you need the complete buffer (e.g. for caching).
 */
function buildPdf(docDefinition) {
  const { defaultStyle, ...rest } = docDefinition;

  return new Promise((resolve, reject) => {
    try {
      const doc = printer.createPdfKitDocument({
        pageSize: 'A4',
        pageMargins: [40, 35, 40, 45],
        ...rest,
        defaultStyle: { font: 'Lato', fontSize: 9.5, color: INK, ...defaultStyle },
      });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Create a pdfmake doc stream that can be piped directly to an HTTP response.
 * Use this for uncached PDF generation to reduce TTFB — the browser starts
 * receiving bytes before the entire PDF is finished rendering.
 */
function createPdfStream(docDefinition) {
  const { defaultStyle, ...rest } = docDefinition;
  const doc = printer.createPdfKitDocument({
    pageSize: 'A4',
    pageMargins: [40, 35, 40, 45],
    ...rest,
    defaultStyle: { font: 'Lato', fontSize: 9.5, color: INK, ...defaultStyle },
  });
  doc.end();
  return doc;
}

/* ---- Logo block: Permit Declaration with purple tick ---- */
function logoBlock() {
  if (logoBase64) {
    return {
      image: logoBase64,
      width: 152,
    };
  }
  // Fallback vector logo
  return {
    columns: [
      {
        width: 32,
        canvas: [
          { type: 'rect', x: 0, y: 2, w: 28, h: 28, r: 6, color: PURPLE },
          {
            type: 'polyline',
            lineWidth: 3.2,
            lineColor: '#ffffff',
            lineCap: 'round',
            lineJoin: 'round',
            points: [{ x: 7, y: 16 }, { x: 12, y: 21 }, { x: 21, y: 9.5 }],
          },
        ],
      },
      {
        width: '*',
        stack: [
          { text: 'Infinity', style: 'wordmark' },
          { text: 'Solutions', style: 'wordmark' },
        ],
        margin: [4, 0, 0, 0],
      },
    ],
  };
}

/**
 * Ensure cell text wraps gracefully in PDF cells without pushing table columns.
 * Standardizes delimiter spacing (, and ;) and uses soft zero-width breaks
 * on very long continuous tokens (>24 chars) without corrupting word contents.
 */
function formatCellText(str) {
  if (!str) return '';
  const lines = String(str).split('\n');
  return lines
    .map((line) => {
      let trimmed = line.trim();
      // Ensure clean spacing after commas and semicolons
      trimmed = trimmed
        .replace(/,\s*/g, ', ')
        .replace(/;\s*/g, '; ');
      // Use zero-width space \u200B for soft line breaks on unbroken strings > 24 chars
      return trimmed
        .split(' ')
        .map((word) => {
          if (word.length > 24) {
            const chunks = word.match(/.{1,14}/g) || [word];
            return chunks.join('\u200B');
          }
          return word;
        })
        .join(' ');
    })
    .join('\n');
}

/**
 * Estimate rendered line count for an item (product name + description).
 */
function estimateItemLines(item) {
  const prodLen = (item.productname || '').length;
  const desc = String(item.description || '');
  const descLines = desc.split('\n');
  let totalDescLines = 0;
  for (const line of descLines) {
    totalDescLines += Math.max(1, Math.ceil(line.length / 28));
  }
  const prodLines = Math.max(1, Math.ceil(prodLen / 20));
  return Math.max(prodLines, totalDescLines);
}

/**
 * Compute dynamic spacing parameters based on items and total line count.
 * This ensures the invoice fits comfortably on a single A4 page for normal
 * and multi-line descriptions while maintaining proportions.
 *
 * A4 dimensions: 595.28pt × 841.89pt
 * Usable height ≈ 771.89pt (841.89 - 35 top - 45 bottom margins).
 */
function getSpacing(items) {
  const itemsList = Array.isArray(items) ? items : (typeof items === 'number' ? new Array(items).fill({}) : []);
  const itemCount = itemsList.length;
  const totalLines = itemsList.reduce((sum, it) => sum + estimateItemLines(it), 0);

  const fixed = {
    dateLineSize: 11.5,
    invoiceNoSize: 13.5,
  };

  // Determine effective height factor combining row count and description lines
  const effectiveCount = Math.max(itemCount, Math.ceil(totalLines * 0.75));

  if (effectiveCount <= 2) {
    return {
      ...fixed,
      headerBottomMargin: 20,
      fromToBottomMargin: 16,
      tablePaddingV: 8,
      footerTopMargin: 170,
      fromFontSize: 8.5,
      toFontSize: 8.5,
      partyNameSize: 10,
      cellFontSize: 8.5,
      thFontSize: 8.5,
      totalBoxMarginTop: 2,
    };
  }
  if (effectiveCount <= 4) {
    return {
      ...fixed,
      headerBottomMargin: 18,
      fromToBottomMargin: 14,
      tablePaddingV: 7,
      footerTopMargin: 120,
      fromFontSize: 8.5,
      toFontSize: 8.5,
      partyNameSize: 10,
      cellFontSize: 8.5,
      thFontSize: 8.5,
      totalBoxMarginTop: 2,
    };
  }
  if (effectiveCount <= 7) {
    return {
      ...fixed,
      headerBottomMargin: 14,
      fromToBottomMargin: 12,
      tablePaddingV: 5.5,
      footerTopMargin: 60,
      fromFontSize: 8,
      toFontSize: 8,
      partyNameSize: 9.5,
      cellFontSize: 8,
      thFontSize: 8,
      totalBoxMarginTop: 2,
    };
  }
  if (effectiveCount <= 10) {
    return {
      ...fixed,
      headerBottomMargin: 10,
      fromToBottomMargin: 10,
      tablePaddingV: 4.5,
      footerTopMargin: 30,
      fromFontSize: 7.5,
      toFontSize: 7.5,
      partyNameSize: 9,
      cellFontSize: 7.5,
      thFontSize: 7.5,
      totalBoxMarginTop: 1,
    };
  }
  if (effectiveCount <= 14) {
    return {
      ...fixed,
      headerBottomMargin: 6,
      fromToBottomMargin: 6,
      tablePaddingV: 3,
      footerTopMargin: 15,
      fromFontSize: 7,
      toFontSize: 7,
      partyNameSize: 8.5,
      cellFontSize: 7,
      thFontSize: 7,
      totalBoxMarginTop: 0,
    };
  }
  return {
    ...fixed,
    headerBottomMargin: 4,
    fromToBottomMargin: 4,
    tablePaddingV: 2,
    footerTopMargin: 10,
    fromFontSize: 6.5,
    toFontSize: 6.5,
    partyNameSize: 8,
    cellFontSize: 6.5,
    thFontSize: 6.5,
    totalBoxMarginTop: 0,
  };
}

/**
 * Invoice header. Left: company details, then a "CUSTOMER INFO" bar with the
 * customer's details. Right: the INVOICE title, an Invoice # / DATE box and the
 * logo under it.
 */
const HEADER_RIGHT_WIDTH = 185;
// Height of the Total box (rule, 8pt padding, one 10.5pt line, 8pt padding): the
// payment details start this far down so their top is level with the rule under the Total.
const TOTAL_BOX_HEIGHT = 30;

// Invoice line-items table: fixed column widths and the padding on each side of a cell.
const ITEM_CELL_PADDING = 6;
const QTY_COL_WIDTH = 40;
const UNIT_COST_COL_WIDTH = 58;
const LINE_TOTAL_COL_WIDTH = 60;
// The Total box sits under the Unit Cost and Total columns with the same cell padding,
// so its label starts level with the "Unit Cost" heading.
const TOTAL_BOX_WIDTH = UNIT_COST_COL_WIDTH + LINE_TOTAL_COL_WIDTH + ITEM_CELL_PADDING * 4;
const TOTAL_GAP = 4; // space between the "Total Amount" label and the currency symbol
const TOTAL_SYMBOL_GAP = 3; // least space between the currency symbol and the amount
const TOTAL_VALUE_SIZE = 10.5;
// Width left for the symbol and the amount together: the box less its outer padding,
// the two gaps and the label ("Total Amount" in 10pt Lato Bold is 60pt wide).
const TOTAL_VALUE_ROOM = TOTAL_BOX_WIDTH - ITEM_CELL_PADDING * 2 - TOTAL_GAP - TOTAL_SYMBOL_GAP - 60;

/** Rough width of text such as "S$" or "12297.00" in Lato Bold, in ems (slightly generous). */
function estimateEms(text) {
  return [...String(text)].reduce((sum, ch) => sum + (ch === '.' || ch === ' ' || ch === ',' ? 0.26 : 0.6), 0);
}

/** Blue label with a white caption, as wide as its text; a block heading on the invoice. */
function sectionBar(text, margin = [0, 0, 0, 0]) {
  return {
    table: {
      widths: ['auto'],
      body: [[{ text, style: 'sectionBar', fillColor: PURPLE }]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingTop: () => 3,
      paddingBottom: () => 3,
      paddingLeft: () => 6,
      paddingRight: () => 6,
    },
    margin,
  };
}

/**
 * Payment instructions at the bottom of the invoice (Company Settings).
 * Bank details typed one per line as "Label: value" are laid out as an aligned
 * list under a PAYMENT DETAILS bar; any other line prints as plain text.
 * Free text with no such lines, and the default cheque wording, print as before.
 */
function paymentDetailsBlock(settings) {
  const lines = toLines(settings.cheque_payable_to);
  if (!lines.length) {
    return [
      { text: 'All Cheques should be crossed and made payable to', style: 'payLead' },
      { text: (settings.company_name || 'INFINITY SOLUTIONS PTE LTD').toUpperCase(), style: 'payee' },
    ];
  }
  if (!lines.some(parseDetailLine)) return [{ text: settings.cheque_payable_to, style: 'payee' }];

  const blocks = [sectionBar('PAYMENT DETAILS', [0, 0, 0, 6])];
  let rows = [];
  const flushRows = () => {
    if (!rows.length) return;
    blocks.push({
      table: { widths: ['auto', 'auto', '*'], body: rows },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingTop: () => 1.5,
        paddingBottom: () => 1.5,
        paddingLeft: (i) => (i === 0 ? 0 : 5),
        paddingRight: () => 0,
      },
      margin: [0, 2, 0, 3],
    });
    rows = [];
  };
  for (const line of lines) {
    const pair = parseDetailLine(line);
    if (pair) {
      rows.push([
        { text: pair[0], style: 'payLabel' },
        { text: ':', style: 'payLabel' },
        { text: pair[1], style: 'payValue' },
      ]);
    } else {
      flushRows();
      blocks.push({ text: line, style: 'payLead' });
    }
  }
  flushRows();
  return blocks;
}

function invoiceHeaderBlock(invoice, settings, sp) {
  const line = (text) => ({ text, style: 'partyLine' });
  const invoiceNo = String(invoice.invoice_no || '').replace(/^#/, '');

  const companyLines = [];
  if (settings.address) companyLines.push(line(settings.address));
  if (settings.tel) companyLines.push(line(`Tel: ${settings.tel}`));
  if (settings.mobile) companyLines.push(line(`Mobile: ${settings.mobile}`));
  if (settings.email) companyLines.push(line(`Mail: ${settings.email}`));
  if (settings.website) companyLines.push(line(settings.website));
  if (settings.contact_no) companyLines.push(line(`Contact: ${settings.contact_no}`));

  const customerPhone = invoice.customer_mobile || invoice.customer_contact;
  const customerLines = [];
  if (invoice.person_incharge) customerLines.push(line(`Attn: ${invoice.person_incharge}`));
  if (invoice.customer_address) customerLines.push(line(invoice.customer_address));
  if (customerPhone) customerLines.push(line(`Tel: ${customerPhone}`));
  if (invoice.customer_email) customerLines.push(line(`Mail: ${invoice.customer_email}`));

  const metaHead = (text) => ({ text, style: 'metaHead', alignment: 'center', fillColor: PURPLE });
  const metaValue = (text) => ({ text, style: 'metaValue', alignment: 'center' });

  return {
    columns: [
      {
        width: '*',
        stack: [
          { text: settings.company_name || 'Infinity Solutions Pte Ltd', style: 'companyName' },
          ...companyLines,
          sectionBar('CUSTOMER INFO', [0, 9, 0, 0]),
          { text: invoice.companyname || '', style: 'partyName' },
          ...customerLines,
        ],
      },
      {
        width: HEADER_RIGHT_WIDTH,
        stack: [
          { text: 'INVOICE', style: 'docHeading', alignment: 'right' },
          {
            table: {
              widths: ['*', '*'],
              body: [
                [metaHead('Invoice No'), metaHead('DATE')],
                [metaValue(invoiceNo), metaValue(formatDate(invoice.invoice_date))],
              ],
            },
            layout: {
              hLineWidth: () => 0.75,
              vLineWidth: () => 0.75,
              hLineColor: () => PURPLE,
              // White divider between the two blue heading cells, blue everywhere else.
              vLineColor: (i, node, rowIndex) => (i === 1 && rowIndex === 0 ? '#ffffff' : PURPLE),
              paddingTop: () => 3,
              paddingBottom: () => 3,
              paddingLeft: () => 4,
              paddingRight: () => 4,
            },
          },
          logoBase64
            ? { image: logoBase64, fit: [HEADER_RIGHT_WIDTH, 112], alignment: 'center', margin: [0, 8, 0, 0] }
            : { ...logoBlock(), margin: [0, 10, 0, 0] },
        ],
      },
    ],
    columnGap: 20,
    margin: [0, 0, 0, Math.max(4, sp.fromToBottomMargin - 8)],
  };
}

/* ---- Invoice PDF definition ---- */
function invoicePdfDefinition(invoice, items = [], settings = {}) {
  const currency = settings.default_currency || 'SGD';
  const sp = getSpacing(items);

  // Total: the currency symbol sits right after the label and the amount is right-aligned.
  // A very large amount is set in a smaller size so it still fits on one line.
  const totalSymbol = currencySymbol(currency);
  const totalText = money(invoice.sub_amount);
  const totalFontSize = Math.max(
    6.5,
    Math.min(TOTAL_VALUE_SIZE, TOTAL_VALUE_ROOM / (estimateEms(totalSymbol) + estimateEms(totalText)))
  );

  /* ---- Build item rows ---- */
  const itemRows = items.map((item, idx) => [
    { text: String(idx + 1), style: 'cell', alignment: 'center' },
    { text: formatCellText(item.productname || '').toUpperCase(), style: 'cell', alignment: 'left' },
    { text: formatCellText(item.description || ''), style: 'cell', alignment: 'left' },
    { text: String(Number(item.quantity || 0)), style: 'cell', alignment: 'center' },
    { text: money(item.rate), style: 'cell', alignment: 'left' },
    { text: money(item.total), style: 'cell', alignment: 'right' },
  ]);

  return {
    background: (currentPage, pageSize) => {
      if (logoBase64) {
        return [
          {
            image: logoBase64,
            width: 320,
            opacity: 0.08,
            absolutePosition: {
              x: (pageSize.width - 320) / 2,
              y: 290,
            },
          },
        ];
      }
      return null;
    },
    footer: (currentPage, pageCount) => ({
      text: 'This is a system generated invoice no authorized signature needed.',
      style: 'systemNotice',
      alignment: 'center',
      margin: [0, 15, 0, 0],
    }),
    content: [
      /* ======== HEADER: company + customer left, INVOICE / number / date / logo right ======== */
      invoiceHeaderBlock(invoice, settings, sp),

      /* ======== LINE-ITEMS TABLE (Solid Purple Header with White Text) ======== */
      {
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: [20, 112, '*', QTY_COL_WIDTH, UNIT_COST_COL_WIDTH, LINE_TOTAL_COL_WIDTH],
          body: [
            [
              { text: '#', style: 'th', color: '#ffffff', bold: true, alignment: 'center' },
              { text: 'Product Name', style: 'th', color: '#ffffff', bold: true, alignment: 'left' },
              { text: 'Description', style: 'th', color: '#ffffff', bold: true, alignment: 'left' },
              { text: 'Qty', style: 'th', color: '#ffffff', bold: true, alignment: 'center' },
              { text: `Unit Cost ${currency}`, style: 'th', color: '#ffffff', bold: true, alignment: 'left' },
              { text: `Total ${currency}`, style: 'th', color: '#ffffff', bold: true, alignment: 'right' },
            ],
            ...itemRows,
          ],
        },
        layout: {
          fillColor: (rowIndex) => (rowIndex === 0 ? PURPLE : null),
          hLineWidth: (i, node) => {
            if (i === 0) return 0;
            return 0.75;
          },
          vLineWidth: () => 0,
          hLineColor: () => PURPLE,
          paddingTop: (i) => (i === 0 ? 7 : sp.tablePaddingV),
          paddingBottom: (i) => (i === 0 ? 7 : sp.tablePaddingV),
          paddingLeft: (i) => (i === 0 ? 4 : ITEM_CELL_PADDING),
          paddingRight: () => ITEM_CELL_PADDING,
        },
      },

      /* ======== FOOTER: Total on the right; payment details on the left, starting level
         with the rule under the Total; kept together on one page ======== */
      {
        unbreakable: true,
        columns: [
          {
            width: '*',
            stack: paymentDetailsBlock(settings),
            margin: [0, TOTAL_BOX_HEIGHT, 0, 0],
          },
          {
            width: TOTAL_BOX_WIDTH,
            table: {
              // Label and symbol keep their own width; the amount takes the rest, on one line.
              widths: ['auto', 'auto', '*'],
              body: [
                [
                  { text: 'Total Amount', style: 'totalLabel', noWrap: true, border: [false, true, false, true] },
                  {
                    text: totalSymbol,
                    style: 'totalValue',
                    fontSize: totalFontSize,
                    noWrap: true,
                    border: [false, true, false, true],
                  },
                  {
                    text: totalText,
                    style: 'totalValue',
                    fontSize: totalFontSize,
                    noWrap: true,
                    alignment: 'right',
                    border: [false, true, false, true],
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0.75,
              vLineWidth: () => 0,
              hLineColor: () => PURPLE,
              paddingTop: () => 8,
              paddingBottom: () => 8,
              // Padding only on the outer edges, plus small gaps between the three parts.
              paddingLeft: (i) => [ITEM_CELL_PADDING, TOTAL_GAP, TOTAL_SYMBOL_GAP][i],
              paddingRight: (i) => (i === 2 ? ITEM_CELL_PADDING : 0),
            },
          },
        ],
        margin: [0, sp.footerTopMargin + 4, 0, 0],
      },
    ],

    /* ======== STYLES (exact match to reference PDF) ======== */
    styles: {
      wordmark: { fontSize: 15.5, bold: true, color: PURPLE, lineHeight: 1 },

      // Two blank lines above the company name, so it starts below the INVOICE title.
      companyName: { fontSize: 13, bold: true, color: INK, margin: [0, 26, 0, 6] },
      docHeading: { fontSize: 22, color: INK, margin: [0, 0, 0, 4] },
      metaHead: { fontSize: 8, bold: true, color: '#ffffff' },
      metaValue: { fontSize: 9, color: INK },
      sectionBar: { fontSize: 8, bold: true, color: '#ffffff' },
      partyName: {
        fontSize: sp.partyNameSize,
        bold: true,
        color: INK,
        margin: [0, 4, 0, 2],
        lineHeight: 1.25,
      },
      partyLine: { fontSize: sp.fromFontSize, color: INK, lineHeight: 1.35 },

      th: { fontSize: sp.thFontSize, color: '#ffffff', bold: true },
      cell: { fontSize: sp.cellFontSize, color: INK, lineHeight: 1.25 },

      payLead: { fontSize: 8.5, color: INK },
      payee: { fontSize: 11, bold: true, color: INK, margin: [0, 3, 0, 0] },
      payLabel: { fontSize: 8.5, color: INK },
      payValue: { fontSize: 8.5, bold: true, color: INK },

      totalLabel: { fontSize: 10, bold: true, color: INK },
      totalValue: { fontSize: 10.5, bold: true, color: INK },
      systemNotice: { fontSize: 10, bold: true, color: INK, italics: true },
    },
  };
}

/* ---- Report PDF (preserved for report generation) ---- */
function reportPdfDefinition(rows, filters, summary) {
  const activeFilters = Object.entries({
    'Company Name': filters.company,
    From: filters.start,
    To: filters.end,
    'Payment Status': filters.paymentStatus,
    Status: filters.status && String(filters.status).toLowerCase() === 'pending' ? 'Unpaid' : filters.status,
    'Invoice No': filters.invoiceNo,
  }).filter(([, v]) => v && v !== 'All').map(([k, v]) => `${k}: ${v}`).join('   •   ');

  const body = [
    [
      { text: 'Invoice No', style: 'th', alignment: 'left', color: '#ffffff', bold: true },
      { text: 'Invoice Date', style: 'th', alignment: 'left', color: '#ffffff', bold: true },
      { text: 'Company Name', style: 'th', alignment: 'left', color: '#ffffff', bold: true },
      { text: 'Description', style: 'th', alignment: 'left', color: '#ffffff', bold: true },
      { text: 'Sub Amount', style: 'th', alignment: 'right', color: '#ffffff', bold: true },
      { text: 'Status', style: 'th', alignment: 'center', color: '#ffffff', bold: true },
    ],
    ...rows.map((r) => [
      { text: r.invoice_no, style: 'cell', alignment: 'left' },
      { text: formatDate(r.invoice_date), style: 'cell', alignment: 'left' },
      { text: r.companyname, style: 'cell', alignment: 'left' },
      { text: r.description || '', style: 'cell', alignment: 'left' },
      { text: money(r.sub_amount), style: 'cell', alignment: 'right' },
      { text: (r.status && String(r.status).toLowerCase() === 'pending') ? 'Unpaid' : (r.status || ''), style: 'cell', alignment: 'center' },
    ]),
  ];

  return {
    pageOrientation: 'landscape',
    background: (currentPage, pageSize) => {
      if (logoBase64) {
        return [
          {
            image: logoBase64,
            width: 360,
            opacity: 0.08,
            absolutePosition: {
              x: (pageSize.width - 360) / 2,
              y: (pageSize.height - 200) / 2,
            },
          },
        ];
      }
      return null;
    },
    content: [
      {
        columns: [
          logoBlock(),
          {
            width: '*',
            stack: [
              { text: 'Invoice Report', style: 'title' },
              { text: `Generated ${formatDate(new Date())}`, style: 'subtle' },
            ],
            alignment: 'right',
          },
        ],
        margin: [0, 0, 0, 14],
      },
      activeFilters
        ? { text: activeFilters, style: 'subtle', margin: [0, 0, 0, 12] }
        : { text: 'All invoices (no filters applied)', style: 'subtle', margin: [0, 0, 0, 12] },
      {
        table: { headerRows: 1, widths: [92, 68, 150, '*', 82, 62], body },
        layout: {
          fillColor: (i) => (i === 0 ? PURPLE : null),
          hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? 0.75 : 0.4),
          vLineWidth: () => 0,
          hLineColor: (i, node) => (i === 0 || i === node.table.body.length ? PURPLE : '#e2e5eb'),
          paddingTop: (i) => (i === 0 ? 6 : 7),
          paddingBottom: (i) => (i === 0 ? 6 : 7),
          paddingLeft: (i) => (i === 0 ? 6 : 8),
          paddingRight: (i, node) => (i === node.table.widths.length - 1 ? 6 : 8),
        },
      },
      {
        columns: [
          { text: `${rows.length} invoice${rows.length === 1 ? '' : 's'}`, style: 'summary' },
          { text: `Total Amount: ${money(summary.totalAmount)}`, style: 'summary', alignment: 'right' },
        ],
        margin: [0, 16, 0, 0],
      },
    ],
    // The notice lives in the page footer: it takes no content height, so a full table
    // never pushes it alone onto an extra page, and it appears on every page.
    footer: () => ({
      text: 'This is a system generated invoice no authorized signature needed.',
      style: 'systemNotice',
      alignment: 'center',
      margin: [40, 0, 40, 0],
    }),
    pageMargins: [40, 35, 40, 50],
    styles: {
      wordmark: { fontSize: 13, bold: true, color: PURPLE, lineHeight: 1 },
      title: { fontSize: 16, bold: true, color: INK },
      subtle: { fontSize: 8.5, color: MUTED },
      th: { fontSize: 8.5, color: '#ffffff', bold: true },
      cell: { fontSize: 8.5, color: INK },
      summary: { fontSize: 9.5, bold: true, color: INK },
      systemNotice: { fontSize: 10, bold: true, color: INK, italics: true },
    },
    defaultStyle: { fontSize: 8.5 },
  };
}

/* ---- Quotation PDF: same layout as the invoice, followed by the quotation sections ---- */
function quotationPdfDefinition(quotation = {}, settings = {}) {
  const currency = settings.default_currency || 'SGD';
  const items = visibleItems(quotation.items);
  const vis = resolveVisibility(quotation);
  const companyName = settings.company_name || 'Infinity Solutions Pte Ltd';
  const sections = resolveSections(quotation, {
    currency,
    companyName,
    email: settings.email || 'contact@infinitysolutions.com.sg',
    contact: settings.mobile || settings.tel || settings.contact_no || '',
  });
  // Same font sizing and row padding as the invoice for the same number of lines.
  const sp = getSpacing(items.length ? items : [{}]);
  const total = visibleTotal(quotation.items);

  const rawNo = String(quotation.quotation_no || '');
  const formattedNo = rawNo.startsWith('#') ? `Quotation ${rawNo}` : `Quotation #${rawNo}`;

  /* ---- Line-items table (Description column can be hidden) ---- */
  const showDescription = vis.description;
  const th = (text, alignment) => ({ text, style: 'th', color: '#ffffff', bold: true, alignment });
  const headerCells = [
    th('#', 'center'),
    th('product name', 'left'),
    ...(showDescription ? [th('Description', 'left')] : []),
    th(`Unit Cost ${currency}`, 'right'),
  ];
  const widths = showDescription ? [24, 160, '*', 100] : [24, '*', 120];
  const itemRows = items.map((item, idx) => [
    { text: String(idx + 1), style: 'cell', alignment: 'center' },
    { text: formatCellText(item.productname || '').toUpperCase(), style: 'cell', alignment: 'left' },
    ...(showDescription ? [{ text: formatCellText(item.description || ''), style: 'cell', alignment: 'left' }] : []),
    { text: money(item.rate), style: 'cell', alignment: 'right' },
  ]);
  if (!itemRows.length) {
    itemRows.push([
      { text: 'No items listed.', style: 'cell', alignment: 'center', color: MUTED, colSpan: headerCells.length },
      ...Array(headerCells.length - 1).fill({}),
    ]);
  }

  const purpleTable = {
    fillColor: (rowIndex) => (rowIndex === 0 ? PURPLE : null),
    hLineWidth: (i) => (i === 0 ? 0 : 0.75),
    vLineWidth: () => 0,
    hLineColor: () => PURPLE,
    paddingTop: (i) => (i === 0 ? 7 : sp.tablePaddingV),
    paddingBottom: (i) => (i === 0 ? 7 : sp.tablePaddingV),
    paddingLeft: () => 6,
    paddingRight: () => 6,
  };

  /* ---- "From" address block (same as the invoice) ---- */
  const fromLines = [{ text: settings.company_name || 'Infinity Solutions Pte Ltd', style: 'partyName' }];
  if (settings.address) fromLines.push({ text: settings.address, style: 'partyLine' });
  const telLine = [
    settings.tel ? `Tel: ${settings.tel}` : null,
    settings.mobile ? `HP: ${settings.mobile}` : null,
  ].filter(Boolean).join(' | ');
  if (telLine) fromLines.push({ text: telLine, style: 'partyLine' });
  if (settings.email) fromLines.push({ text: `Email: ${settings.email}`, style: 'partyLine' });
  if (settings.website) fromLines.push({ text: settings.website, style: 'partyLine' });
  if (settings.contact_no) fromLines.push({ text: `Contact: ${settings.contact_no}`, style: 'partyLine' });

  /* ---- Quotation sections, each only when shown and not empty ---- */
  const para = (text) => toLines(text).map((line) => ({ text: line, style: 'sectionText' }));
  const blocks = [];
  const section = (shown, title, body) => {
    if (!shown || !body.length) return;
    blocks.push({ text: title, style: 'sectionTitle' }, ...body);
  };

  section(vis.item_cost, 'Item Cost :', para(sections.item_cost));
  if (vis.turnaround && sections.turnaround.length) {
    blocks.push({ text: 'PERMIT TURN-AROUND TIME', style: 'sectionTitle', alignment: 'center' });
    blocks.push({
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: ['55%', '45%'],
        body: [
          [th('Priority', 'left'), th('Permit Returning Timings', 'center')],
          ...sections.turnaround.map((row) => [
            { text: row.priority || '', style: 'cell' },
            { text: row.timing || '', style: 'cell', alignment: 'center' },
          ]),
        ],
      },
      layout: purpleTable,
      margin: [0, 0, 0, 6],
    });
  }
  section(vis.procedures, 'Procedures :', para(sections.procedures));
  section(vis.operating_hours, 'Operating Hours :', para(sections.operating_hours));
  section(
    vis.terms,
    'Terms & Conditions :',
    sections.terms.map((t) => ({ text: `•  ${t}`, style: 'sectionText', margin: [8, 0, 0, 2] }))
  );
  if (vis.closing_note && String(sections.closing_note || '').trim()) {
    blocks.push({ text: sections.closing_note, style: 'sectionText', margin: [0, 8, 0, 0] });
  }
  section(vis.notes, 'Additional Notes :', para(quotation.notes));

  return {
    background: (currentPage, pageSize) => {
      if (logoBase64) {
        return [
          {
            image: logoBase64,
            width: 320,
            opacity: 0.08,
            absolutePosition: { x: (pageSize.width - 320) / 2, y: 290 },
          },
        ];
      }
      return null;
    },
    footer: () => ({
      text: 'This is a system generated quotation, no authorized signature needed.',
      style: 'systemNotice',
      alignment: 'center',
      margin: [0, 15, 0, 0],
    }),
    content: [
      /* ======== HEADER: Logo left, Date + Quotation # to the right ======== */
      {
        columns: [
          { width: '*', stack: [logoBlock()] },
          {
            width: 'auto',
            stack: [
              {
                text: [
                  { text: 'Date : ', bold: true },
                  { text: formatDate(quotation.quotation_date || quotation.created_at), bold: true },
                ],
                style: 'dateLine',
                alignment: 'left',
              },
              { text: formattedNo, style: 'invoiceNo', alignment: 'left' },
            ],
          },
        ],
        margin: [0, 0, 0, 18],
      },

      /* ======== FROM & TO ======== */
      {
        columns: [
          { width: 295, stack: fromLines },
          {
            width: 220,
            stack: [
              {
                text: [
                  { text: 'To: ' },
                  { text: quotation.companyname || '', bold: true },
                ],
                style: 'partyLabel',
              },
              { text: `Name: ${quotation.person_incharge || ''}`, style: 'partyName', margin: [0, 4, 0, 2] },
              { text: `Address: ${quotation.address || ''}`, style: 'partyLine' },
              { text: `Phone: ${quotation.customer_contact || quotation.mobile_no || ''}`, style: 'partyLine' },
            ],
          },
        ],
        margin: [0, 0, 0, 14],
      },

      /* ======== DOCUMENT TITLE (optional) ======== */
      ...(vis.doc_title && String(sections.doc_title || '').trim()
        ? [{ text: String(sections.doc_title).toUpperCase(), style: 'docTitle' }]
        : []),

      /* ======== LINE-ITEMS TABLE ======== */
      {
        table: { headerRows: 1, dontBreakRows: true, widths, body: [headerCells, ...itemRows] },
        layout: purpleTable,
      },

      /* ======== QUOTATION SECTIONS ======== */
      ...(blocks.length ? [{ stack: blocks, margin: [0, 14, 0, 0] }] : []),
    ],

    styles: {
      wordmark: { fontSize: 15.5, bold: true, color: PURPLE, lineHeight: 1 },
      dateLine: { fontSize: sp.dateLineSize, bold: true, color: INK, margin: [0, 0, 0, 3] },
      invoiceNo: { fontSize: sp.invoiceNoSize, bold: true, color: INK },
      partyLabel: { fontSize: sp.fromFontSize, color: INK, bold: false },
      partyName: { fontSize: sp.partyNameSize, bold: true, color: INK, margin: [0, 4, 0, 2], lineHeight: 1.25 },
      partyLine: { fontSize: sp.fromFontSize, color: INK, lineHeight: 1.35 },
      docTitle: { fontSize: 11.5, bold: true, color: INK, alignment: 'center', margin: [0, 2, 0, 10] },
      th: { fontSize: sp.thFontSize, color: '#ffffff', bold: true },
      cell: { fontSize: sp.cellFontSize, color: INK, lineHeight: 1.25 },
      totalLabel: { fontSize: 10, color: INK },
      totalValue: { fontSize: 10.5, bold: true, color: INK },
      sectionTitle: { fontSize: 9.5, bold: true, color: INK, margin: [0, 10, 0, 4] },
      sectionText: { fontSize: 9, color: INK, lineHeight: 1.3, margin: [0, 0, 0, 3] },
      systemNotice: { fontSize: 10, bold: true, color: INK, italics: true },
    },
  };
}

module.exports = {
  buildPdf,
  createPdfStream,
  invoicePdfDefinition,
  quotationPdfDefinition,
  reportPdfDefinition,
  formatDate,
  money,
};

