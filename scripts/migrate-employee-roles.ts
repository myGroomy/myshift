import { config } from "dotenv";
import { employeeColumnIndex, getEmployeeRows, replaceEmployeeRow } from "../lib/google/registry";
import { normalizeEmployeeRole } from "../lib/domain/employee-role";

config({ path: ".env.local" });

async function main() {
  const registryId = process.env.REGISTRY_SPREADSHEET_ID;
  if (!registryId) throw new Error("REGISTRY_SPREADSHEET_ID wajib diisi");

  const rows = await getEmployeeRows();
  const roleIndex = rows[0] ? employeeColumnIndex(rows[0].headers, "Role") : -1;
  const changedRows = rows.filter(
    (row) => roleIndex >= 0 && row.values[roleIndex]?.trim() !== normalizeEmployeeRole(row.values[roleIndex] ?? ""),
  );
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
    await replaceEmployeeRow(row, {
      Role: normalizeEmployeeRole(row.values[roleIndex] ?? ""),
      Updated_At: new Date().toISOString(),
    });
  }
  console.log(`${changedRows.length} role Registry berhasil dinormalisasi.`);
}

main().catch((error) => {
  console.error("Migrasi role gagal:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
