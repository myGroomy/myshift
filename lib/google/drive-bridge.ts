import { DomainError } from "@/lib/error-codes";

// Client for the Apps Script Drive bridge (gas/Code.js, gas/README.md).
//
// The service account has Drive `storageQuota.limit = 0`, so Drive refuses to let it *create* files
// (`Service Accounts do not have storage quota` PLAN/Db refactor-plan.md Step 0b). Everything else
// still works with the service account, including reading/writing the contents of spreadsheets it
// was granted access to. So exactly three operations go through the bridge template import,
// template copy, and photo upload all executed as the human who owns the Drive folder.
//
// Trust model: the bridge URL is a privileged public endpoint, guarded only by a shared secret.
// Therefore this client never sends anything the bridge could abuse (IDs come from the Registry, not
// from the request body), and the bridge itself only accepts destinations inside the MYSHIFT folder.

export const BRIDGE_TIMEOUT_MS = 25_000;

export type BridgeAction = "importFile" | "copyFile" | "uploadFile";

export type BridgeConfig = { url: string; secret: string };

export type BridgeDeps = {
  fetchImpl?: typeof fetch;
  config?: () => BridgeConfig | null;
  timeoutMs?: number;
  /** Injectable sleep so tests can assert retry behaviour without waiting 500 ms. */
  sleepImpl?: (ms: number) => Promise<void>;
};

function readConfig(): BridgeConfig | null {
  const url = (process.env.GAS_DRIVE_BRIDGE_URL ?? "").trim();
  const secret = (process.env.GAS_BRIDGE_SECRET ?? "").trim();
  if (!url || !secret) return null;
  return { url, secret };
}

export function bridgeConfig(): BridgeConfig | null {
  return readConfig();
}

export function bridgeConfigured(): boolean {
  return readConfig() !== null;
}

// Throws unless the bridge env is present. Callers run this *before* creating anything in Drive —
// making a folder first and then discovering there is no bridge would only produce an orphan.
export function assertBridgeConfigured(config: BridgeConfig | null = readConfig()): BridgeConfig {
  if (!config) {
    throw new DomainError(
      "SHEETS_SETUP_REQUIRED",
      "Drive bridge (Apps Script) belum dikonfigurasi. Isi GAS_DRIVE_BRIDGE_URL dan GAS_BRIDGE_SECRET lihat gas/README.md.",
    );
  }
  return config;
}

function requireConfig(deps: BridgeDeps): BridgeConfig {
  return assertBridgeConfigured((deps.config ?? readConfig)());
}

type BridgeResponse = { ok?: boolean; fileId?: string; reused?: boolean; error?: string; message?: string };

export type BridgeResult = { fileId: string; reused: boolean };

function asFileId(payload: BridgeResponse, action: BridgeAction): string {
  const fileId = String(payload.fileId ?? "").trim();
  if (!fileId) {
    throw new DomainError(
      "PROVISION_FAILED",
      `Drive bridge tidak mengembalikan fileId untuk ${action}.`,
      { data: { bridgeError: payload.error ?? "MISSING_FILE_ID" } },
    );
  }
  return fileId;
}

// Transient failures only: a 5xx from Apps Script (or a timeout) may mean the write never happened —
// which is exactly why the bridge is idempotent by name (it looks up the target folder by filename
// first), so retrying returns the same file instead of creating a second copy.
function isTransient(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function callBridge(
  action: BridgeAction,
  payload: Record<string, unknown>,
  deps: BridgeDeps,
): Promise<BridgeResult> {
  const config = requireConfig(deps);
  const fetchImpl = deps.fetchImpl ?? fetch;
  const sleep = deps.sleepImpl ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const timeoutMs = deps.timeoutMs ?? BRIDGE_TIMEOUT_MS;
  const body = JSON.stringify({ secret: config.secret, action, ...payload });

  let lastError = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(config.url, {
        method: "POST",
        // Apps Script answers a POST with a 302 to the response URL; the reply only survives because
        // fetch follows the redirect for us. JSON keeps the bridge's content-type check meaningful.
        redirect: "follow",
        headers: { "Content-Type": "application/json" },
        body,
        signal: controller.signal,
      });
      const text = await response.text();

      if (!response.ok && isTransient(response.status) && attempt === 1) {
        lastError = `HTTP ${response.status}`;
        await sleep(500);
        continue;
      }
      if (!response.ok) {
        throw new DomainError("PROVISION_FAILED", `Drive bridge menolak permintaan (HTTP ${response.status}).`, {
          data: { bridgeError: `HTTP_${response.status}`, detail: text.slice(0, 200) },
        });
      }

      let parsed: BridgeResponse;
      try {
        parsed = JSON.parse(text) as BridgeResponse;
      } catch {
        throw new DomainError("PROVISION_FAILED", "Drive bridge mengembalikan respons yang bukan JSON.", {
          data: { detail: text.slice(0, 200) },
        });
      }

      if (parsed.ok !== true) {
        // UNAUTHORIZED is a deployment mistake, not a user mistake say which one it is.
        const hint =
          parsed.error === "UNAUTHORIZED"
            ? "GAS_BRIDGE_SECRET berbeda dengan Script Property MYSHIFT_BRIDGE_SECRET."
            : (parsed.message ?? "Periksa log eksekusi Apps Script.");
        throw new DomainError("PROVISION_FAILED", `Drive bridge gagal (${parsed.error ?? "UNKNOWN"}): ${hint}`, {
          data: { bridgeError: parsed.error ?? "UNKNOWN" },
        });
      }

      return { fileId: asFileId(parsed, action), reused: parsed.reused === true };
    } catch (error) {
      if (error instanceof DomainError) throw error;
      const timedOut = (error as { name?: string })?.name === "AbortError";
      lastError = timedOut ? `timeout ${timeoutMs}ms` : ((error as Error)?.message ?? String(error));
      if (attempt === 1) {
        await sleep(500);
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw new DomainError(
    "PROVISION_FAILED",
    `Drive bridge tidak bisa dihubungi (${lastError}). Periksa GAS_DRIVE_BRIDGE_URL dan status deployment Apps Script.`,
    { data: { bridgeError: "UNREACHABLE" } },
  );
}

/** Converts the generated `.xlsx` template into a Google-native Sheet (setup step, idempotent by name). */
export async function bridgeImportFile(
  input: { sourceFileId: string; parentFolderId: string; name: string },
  deps: BridgeDeps = {},
): Promise<BridgeResult> {
  return callBridge("importFile", input, deps);
}

/** Copies the branch template into a branch folder. Idempotent by name. */
export async function bridgeCopyFile(
  input: { templateSpreadsheetId: string; folderId: string; name: string },
  deps: BridgeDeps = {},
): Promise<BridgeResult> {
  return callBridge("copyFile", input, deps);
}

/** Stores one checklist photo (already size/type validated by the caller) in a branch folder. */
export async function bridgeUploadFile(
  input: { folderId: string; name: string; mimeType: string; buffer: Buffer },
  deps: BridgeDeps = {},
): Promise<BridgeResult> {
  return callBridge(
    "uploadFile",
    {
      folderId: input.folderId,
      name: input.name,
      mimeType: input.mimeType,
      dataBase64: input.buffer.toString("base64"),
    },
    deps,
  );
}
