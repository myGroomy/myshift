import test from "node:test";
import assert from "node:assert/strict";
import {
  assertBridgeConfigured,
  bridgeCopyFile,
  bridgeUploadFile,
  BRIDGE_TIMEOUT_MS,
  type BridgeDeps,
} from "@/lib/google/drive-bridge";
import { isDomainError } from "@/lib/error-codes";

// The Apps Script bridge is a privileged public endpoint guarded only by a shared secret, and it is
// what stands between provisioning and the service account's zero Drive storage
// (PLAN/Db refactor-plan.md Step 0b). What must stay true: it is never called without a config, its
// failures surface as contract error codes (never a stack trace), and only *transient* failures are
// retried a definitive one is reported straight away.

const CONFIG = { url: "https://script.google.com/macros/s/ABC/exec", secret: "s3cret" };

function json(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function fakeFetch(handler: (call: { body: string; url: string; signal?: AbortSignal }) => Response | Promise<Response>) {
  const calls: Array<{ body: string; url: string; signal?: AbortSignal }> = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const call = { body: String(init.body ?? ""), url: String(url), signal: init.signal ?? undefined };
    calls.push(call);
    return handler(call);
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

const deps = (overrides: Partial<BridgeDeps> = {}): BridgeDeps => ({
  config: () => CONFIG,
  sleepImpl: async () => {},
  ...overrides,
});

test("assertBridgeConfigured throws SHEETS_SETUP_REQUIRED naming both env vars", () => {
  assert.throws(
    () => assertBridgeConfigured(null),
    (error: unknown) => {
      assert.ok(isDomainError(error));
      assert.equal(error.code, "SHEETS_SETUP_REQUIRED");
      assert.equal(error.status, 503);
      assert.match(error.message, /GAS_DRIVE_BRIDGE_URL/);
      assert.match(error.message, /GAS_BRIDGE_SECRET/);
      return true;
    },
  );
  assert.deepEqual(assertBridgeConfigured(CONFIG), CONFIG);
});

test("a successful copy returns the fileId and sends the shared secret with the request", async () => {
  const { fetchImpl, calls } = fakeFetch(() => json({ ok: true, fileId: "sheet-1", reused: false }));

  const result = await bridgeCopyFile(
    { templateSpreadsheetId: "template-1", folderId: "folder-1", name: "MYSHIFT CBG009" },
    deps({ fetchImpl }),
  );

  assert.deepEqual(result, { fileId: "sheet-1", reused: false });
  assert.equal(calls[0].url, CONFIG.url);
  const payload = JSON.parse(calls[0].body) as Record<string, unknown>;
  assert.equal(payload.secret, CONFIG.secret);
  assert.equal(payload.action, "copyFile");
  assert.equal(payload.folderId, "folder-1");
  assert.equal(payload.name, "MYSHIFT CBG009");
});

test("an upload is sent base64-encoded, never the raw buffer object", async () => {
  const { fetchImpl, calls } = fakeFetch(() => json({ ok: true, fileId: "photo-1" }));

  await bridgeUploadFile(
    {
      folderId: "folder-1",
      name: "SCH-20260929-001_CHK-001_20260929T010203Z.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("hello"),
    },
    deps({ fetchImpl }),
  );

  const payload = JSON.parse(calls[0].body) as Record<string, unknown>;
  assert.equal(payload.action, "uploadFile");
  assert.equal(payload.dataBase64, Buffer.from("hello").toString("base64"));
  assert.equal(payload.mimeType, "image/jpeg");
  assert.equal("buffer" in payload, false);
});

test("a wrong secret is reported as an actionable PROVISION_FAILED, without retrying", async () => {
  const { fetchImpl, calls } = fakeFetch(() => json({ ok: false, error: "UNAUTHORIZED" }));

  await assert.rejects(
    () => bridgeCopyFile({ templateSpreadsheetId: "t", folderId: "f", name: "n" }, deps({ fetchImpl })),
    (error: unknown) => {
      assert.ok(isDomainError(error));
      assert.equal(error.code, "PROVISION_FAILED");
      assert.equal(error.status, 502);
      assert.match(error.message, /MYSHIFT_BRIDGE_SECRET/);
      return true;
    },
  );
  assert.equal(calls.length, 1, "a 200 with ok:false is definitive do not retry it");
});

test("a transient 503 is retried once, then succeeds", async () => {
  let attempt = 0;
  const { fetchImpl, calls } = fakeFetch(() => {
    attempt += 1;
    return attempt === 1 ? json({ error: "backend error" }, 503) : json({ ok: true, fileId: "sheet-1" });
  });

  const result = await bridgeCopyFile(
    { templateSpreadsheetId: "t", folderId: "f", name: "n" },
    deps({ fetchImpl }),
  );
  assert.equal(result.fileId, "sheet-1");
  assert.equal(calls.length, 2);
});

test("a definitive 400 is not retried", async () => {
  const { fetchImpl, calls } = fakeFetch(() => json({ error: "bad request" }, 400));

  await assert.rejects(
    () => bridgeCopyFile({ templateSpreadsheetId: "t", folderId: "f", name: "n" }, deps({ fetchImpl })),
    (error: unknown) => {
      assert.ok(isDomainError(error));
      assert.equal(error.code, "PROVISION_FAILED");
      assert.match(error.message, /HTTP 400/);
      return true;
    },
  );
  assert.equal(calls.length, 1);
});

test("an unreachable bridge reports UNREACHABLE instead of throwing the raw fetch error", async () => {
  const { fetchImpl, calls } = fakeFetch(() => {
    throw new Error("fetch failed");
  });

  await assert.rejects(
    () => bridgeCopyFile({ templateSpreadsheetId: "t", folderId: "f", name: "n" }, deps({ fetchImpl })),
    (error: unknown) => {
      assert.ok(isDomainError(error));
      assert.equal(error.code, "PROVISION_FAILED");
      assert.match(error.message, /GAS_DRIVE_BRIDGE_URL/);
      return true;
    },
  );
  assert.equal(calls.length, 2, "a network failure gets the single retry");
});

test("a timeout aborts the request and is reported as a bridge failure", async () => {
  const { fetchImpl } = fakeFetch(
    (call) =>
      new Promise<Response>((_resolve, reject) => {
        call.signal?.addEventListener("abort", () => {
          const abortError = new Error("aborted");
          abortError.name = "AbortError";
          reject(abortError);
        });
      }),
  );

  await assert.rejects(
    () =>
      bridgeUploadFile(
        { folderId: "folder-1", name: "a.jpg", mimeType: "image/jpeg", buffer: Buffer.from("x") },
        deps({ fetchImpl, timeoutMs: 20 }),
      ),
    (error: unknown) => {
      assert.ok(isDomainError(error));
      assert.equal(error.code, "PROVISION_FAILED");
      assert.match(error.message, /timeout/);
      return true;
    },
  );
});

test("a non-JSON body (the classic HTML error page) fails with a sample of the body", async () => {
  const { fetchImpl } = fakeFetch(
    () => ({ ok: true, status: 200, text: async () => "<html>denied</html>" }) as unknown as Response,
  );

  await assert.rejects(
    () => bridgeCopyFile({ templateSpreadsheetId: "t", folderId: "f", name: "n" }, deps({ fetchImpl })),
    (error: unknown) => {
      assert.ok(isDomainError(error));
      assert.equal(error.code, "PROVISION_FAILED");
      assert.match((error.data as { detail?: string })?.detail ?? "", /<html>/);
      return true;
    },
  );
});

test("a success body without fileId is rejected instead of writing an empty ID to the Registry", async () => {
  const { fetchImpl } = fakeFetch(() => json({ ok: true }));

  await assert.rejects(
    () => bridgeCopyFile({ templateSpreadsheetId: "t", folderId: "f", name: "n" }, deps({ fetchImpl })),
    (error: unknown) => {
      assert.ok(isDomainError(error));
      assert.equal(error.code, "PROVISION_FAILED");
      return true;
    },
  );
});

test("the default timeout is bounded, so a hung bridge cannot eat the whole function budget", () => {
  assert.ok(BRIDGE_TIMEOUT_MS > 0 && BRIDGE_TIMEOUT_MS <= 60_000);
});
