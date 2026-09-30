import { config } from "dotenv";
import { EMPLOYEE_ROW_WIDTH, padRow, REGISTRY_SHEETS } from "../lib/google/sheet-schema";
import { getEmployeeRows } from "../lib/google/registry";
import { replaceRow } from "../lib/google/sheets-data";

config({ path: ".env.local" });

async function main() {
  const registryId = process.env.REGISTRY_SPREADSHEET_ID;
  if (!registryId) throw new Error("REGISTRY_SPREADSHEET_ID wajib diisi");

  const legacyRows = (await getEmployeeRows()).filter((row) => row.values[4]?.trim() === "kepala_cabang");
  if (legacyRows.length === 0) {
    console.log("Tidak ada akun kepala_cabang yang perlu dimigrasikan.");
    return;
  }

  if (!process.argv.includes("--apply")) {
    console.log(`${legacyRows.length} akun kepala_cabang akan diubah menjadi karyawan.`);
    console.log("Jalankan ulang dengan --apply untuk menulis perubahan ke Registry.");
    return;
  }

  for (const row of legacyRows) {
    const values = padRow(row.values, EMPLOYEE_ROW_WIDTH);
    values[4] = "karyawan";
    await replaceRow(registryId, REGISTRY_SHEETS.employees, row.rowNumber, values);
  }
  console.log(`${legacyRows.length} akun berhasil dimigrasikan menjadi karyawan.`);
}

main().catch((error) => {
  console.error("Migrasi role gagal:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
