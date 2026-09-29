import test from "node:test";
import assert from "node:assert/strict";
import {
  applyBranchEdits,
  branchRowValues,
  parseAktif,
  parseProvisionStatus,
  type Branch,
} from "@/lib/google/registry";
import { BRANCH_ROW_WIDTH, columnLetter, REGISTRY_HEADERS } from "@/lib/google/sheet-schema";

const ready: Branch = {
  branchId: "CBG001",
  nama: "Mochikin Cabang Pusat",
  spreadsheetId: "1AbCdEfGhIjKlMnOpQrStUv",
  folderId: "1FolderIdForTheBranch",
  provisionStatus: "ready",
  aktif: true,
};

// Regression guard for the 6-column migration of Daftar_Cabang (SHEETS-SCHEMA §1). Before the
// migration the row was 4 wide: [Cabang_ID, Nama_Cabang, Spreadsheet_ID, Aktif]. Anything that
// still writes 4 elements puts TRUE into Folder_Drive_ID and leaves Aktif blank, which reads back
// as an inactive branch with no Drive folder — silent, and it only shows up on the next
// provisioning attempt. The assertions below pin both the width and the carry-over rule.

test("branchRowValues always writes 6 columns", () => {
  const row = branchRowValues(ready);
  assert.equal(row.length, BRANCH_ROW_WIDTH);
  assert.equal(row.length, REGISTRY_HEADERS.Daftar_Cabang.length);
  assert.equal(row.length, 6);
});

test("branchRowValues maps each column to its header, not to the old 4-wide order", () => {
  const row = branchRowValues(ready);
  assert.equal(row[REGISTRY_HEADERS.Daftar_Cabang.indexOf("Cabang_ID")], "CBG001");
  assert.equal(row[REGISTRY_HEADERS.Daftar_Cabang.indexOf("Nama_Cabang")], "Mochikin Cabang Pusat");
  assert.equal(row[REGISTRY_HEADERS.Daftar_Cabang.indexOf("Spreadsheet_ID")], "1AbCdEfGhIjKlMnOpQrStUv");
  assert.equal(row[REGISTRY_HEADERS.Daftar_Cabang.indexOf("Folder_Drive_ID")], "1FolderIdForTheBranch");
  assert.equal(row[REGISTRY_HEADERS.Daftar_Cabang.indexOf("Provision_Status")], "ready");
  assert.equal(row[REGISTRY_HEADERS.Daftar_Cabang.indexOf("Aktif")], "TRUE");
});

test("a 4-wide write would misread as an inactive branch with no Drive folder", () => {
  // The exact shape the pre-migration PATCH handler wrote.
  const legacyRow = ["CBG001", "Mochikin Cabang Pusat", "1AbCdEfGhIjKlMnOpQrStUv", "TRUE"];
  assert.equal(legacyRow.length, 4);

  // Read back positionally, exactly as toBranch() does for a 6-column sheet.
  assert.equal(parseAktif(legacyRow[3]), true, "TRUE sits where Folder_Drive_ID is expected");
  assert.equal(parseAktif(legacyRow[5] ?? ""), false, "Aktif is missing, so the branch reads inactive");
  assert.equal(parseProvisionStatus(legacyRow[4]), "pending", "Provision_Status is missing, so it reads pending");

  assert.notDeepEqual(legacyRow, branchRowValues(ready));
});

test("renaming a branch preserves the provisioning columns verbatim", () => {
  const edited = applyBranchEdits(ready, { nama: "Mochikin Pusat Baru" });
  const row = branchRowValues(edited);

  assert.equal(row[1], "Mochikin Pusat Baru");
  assert.equal(row[2], ready.spreadsheetId);
  assert.equal(row[3], ready.folderId);
  assert.equal(row[4], "ready");
  assert.equal(row[5], "TRUE");
});

test("deactivating a branch keeps the spreadsheet and folder wired up", () => {
  const edited = applyBranchEdits(ready, { aktif: false });
  const row = branchRowValues(edited);

  assert.equal(row[5], "FALSE");
  assert.equal(row[2], ready.spreadsheetId);
  assert.equal(row[3], ready.folderId);
  assert.equal(row[4], "ready", "re-enabling must not trigger reprovisioning");
});

test("applyBranchEdits with no edits is a no-op on every column", () => {
  assert.deepEqual(branchRowValues(applyBranchEdits(ready, {})), branchRowValues(ready));
});

test("an undefined edit value is treated as absent, not as a clear", () => {
  const edited = applyBranchEdits(ready, { nama: undefined, aktif: undefined });
  assert.deepEqual(edited, ready);
  assert.deepEqual(branchRowValues(edited), branchRowValues(ready));
});

test("a pending branch round-trips through edits without inventing Drive IDs", () => {
  const pending: Branch = {
    branchId: "CBG002",
    nama: "Mochikin Cabang Selatan",
    spreadsheetId: "",
    folderId: "",
    provisionStatus: "pending",
    aktif: true,
  };
  const row = branchRowValues(applyBranchEdits(pending, { nama: "Mochikin Selatan" }));

  assert.equal(row.length, BRANCH_ROW_WIDTH);
  assert.deepEqual(row, ["CBG002", "Mochikin Selatan", "", "", "pending", "TRUE"]);
});

test("branch rows are written across all 6 columns, not a shorter A:D range", () => {
  const range = `Daftar_Cabang!A:${columnLetter(BRANCH_ROW_WIDTH)}`;
  assert.equal(range, "Daftar_Cabang!A:F");
  assert.notEqual(range, "Daftar_Cabang!A:D");
});
