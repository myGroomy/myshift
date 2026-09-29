/**
 * MYSHIFT Drive Bridge — Apps Script Web App.
 *
 * WHY THIS EXISTS
 * The service account the Next.js app uses has Drive `storageQuota.limit = 0`, so Drive refuses to
 * let it create any file (`Service Accounts do not have storage quota`). Reading and *writing the
 * contents* of a spreadsheet it was granted access to still works, so the app keeps doing all
 * Sheets work with the service account. Only three file-creating operations need a quota-bearing
 * identity, and this script is that identity: it runs as the deploying user (`Execute as: Me`).
 *
 *   1. importFile  — convert the generated `.xlsx` into a Google-native Sheet (template setup)
 *   2. copyFile    — copy the template into a branch folder (branch provisioning)
 *   3. uploadFile  — store a checklist evidence photo in the branch folder
 *
 * DESIGN RULES
 * - This script is a *dumb executor*. Naming, validation, header verification, idempotency in the
 *   Registry and all business rules stay in the app, where they are covered by `pnpm test`. Do not
 *   move schema knowledge here — two sources of truth is how headers drift.
 * - Idempotent by name: if the target folder already contains a file with the requested name, that
 *   file is returned instead of creating a second one. This is what makes a retry after a timeout
 *   safe (see `PLAN/Db refactor-plan.md` Step 3.2).
 * - Blast radius is bounded by Script Properties: `MYSHIFT_PARENT_FOLDER_ID` is the only allowed
 *   destination, and every call is rejected unless the target folder sits inside it.
 * - Treat this endpoint as privileged and public (`Who has access: Anyone`): `MYSHIFT_BRIDGE_SECRET`
 *   (Script Property) is the only credential. Keep it in Script Properties, never in this code.
 *
 * SETUP: gas/SETUP-NEW-PROJECT.md (project baru) dan gas/README.md (-operated thereafter).
 */

/** Requests must be JSON smaller than this (photo bytes arrive base64-encoded, ~1.34x the file). */
var MAX_PAYLOAD_CHARS = 8 * 1024 * 1024;

/** How far up the folder tree `assertInsideParent` will walk before giving up. */
var MAX_ANCESTOR_HOPS = 10;

function doPost(e) {
  try {
    if (!e || !e.postData || String(e.postData.type || "").indexOf("application/json") === -1) {
      return json({ ok: false, error: "BAD_CONTENT_TYPE" });
    }
    var contents = e.postData.contents || "";
    if (contents.length > MAX_PAYLOAD_CHARS) {
      return json({ ok: false, error: "PAYLOAD_TOO_LARGE" });
    }

    var body = JSON.parse(contents);
    if (!constantTimeEquals(String(body.secret || ""), secret())) {
      return json({ ok: false, error: "UNAUTHORIZED" });
    }

    switch (body.action) {
      case "importFile":
        return json(importFile(body));
      case "copyFile":
        return json(copyFile(body));
      case "uploadFile":
        return json(uploadFile(body));
      default:
        return json({ ok: false, error: "UNKNOWN_ACTION" });
    }
  } catch (error) {
    // Never let a stack trace escape: the caller only needs a code and a short message.
    return json({
      ok: false,
      error: "BRIDGE_ERROR",
      message: String((error && error.message) || error).slice(0, 300),
    });
  }
}

