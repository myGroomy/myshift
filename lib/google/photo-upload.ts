import { Readable } from "node:stream";
import { drive } from "@/lib/google/client";
import { DomainError } from "@/lib/error-codes";
import { nowIso } from "@/lib/domain/date";
import { DRIVE_NAME_MAX, driveSafeName } from "@/lib/google/provisioning";

// Checklist evidence photos (API-CONTRACT §8). Uploaded to the branch's own Drive folder, never to
// an arbitrary path — the folder comes from `Daftar_Cabang.Folder_Drive_ID`, so one branch can
// never write into another branch's folder.
//
// Everything the browser claims is re-checked here. The `accept` attribute on <input type=file> is
// a filter, not a control, and the multipart part's `Content-Type` is client-controlled (AGENTS.md
// §5: business rules are enforced on the backend).

export const CHECKLIST_PHOTO_FOLDER = "Checklist Foto";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// Whitelisted MIME -> extension. The extension is derived from this map and never from the
// client-supplied filename, so a `.svg` (which can carry script) can never be produced even if the
// part is declared `image/jpeg`.
export const PHOTO_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
} as const;

export type PhotoMime = keyof typeof PHOTO_EXTENSIONS;

export function photoExtensionFor(mimeType: string): string | null {
  const mime = mimeType.trim().toLowerCase().split(";")[0].trim();
  return mime in PHOTO_EXTENSIONS ? PHOTO_EXTENSIONS[mime as PhotoMime] : null;
}

// Returns the safe extension for an accepted upload, or throws. Pure, so both halves of the
// accept/deny decision are unit-testable without Drive.
export function assertUploadablePhoto(input: { type: string; size: number }): string {
  const ext = photoExtensionFor(input.type);
  if (!ext) {
    throw new DomainError(
      "UNSUPPORTED_FILE_TYPE",
      "Format foto tidak didukung. Gunakan JPEG, PNG, WEBP, atau HEIC.",
      { data: { allowed: Object.keys(PHOTO_EXTENSIONS) } },
    );
  }
  if (input.size <= 0) {
    throw new DomainError("VALIDATION_ERROR", "File foto kosong.");
  }
  if (input.size > MAX_PHOTO_BYTES) {
    throw new DomainError("FILE_TOO_LARGE", "Ukuran foto maksimal 5 MB.");
  }
  return ext;
}

// `<Schedule_ID>_<Item_ID>_<timestamp>.<ext>` per API-CONTRACT §8. The timestamp is compact UTC so
// the name sorts chronologically and never contains a character Drive rejects.
export function checklistPhotoFileName(
  scheduleId: string,
  itemId: string,
  ext: string,
  now: Date = new Date(),
): string {
  const stamp = nowIso(now).replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const safe = driveSafeName(`${scheduleId}_${itemId}_${stamp}.${ext}`).replace(/ /g, "_");
  // Truncate the stem, not the tail: a plain .slice() would cut the extension off a long
  // Schedule_ID and Drive would then serve the photo as an unknown binary type.
  const suffix = `.${ext}`;
  if (safe.length <= DRIVE_NAME_MAX) return safe;
  return `${safe.slice(0, DRIVE_NAME_MAX - suffix.length)}${suffix}`;
}

// What Checklist_Log.Foto_URL stores. The viewer URL renders the image in the browser, which is
// what the staff member checks to confirm the photo is the right one.
export function driveViewerUrl(fileId: string): string {
  return `https://drive.google.com/uc?id=${fileId}`;
}

// Finds the branch's photo folder, creating it on first use. Creating a folder per branch once is
// cheaper than probing Drive on every checklist tap, and the name is fixed so the lookup is exact.
export async function ensureChecklistPhotoFolder(folderId: string): Promise<string> {
  const listed = await drive.files.list({
    q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id,name)",
    supportsAllDrives: true,
    pageSize: 100,
  });
  const existing = listed.data.files?.find((f) => f.name === CHECKLIST_PHOTO_FOLDER);
  if (existing?.id) return existing.id;

  const created = await drive.files.create({
    supportsAllDrives: true,
    fields: "id",
    requestBody: {
      name: CHECKLIST_PHOTO_FOLDER,
      mimeType: "application/vnd.google-apps.folder",
      parents: [folderId],
    },
  });
  if (!created.data.id) {
    throw new DomainError("PROVISION_FAILED", "Google tidak mengembalikan ID folder foto.");
  }
  return created.data.id;
}

export async function uploadChecklistPhoto(input: {
  folderId: string;
  name: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<{ fileId: string; photoUrl: string }> {
  const created = await drive.files.create({
    supportsAllDrives: true,
    fields: "id",
    requestBody: { name: input.name, parents: [input.folderId], mimeType: input.mimeType },
    // gaxios builds the multipart body itself and calls .pipe() on it, so a raw Buffer throws
    // "part.body.pipe is not a function". A stream over the buffer is what it expects.
    media: { mimeType: input.mimeType, body: Readable.from(input.buffer) },
  });
  if (!created.data.id) {
    throw new DomainError("PROVISION_FAILED", "Google tidak mengembalikan ID file foto.");
  }
  return { fileId: created.data.id, photoUrl: driveViewerUrl(created.data.id) };
}

// Convenience for the route: the branch folder must already exist. A branch that was never
// provisioned has no folder, and photos must not fall back to a shared location.
export async function uploadChecklistEvidence(input: {
  branchFolderId: string;
  scheduleId: string;
  itemId: string;
  mimeType: string;
  buffer: Buffer;
  now?: Date;
}): Promise<{ fileId: string; photoUrl: string }> {
  if (!input.branchFolderId.trim()) {
    throw new DomainError(
      "PROVISION_FAILED",
      "Folder Drive cabang belum ada. Selesaikan provisioning cabang sebelum mengunggah foto.",
    );
  }
  const ext = assertUploadablePhoto({ type: input.mimeType, size: input.buffer.byteLength });
  const photoFolderId = await ensureChecklistPhotoFolder(input.branchFolderId);
  return uploadChecklistPhoto({
    folderId: photoFolderId,
    name: checklistPhotoFileName(input.scheduleId, input.itemId, ext, input.now),
    mimeType: input.mimeType.split(";")[0].trim().toLowerCase(),
    buffer: input.buffer,
  });
}
