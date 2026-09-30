// Builds PLAN/templates/MYSHIFT-Template-Cabang.xlsx the file admins upload once and
// duplicate per branch, instead of having POST /api/branches spend Sheets quota on a
// spreadsheet.create() for every new branch (lib/google/provisioning.ts copies this file).
//
// Headers are read from lib/google/sheet-schema.ts and seed IDs from lib/ids.ts, the same two
// modules the app writes through, so the template cannot drift from PLAN/SHEETS-SCHEMA.md
// (AGENTS.md §6.4). The only thing hard-coded here is the default *content* per sheet.
//
// Every column is written as plain text (numFmt "@") except `Urutan`. The app reads cells with
// the Sheets default FORMATTED_VALUE rendering and slices them as strings validDate() wants
// "YYYY-MM-DD" and timeOverlaps() slices "HH:mm". If the import coerced those to date/time
// serials, both would break on a locale-dependent render.
//
// Run: pnpm template:branch
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { deflateRawSync } from "node:zlib";
import {
  BRANCH_HEADERS,
  BRANCH_SHEET_NAMES,
  columnLetter,
  type BranchSheetName,
} from "../lib/google/sheet-schema";
import { ID_PREFIX } from "../lib/ids";

const OUTPUT = resolve(import.meta.dirname, "../PLAN/templates/MYSHIFT-Template-Cabang.xlsx");

// ---------------------------------------------------------------------------
// Sheet contents
// ---------------------------------------------------------------------------

type Cell = string | number;
/** Sheets that start empty: the app appends them, and seeded rows would read as real data. */
type SheetSeed = readonly Cell[][];

/**
 * Builds a known seed ID, e.g. seedId(ID_PREFIX.shift, 2) -> "SFT-002". The padding matches
 * nextSequentialId() in lib/ids.ts, so a seeded row is indistinguishable from a row the app
 * appended later and the two can never collide.
 */
function seedId(prefix: string, ordinal: number): string {
  return `${prefix}${String(ordinal).padStart(3, "0")}`;
}

// Schedules, Shift_Swaps, Izin, Checklist_Log, Shift_Report_Audit and Handover_Log stay header-only: the app appends
// to them, and any row seeded here would be indistinguishable from real shift data.
const SEED: Record<BranchSheetName, SheetSeed> = {
  Shifts: [
    [seedId(ID_PREFIX.shift, 1), "Opening", "06:00", "14:00", "TRUE", "", ""],
    [seedId(ID_PREFIX.shift, 2), "Middle", "14:00", "22:00", "TRUE", "", ""],
    [seedId(ID_PREFIX.shift, 3), "Closing", "22:00", "06:00", "TRUE", "", ""],
  ],
  Schedules: [],
  Shift_Swaps: [],
  Izin: [],
  Kategori_Izin: [
    [seedId(ID_PREFIX.category, 1), "Sakit", "TRUE", "", ""],
    [seedId(ID_PREFIX.category, 2), "Ijin", "TRUE", "", ""],
    [seedId(ID_PREFIX.category, 3), "Alpha", "TRUE", "", ""],
  ],
  SOP_Kategori: [[seedId(ID_PREFIX.sopCategory, 1), "Operasional Umum", 1, "TRUE", "", ""]],
  Checklist_Point: [
    [seedId(ID_PREFIX.checklistItem, 1), seedId(ID_PREFIX.sopCategory, 1), "Cek ketersediaan stok bahan", "centang_foto", "", "", "", "", "FALSE", seedId(ID_PREFIX.shift, 1), 1, "TRUE", "", ""],
    [seedId(ID_PREFIX.checklistItem, 2), seedId(ID_PREFIX.sopCategory, 1), "Cek kondisi peralatan dapur", "centang_foto", "", "", "", "", "FALSE", seedId(ID_PREFIX.shift, 1), 2, "TRUE", "", ""],
    [seedId(ID_PREFIX.checklistItem, 3), seedId(ID_PREFIX.sopCategory, 1), "Cuci tangan & sanitasi", "centang", "", "", "", "", "FALSE", seedId(ID_PREFIX.shift, 1), 3, "TRUE", "", ""],
    [seedId(ID_PREFIX.checklistItem, 4), seedId(ID_PREFIX.sopCategory, 1), "Hitung uang kasir", "centang_foto", "", "", "", "", "FALSE", seedId(ID_PREFIX.shift, 3), 1, "TRUE", "", ""],
    [seedId(ID_PREFIX.checklistItem, 5), seedId(ID_PREFIX.sopCategory, 1), "Backup data penjualan", "centang_foto", "", "", "", "", "FALSE", seedId(ID_PREFIX.shift, 3), 2, "TRUE", "", ""],
    [seedId(ID_PREFIX.checklistItem, 6), seedId(ID_PREFIX.sopCategory, 1), "Matikan peralatan listrik", "centang", "", "", "", "", "FALSE", seedId(ID_PREFIX.shift, 3), 3, "TRUE", "", ""],
  ],
  Checklist_Log: [],
  Shift_Report_Audit: [],
  Handover_Template: [
    [seedId(ID_PREFIX.handoverField, 1), "Stok bahan apa saja yang tinggal", "TRUE", 1, "TRUE", "", ""],
    [seedId(ID_PREFIX.handoverField, 2), "Kondisi mesin/perlengkapan", "TRUE", 2, "TRUE", "", ""],
    [seedId(ID_PREFIX.handoverField, 3), "Catatan VIP/kebutuhan khusus", "FALSE", 3, "TRUE", "", ""],
    [seedId(ID_PREFIX.handoverField, 4), "Uang kasir", "TRUE", 4, "TRUE", "", ""],
  ],
  Handover_Log: [],
  Kategori_Incident: [
    [seedId(ID_PREFIX.incidentCategory, 1), "Mesin Rusak", "TRUE", "", ""],
    [seedId(ID_PREFIX.incidentCategory, 2), "Komplain Customer", "TRUE", "", ""],
    [seedId(ID_PREFIX.incidentCategory, 3), "Barang Rusak", "TRUE", "", ""],
    [seedId(ID_PREFIX.incidentCategory, 4), "Stok Habis", "TRUE", "", ""],
    [seedId(ID_PREFIX.incidentCategory, 5), "Kesalahan Order", "TRUE", "", ""],
    [seedId(ID_PREFIX.incidentCategory, 6), "Kebersihan", "TRUE", "", ""],
    [seedId(ID_PREFIX.incidentCategory, 7), "Keamanan", "TRUE", "", ""],
    [seedId(ID_PREFIX.incidentCategory, 8), "Karyawan Berhalangan", "TRUE", "", ""],
    [seedId(ID_PREFIX.incidentCategory, 9), "Lainnya", "TRUE", "", ""],
  ],
  Incidents: [],
  Shift_Reports: [],
  Shift_Report_Snapshots: [],
  File_Assets: [],
  Incident_Attachments: [],
  Schema_Migrations: [],
};

