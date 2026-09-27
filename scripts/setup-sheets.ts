import { config } from "dotenv";
import { google } from "googleapis";
import { hashPin } from "../lib/domain/pin";
// Column layout comes from the same module the app uses, so onboarding can no longer write
// headers that disagree with PLAN/SHEETS-SCHEMA.md (audit H-4).
import {
  BRANCH_HEADERS,
  BRANCH_SHEET_NAMES,
  REGISTRY_HEADERS,
  REGISTRY_SHEET_NAMES,
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
    await seedAdminIfRequested(registryId, process.env.TEMPLATE_SPREADSHEET_ID || "");
    console.log(`REGISTRY_SPREADSHEET_ID=${registryId}`);
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

  // 3. Template spreadsheet for new branches
  const template = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: "MYSHIFT Template Cabang" },
      sheets: BRANCH_SHEET_NAMES.map((title) => ({ properties: { title } })),
    },
  });
  const templateSheetId = template.data.spreadsheetId;
  if (!templateSheetId) throw new Error("Google did not return a template spreadsheet ID");
  console.log("Template spreadsheet created:", templateSheetId);
  await writeHeaders(templateSheetId, BRANCH_HEADERS);

  // 4. Optional seed admin if MYSHIFT_INIT_PIN is set
  const initPin = process.env.MYSHIFT_INIT_PIN;
  const initName = process.env.MYSHIFT_INIT_NAME || "Admin Pusat";
  const initBranch = process.env.MYSHIFT_INIT_BRANCH || "CBG001";

  if (initPin) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: registrySheetId,
      range: `Employees!A:J`,
      valueInputOption: "RAW",
      requestBody: { values: [["EMP-001", "admin", hashPin(initPin), initName, "admin", initBranch, initBranch, "TRUE", "0", ""]] },
    });
    await sheets.spreadsheets.values.append({
      spreadsheetId: registrySheetId,
      range: "Daftar_Cabang!A:D",
      valueInputOption: "RAW",
      requestBody: { values: [[initBranch, initName, templateSheetId, "TRUE"]] },
    });
    console.log("Seeded admin account: admin");
  }

  console.log("\n=== Setup Complete ===");
  console.log("Registry Spreadsheet ID:", registrySheetId);
  console.log("Template Spreadsheet ID:", templateSheetId);
  console.log("\nAdd these to myshift/.env.local:");
  console.log(`REGISTRY_SPREADSHEET_ID=${registrySheetId}`);
  console.log(`TEMPLATE_SPREADSHEET_ID=${templateSheetId}`);
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

  await writeHeaders(spreadsheetId, REGISTRY_HEADERS);
}

async function seedAdminIfRequested(registrySheetId: string, templateSheetId: string) {
  const initPin = process.env.MYSHIFT_INIT_PIN;
  if (!initPin) return;
  const initName = process.env.MYSHIFT_INIT_NAME || "Admin Pusat";
  const initBranch = process.env.MYSHIFT_INIT_BRANCH || "CBG001";
  await sheets.spreadsheets.values.append({
    spreadsheetId: registrySheetId,
    range: `Employees!A:J`,
    valueInputOption: "RAW",
    requestBody: { values: [["EMP-001", "admin", hashPin(initPin), initName, "admin", initBranch, initBranch, "TRUE", "0", ""]] },
  });
  await sheets.spreadsheets.values.append({
    spreadsheetId: registrySheetId,
    range: "Daftar_Cabang!A:D",
    valueInputOption: "RAW",
    requestBody: { values: [[initBranch, initName, templateSheetId, "TRUE"]] },
  });
  console.log("Seeded admin account: admin");
}

main().catch((err) => {
  console.error("Setup error:", err);
  process.exit(1);
});
