import test from "node:test";
import assert from "node:assert/strict";
import { provisionBranchDrive, type DriveFilesApi, type ProvisionDeps } from "@/lib/google/provisioning";
import { DomainError, isDomainError } from "@/lib/error-codes";

// PLAN/Db refactor-plan.md Step 3.2 provisioning is exercised against a fake Drive so the
// behaviour that matters (idempotent retry, verification before `ready`, orphan reporting) is
// pinned without a network call. Step 0b showed the real service account currently has zero Drive
// storage, so this suite is the only way to test the flow today (see the Step 0b note in that doc).

type Call = { op: "get" | "create" | "copy"; fileId?: string; name?: string; parents?: string[] };

function fakeDrive(options: {
  existing?: string[];
  folderId?: string;
  copyId?: string;
  fail?: "create" | "copy" | "no-id";
}) {
  const calls: Call[] = [];
  const existing = new Set(options.existing ?? []);

  const api = {
    files: {
      get: async ({ fileId }: { fileId: string }) => {
        calls.push({ op: "get", fileId });
        if (!existing.has(fileId)) throw Object.assign(new Error("File not found"), { code: 404 });
        return { data: { id: fileId } };
      },
      create: async ({ requestBody }: { requestBody?: { name?: string; parents?: string[] } }) => {
        calls.push({ op: "create", name: requestBody?.name, parents: requestBody?.parents });
        if (options.fail === "create") {
          throw Object.assign(new Error("Service Accounts do not have storage quota."), { code: 403 });
        }
        return { data: { id: options.fail === "no-id" ? undefined : (options.folderId ?? "folder-new") } };
      },
    },
    // The template copy goes through the Apps Script bridge in production (the service account
    // cannot create files), so the fake carries a bridge stand-in on the same object same call
    // shape, same failure mode, wired up by depsOver() below.
    copyTemplate: async (input: { templateSpreadsheetId: string; folderId: string; name: string }) => {
      calls.push({ op: "copy", fileId: input.templateSpreadsheetId, name: input.name, parents: [input.folderId] });
      if (options.fail === "copy") {
        throw Object.assign(new Error("Service Accounts do not have storage quota."), { code: 403 });
      }
      return options.copyId ?? "sheet-new";
    },
  } as unknown as DriveFilesApi;

  return { api, calls, ops: () => calls.map((call) => call.op) };
}

const TEMPLATE = { templateSpreadsheetId: "template-sheet", parentFolderId: "parent-folder" };


test("a new branch becomes a folder plus a copy, with the copy ID recorded before verification", async () => {
  const drive = fakeDrive({ folderId: "folder-1", copyId: "sheet-1" });
  const events: string[] = [];

  const result = await provisionBranchDrive(
    "CBG009",
    "Mochikin Cabang Uji",
    { onDriveObject: async (ids) => void events.push(`report:${ids.folderId}:${ids.spreadsheetId}`) },
    depsOver({ drive: drive.api, verify: async (id) => void events.push(`verify:${id}`) }),
  );

  assert.deepEqual(result, { spreadsheetId: "sheet-1", folderId: "folder-1", reusedSpreadsheet: false });
  assert.deepEqual(events, ["report:folder-1:", "report:folder-1:sheet-1", "verify:sheet-1"]);
  assert.equal(drive.calls.filter((call) => call.op === "copy").length, 1);
  assert.equal(drive.calls.find((call) => call.op === "create")?.name, "Mochikin Cabang Uji (CBG009)");
  assert.deepEqual(drive.calls.find((call) => call.op === "copy")?.parents, ["folder-1"]);
  assert.equal(drive.calls.find((call) => call.op === "copy")?.fileId, "template-sheet");
});

test("an existing branch folder is reused, so earlier checklist photos survive a retry", async () => {
  const drive = fakeDrive({ existing: ["folder-1"], copyId: "sheet-1" });

  const result = await provisionBranchDrive(
    "CBG009",
    "Mochikin Cabang Uji",
    { existingFolderId: "folder-1" },
    depsOver({ drive: drive.api }),
  );

  assert.equal(result.folderId, "folder-1");
  assert.equal(drive.ops().includes("create"), false, "no second folder for the same branch");
  assert.deepEqual(drive.calls.find((call) => call.op === "copy")?.parents, ["folder-1"]);
});

test("a folder that was deleted in Drive is recreated instead of failing", async () => {
  const drive = fakeDrive({ folderId: "folder-2", copyId: "sheet-1" });

  const result = await provisionBranchDrive(
    "CBG009",
    "Mochikin Cabang Uji",
    { existingFolderId: "folder-gone" },
    depsOver({ drive: drive.api }),
  );

  assert.equal(result.folderId, "folder-2");
  assert.equal(drive.ops().filter((op) => op === "create").length, 1);
});

test("retry reuses a copy that still exists and matches the schema no second copy", async () => {
  const drive = fakeDrive({ existing: ["folder-1", "sheet-old"] });
  const verified: string[] = [];

  const result = await provisionBranchDrive(
    "CBG009",
    "Mochikin Cabang Uji",
    { existingFolderId: "folder-1", existingSpreadsheetId: "sheet-old" },
    depsOver({ drive: drive.api, verify: async (id) => void verified.push(id) }),
  );

  assert.deepEqual(result, { spreadsheetId: "sheet-old", folderId: "folder-1", reusedSpreadsheet: true });
  assert.deepEqual(verified, ["sheet-old"], "verified exactly once");
  assert.equal(drive.ops().includes("copy"), false);
});

