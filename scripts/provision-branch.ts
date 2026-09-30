/**
 * Provisioning cabang yang barisnya sudah ada di `Daftar_Cabang` jalur yang sama dengan
 * `POST /api/branches/:id/retry-provision`, tanpa perlu HTTP + sesi admin.
 *
 * Dipakai untuk cabang yang tercatat `pending`/`failed`, terutama saat setup awal: cabang seperti
 * ini membuat semua endpoint per-cabang membalas 503 `SHEETS_SETUP_REQUIRED` (getBranch() menolak
 * cabang yang belum punya spreadsheet), jadi app tidak bisa dipakai sampai cabang di-provisioning.
 *
 *   pnpm provision:branch -- --id=CBG001
 *   pnpm provision:branch -- --list
 *   pnpm provision:branch -- --id=CBG001 --dry-run
 *
 * `--dry-run` hanya menampilkan status baris tanpa menyentuh Drive.
 */
import { config } from "dotenv";
import { getBranches } from "@/lib/google/registry";
import { maskSpreadsheetId } from "@/lib/google/sheet-schema";
import { provisionExistingBranch } from "@/lib/google/branch-provisioning";
import { isDomainError } from "@/lib/error-codes";

config({ path: ".env.local" });

function arg(name: string): string | undefined {
  const match = process.argv.slice(2).find((value) => value.startsWith(`--${name}=`));
  return match?.slice(name.length + 3)?.trim();
}

/** Flag tanpa nilai (`--list`, `--dry-run`) `arg()` hanya menangani pasangan `--nama=nilai`. */
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const branches = await getBranches();

  if (hasFlag("list")) {
    console.log("cabang di Daftar_Cabang:");
    for (const branch of branches) {
      console.log(
        `  ${branch.branchId}  ${branch.nama}  status=${branch.provisionStatus}  aktif=${branch.aktif}  ` +
          `spreadsheet=${branch.spreadsheetId ? maskSpreadsheetId(branch.spreadsheetId) : "(kosong)"}`,
      );
    }
    return;
  }

  const id = arg("id");
  if (!id) {
    console.error("Pakai --id=<Cabang_ID> (lihat daftar dengan --list), contoh: --id=CBG001");
    process.exitCode = 1;
    return;
  }

  const branch = branches.find((entry) => entry.branchId === id);
  if (!branch) {
    console.error(`Cabang ${id} tidak ada di Daftar_Cabang.`);
    process.exitCode = 1;
    return;
  }

  console.log(`${branch.branchId} ${branch.nama}`);
  console.log(`  status saat ini : ${branch.provisionStatus}`);
  console.log(`  spreadsheet     : ${branch.spreadsheetId || "(kosong)"}`);
  console.log(`  folder          : ${branch.folderId || "(kosong)"}`);

  if (hasFlag("dry-run")) {
    console.log("\n--dry-run: tidak ada yang diubah.");
    return;
  }
  if (branch.provisionStatus === "ready") {
    console.log("\nSudah ready tidak ada yang perlu diprovisioning.");
    return;
  }

  const result = await provisionExistingBranch(branch);
  console.log(
    `\nSelesai: ${result.branchId} -> ${result.status}  ` +
      `(spreadsheet ${maskSpreadsheetId(result.spreadsheetId)}, folder ${result.folderId})`,
  );
}

main().catch((error) => {
  if (isDomainError(error)) {
    console.error(`Gagal (${error.code}): ${error.message}`);
  } else {
    console.error(error instanceof Error ? error.message : error);
  }
  process.exitCode = 1;
});
