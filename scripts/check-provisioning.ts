/**
 * Acceptance check (PLAN/Db refactor-plan.md Step 4) — menjalankan alur provisioning cabang
 * sungguhan terhadap infra live, lalu membersihkannya kembali. Melengkapi unit test
 * (`test/provisioning.test.ts`) yang hanya menguji logika dengan Drive/bridge palsu.
 *
 * Yang diperiksa: reserve baris `pending` → provisioning (folder + copy via bridge, ID ditulis
 * sebelum verifikasi) → verifikasi header salinan → `ready` → `getBranch()` resolve spreadsheet +
 * folder → salinan bisa dibuka admin manusia → retry saat `failed` reuse folder & salinan (tanpa
 * baris/salinan kedua) → unggah foto checklist lewat bridge → cabang `pending`/nonaktif ditolak
 * → cleanup (baris registry dihapus, folder cabang dibuang).
 *
 *   pnpm check:provisioning
 *
 * Exit code 0 = semua lolos. Semua data uji dibuat dan dihapus di dalam blok `finally`.
 */
import { config } from "dotenv";
import { appendRow, deleteRowById, readRows, replaceRow } from "@/lib/google/sheets-data";
import { BRANCH_ROW_WIDTH, REGISTRY_SHEETS, padRow, registrySheetRange } from "@/lib/google/sheet-schema";
import { drive } from "@/lib/google/client";
import { provisionBranchDrive } from "@/lib/google/provisioning";
import { branchSpreadsheet } from "@/lib/google/branch-data";
import { driveViewerUrl, uploadChecklistEvidence } from "@/lib/google/photo-upload";
import { verifyBranchSpreadsheet } from "@/lib/google/template-verify";
import { ID_PREFIX, nextSequentialId } from "@/lib/ids";
import { isDomainError } from "@/lib/error-codes";

config({ path: ".env.local" });

const RANGE = registrySheetRange(REGISTRY_SHEETS.branches);
const TEST_NAME = "MYSHIFT Uji Acceptance";

// 1x1 PNG — yang divalidasi backend hanya MIME + ukuran, jadi ini cukup realistis.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

let rowWritten = false;
let branchId = "";
let folderId = "";

function pass(name: string, detail = "") {
  console.log(`  OK    ${name}${detail ? `: ${detail}` : ""}`);
}

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: dapat ${String(actual)}, harap ${String(expected)}`);
  }
}

async function expectRejection(id: string, code: string, status: number) {
  try {
    await branchSpreadsheet(id);
  } catch (error) {
    if (!isDomainError(error) || error.code !== code || error.status !== status) {
      throw new Error(
        `penolakan untuk ${id} salah: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  }
  throw new Error(`getBranch(${id}) seharusnya ditolak dengan ${code}`);
}

