import { google } from "googleapis";

// Lazy singleton — initialized on first use, not at module load.
// This prevents build-time crashes when env vars are not yet configured.
let _sheets: ReturnType<typeof google.sheets> | null = null;

function getSheets() {
  if (_sheets) return _sheets;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !privateKey) {
    throw new Error(
      "Google Sheets API not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY."
    );
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  _sheets = google.sheets({ version: "v4", auth });
  return _sheets;
}

export const sheets = new Proxy({} as ReturnType<typeof google.sheets>, {
  get(_target, prop) {
    return (getSheets() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
