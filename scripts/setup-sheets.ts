import { config } from "dotenv";
import { google } from "googleapis";
import { hashPin } from "../lib/auth";

config({ path: ".env.local" });

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, "\n");

const auth = new google.auth.JWT({ email, key: privateKey, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });

const sheets = google.sheets({ version: "v4", auth });

async function main() {
  const registryId = process.env.REGISTRY_SPREADSHEET_ID || process.env.MYSHIFT_SHEET_ID;

  if (registryId) {
    console.log("Using existing registry spreadsheet:", registryId);
    await ensureRegistrySheets(registryId);
    await seedAdminIfRequested(registryId, process.env.TEMPLATE_SPREADSHEET_ID || "");
    console.log(`REGISTRY_SPREADSHEET_ID=${registryId}`);
    return;
  }

  // 1. Create Registry spreadsheet
  const registry = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: "MYSHIFT Registry" },
      sheets: [
        { properties: { title: "Daftar_Cabang" } },
        { properties: { title: "Employees" } },
        { properties: { title: "Settings_Global" } },
      ],
    },
  });
  const registrySheetId = registry.data.spreadsheetId;
  if (!registrySheetId) throw new Error("Google did not return a registry spreadsheet ID");
  console.log("Registry spreadsheet created:", registrySheetId);

  // 2. Write headers
  // Daftar_Cabang headers
  await sheets.spreadsheets.values.update({
    spreadsheetId: registrySheetId,
    range: "Daftar_Cabang!A1:D1",
    valueInputOption: "RAW",
    requestBody: {
      values: [["Cabang_ID", "Nama_Cabang", "Spreadsheet_ID", "Aktif"]],
    },
  });
  // Employees headers
  await sheets.spreadsheets.values.update({
    spreadsheetId: registrySheetId,
    range: "Employees!A1:J1",
    valueInputOption: "RAW",
    requestBody: {
      values: [
        ["Employee_ID", "Username", "PIN_Hash", "Nama", "Role", "Cabang_Aktif", "Cabang_Terafiliasi", "Aktif", "Failed_Login_Attempts", "Locked_Until"],
      ],
    },
  });
  // Settings_Global headers
  await sheets.spreadsheets.values.update({
    spreadsheetId: registrySheetId,
    range: "Settings_Global!A1:B1",
    valueInputOption: "RAW",
    requestBody: { values: [["KEY", "VALUE"]] },
  });

  // 3. Create Template Cabang spreadsheet
  const template = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: "MYSHIFT Template Cabang" },
      sheets: [
        { properties: { title: "Shifts" } },
        { properties: { title: "Schedules" } },
        { properties: { title: "Shift_Swaps" } },
        { properties: { title: "Izin" } },
        { properties: { title: "Kategori_Izin" } },
        { properties: { title: "Checklist_Template" } },
        { properties: { title: "Checklist_Log" } },
        { properties: { title: "Handover_Template" } },
        { properties: { title: "Handover_Log" } },
      ],
    },
  });
  const templateSheetId = template.data.spreadsheetId;
  if (!templateSheetId) throw new Error("Google did not return a template spreadsheet ID");
  console.log("Template spreadsheet created:", templateSheetId);

  // Write headers for each sheet in template
  const sheetHeaders: Record<string, string[][]> = {
    Shifts: [["Shift_ID", "Cabang_ID", "Tanggal", "Shift_Mulai", "Shift_Selesai", "Keterangan"]],
    Schedules: [["Schedule_ID", "Employee_ID", "Shift_ID", "Hari", "Status"]],
    Shift_Swaps: [["Swap_ID", "Employee_ID_1", "Employee_ID_2", "Tanggal", "Status"]],
    Izin: [["Izin_ID", "Employee_ID", "Mulai", "Selesai", "Kategori", "Status"]],
    Kategori_Izin: [["Kategori_ID", "Nama_Kategori", "Deskripsi"]],
    Checklist_Template: [["Checklist_ID", "Nama", "Uraian", "Golongan"]],
    Checklist_Log: [["Log_ID", "Checklist_ID", "Employee_ID", "Tanggal", "Status", "Catatan"]],
    Handover_Template: [["Handover_ID", "Dari_Employee", "Ke_Employee", "Tanggal", "Isi"]],
    Handover_Log: [["Log_ID", "Handover_ID", "Dari_Employee", "Ke_Employee", "Tanggal", "Isi_Diterima", "Status"]],
  };

  for (const [sheetName, headerRows] of Object.entries(sheetHeaders)) {
    for (let r = 0; r < headerRows.length; r++) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: templateSheetId,
        range: `${sheetName}!A${r + 1}`,
        valueInputOption: "RAW",
        requestBody: { values: [headerRows[r]] },
      });
    }
  }

  // 4. Optional seed admin if MYSHIFT_INIT_PIN is set
  const initPin = process.env.MYSHIFT_INIT_PIN;
  const initName = process.env.MYSHIFT_INIT_NAME || "Admin Pusat";
  const initBranch = process.env.MYSHIFT_INIT_BRANCH || "CBG001";

  if (initPin) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: registrySheetId,
      range: "Employees!A:J",
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

  // 5. Output IDs for .env.local
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
    requests.push({ updateSheetProperties: { properties: { sheetId: firstSheet.sheetId, title: "Daftar_Cabang" }, fields: "title" } });
    names.delete("Sheet1");
    names.add("Daftar_Cabang");
  }
  for (const title of ["Daftar_Cabang", "Employees", "Settings_Global"]) {
    if (!names.has(title)) requests.push({ addSheet: { properties: { title } } });
  }
  if (requests.length) await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });

  await sheets.spreadsheets.values.update({ spreadsheetId, range: "Daftar_Cabang!A1:D1", valueInputOption: "RAW", requestBody: { values: [["Cabang_ID", "Nama_Cabang", "Spreadsheet_ID", "Aktif"]] } });
  await sheets.spreadsheets.values.update({ spreadsheetId, range: "Employees!A1:J1", valueInputOption: "RAW", requestBody: { values: [["Employee_ID", "Username", "PIN_Hash", "Nama", "Role", "Cabang_Aktif", "Cabang_Terafiliasi", "Aktif", "Failed_Login_Attempts", "Locked_Until"]] } });
  await sheets.spreadsheets.values.update({ spreadsheetId, range: "Settings_Global!A1:B1", valueInputOption: "RAW", requestBody: { values: [["KEY", "VALUE"]] } });
}

async function seedAdminIfRequested(registrySheetId: string, templateSheetId: string) {
  const initPin = process.env.MYSHIFT_INIT_PIN;
  if (!initPin) return;
  const initName = process.env.MYSHIFT_INIT_NAME || "Admin Pusat";
  const initBranch = process.env.MYSHIFT_INIT_BRANCH || "CBG001";
  await sheets.spreadsheets.values.append({
    spreadsheetId: registrySheetId,
    range: "Employees!A:J",
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
