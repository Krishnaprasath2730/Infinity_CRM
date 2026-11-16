const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { reportHeader } = require('./reportMeta');
const { resolveSections, resolveVisibility, toLines: sectionLines, visibleItems } = require('./quotationSections');
const { parseDetailLine } = require('./paymentDetails');

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo.png');
const PURPLE = 'FF0070EB';
const MUTED = 'FF717684';
const COLUMN_COUNT = 6;

/* ---- Read the logo once at module load, with its pixel size for scaling ---- */
let logo = null;
try {
  if (fs.existsSync(LOGO_PATH)) {
    const buffer = fs.readFileSync(LOGO_PATH);
    // PNG: width and height are big-endian uint32 at bytes 16 and 20 of the IHDR chunk.
    logo = { buffer, width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
} catch (err) {
  console.error('[excel] Failed to read the logo:', err.message);
}

// The logo sits over columns A-B (about 260px wide); scale it to fit with a margin.
const LOGO_MAX_WIDTH = 215;
const LOGO_MAX_HEIGHT = 50;

function logoSize() {
  const scale = Math.min(LOGO_MAX_WIDTH / logo.width, LOGO_MAX_HEIGHT / logo.height, 1);
  return { width: Math.round(logo.width * scale), height: Math.round(logo.height * scale) };
}

/**
 * Letterhead: logo top-left, report title and generated line top-right, company
 * name under the logo and the applied filters under that. Mirrors the PDF export.
 * Returns nothing; the table starts on the row after the blank spacer.
 */
function addLetterhead(workbook, sheet, header) {
  // Row 1: logo (left) + title (right)
  const topRow = sheet.addRow([]);
  topRow.height = 46;
  sheet.mergeCells(1, 3, 1, COLUMN_COUNT);
  const titleCell = sheet.getCell(1, 3);
  titleCell.value = header.title;
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: PURPLE } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'right' };

  if (logo) {
    const imageId = workbook.addImage({ buffer: logo.buffer, extension: 'png' });
    sheet.addImage(imageId, {
      tl: { col: 0.15, row: 0.18 },
      ext: logoSize(),
      editAs: 'oneCell',
    });
  }

  // Row 2: company name (left) + generated line (right)
  const infoRow = sheet.addRow([]);
  infoRow.height = 18;
  sheet.mergeCells(2, 1, 2, 2);
  const companyCell = sheet.getCell(2, 1);
  companyCell.value = header.company;
  companyCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF343A40' } };
  companyCell.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.mergeCells(2, 3, 2, COLUMN_COUNT);
  const generatedCell = sheet.getCell(2, 3);
  generatedCell.value = `Generated on ${header.generatedOn} • ${header.countLabel}`;
  generatedCell.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: MUTED } };
  generatedCell.alignment = { vertical: 'middle', horizontal: 'right' };

  // Row 3: filters the report was run with
  const filterRow = sheet.addRow([]);
  filterRow.height = 18;
  sheet.mergeCells(3, 1, 3, COLUMN_COUNT);
  const filterCell = sheet.getCell(3, 1);
  filterCell.value = header.filtersLabel;
  filterCell.font = { name: 'Arial', size: 9.5, color: { argb: MUTED } };
  filterCell.alignment = { vertical: 'middle', horizontal: 'left' };
  filterCell.border = { bottom: { style: 'thin', color: { argb: PURPLE } } };

  sheet.addRow([]); // Blank spacer
}

/**
 * @param {Array} rows      report rows
 * @param {object} summary  { totalAmount }
 * @param {{filters?: object, settings?: object}} context  filters used and company settings
 */