async function main() {
  const registryId = process.env.REGISTRY_SPREADSHEET_ID!;
  const existing = await readRows(registryId, RANGE);
  const usedIds = existing.map((row) => (row.values[0] ?? "").trim()).filter(Boolean);
  branchId = nextSequentialId(usedIds, ID_PREFIX.branch);
  const rowNumber = existing.length + 2;
  console.log(`Cabang uji: ${branchId} (${TEST_NAME})\n`);

  const writeRow = async (spreadsheetId: string, status: string, aktif = true) => {
    await replaceRow(
      registryId,
      REGISTRY_SHEETS.branches,
      rowNumber,
      padRow([branchId, TEST_NAME, spreadsheetId, folderId, status, aktif ? "TRUE" : "FALSE"], BRANCH_ROW_WIDTH),
    );
  };

  try {
    // 1. Reserve baris dengan `pending` — urutan yang sama dengan POST /api/branches, supaya ID
    //    cabang tidak hilang kalau Drive gagal di tengah jalan.
    await appendRow(registryId, RANGE, [branchId, TEST_NAME, "", "", "pending", "TRUE"]);
    rowWritten = true;
    pass("baris registry di-reserve", `${branchId} pending (baris ${rowNumber})`);

    // 2. Provisioning: folder -> copy lewat bridge -> ID ditulis ke baris sebelum verifikasi.
    const provisioned = await provisionBranchDrive(branchId, TEST_NAME, {
      onDriveObject: async (ids) => {
        folderId = ids.folderId || folderId;
        await writeRow(ids.spreadsheetId, "pending");
      },
    });
    folderId = provisioned.folderId;
    pass("provisioning lewat bridge", `folder=${folderId} sheet=${provisioned.spreadsheetId}`);

    // 3. Header salinan — provisioning sudah menolak sendiri kalau tidak sesuai; diulang di sini
    //    sebagai bukti eksplisit.
    const diffs = await verifyBranchSpreadsheet(provisioned.spreadsheetId);
    if (diffs.length > 0) throw new Error(`header salinan tidak sesuai: ${JSON.stringify(diffs)}`);
    pass("header salinan sesuai SHEETS-SCHEMA §2", "9 sheet, urutan kolom sama");

    // 4. Tandai ready, lalu lookup cabang harus resolve spreadsheet + folder.
    await writeRow(provisioned.spreadsheetId, "ready");
    const lookup = await branchSpreadsheet(branchId);
    assertEqual(lookup.spreadsheetId, provisioned.spreadsheetId, "getBranch() mengembalikan spreadsheet yang sama");
    assertEqual(lookup.folderId, folderId, "getBranch() mengembalikan folder yang sama");
    assertEqual(lookup.status, "ready", "status hasil lookup");
    pass("getBranch() resolve spreadsheet + folder", lookup.status);

    // 5. Salinan harus bisa dibuka/diedit admin manusia (PRD): permission diwarisi dari folder induk.
    const perms = await drive.permissions.list({
      fileId: provisioned.spreadsheetId,
      fields: "permissions(type,role,emailAddress)",
      supportsAllDrives: true,
    });
    const humans = (perms.data.permissions ?? []).filter((entry) => entry.type === "user");
    if (humans.length === 0) throw new Error("salinan tidak mewarisi akses user manusia");
    pass("salinan bisa dibuka admin manusia", humans.map((entry) => `${entry.emailAddress}=${entry.role}`).join(", "));

    // 6. Retry saat `failed`: folder & salinan dipakai ulang, tidak ada baris atau salinan kedua.
    await writeRow(provisioned.spreadsheetId, "failed");
    const retry = await provisionBranchDrive(branchId, TEST_NAME, {
      existingFolderId: folderId,
      existingSpreadsheetId: provisioned.spreadsheetId,
    });
    assertEqual(retry.spreadsheetId, provisioned.spreadsheetId, "retry memakai salinan yang sama");
    assertEqual(retry.reusedSpreadsheet, true, "retry menandai salinan sebagai reuse");
    const rowsAfterRetry = await readRows(registryId, RANGE);
    assertEqual(
      rowsAfterRetry.filter((row) => (row.values[0] ?? "").trim() === branchId).length,
      1,
      "jumlah baris registry untuk cabang uji",
    );
    await writeRow(provisioned.spreadsheetId, "ready");
    pass("retry idempoten", "folder + salinan reuse, tanpa baris kedua");

    // 7. Unggah foto checklist lewat bridge, hasilnya disimpan sebagai Foto_URL.
    const photo = await uploadChecklistEvidence({
      branchFolderId: folderId,
      scheduleId: "SCH-20260929-000",
      itemId: "CHK-001",
      mimeType: "image/png",
      buffer: TINY_PNG,
    });
    assertEqual(photo.photoUrl, driveViewerUrl(photo.fileId), "Foto_URL harus URL viewer Drive");
    // Foto tidak ditaruh langsung di folder cabang, tapi di subfolder `Checklist Foto` — jadi
    // yang diperiksa adalah rantainya, bukan parent pertama.
    const stored = await drive.files.get({ fileId: photo.fileId, fields: "id,name,parents", supportsAllDrives: true });
    const photoFolderId = stored.data.parents?.[0] ?? "";
    const photoFolder = await drive.files.get({ fileId: photoFolderId, fields: "id,name,parents", supportsAllDrives: true });
    assertEqual(photoFolder.data.name, "Checklist Foto", "nama subfolder foto");
    if (!photoFolder.data.parents?.includes(folderId)) {
      throw new Error(`subfolder foto bukan anak dari folder cabang: ${JSON.stringify(photoFolder.data.parents)}`);
    }
    pass("foto checklist masuk folder cabang", `${stored.data.name} → Checklist Foto/ di dalam folder cabang`);

    // 8. Cabang `pending` dan nonaktif harus ditolak, bukan dipakai diam-diam.
    await writeRow(provisioned.spreadsheetId, "pending");
    await expectRejection(branchId, "SHEETS_SETUP_REQUIRED", 503);
    await writeRow(provisioned.spreadsheetId, "ready", false);
    await expectRejection(branchId, "NOT_FOUND", 404);
    await writeRow(provisioned.spreadsheetId, "ready");
    pass("getBranch() menolak pending & nonaktif", "503 / 404");

    console.log("\nACCEPTANCE PASSED");
  } finally {
    console.log("\nCleanup:");
    if (rowWritten) {
      try {
        const deleted = await deleteRowById(registryId, REGISTRY_SHEETS.branches, RANGE, branchId);
        console.log(`  ${deleted ? "OK   " : "WARN "} baris registry ${branchId} dihapus`);
      } catch (error) {
        console.log(`  FAIL hapus baris: ${error instanceof Error ? error.message : error}`);
      }
    }
    if (folderId) {
      try {
        await drive.files.delete({ fileId: folderId, supportsAllDrives: true });
        console.log(`  OK    folder ${folderId} dibuang (isi folder ikut ke trash)`);
      } catch (error) {
        console.log(`  FAIL hapus folder: ${error instanceof Error ? error.message : error}`);
      }
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

