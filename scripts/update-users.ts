import { config } from "dotenv";
import { hashPin } from "../lib/domain/pin";
import { sheets } from "../lib/google/client";

config({ path: ".env.local" });

const registryId = process.env.REGISTRY_SPREADSHEET_ID!;

// New user data: [no, username, pin, nama, role, cabang, aktif, created_at]
const newUsers: [string, string, string, string, string, string, string, string][] = [
  ["1", "dea", "778899", "Dea", "admin", "CBG01BDG, CBG02CMH", "TRUE", "8/26/2026 22:43:34"],
  ["2", "Candra", "808080", "Candra", "petugas", "CBG01BDG, CBG02CMH", "TRUE", "8/27/2026 22:43:34"],
  ["3", "Luthfia", "333777", "Luthfia", "petugas", "CBG01BDG, CBG02CMH", "TRUE", "8/28/2026 22:43:34"],
  ["4", "Nurul Hilma", "333888", "Nurul Hilma", "petugas", "CBG01BDG, CBG02CMH", "TRUE", "8/29/2026 22:43:34"],
  ["5", "Prita", "777222", "Prita", "petugas", "CBG01BDG, CBG02CMH", "TRUE", "8/30/2026 22:43:34"],
  ["6", "Rifah", "676767", "Rifah", "petugas", "CBG01BDG, CBG02CMH", "TRUE", "8/31/2026 22:43:34"],
  ["7", "Cabat", "100101", "Sabat", "petugas", "CBG01BDG, CBG02CMH", "TRUE", "9/1/2026 22:43:34"],
  ["8", "Alisha", "222666", "Alisha", "petugas", "CBG01BDG, CBG02CMH", "TRUE", "9/2/2026 22:43:34"],
  ["9", "Taufik", "565678", "Taufik Alwan", "petugas", "CBG01BDG, CBG02CMH", "TRUE", "9/3/2026 22:43:34"],
];

// Employee_ID format: EMP-### (3 digits, starting from 001)
function formatEmployeeId(index: number): string {
  return `EMP-${String(index + 1).padStart(3, "0")}`;
}

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

async function clearSheet(sheetName: string): Promise<void> {
  const rows = await getExistingRows(sheetName);
  if (rows.length <= 1) return; // Only header or empty

  // Delete all rows except header (row 1)
  const rowCount = rows.length - 1;
  await sheets.spreadsheets.values.clear({
    spreadsheetId: registryId,
    range: `${sheetName}!A2:Z${rows.length}`,
  });
  console.log(`  Cleared ${rowCount} rows from ${sheetName}`);
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

async function main() {
  console.log("=== MYSHIFT Update Users ===\n");

  // 1. Clear and update Employees
  console.log("1. Updating Employees...");
  await clearSheet("Employees");

  const employeeRows = newUsers.map((user, index) => {
    const [no, username, pin, nama, role, cabang, aktif, createdAt] = user;
    return [
      formatEmployeeId(index), // Employee_ID
      username,                // Username
      hashPin(pin),            // PIN_Hash (hashed with scrypt)
      nama,                    // Nama
      role,                    // Role
      cabang,                  // Cabang_Aktif
      cabang,                  // Cabang_Terafiliasi
      aktif,                   // Aktif
      "0",                     // Failed_Login_Attempts
      "",                      // Locked_Until
    ];
  });

  await appendRows("Employees", employeeRows);
  console.log(`  Created ${employeeRows.length} employees`);
  for (const row of employeeRows) {
    console.log(`    ${row[0]} ${row[1]} (${row[4]}) - ${row[5]}`);
  }

  // 2. Update Daftar_Cabang with new branch codes
  console.log("\n2. Updating Daftar_Cabang...");
  const existingBranches = await getExistingRows("Daftar_Cabang");
  console.log(`  Current branches: ${existingBranches.length - 1}`);

  // New branch data with updated codes
  const newBranches = [
    {
      id: "CBG01BDG",
      name: "Mochikin Cabang 1",
    },
    {
      id: "CBG02CMH",
      name: "Mochikin Cabang 2",
    },
  ];

  // Clear existing branches
  await clearSheet("Daftar_Cabang");

  // Add new branches (without spreadsheet provisioning for now)
  const branchRows = newBranches.map((b) => [
    b.id,                    // Cabang_ID
    b.name,                  // Nama_Cabang
    "",                      // Spreadsheet_ID (empty - needs provisioning)
    "",                      // Folder_Drive_ID (empty - needs provisioning)
    "pending",               // Provision_Status
    "TRUE",                  // Aktif
  ]);

  await appendRows("Daftar_Cabang", branchRows);
  console.log(`  Created ${branchRows.length} branches`);
  for (const row of branchRows) {
    console.log(`    ${row[0]} ${row[1]}`);
  }

  console.log("\n=== Update Complete ===");
  console.log(`  Employees: ${employeeRows.length} users`);
  console.log(`  Branches: ${branchRows.length} branches`);
  console.log("\nNote: Branch spreadsheet IDs are empty. Run provisioning to set up branch spreadsheets.");
}

main().catch((err) => {
  console.error("Update error:", err);
  process.exit(1);
});
