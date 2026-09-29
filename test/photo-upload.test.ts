import assert from "node:assert/strict";
import test from "node:test";

import { DomainError } from "../lib/error-codes";
import {
  assertUploadablePhoto,
  checklistPhotoFileName,
  driveViewerUrl,
  MAX_PHOTO_BYTES,
  photoExtensionFor,
  uploadChecklistEvidence,
} from "../lib/google/photo-upload";
import { branchFolderName, DRIVE_NAME_MAX } from "../lib/google/provisioning";

function expectDomainError(run: () => unknown, code: string, status: number) {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof DomainError, `expected DomainError, got ${String(error)}`);
    assert.equal(error.code, code);
    assert.equal(error.status, status);
    return true;
  });
}

// The `accept` attribute on <input type=file> is a filter, not a control, and the multipart part's
// Content-Type is client-supplied. These lock down the backend side of that boundary.
test("photoExtensionFor accepts exactly the four contract MIME types", () => {
  assert.equal(photoExtensionFor("image/jpeg"), "jpg");
  assert.equal(photoExtensionFor("image/png"), "png");
  assert.equal(photoExtensionFor("image/webp"), "webp");
  assert.equal(photoExtensionFor("image/heic"), "heic");
});

test("photoExtensionFor normalizes case and MIME parameters", () => {
  assert.equal(photoExtensionFor("IMAGE/JPEG"), "jpg");
  assert.equal(photoExtensionFor("image/png; charset=binary"), "png");
  assert.equal(photoExtensionFor("  image/webp  "), "webp");
});

test("photoExtensionFor rejects anything outside the whitelist, including SVG", () => {
  for (const mime of ["image/svg+xml", "application/pdf", "text/html", "image/gif", "", "image/jpg"]) {
    assert.equal(photoExtensionFor(mime), null, `${mime} must not be accepted`);
  }
});

test("assertUploadablePhoto returns the safe extension on an accepted upload", () => {
  assert.equal(assertUploadablePhoto({ type: "image/jpeg", size: 1024 }), "jpg");
  assert.equal(assertUploadablePhoto({ type: "image/png", size: MAX_PHOTO_BYTES }), "png");
});

test("assertUploadablePhoto rejects a disallowed type with 415", () => {
  expectDomainError(
    () => assertUploadablePhoto({ type: "image/svg+xml", size: 1024 }),
    "UNSUPPORTED_FILE_TYPE",
    415,
  );
});

test("assertUploadablePhoto rejects an empty file with 400", () => {
  expectDomainError(() => assertUploadablePhoto({ type: "image/jpeg", size: 0 }), "VALIDATION_ERROR", 400);
});

test("assertUploadablePhoto rejects one byte over 5 MB with 413", () => {
  assert.equal(MAX_PHOTO_BYTES, 5 * 1024 * 1024);
  expectDomainError(
    () => assertUploadablePhoto({ type: "image/jpeg", size: MAX_PHOTO_BYTES + 1 }),
    "FILE_TOO_LARGE",
    413,
  );
});

test("assertUploadablePhoto checks the type before the size, so a big SVG is a 415", () => {
  expectDomainError(
    () => assertUploadablePhoto({ type: "image/svg+xml", size: MAX_PHOTO_BYTES + 1 }),
    "UNSUPPORTED_FILE_TYPE",
    415,
  );
});

test("checklistPhotoFileName follows <Schedule_ID>_<Item_ID>_<timestamp>.<ext>", () => {
  const name = checklistPhotoFileName("SCH-20260929-001", "CHK-01", "jpg", new Date("2026-09-29T03:45:07.123Z"));
  assert.equal(name, "SCH-20260929-001_CHK-01_20260929T034507Z.jpg");
});

