import { google } from "googleapis";

// Lazy singletons — initialized on first use, not at module load.
// This prevents build-time crashes when env vars are not yet configured.
// (Connection objects only: no *data* is cached at module level, per AGENTS.md §5.)
const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
];

let _auth: InstanceType<typeof google.auth.JWT> | null = null;
let _sheets: ReturnType<typeof google.sheets> | null = null;
let _drive: ReturnType<typeof google.drive> | null = null;

function getAuth() {
  if (_auth) return _auth;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !privateKey) {
    throw new Error(
      "Google Sheets API not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY."
    );
  }

  _auth = new google.auth.JWT({
    email,
    key: privateKey.replace(/\\n/g, "\n"),
    scopes: SCOPES,
  });
  return _auth;
}

export const sheets = new Proxy({} as ReturnType<typeof google.sheets>, {
  get(_target, prop) {
    if (!_sheets) _sheets = google.sheets({ version: "v4", auth: getAuth() });
    return (_sheets as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Drive is only used for branch provisioning (copy the template into the branch's own folder).
export const drive = new Proxy({} as ReturnType<typeof google.drive>, {
  get(_target, prop) {
    if (!_drive) _drive = google.drive({ version: "v3", auth: getAuth() });
    return (_drive as unknown as Record<string | symbol, unknown>)[prop];
  },
});
