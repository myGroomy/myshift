import { config } from "dotenv";
import { EMPLOYEE_ROW_WIDTH, padRow, REGISTRY_SHEETS } from "../lib/google/sheet-schema";
import { getEmployeeRows } from "../lib/google/registry";
import { replaceRow } from "../lib/google/sheets-data";
import { normalizeEmployeeRole } from "../lib/domain/employee-role";

config({ path: ".env.local" });

async function main() {
  const registryId = process.env.REGISTRY_SPREADSHEET_ID;
  if (!registryId) throw new Error("REGISTRY_SPREADSHEET_ID wajib diisi");

  const rows = await getEmployeeRows();
  const changedRows = rows.filter((row) => row.values[4]?.trim() !== normalizeEmployeeRole(row.values[4] ?? ""));
  if (changedRows.length === 0) {
    console.log("Semua role Registry sudah memakai nilai kanonis admin/petugas.");
    return;
  }

  if (!process.argv.includes("--apply")) {
    console.log(`${changedRows.length} role Registry akan dinormalisasi menjadi admin/petugas.`);
    console.log("Jalankan ulang dengan --apply untuk menulis perubahan ke Registry.");
    return;
  }

  for (const row of changedRows) {
    const values = padRow(row.values, EMPLOYEE_ROW_WIDTH);
    values[4] = normalizeEmployeeRole(values[4] ?? "");
    await replaceRow(registryId, REGISTRY_SHEETS.employees, row.rowNumber, values);
  }
  console.log(`${changedRows.length} role Registry berhasil dinormalisasi.`);
}

main().catch((error) => {
  console.error("Migrasi role gagal:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
