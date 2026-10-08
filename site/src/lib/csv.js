// CSV writer for the admin export (RFC 4180 quoting plus a spreadsheet formula guard).

const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * One CSV cell. Cells that a spreadsheet would treat as a formula
 * (starting with = + - @, tab or carriage return) get a leading apostrophe.
 */
export function csvCell(value) {
  let text = value == null ? '' : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text) || text !== text.trim()) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(columns, rows) {
  const lines = [columns.map(csvCell).join(',')];
  for (const row of rows) lines.push(columns.map((column) => csvCell(row[column])).join(','));
  return `${lines.join('\r\n')}\r\n`;
}