/** Columns kept numeric; everything else is text so the import cannot coerce it. */
const NUMERIC_COLUMNS = new Set(["Urutan", "Batas_Min", "Batas_Max"]);

/** Columns holding sentences or links, widened so admins do not have to reformat by hand. */
const WIDE_COLUMNS = new Set([
  "Deskripsi",
  "Label",
  "Isi",
  "Keterangan",
  "Alasan",
  "Reject_Reason",
  "Foto_URL",
  "Nama",
  "Nilai_Lama",
  "Nilai_Baru",
]);

const DEFAULT_WIDTH = 18;
const WIDE_WIDTH = 42;

// ---------------------------------------------------------------------------
// Minimal OOXML writer an .xlsx is a zip of XML parts, so this avoids taking an
// xlsx-writing dependency for a one-file template generator.
// ---------------------------------------------------------------------------

const XLSX_STYLE = { DEFAULT: 0, HEADER: 1, TEXT: 2 } as const;

// Fixed stamp instead of the current time, so regenerating the template is byte-identical and
// git only sees a diff when the schema actually changed.
const DOS_TIME = (12 << 11) | (0 << 5) | 0;
const DOS_DATE = ((2020 - 1980) << 9) | (1 << 5) | 1;

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value;
  }
  return table;
})();

function crc32(data: Buffer): number {
  let crc = -1;
  for (const byte of data) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  return (crc ^ -1) >>> 0;
}

function zip(entries: ReadonlyArray<readonly [name: string, content: string]>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const [name, content] of entries) {
    const nameBytes = Buffer.from(name, "utf8");
    const raw = Buffer.from(content, "utf8");
    const deflated = deflateRawSync(raw, { level: 9 });
    const checksum = crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(deflated.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28); // extra length
    locals.push(local, nameBytes, deflated);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0, 8); // flags
    central.writeUInt16LE(8, 10); // deflate
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(deflated.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt16LE(0, 30); // extra
    central.writeUInt16LE(0, 32); // comment
    central.writeUInt16LE(0, 34); // disk
    central.writeUInt16LE(0, 36); // internal attrs
    central.writeUInt32LE(0, 38); // external attrs
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);

    offset += local.length + nameBytes.length + deflated.length;
  }

  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...locals, directory, end]);
}