async function buildReportExcel(rows, summary, context = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Infinity CRM';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Invoice Report', {
    views: [{ showGridLines: true }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  // Column widths first: the logo is positioned relative to them.
  sheet.columns = [
    { width: 20 },
    { width: 16 },
    { width: 32 },
    { width: 48 },
    { width: 18 },
    { width: 16 },
  ];

  addLetterhead(workbook, sheet, reportHeader(rows, context));

  // Table Headers
  const headers = ['Invoice No', 'Invoice Date', 'Company Name', 'Description', 'Sub Amount', 'Status'];
  const headerRow = sheet.addRow(headers);
  headerRow.height = 25;

  headerRow.eachCell((cell, colNum) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: PURPLE },
    };
    cell.font = {
      name: 'Arial',
      size: 10,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNum === 5 ? 'right' : colNum === 6 ? 'center' : 'left',
    };
    cell.border = {
      top: { style: 'thin', color: { argb: PURPLE } },
      bottom: { style: 'thin', color: { argb: PURPLE } },
      left: { style: 'thin', color: { argb: 'FF1A82F7' } },
      right: { style: 'thin', color: { argb: 'FF1A82F7' } },
    };
  });

  // Data Rows
  rows.forEach((r, idx) => {
    const isEven = idx % 2 === 0;
    const description = String(r.description || '');
    const row = sheet.addRow([
      r.invoice_no,
      String(r.invoice_date).slice(0, 10),
      r.companyname,
      description,
      Number(r.sub_amount) || 0,
      (!r.status || String(r.status).toLowerCase() === 'pending') ? 'Unpaid' : r.status,
    ]);
    // One line per invoice item; grow the row so every description line stays visible.
    const descriptionLines = description ? description.split('\n').length : 1;
    row.height = Math.max(20, 15 * descriptionLines + 5);

    row.eachCell((cell, colNum) => {
      cell.font = { name: 'Arial', size: 9.5, color: { argb: 'FF343A40' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8F9FA' },
      };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE9ECEF' } },
        left: { style: 'thin', color: { argb: 'FFE9ECEF' } },
        right: { style: 'thin', color: { argb: 'FFE9ECEF' } },
      };

      if (colNum === 5) {
        cell.numFmt = '#,##0.00';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (colNum === 6) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNum === 4) {
        cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  });

  // Totals Row
  const totalAmount = summary?.totalAmount !== undefined
    ? Number(summary.totalAmount)
    : rows.reduce((acc, r) => acc + (Number(r.sub_amount) || 0), 0);

  const totalRow = sheet.addRow(['Total Amount', '', '', '', totalAmount, '']);
  totalRow.height = 24;

  totalRow.eachCell((cell, colNum) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF343A40' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2E6F4' },
    };
    cell.border = {
      top: { style: 'medium', color: { argb: PURPLE } },
      bottom: { style: 'double', color: { argb: PURPLE } },
    };

    if (colNum === 5) {
      cell.numFmt = '#,##0.00';
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    } else {
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    }
  });

  return workbook.xlsx.writeBuffer();
}

/* ============================================================
 * Quotation workbook: the quotation document as a sheet, in the same order as
 * the PDF (header, From / To, line items, then the sections that are shown).
 * ============================================================ */

const INK = 'FF343A40';
// A: #, B: product name, C: description, D: unit cost.
const QUOTE_WIDTHS = [6, 34, 46, 20];
const QUOTE_COLS = QUOTE_WIDTHS.length;
const LINE_HEIGHT = 14; // points per wrapped line at 10pt Arial

const quoteFont = (extra = {}) => ({ name: 'Arial', size: 10, color: { argb: INK }, ...extra });

