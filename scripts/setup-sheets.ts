import { config } from "dotenv";
import { google } from "googleapis";
import { hashPin } from "../lib/domain/pin";
// Column layout comes from the same module the app uses, so onboarding can no longer write
// headers that disagree with PLAN/SHEETS-SCHEMA.md (audit H-4).
import {
  REGISTRY_HEADERS,
  REGISTRY_SHEET_NAMES,
  columnLetter,
  headerRange,
} from "../lib/google/sheet-schema";

config({ path: ".env.local" });

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, "\n");

const auth = new google.auth.JWT({
  email,
  key: privateKey,
  scopes: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"],
});

const sheets = google.sheets({ version: "v4", auth });

async function writeHeaders(spreadsheetId: string, headersByName: Record<string, readonly string[]>) {
  for (const [sheetName, headers] of Object.entries(headersByName)) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: headerRange(sheetName, headers.length),
      valueInputOption: "RAW",
      requestBody: { values: [[...headers]] },
    });
  }
}

async function main() {
  const registryId = process.env.REGISTRY_SPREADSHEET_ID || process.env.MYSHIFT_SHEET_ID;

  if (registryId) {
    console.log("Using existing registry spreadsheet:", registryId);
    await ensureRegistrySheets(registryId);
    await seedAdminIfRequested(registryId);
    console.log(`REGISTRY_SPREADSHEET_ID=${registryId}`);
    printTemplateSteps();
    return;
  }

  // 1. Registry spreadsheet
  const registry = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: "MYSHIFT Registry" },
      sheets: REGISTRY_SHEET_NAMES.map((title) => ({ properties: { title } })),
    },
  });
  const registrySheetId = registry.data.spreadsheetId;
  if (!registrySheetId) throw new Error("Google did not return a registry spreadsheet ID");
  console.log("Registry spreadsheet created:", registrySheetId);

  // 2. Registry headers
  await writeHeaders(registrySheetId, REGISTRY_HEADERS);

  // 3. Optional seed admin if MYSHIFT_INIT_PIN is set
  await seedAdminIfRequested(registrySheetId);

  console.log("\n=== Setup Complete ===");
  console.log("Registry Spreadsheet ID:", registrySheetId);
  console.log("\nAdd this to myshift/.env.local:");
  console.log(`REGISTRY_SPREADSHEET_ID=${registrySheetId}`);
  printTemplateSteps();
}

// The branch template is no longer created here. A template that lives outside the Drive folder
// tree cannot be copied per branch, and its ID has to be editable by an admin without a
// redeploy, so the sheet TEMPLATES in the registry is the single source of truth
// (SHEETS-SCHEMA.md §1-§2, API-CONTRACT.md §3).
function printTemplateSteps() {
  console.log("\n=== Branch template (required before creating branches) ===");
  console.log("1. pnpm template:branch                     -> PLAN/templates/MYSHIFT-Template-Cabang.xlsx");
  console.log("2. Upload the .xlsx to your MYSHIFT folder in Drive");
  console.log("3. pnpm template:import -- --source=<fileId> -> converts it to a Google Sheet");
  console.log("4. Fill sheet TEMPLATES in the registry:");
  console.log("     A2 = Template_Spreadsheet_ID (the imported Sheet)");
  console.log("     B2 = Parent_Folder_ID (the MYSHIFT folder)");
  console.log("   Share both with GOOGLE_SERVICE_ACCOUNT_EMAIL as Editor");
}

async function ensureRegistrySheets(spreadsheetId: string) {
  const current = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties" });
  const properties = current.data.sheets?.map((sheet) => sheet.properties).filter(Boolean) ?? [];
  const names = new Set(properties.map((property) => property?.title));
  const requests: object[] = [];

  const firstSheet = properties[0];
  if (firstSheet?.sheetId !== undefined && firstSheet.title === "Sheet1") {
    requests.push({
      updateSheetProperties: {
        properties: { sheetId: firstSheet.sheetId, title: "Daftar_Cabang" },
        fields: "title",
      },
    });
    names.delete("Sheet1");
    names.add("Daftar_Cabang");
  }
  for (const title of REGISTRY_SHEET_NAMES) {
    if (!names.has(title)) requests.push({ addSheet: { properties: { title } } });
  }
  if (requests.length) await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });

  await assertRegistryHeadersSafeToWrite(spreadsheetId);
  await writeHeaders(spreadsheetId, REGISTRY_HEADERS);
}

async function assertRegistryHeadersSafeToWrite(spreadsheetId: string) {
  const mismatches: string[] = [];
  for (const [sheetName, expected] of Object.entries(REGISTRY_HEADERS)) {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:Z`,
    });
    const rows = result.data.values ?? [];
    const actual = (rows[0] ?? []).map((value) => String(value).trim());
    const hasData = rows.slice(1).some((row) => row.some((value) => String(value).trim() !== ""));
    const emptySheet = actual.every((value) => !value) && !hasData;
    if (!emptySheet && actual.join("|") !== expected.join("|")) {
      mismatches.push(`${sheetName}: [${actual.join(", ")}]`);
    }
  }
  if (mismatches.length) {
    throw new Error(
      "Header Registry tidak cocok dengan skema aplikasi; setup dibatalkan agar data tidak bergeser. " +
        `${mismatches.join("; ")}. Migrasikan kolom berdasarkan nama header sebelum setup.`,
    );
  }
}

async function seedAdminIfRequested(registrySheetId: string) {
  const initPin = process.env.MYSHIFT_INIT_PIN;
  if (!initPin) return;
  const initName = process.env.MYSHIFT_INIT_NAME || "Admin Pusat";
  const initBranch = process.env.MYSHIFT_INIT_BRANCH || "CBG001";
  await sheets.spreadsheets.values.append({
    spreadsheetId: registrySheetId,
    range: `Employees!A:${columnLetter(REGISTRY_HEADERS.Employees.length)}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        "EMP-001",
        "admin",
        "admin",
        hashPin(initPin),
        initName,
        "admin",
        initBranch,
        initBranch,
        "TRUE",
        "0",
        "",
        new Date().toISOString(),
        new Date().toISOString(),
        "",
      ]],
    },
  });
  await sheets.spreadsheets.values.append({
    spreadsheetId: registrySheetId,
    range: `Daftar_Cabang!A:${columnLetter(REGISTRY_HEADERS.Daftar_Cabang.length)}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[initBranch, initName, "", "", "pending", "TRUE", "Asia/Jakarta", new Date().toISOString(), new Date().toISOString()]],
    },
  });
  console.log("Seeded admin account: admin");
}

main().catch((err) => {
  console.error("Setup error:", err);
  process.exit(1);
});
