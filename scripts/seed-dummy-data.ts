import { config } from "dotenv";
import { google } from "googleapis";
import { isValidPin } from "../lib/domain/pin";
import { hashPin } from "../lib/domain/pin";
// Headers come from the shared schema module so seeded branches match SHEETS-SCHEMA.md.
import { BRANCH_HEADERS, headerRange } from "../lib/google/sheet-schema";

config({ path: ".env.local" });

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, "\n");

const auth = new google.auth.JWT({ email, key: privateKey, scopes: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"] });
const sheets = google.sheets({ version: "v4", auth });

const registryId = process.env.REGISTRY_SPREADSHEET_ID!;
const folderId = process.env.MYSHIFT_FOLDER;

async function getExistingRows(sheetName: string): Promise<string[][]> {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: registryId,
      range: `${sheetName}!A:Z`,
    });
    return res.data.values || [];
  } catch {
    return [];
  }
}

async function appendRows(sheetName: string, rows: string[][]): Promise<void> {
  if (rows.length === 0) return;
  await sheets.spreadsheets.values.append({
    spreadsheetId: registryId,
    range: `${sheetName}!A:Z`,
    valueInputOption: "RAW",
    requestBody: { values: rows },
  });
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log("=== MYSHIFT Dummy Data Seed ===\n");

  console.log("1. Seeding branches...");
  const existingBranches = await getExistingRows("Daftar_Cabang");
  const existingBranchIds = new Set(existingBranches.slice(1).map((r) => r[0]));

  const branches = [
    { id: "CBG001", name: "Mochikin Cabang Pusat" },
    { id: "CBG002", name: "Mochikin Cabang Selatan" },
    { id: "CBG003", name: "Mochikin Cabang Timur" },
  ];

  const newBranches = branches.filter((b) => !existingBranchIds.has(b.id));
  if (newBranches.length > 0) {
    for (const branch of newBranches) {
      const branchSs = await sheets.spreadsheets.create({
        requestBody: {
          properties: { title: `MYSHIFT ${branch.name}` },
          sheets: [
            { properties: { title: "Schedules" } },
            { properties: { title: "Shifts" } },
            { properties: { title: "Kategori_Izin" } },
            { properties: { title: "Izin" } },
            { properties: { title: "Checklist" } },
            { properties: { title: "Checklist_Templates" } },
            { properties: { title: "Handover" } },
            { properties: { title: "Handover_Templates" } },
            { properties: { title: "Absen" } },
          ],
        },
        fields: "spreadsheetId",
      });
      const branchSsId = branchSs.data.spreadsheetId;
      if (!branchSsId) throw new Error(`Failed to create spreadsheet for ${branch.id}`);

      for (const [sheetName, headers] of Object.entries(BRANCH_HEADERS)) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: branchSsId,
          range: headerRange(sheetName, headers.length),
          valueInputOption: "RAW",
          requestBody: { values: [[...headers]] },
        });
      }

      const shiftRows = [
        ["SFT-001", "Opening", "07:00", "15:00"],
        ["SFT-002", "Middle", "12:00", "20:00"],
        ["SFT-003", "Closing", "18:00", "22:00"],
      ];
      await sheets.spreadsheets.values.append({
        spreadsheetId: branchSsId,
        range: "Shifts!A:D",
        valueInputOption: "RAW",
        requestBody: { values: shiftRows },
      });

      const izinRows = [
        ["KTG-001", "Sakit", "TRUE"],
        ["KTG-002", "Cuti", "TRUE"],
        ["KTG-003", "Keperluan Pribadi", "TRUE"],
        ["KTG-004", "Ibadah", "TRUE"],
      ];
      await sheets.spreadsheets.values.append({
        spreadsheetId: branchSsId,
        range: "Kategori_Izin!A:C",
        valueInputOption: "RAW",
        requestBody: { values: izinRows },
      });

      const checklistRows = [
        ["CHK-001", "opening", "Nyalakan mesin kopi", "FALSE", "1", "TRUE"],
        ["CHK-002", "opening", "Cek stok bahan baku", "TRUE", "2", "TRUE"],
        ["CHK-003", "opening", "Bersihkan area kasir", "FALSE", "3", "TRUE"],
        ["CHK-004", "opening", "Nyalakan lampu dan AC", "FALSE", "4", "TRUE"],
        ["CHK-005", "closing", "Hitung kasir dan catat omzet", "TRUE", "1", "TRUE"],
        ["CHK-006", "closing", "Bersihkan area dapur", "TRUE", "2", "TRUE"],
        ["CHK-007", "closing", "Matikan semua peralatan", "FALSE", "3", "TRUE"],
        ["CHK-008", "closing", "Kunci pintu dan alarm", "FALSE", "4", "TRUE"],
      ];
      await sheets.spreadsheets.values.append({
        spreadsheetId: branchSsId,
        range: "Checklist_Template!A:F",
        valueInputOption: "RAW",
        requestBody: { values: checklistRows },
      });

      const handoverRows = [
        ["HOF-001", "Kondisi Kasir", "TRUE", "1"],
        ["HOF-002", "Stok Bahan Baku", "TRUE", "2"],
        ["HOF-003", "Peralatan Rusak", "FALSE", "3"],
        ["HOF-004", "Catatan Khusus", "FALSE", "4"],
      ];
      await sheets.spreadsheets.values.append({
        spreadsheetId: branchSsId,
        range: "Handover_Template!A:D",
        valueInputOption: "RAW",
        requestBody: { values: handoverRows },
      });

      await appendRows("Daftar_Cabang", [[branch.id, branch.name, branchSsId, "TRUE"]]);
      console.log(`  Created ${branch.id} (${branch.name}) with spreadsheet ${branchSsId}`);
    }
  } else {
    console.log("  All branches already exist, skipping");
  }

  const seedPin = process.env.MYSHIFT_SEED_PIN;
  if (!isValidPin(seedPin)) {
    throw new Error("MYSHIFT_SEED_PIN (4-8 digit) wajib diisi untuk seeding data dummy");
  }

  console.log("\n2. Seeding employees...");
  const existingEmployees = await getExistingRows("Employees");
  const existingUsernames = new Set(existingEmployees.slice(1).map((r) => r[1]));

  const employees = [
    { id: "EMP-002", username: "budi", name: "Budi Santoso", role: "kepala_cabang", branch: "CBG001" },
    { id: "EMP-003", username: "siti", name: "Siti Rahayu", role: "karyawan", branch: "CBG001" },
    { id: "EMP-004", username: "agus", name: "Agus Wijaya", role: "karyawan", branch: "CBG001" },
    { id: "EMP-005", username: "dewi", name: "Dewi Lestari", role: "kepala_cabang", branch: "CBG002" },
    { id: "EMP-006", username: "rudi", name: "Rudi Hartono", role: "karyawan", branch: "CBG002" },
    { id: "EMP-007", username: "nina", name: "Nina Putri", role: "karyawan", branch: "CBG002" },
    { id: "EMP-008", username: "joko", name: "Joko Prasetyo", role: "kepala_cabang", branch: "CBG003" },
    { id: "EMP-009", username: "maya", name: "Maya Sari", role: "karyawan", branch: "CBG003" },
    { id: "EMP-010", username: "bambang", name: "Bambang Sutrisno", role: "karyawan", branch: "CBG003" },
  ];

  const newEmployees = employees.filter((e) => !existingUsernames.has(e.username));
  if (newEmployees.length > 0) {
    const employeeRows = newEmployees.map((e) => [
      e.id,
      e.username,
      hashPin(seedPin),
      e.name,
      e.role,
      e.branch,
      e.branch,
      "TRUE",
      "0",
      "",
    ]);
    await appendRows("Employees", employeeRows);
    console.log(`  Created ${newEmployees.length} employees`);
    for (const e of newEmployees) {
      console.log(`    ${e.id} ${e.username} (${e.role}) - ${e.branch}`);
    }
  } else {
    console.log("  All employees already exist, skipping");
  }

  console.log("\n3. Seeding schedules for current week...");

  const allBranches = await getExistingRows("Daftar_Cabang");
  const branchData = allBranches.slice(1).map((r) => ({
    id: r[0],
    name: r[1],
    spreadsheetId: r[2],
  }));

  const allEmployees = await getExistingRows("Employees");
  const employeeData = allEmployees.slice(1).map((r) => ({
    id: r[0],
    username: r[1],
    name: r[3],
    role: r[4],
    branch: r[5],
  }));

  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek + 1);

  let scheduleCount = 0;
  let swapCount = 0;
  let izinCount = 0;

  for (const branch of branchData) {
    if (!branch.spreadsheetId) continue;

    let existingSchedules: string[][] = [];
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: branch.spreadsheetId,
        range: "Schedules!A:G",
      });
      existingSchedules = res.data.values || [];
    } catch {
      // Sheet might not exist yet
    }

    if (existingSchedules.length > 1) {
      console.log(`  ${branch.id}: schedules already exist, skipping`);
      continue;
    }

    const branchEmployees = employeeData.filter((e) => e.branch === branch.id);
    if (branchEmployees.length === 0) continue;

    let shifts: string[][] = [];
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: branch.spreadsheetId,
        range: "Shifts!A:D",
      });
      shifts = res.data.values || [];
    } catch {
      continue;
    }
    const shiftIds = shifts.slice(1).map((s) => s[0]);

    const scheduleRows: string[][] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + d);
      const dateStr = formatDate(date);

      const dailyEmployees = branchEmployees.slice(0, Math.min(3, branchEmployees.length));
      for (let i = 0; i < dailyEmployees.length; i++) {
        const emp = dailyEmployees[i];
        const shiftId = shiftIds[i % shiftIds.length];
        const scheduleId = `SCH-${dateStr.replace(/-/g, "")}-${String(i + 1).padStart(3, "0")}`;
        scheduleRows.push([scheduleId, emp.id, shiftId, dateStr, "scheduled", "", "myshift"]);
        scheduleCount++;
      }
    }

    if (scheduleRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: branch.spreadsheetId,
        range: "Schedules!A:G",
        valueInputOption: "RAW",
        requestBody: { values: scheduleRows },
      });
      console.log(`  ${branch.id}: created ${scheduleRows.length} schedules`);
    }

    if (scheduleRows.length >= 2) {
      const swapRows = [
        [
          "SWP-001",
          scheduleRows[0][0],
          scheduleRows[0][1],
          scheduleRows[1][1],
          "Tukar shift karena keperluan keluarga",
          "pending",
          "",
          "",
        ],
      ];
      await sheets.spreadsheets.values.append({
        spreadsheetId: branch.spreadsheetId,
        range: "Shift_Swaps!A:H",
        valueInputOption: "RAW",
        requestBody: { values: swapRows },
      });
      swapCount++;
      console.log(`  ${branch.id}: created 1 swap request`);
    }

    if (scheduleRows.length > 0) {
      const izinRows = [
        [
          "IZN-001",
          scheduleRows[0][1],
          scheduleRows[0][0],
          "KTG-001",
          "Demam, perlu istirahat",
          "pending",
          "",
          "",
        ],
      ];
      await sheets.spreadsheets.values.append({
        spreadsheetId: branch.spreadsheetId,
        range: "Izin!A:H",
        valueInputOption: "RAW",
        requestBody: { values: izinRows },
      });
      izinCount++;
      console.log(`  ${branch.id}: created 1 izin request`);
    }
  }

  console.log("\n=== Seed Complete ===");
  console.log(`  Branches: ${newBranches.length} new`);
  console.log(`  Employees: ${newEmployees.length} new`);
  console.log(`  Schedules: ${scheduleCount} created`);
  console.log(`  Swap requests: ${swapCount}`);
  console.log(`  Izin requests: ${izinCount}`);
  // Never print PINs: AGENTS.md §5 forbids plaintext PINs in code or logs.
  console.log("\nSeeded accounts (PIN = value of MYSHIFT_SEED_PIN):");
  console.log("  admin (Admin Pusat)");
  for (const e of newEmployees) {
    console.log(`  ${e.username} (${e.name})`);
  }
}

main().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