function quoteDate(value) {
  const raw = String(value || '').slice(0, 10);
  const parts = raw.split('-');
  if (parts.length === 3 && parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return '';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

/** Combined width, in characters, of columns `from`..`to` (1-based). */
function spanWidth(from, to) {
  return QUOTE_WIDTHS.slice(from - 1, to).reduce((sum, width) => sum + width, 0);
}

/**
 * Row height that shows all of `text` wrapped in a cell `widthChars` wide.
 * Excel does not auto-fit merged cells, so the height is estimated.
 */
function wrappedHeight(text, widthChars, minimum = 18) {
  const lines = String(text ?? '')
    .split('\n')
    .reduce((count, part) => count + Math.max(1, Math.ceil(part.length / widthChars)), 0);
  return Math.max(minimum, lines * LINE_HEIGHT + 4);
}

/**
 * @param {object} quotation  hydrated quotation (JSON columns parsed)
 * @param {object} settings   company settings row
 */
async function buildQuotationExcel(quotation = {}, settings = {}) {
  const currency = settings.default_currency || 'SGD';
  const companyName = settings.company_name || 'Infinity Solutions Pte Ltd';
  const items = visibleItems(quotation.items);
  const vis = resolveVisibility(quotation);
  const sections = resolveSections(quotation, {
    currency,
    companyName,
    email: settings.email || 'contact@infinitysolutions.com.sg',
    contact: settings.mobile || settings.tel || settings.contact_no || '',
  });
  const showDescription = vis.description;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Infinity CRM';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Quotation', {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  });
  sheet.columns = QUOTE_WIDTHS.map((width) => ({ width }));

  /** Add a row with `value` in one merged, wrapped cell spanning `from`..`to`. */
  const block = (value, { from = 1, to = QUOTE_COLS, font = {}, horizontal = 'left', minHeight = 18 } = {}) => {
    const row = sheet.addRow([]);
    if (to > from) sheet.mergeCells(row.number, from, row.number, to);
    const cell = row.getCell(from);
    cell.value = value;
    cell.font = quoteFont(font);
    cell.alignment = { vertical: 'top', horizontal, wrapText: true };
    row.height = wrappedHeight(value, spanWidth(from, to), minHeight);
    return row;
  };
  const spacer = (height = 8) => { sheet.addRow([]).height = height; };

  /** Blue header row. `cells` is a list of { text, from, to, horizontal }. */
  const headerRow = (cells) => {
    const row = sheet.addRow([]);
    row.height = 24;
    for (const { text, from, to = from, horizontal = 'left' } of cells) {
      if (to > from) sheet.mergeCells(row.number, from, row.number, to);
      for (let col = from; col <= to; col += 1) {
        row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PURPLE } };
      }
      const cell = row.getCell(from);
      cell.value = text;
      cell.font = quoteFont({ bold: true, color: { argb: 'FFFFFFFF' } });
      cell.alignment = { vertical: 'middle', horizontal, wrapText: true };
    }
    return row;
  };

  /** Body row under a blue header, with the same cell layout and a blue rule below. */
  const bodyRow = (cells) => {
    const row = sheet.addRow([]);
    let height = 20;
    for (const { value, from, to = from, horizontal = 'left', numFmt, font } of cells) {
      if (to > from) sheet.mergeCells(row.number, from, row.number, to);
      for (let col = from; col <= to; col += 1) {
        row.getCell(col).border = { bottom: { style: 'thin', color: { argb: PURPLE } } };
      }
      const cell = row.getCell(from);
      cell.value = value;
      cell.font = quoteFont(font);
      cell.alignment = { vertical: 'top', horizontal, wrapText: true };
      if (numFmt) cell.numFmt = numFmt;
      if (typeof value === 'string') height = Math.max(height, wrappedHeight(value, spanWidth(from, to), 20));
    }
    row.height = height;
    return row;
  };

  /* ---- Header: logo left; title, date and number right ---- */
  const HEADER_ROWS = 4;
  const HEADER_ROW_HEIGHT = 22;
  const headerLines = [
    { text: 'QUOTATION', font: { size: 18, bold: true, color: { argb: PURPLE } } },
    { text: `Date : ${quoteDate(quotation.quotation_date || quotation.created_at)}`, font: { size: 11, bold: true } },
    { text: `Quotation #${String(quotation.quotation_no || '').replace(/^#/, '')}`, font: { size: 12, bold: true } },
  ];
  for (let i = 0; i < HEADER_ROWS; i += 1) {
    const row = sheet.addRow([]);
    row.height = HEADER_ROW_HEIGHT;
    sheet.mergeCells(row.number, 3, row.number, QUOTE_COLS);
    if (headerLines[i]) {
      const cell = row.getCell(3);
      cell.value = headerLines[i].text;
      cell.font = quoteFont(headerLines[i].font);
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
    }
  }
  if (logo) {
    // Row heights are in points; image sizes are in pixels (1pt = 4/3 px).
    const maxHeight = HEADER_ROWS * HEADER_ROW_HEIGHT * (4 / 3) - 10;
    const scale = Math.min(maxHeight / logo.height, 240 / logo.width, 1);
    sheet.addImage(workbook.addImage({ buffer: logo.buffer, extension: 'png' }), {
      tl: { col: 0.2, row: 0.15 },
      ext: { width: Math.round(logo.width * scale), height: Math.round(logo.height * scale) },
      editAs: 'oneCell',
    });
  }
  spacer(10);

  /* ---- From (columns A-B) and To (columns C-D), side by side ---- */
  const telLine = [
    settings.tel ? `Tel: ${settings.tel}` : null,
    settings.mobile ? `HP: ${settings.mobile}` : null,
  ].filter(Boolean).join(' | ');
  const fromLines = [
    { text: 'From:' },
    { text: companyName, bold: true },
    settings.address ? { text: settings.address } : null,
    telLine ? { text: telLine } : null,
    settings.email ? { text: `Email: ${settings.email}` } : null,
    settings.website ? { text: settings.website } : null,
    settings.contact_no ? { text: `Contact: ${settings.contact_no}` } : null,
  ].filter(Boolean);
  const toLines = [
    {
      text: `To: ${quotation.companyname || ''}`,
      value: {
        richText: [
          { text: 'To: ', font: quoteFont() },
          { text: String(quotation.companyname || ''), font: quoteFont({ bold: true }) },
        ],
      },
    },
    { text: `Name: ${quotation.person_incharge || ''}`, bold: true },
    { text: `Address: ${quotation.address || ''}` },
    { text: `Phone: ${quotation.customer_contact || quotation.mobile_no || ''}` },
  ];
  for (let i = 0; i < Math.max(fromLines.length, toLines.length); i += 1) {
    const row = sheet.addRow([]);
    sheet.mergeCells(row.number, 1, row.number, 2);
    sheet.mergeCells(row.number, 3, row.number, QUOTE_COLS);
    let height = 16;
    [[fromLines[i], 1, 2], [toLines[i], 3, QUOTE_COLS]].forEach(([entry, from, to]) => {
      if (!entry) return;
      const cell = row.getCell(from);
      cell.value = entry.value || entry.text;
      cell.font = quoteFont({ bold: Boolean(entry.bold) });
      cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      height = Math.max(height, wrappedHeight(entry.text, spanWidth(from, to), 16));
    });
    row.height = height;
  }
  spacer(10);

  /* ---- Document title (optional) ---- */
  if (vis.doc_title && String(sections.doc_title || '').trim()) {
    block(String(sections.doc_title).toUpperCase(), { font: { size: 12, bold: true }, horizontal: 'center', minHeight: 22 });
    spacer(4);
  }

  /* ---- Line items (the Description column can be hidden) ---- */
  const nameTo = showDescription ? 2 : 3;
  headerRow([
    { text: '#', from: 1, horizontal: 'center' },
    { text: 'product name', from: 2, to: nameTo },
    ...(showDescription ? [{ text: 'Description', from: 3 }] : []),
    { text: `Unit Cost ${currency}`, from: 4, horizontal: 'right' },
  ]);
  if (!items.length) {
    bodyRow([{ value: 'No items listed.', from: 1, to: QUOTE_COLS, horizontal: 'center', font: { color: { argb: MUTED } } }]);
  }
  items.forEach((item, idx) => {
    bodyRow([
      { value: idx + 1, from: 1, horizontal: 'center' },
      { value: String(item.productname || '').toUpperCase(), from: 2, to: nameTo },
      ...(showDescription ? [{ value: String(item.description || ''), from: 3 }] : []),
      { value: Number(item.rate) || 0, from: 4, horizontal: 'right', numFmt: '#,##0.00' },
    ]);
  });

  /* ---- Sections, each only when shown and not empty ---- */
  const sectionTitle = (title, horizontal = 'left') => {
    spacer(8);
    block(title, { font: { bold: true }, horizontal, minHeight: 20 });
  };
  const section = (shown, title, lines) => {
    if (!shown || !lines.length) return;
    sectionTitle(title);
    lines.forEach((text) => block(text));
  };

  section(vis.item_cost, 'Item Cost :', sectionLines(sections.item_cost));
  if (vis.turnaround && sections.turnaround.length) {
    sectionTitle('PERMIT TURN-AROUND TIME', 'center');
    headerRow([
      { text: 'Priority', from: 1, to: 2 },
      { text: 'Permit Returning Timings', from: 3, to: QUOTE_COLS, horizontal: 'center' },
    ]);
    sections.turnaround.forEach((entry) => {
      bodyRow([
        { value: String(entry.priority || ''), from: 1, to: 2 },
        { value: String(entry.timing || ''), from: 3, to: QUOTE_COLS, horizontal: 'center' },
      ]);
    });
  }
  section(vis.procedures, 'Procedures :', sectionLines(sections.procedures));
  section(vis.operating_hours, 'Operating Hours :', sectionLines(sections.operating_hours));
  section(vis.terms, 'Terms & Conditions :', sections.terms.map((term) => `•  ${term}`));
  if (vis.closing_note && String(sections.closing_note || '').trim()) {
    spacer(10);
    block(String(sections.closing_note).trim());
  }
  section(vis.notes, 'Additional Notes :', sectionLines(quotation.notes));

  spacer(16);
  block('This is a system generated quotation, no authorized signature needed.', {
    font: { bold: true, italic: true },
    horizontal: 'center',
  });

  return workbook.xlsx.writeBuffer();
}

