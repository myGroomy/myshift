// RFC 4180 quoting plus formula neutralization: a cell starting with = + - @ TAB CR
// would be executed as a formula when the export is opened in Excel/Sheets.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;
const NEEDS_QUOTING = /[",\r\n]/;

export type CsvValue = string | number | boolean | null | undefined;

export function csvCell(value: CsvValue): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  return NEEDS_QUOTING.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))];
  return lines.join("\r\n");
}