test("checklistPhotoFileName never emits a character Drive rejects or exceeds the cap", () => {
  const name = checklistPhotoFileName("SCH/2026:09:29", "CHK 01", "png", new Date("2026-09-29T03:45:07.123Z"));
  assert.ok(!/[/?*:<>|]/.test(name), `illegal Drive character in ${name}`);
  assert.ok(name.length <= DRIVE_NAME_MAX, `${name} is ${name.length} chars`);

  const long = checklistPhotoFileName("S".repeat(80), "C".repeat(80), "webp");
  assert.ok(long.length <= DRIVE_NAME_MAX);
  // Truncation must not eat the extension — the whitelist maps MIME to ext, not the client's name.
  assert.ok(long.endsWith(".webp"), `truncated name lost its extension: ${long}`);
});

test("driveViewerUrl is the uc?id= form Checklist_Log.Foto_URL stores", () => {
  assert.equal(driveViewerUrl("1Ab_cD2"), "https://drive.google.com/uc?id=1Ab_cD2");
});

test("branchFolderName keeps the branch ID suffix and the 60-char cap", () => {
  assert.equal(branchFolderName("CBG001", "Mochikin Cabang Pusat"), "Mochikin Cabang Pusat (CBG001)");
  const long = branchFolderName("CBG999", "N".repeat(200));
  assert.equal(long.length, DRIVE_NAME_MAX);
  assert.ok(!/[/?*:<>|]/.test(branchFolderName("CBG001", "A/B:C*D?E<F>G|H")));
});

// The evidence flow is: validate (size/MIME) → find-or-create the photo folder (service account,
// folders cost no quota) → upload the bytes through the Apps Script bridge (the service account
// cannot create files — PLAN/Db refactor-plan.md Step 0b). Both collaborator calls are injected so
// the ordering and the payload are pinned without touching Drive.
test("uploadChecklistEvidence validates, resolves the photo folder, then uploads through the bridge", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const now = new Date("2026-09-29T01:02:03.000Z");

  const result = await uploadChecklistEvidence(
    {
      branchFolderId: "folder-1",
      scheduleId: "SCH-20260929-001",
      itemId: "CHK-001",
      mimeType: "image/jpeg",
      buffer: Buffer.from("bytes"),
      now,
    },
    {
      photoFolder: async (folderId) => {
        calls.push({ photoFolder: folderId });
        return "photo-folder-1";
      },
      upload: async (input) => {
        calls.push({ ...input, buffer: undefined });
        return { fileId: "photo-1" };
      },
    },
  );

  assert.deepEqual(result, { fileId: "photo-1", photoUrl: "https://drive.google.com/uc?id=photo-1" });
  assert.deepEqual(calls[0], { photoFolder: "folder-1" }, "folder lookup runs against the branch folder");
  assert.equal(calls[1].folderId, "photo-folder-1");
  assert.equal(calls[1].mimeType, "image/jpeg");
  assert.equal(calls[1].name, "SCH-20260929-001_CHK-001_20260929T010203Z.jpg");
});

test("an oversized photo is rejected before any Drive call", async () => {
  let touched = false;
  await assert.rejects(
    () =>
      uploadChecklistEvidence(
        {
          branchFolderId: "folder-1",
          scheduleId: "SCH-1",
          itemId: "CHK-1",
          mimeType: "image/jpeg",
          buffer: Buffer.alloc(MAX_PHOTO_BYTES + 1),
        },
        {
          photoFolder: async () => ((touched = true), "photo-folder-1"),
          upload: async () => ((touched = true), { fileId: "photo-1" }),
        },
      ),
    (error: unknown) => {
      expectDomainError(() => {
        throw error;
      }, "FILE_TOO_LARGE", 413);
      return true;
    },
  );
  assert.equal(touched, false, "validation must happen before anything reaches Drive");
});

test("a branch without a Drive folder is rejected instead of falling back to a shared location", async () => {
  let touched = false;
  await assert.rejects(
    () =>
      uploadChecklistEvidence(
        {
          branchFolderId: "  ",
          scheduleId: "SCH-1",
          itemId: "CHK-1",
          mimeType: "image/jpeg",
          buffer: Buffer.from("x"),
        },
        { photoFolder: async () => ((touched = true), "photo-folder-1") },
      ),
    (error: unknown) => {
      expectDomainError(() => {
        throw error;
      }, "PROVISION_FAILED", 502);
      return true;
    },
  );
  assert.equal(touched, false);
});