/* ============================================================
 * Invoice workbook: the invoice as a sheet, laid out like the PDF (company and
 * customer on the left; title, number / date box and logo on the right; line
 * items; total; payment details).
 * ============================================================ */

// A: #, B: product name, C: description, D: qty, E: unit cost, F: total.
const INVOICE_WIDTHS = [6, 30, 40, 10, 16, 16];
const INVOICE_COLS = INVOICE_WIDTHS.length;

/**
 * @param {object} invoice   invoice with its customer fields (see getInvoiceWithItems)
 * @param {Array} items      line items
 * @param {object} settings  company settings row
 */
async function buildInvoiceExcel(invoice = {}, items = [], settings = {}) {
  const currency = settings.default_currency || 'SGD';
  const companyName = settings.company_name || 'Infinity Solutions Pte Ltd';
  const widthOf = (from, to) => INVOICE_WIDTHS.slice(from - 1, to).reduce((sum, width) => sum + width, 0);
  const thin = (argb) => ({ style: 'thin', color: { argb } });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Infinity CRM';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Invoice', {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  });
  sheet.columns = INVOICE_WIDTHS.map((width) => ({ width }));

  /* ---- Header, left side: company details, then the customer ---- */
  const customerPhone = invoice.customer_mobile || invoice.customer_contact;
  const left = [
    { text: companyName, font: { size: 13, bold: true }, height: 22 },
    ...sectionLines(settings.address).map((text) => ({ text })),
    settings.tel ? { text: `Tel: ${settings.tel}` } : null,
    settings.mobile ? { text: `Mobile: ${settings.mobile}` } : null,
    settings.email ? { text: `Mail: ${settings.email}` } : null,
    settings.website ? { text: settings.website } : null,
    settings.contact_no ? { text: `Contact: ${settings.contact_no}` } : null,
    { text: '', height: 8 },
    { text: 'CUSTOMER INFO', label: true },
    { text: String(invoice.companyname || ''), font: { size: 11, bold: true }, height: 19 },
    invoice.person_incharge ? { text: `Attn: ${invoice.person_incharge}` } : null,
    ...sectionLines(invoice.customer_address).map((text) => ({ text })),
    customerPhone ? { text: `Tel: ${customerPhone}` } : null,
    invoice.customer_email ? { text: `Mail: ${invoice.customer_email}` } : null,
  ].filter(Boolean);

  // Right side: title on row 1, the number / date box on rows 2-3, the logo below it.
  const LOGO_FIRST_ROW = 4;
  const LOGO_ROWS = 7;
  const headerRowCount = Math.max(left.length, LOGO_FIRST_ROW - 1 + LOGO_ROWS);
  for (let i = 0; i < headerRowCount; i += 1) {
    const entry = left[i];
    const row = sheet.addRow([]);
    row.height = entry?.height || 16;
    if (!entry) continue;
    const cell = row.getCell(1);
    cell.value = entry.text;
    if (entry.label) {
      // Heading label: a filled cell pair, like the blue label on the PDF.
      sheet.mergeCells(row.number, 1, row.number, 2);
      cell.font = quoteFont({ size: 9, bold: true, color: { argb: 'FFFFFFFF' } });
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PURPLE } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    } else {
      sheet.mergeCells(row.number, 1, row.number, 3);
      cell.font = quoteFont(entry.font);
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    }
  }

  sheet.mergeCells(1, 5, 1, INVOICE_COLS);
  const title = sheet.getCell(1, 5);
  title.value = 'INVOICE';
  title.font = quoteFont({ size: 20 });
  title.alignment = { vertical: 'middle', horizontal: 'right' };
  sheet.getRow(1).height = 28;

  const metaBorder = { top: thin(PURPLE), bottom: thin(PURPLE), left: thin(PURPLE), right: thin(PURPLE) };
  [['Invoice No', String(invoice.invoice_no || '').replace(/^#/, '')], ['DATE', quoteDate(invoice.invoice_date)]]
    .forEach(([label, value], index) => {
      const head = sheet.getCell(2, 5 + index);
      head.value = label;
      head.font = quoteFont({ size: 9, bold: true, color: { argb: 'FFFFFFFF' } });
      head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PURPLE } };
      head.alignment = { vertical: 'middle', horizontal: 'center' };
      head.border = metaBorder;
      const body = sheet.getCell(3, 5 + index);
      body.value = value;
      body.font = quoteFont();
      body.alignment = { vertical: 'middle', horizontal: 'center' };
      body.border = metaBorder;
    });
  sheet.getRow(2).height = 18;
  sheet.getRow(3).height = 18;

  if (logo) {
    // Row heights are in points; image sizes are in pixels (1pt = 4/3 px).
    const maxHeight = LOGO_ROWS * 16 * (4 / 3) - 12;
    const scale = Math.min(maxHeight / logo.height, 200 / logo.width, 1);
    sheet.addImage(workbook.addImage({ buffer: logo.buffer, extension: 'png' }), {
      tl: { col: 4.15, row: LOGO_FIRST_ROW - 1 + 0.4 },
      ext: { width: Math.round(logo.width * scale), height: Math.round(logo.height * scale) },
      editAs: 'oneCell',
    });
  }
  sheet.addRow([]).height = 10;

  /* ---- Line items ---- */
  const headings = ['#', 'Product Name', 'Description', 'Qty', `Unit Cost ${currency}`, `Total ${currency}`];
  const alignments = ['center', 'left', 'left', 'center', 'right', 'right'];
  const headerRow = sheet.addRow(headings);
  headerRow.height = 24;
  headerRow.eachCell((cell, col) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PURPLE } };
    cell.font = quoteFont({ bold: true, color: { argb: 'FFFFFFFF' } });
    cell.alignment = { vertical: 'middle', horizontal: alignments[col - 1] };
  });
  items.forEach((item, idx) => {
    const name = String(item.productname || '').toUpperCase();
    const description = String(item.description || '');
    const row = sheet.addRow([
      idx + 1, name, description, Number(item.quantity) || 0, Number(item.rate) || 0, Number(item.total) || 0,
    ]);
    row.height = Math.max(20, wrappedHeight(name, INVOICE_WIDTHS[1], 20), wrappedHeight(description, INVOICE_WIDTHS[2], 20));
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = quoteFont();
      cell.alignment = { vertical: 'top', horizontal: alignments[col - 1], wrapText: col === 2 || col === 3 };
      cell.border = { bottom: thin(PURPLE) };
      if (col >= 5) cell.numFmt = '0.00';
    });
  });

  /* ---- Total ---- */
  sheet.addRow([]).height = 12;
  const totalRow = sheet.addRow([]);
  totalRow.height = 24;
  const totalLabel = totalRow.getCell(5);
  totalLabel.value = 'Total';
  totalLabel.font = quoteFont({ size: 11 });
  totalLabel.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  const totalValue = totalRow.getCell(6);
  totalValue.value = Number(invoice.sub_amount) || 0;
  totalValue.numFmt = '0.00';
  totalValue.font = quoteFont({ size: 11, bold: true });
  totalValue.alignment = { vertical: 'middle', horizontal: 'right' };
  [totalLabel, totalValue].forEach((cell) => { cell.border = { top: thin(PURPLE), bottom: thin(PURPLE) }; });

  /* ---- Payment details (same reading of the text as the PDF) ---- */
  const fullRow = (text, font = {}) => {
    const row = sheet.addRow([]);
    sheet.mergeCells(row.number, 1, row.number, INVOICE_COLS);
    const cell = row.getCell(1);
    cell.value = text;
    cell.font = quoteFont(font);
    cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    row.height = wrappedHeight(text, widthOf(1, INVOICE_COLS), 16);
    return row;
  };
  sheet.addRow([]).height = 6;
  const paymentLines = sectionLines(settings.cheque_payable_to);
  if (!paymentLines.length) {
    fullRow('All Cheques should be crossed and made payable to');
    fullRow(companyName.toUpperCase(), { size: 11, bold: true });
  } else if (!paymentLines.some(parseDetailLine)) {
    paymentLines.forEach((line) => fullRow(line, { bold: true }));
  } else {
    const labelRow = sheet.addRow([]);
    labelRow.height = 16;
    sheet.mergeCells(labelRow.number, 1, labelRow.number, 2);
    const labelCell = labelRow.getCell(1);
    labelCell.value = 'PAYMENT DETAILS';
    labelCell.font = quoteFont({ size: 9, bold: true, color: { argb: 'FFFFFFFF' } });
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PURPLE } };
    labelCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    paymentLines.forEach((line) => {
      const pair = parseDetailLine(line);
      if (!pair) { fullRow(line); return; }
      const row = sheet.addRow([]);
      row.height = 16;
      sheet.mergeCells(row.number, 1, row.number, 2);
      sheet.mergeCells(row.number, 3, row.number, INVOICE_COLS);
      const name = row.getCell(1);
      name.value = pair[0];
      name.font = quoteFont();
      name.alignment = { vertical: 'middle', horizontal: 'left' };
      // Kept as text so account numbers and codes keep their leading zeros.
      const value = row.getCell(3);
      value.value = `: ${pair[1]}`;
      value.font = quoteFont({ bold: true });
      value.alignment = { vertical: 'middle', horizontal: 'left' };
    });
  }

  sheet.addRow([]).height = 16;
  const notice = fullRow('This is a system generated invoice no authorized signature needed.', { bold: true, italic: true });
  notice.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

  return workbook.xlsx.writeBuffer();
}

module.exports = { buildReportExcel, buildQuotationExcel, buildInvoiceExcel };