// ---------------------------------------------------------------------------
// SpreadsheetML
// ---------------------------------------------------------------------------

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A1-style cell reference, e.g. cellRef(1, 3) -> "B3". columnLetter is 1-based. */
function cellRef(index: number, rowNumber: number): string {
  return `${columnLetter(index + 1)}${rowNumber}`;
}

function cellXml(reference: string, value: Cell, style: number): string {
  // Numeric cells stay untyped; everything else is an inline string with the "@" style so the
  // value survives the import as the literal text the app's string parsers expect.
  if (typeof value === "number") {
    return `<c r="${reference}" s="${XLSX_STYLE.DEFAULT}"><v>${value}</v></c>`;
  }
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function rowXml(rowNumber: number, values: readonly Cell[], headers: readonly string[]): string {
  const cells = values
    .map((value, index) => {
      const style = NUMERIC_COLUMNS.has(headers[index] ?? "") ? XLSX_STYLE.DEFAULT : XLSX_STYLE.TEXT;
      return cellXml(cellRef(index, rowNumber), value, style);
    })
    .join("");
  return `<row r="${rowNumber}">${cells}</row>`;
}

function sheetXml(name: BranchSheetName, headers: readonly string[], rows: SheetSeed): string {
  const lastColumn = columnLetter(headers.length);

  const columns = headers
    .map((header, index) => {
      const size = WIDE_COLUMNS.has(header) ? WIDE_WIDTH : DEFAULT_WIDTH;
      return `<col min="${index + 1}" max="${index + 1}" width="${size}" customWidth="1"/>`;
    })
    .join("");

  const headerRow = `<row r="1" ht="22" customHeight="1">${headers
    .map((header, index) => cellXml(cellRef(index, 1), header, XLSX_STYLE.HEADER))
    .join("")}</row>`;

  const dataRows = rows.map((values, index) => rowXml(index + 2, values, headers)).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastColumn}${rows.length + 1}"/><sheetViews><sheetView tabSelected="${name === BRANCH_SHEET_NAMES[0] ? 1 : 0}" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${columns}</cols><sheetData>${headerRow}${dataRows}</sheetData></worksheet>`;
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="49" formatCode="@"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF404040"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium9" defaultPivotStyle="PivotStyleLight16"/></styleSheet>`;

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${BRANCH_SHEET_NAMES.map(
  (_, index) =>
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
).join("")}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`;

const WORKBOOK_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookPr/><sheets>${BRANCH_SHEET_NAMES.map(
  (name, index) => `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
).join("")}</sheets></workbook>`;

const WORKBOOK_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${BRANCH_SHEET_NAMES.map(
  (_, index) =>
    `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
).join("")}<Relationship Id="rId${BRANCH_SHEET_NAMES.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

const CORE_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>MYSHIFT Template Cabang</dc:title><dc:creator>scripts/build-branch-template.ts</dc:creator><cp:lastModifiedBy>scripts/build-branch-template.ts</cp:lastModifiedBy></cp:coreProperties>`;

const APP_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>scripts/build-branch-template.ts</Application></Properties>`;

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function build(): Buffer {
  return zip([
    ["[Content_Types].xml", CONTENT_TYPES_XML],
    ["_rels/.rels", ROOT_RELS_XML],
    ["docProps/core.xml", CORE_XML],
    ["docProps/app.xml", APP_XML],
    ["xl/workbook.xml", WORKBOOK_XML],
    ["xl/_rels/workbook.xml.rels", WORKBOOK_RELS_XML],
    ["xl/styles.xml", STYLES_XML],
    ...BRANCH_SHEET_NAMES.map(
      (name, index): readonly [string, string] => [
        `xl/worksheets/sheet${index + 1}.xml`,
        sheetXml(name, BRANCH_HEADERS[name], SEED[name]),
      ],
    ),
  ]);
}

mkdirSync(dirname(OUTPUT), { recursive: true });
const file = build();
writeFileSync(OUTPUT, file);

for (const name of BRANCH_SHEET_NAMES) {
  const rows = SEED[name].length;
  console.log(`  ${name.padEnd(20)} ${BRANCH_HEADERS[name].length} kolom, ${rows} baris seed`);
}
console.log(`\nTemplate cabang ditulis: ${OUTPUT} (${file.length} byte)`);