/** No-op GET so a human opening the URL sees that the bridge is alive but not usable without a secret. */
function doGet() {
  return json({ ok: false, error: "USE_POST" });
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Consent helper. Run this once from the Apps Script editor (Run ▸ authCheck) whenever `oauthScopes`
 * changes — Apps Script invalidates the project's authorization on a scope change, and the web app
 * then answers HTTP 401 until the owner approves the new scopes in that consent screen. Keeping a
 * no-op function around means that recovery is a two-click operation instead of guesswork.
 *
 * It is deliberately not reachable from the web app: `doGet`/`doPost` never call it.
 */
function authCheck() {
  return "authorized: " + new Date().toISOString();
}

/**
 * Converts the `.xlsx` in Drive into a Google-native Sheet.
 *
 * Two dead ends are worth remembering, because both look reasonable and both fail:
 *   - `blob.setContentType("application/vnd.google-apps.spreadsheet")` + `folder.createFile(blob)`
 *     → "Invalid argument: file.contentType"
 *   - declaring the advanced Drive service in appsscript.json → the Apps Script API rejects the
 *     manifest field ("unknown fields: [advancedServices]"); it is IDE-only.
 * `files.copy` with a target `mimeType` is the real conversion path (what "Save as Google Sheets"
 * does), called over `UrlFetchApp` with the script's own OAuth token, so no extra service, no
 * manual IDE step, and the converted file is owned by the executing user.
 */
function importFile(body) {
  var parent = assertParentFolder(body.parentFolderId);
  var name = requireName(body.name);

  var existing = findByName(parent, name);
  if (existing) return { ok: true, fileId: existing, reused: true };

  // The source file must live inside the MYSHIFT folder too — same allowlist as every other write.
  var sourceId = requireInsideParent(body.sourceFileId, "sourceFileId");
  var response = UrlFetchApp.fetch(
    "https://www.googleapis.com/drive/v3/files/" + sourceId + "/copy",
    {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      payload: JSON.stringify({
        mimeType: GOOGLE_SHEET_MIME,
        name: name,
        parents: [parent.getId()],
      }),
      muteHttpExceptions: true,
    }
  );

  var code = response.getResponseCode();
  var text = String(response.getContentText() || "").slice(0, 300);
  if (code < 200 || code >= 300) {
    return { ok: false, error: "IMPORT_FAILED", message: "HTTP " + code + " " + text };
  }
  var created = JSON.parse(text);
  if (!created.id) return { ok: false, error: "IMPORT_FAILED", message: text };
  return { ok: true, fileId: created.id, reused: false };
}

/** Copies a Google-native Sheet from inside the MYSHIFT parent folder into a branch folder. */
function copyFile(body) {
  var templateId = requireInsideParent(body.templateSpreadsheetId, "templateSpreadsheetId");
  var folder = assertInsideParent(body.folderId, "folderId");
  var name = requireName(body.name);

  var existing = findByName(folder, name);
  if (existing) return { ok: true, fileId: existing, reused: true };

  var template = DriveApp.getFileById(templateId);
  var mime = template.getMimeType();
  if (mime !== "application/vnd.google-apps.spreadsheet") {
    return { ok: false, error: "TEMPLATE_NOT_A_SHEET", message: mime };
  }
  var copy = template.makeCopy(name, folder);
  return { ok: true, fileId: copy.getId(), reused: false };
}

/** Stores one binary file (checklist photo) in a folder inside the MYSHIFT parent folder. */
function uploadFile(body) {
  var folder = assertInsideParent(body.folderId, "folderId");
  var name = requireName(body.name);
  var mimeType = String(body.mimeType || "");
  var data = String(body.dataBase64 || "");
  if (!mimeType || !data) return { ok: false, error: "MISSING_FILE_DATA" };

  var existing = findByName(folder, name);
  if (existing) return { ok: true, fileId: existing, reused: true };

  var blob = Utilities.newBlob(Utilities.base64Decode(data), mimeType, name);
  var file = folder.createFile(blob);
  return { ok: true, fileId: file.getId(), reused: false };
}

// ---------------------------------------------------------------------------
// Guards + helpers
// ---------------------------------------------------------------------------

function scriptProperty(key) {
  var value = PropertiesService.getScriptProperties().getProperty(key);
  return String(value || "").trim();
}

function secret() {
  var value = scriptProperty("MYSHIFT_BRIDGE_SECRET");
  if (!value) throw new Error("MYSHIFT_BRIDGE_SECRET belum diisi di Script Properties");
  return value;
}

function parentFolderId() {
  var value = scriptProperty("MYSHIFT_PARENT_FOLDER_ID");
  if (!value) throw new Error("MYSHIFT_PARENT_FOLDER_ID belum diisi di Script Properties");
  return value;
}

function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function requireId(value, field) {
  var id = String(value || "").trim();
  if (!/^[A-Za-z0-9_-]{10,}$/.test(id)) throw new Error(field + " tidak valid");
  return id;
}

/** Drive caps names at 60 chars-ish and rejects a few characters; the app sanitizes, this is a backstop. */
function requireName(value) {
  var name = String(value || "").replace(/[/\\?*:<>|]/g, "-").trim().slice(0, 200);
  if (!name) throw new Error("name wajib diisi");
  return name;
}

function findByName(folder, name) {
  var files = folder.getFilesByName(name);
  if (files.hasNext()) return files.next().getId();
  return "";
}

/** Rejects any folder that is not the configured MYSHIFT folder itself. */
function assertParentFolder(value) {
  var id = requireId(value, "parentFolderId");
  var expected = parentFolderId();
  if (id !== expected) throw new Error("parentFolderId tidak diizinkan");
  return DriveApp.getFolderById(id);
}

/** Rejects any folder that is not the configured MYSHIFT folder or a (nested) descendant of it. */
function assertInsideParent(value, field) {
  var id = requireId(value, field);
  var expected = parentFolderId();
  if (id === expected) return DriveApp.getFolderById(id);

  var current = DriveApp.getFolderById(id);
  for (var hop = 0; hop <= MAX_ANCESTOR_HOPS; hop++) {
    var parents = current.getParents();
    if (!parents.hasNext()) break;
    current = parents.next();
    if (current.getId() === expected) return DriveApp.getFolderById(id);
  }
  throw new Error(field + " berada di luar folder MYSHIFT");
}

/** Same allowlist as assertInsideParent, but for files (the template lives in the MYSHIFT folder). */
function requireInsideParent(value, field) {
  var id = requireId(value, field);
  var expected = parentFolderId();

  var file = DriveApp.getFileById(id);
  var parents = file.getParents();
  if (parents.hasNext() && parents.next().getId() === expected) return id;
  throw new Error(field + " berada di luar folder MYSHIFT");
}

/**
 * Compares two strings without leaking where they differ through timing. Apps Script has no
 * timingSafeEqual, so the comparison walks every character of the longer string.
 */
function constantTimeEquals(a, b) {
  var length = Math.max(a.length, b.length);
  var diff = a.length === b.length ? 0 : 1;
  for (var i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