test("retry replaces a copy whose headers no longer match the schema", async () => {
  const drive = fakeDrive({ existing: ["folder-1", "sheet-old"], copyId: "sheet-new" });
  let attempts = 0;

  const result = await provisionBranchDrive(
    "CBG009",
    "Mochikin Cabang Uji",
    { existingFolderId: "folder-1", existingSpreadsheetId: "sheet-old" },
    depsOver({
      drive: drive.api,
      verify: async (id) => {
        attempts += 1;
        if (id === "sheet-old") throw new DomainError("SHEETS_SETUP_REQUIRED", "header beda");
      },
    }),
  );

  assert.equal(attempts, 2, "the old copy failed verification, the new one passed");
  assert.deepEqual(result, { spreadsheetId: "sheet-new", folderId: "folder-1", reusedSpreadsheet: false });
  assert.equal(drive.ops().filter((op) => op === "copy").length, 1);
});

test("retry copies again when the recorded spreadsheet was deleted from Drive", async () => {
  const drive = fakeDrive({ existing: ["folder-1"], copyId: "sheet-new" });

  const result = await provisionBranchDrive(
    "CBG009",
    "Mochikin Cabang Uji",
    { existingFolderId: "folder-1", existingSpreadsheetId: "sheet-gone" },
    depsOver({ drive: drive.api }),
  );

  assert.equal(result.spreadsheetId, "sheet-new");
  assert.equal(result.reusedSpreadsheet, false);
});


test("a Drive refusal surfaces as PROVISION_FAILED with the folder it already made", async () => {
  const drive = fakeDrive({ folderId: "folder-1", fail: "copy" });

  await assert.rejects(
    () => provisionBranchDrive("CBG009", "Mochikin Cabang Uji", {}, depsOver({ drive: drive.api })),
    (error: unknown) => {
      assert.ok(isDomainError(error));
      assert.equal(error.code, "PROVISION_FAILED");
      assert.equal(error.status, 502);
      assert.deepEqual((error.data as { orphans: string[] }).orphans, ["folder-1"]);
      return true;
    },
  );
});

test("a folder Drive refuses to create is reported, and no copy is attempted", async () => {
  const drive = fakeDrive({ fail: "create" });

  await assert.rejects(
    () => provisionBranchDrive("CBG009", "Mochikin Cabang Uji", {}, depsOver({ drive: drive.api })),
    (error: unknown) => {
      assert.ok(isDomainError(error));
      assert.equal(error.code, "PROVISION_FAILED");
      return true;
    },
  );

  assert.equal(drive.ops().includes("copy"), false, "never copies without a folder");
});

test("template drift blocks `ready` and reports the Drive objects left behind", async () => {
  const drive = fakeDrive({ folderId: "folder-1", copyId: "sheet-1" });

  await assert.rejects(
    () =>
      provisionBranchDrive(
        "CBG009",
        "Mochikin Cabang Uji",
        {},
        depsOver({
          drive: drive.api,
          verify: async () => {
            throw new DomainError("SHEETS_SETUP_REQUIRED", "header Checklist_Log berbeda");
          },
        }),
      ),
    (error: unknown) => {
      assert.ok(isDomainError(error));
      assert.equal(error.code, "SHEETS_SETUP_REQUIRED", "the template is what needs fixing");
      assert.deepEqual((error.data as { orphans: string[] }).orphans, ["folder-1", "sheet-1"]);
      return true;
    },
  );
});

test("an unconfigured TEMPLATES sheet fails before any Drive write", async () => {
  const drive = fakeDrive({});

  await assert.rejects(
    () =>
      provisionBranchDrive("CBG009", "Mochikin Cabang Uji", {}, {
        drive: drive.api,
        templateConfig: async () => {
          throw new DomainError("SHEETS_SETUP_REQUIRED", "TEMPLATES kosong");
        },
      }),
    (error: unknown) => {
      assert.ok(isDomainError(error));
      assert.equal(error.code, "SHEETS_SETUP_REQUIRED");
      return true;
    },
  );

  assert.deepEqual(drive.calls, [], "no folder or copy may be created without a template");
});

function depsOver(overrides: ProvisionDeps = {}): ProvisionDeps {
  // `fakeDrive` hangs `copyTemplate` on the object the test passes as `drive`, so one property
  // wires up both halves (service-account folder ops + the bridge copy). Explicit
  // `copyTemplate: undefined` still wins, which is how the "bridge not configured" test runs.
  const bound = (overrides.drive as unknown as { copyTemplate?: ProvisionDeps["copyTemplate"] })
    ?.copyTemplate;
  const copyTemplate = "copyTemplate" in overrides ? overrides.copyTemplate : bound;
  return { templateConfig: async () => TEMPLATE, verify: async () => {}, ...overrides, copyTemplate };
}

test("an unconfigured Drive bridge fails before anything is created in Drive", async () => {
  // Provisioning copies through gas/Code.js. Without GAS_DRIVE_BRIDGE_URL / GAS_BRIDGE_SECRET the
  // flow must stop *before* making the folder otherwise every failed provisioning would leave an
  // empty branch folder behind.
  const drive = fakeDrive({ folderId: "folder-1", copyId: "sheet-1" });

  await assert.rejects(
    () => provisionBranchDrive("CBG009", "Mochikin Cabang Uji", {}, depsOver({ drive: drive.api, copyTemplate: undefined })),
    (error: unknown) => {
      assert.ok(isDomainError(error));
      assert.equal(error.code, "SHEETS_SETUP_REQUIRED");
      assert.match(error.message, /GAS_DRIVE_BRIDGE_URL/);
      return true;
    },
  );

  assert.deepEqual(drive.calls, [], "no folder and no copy may happen without a bridge");
});
