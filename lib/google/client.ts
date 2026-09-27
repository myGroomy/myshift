import { google } from "googleapis";

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, "\n");

// Singleton JWT — token is cached and auto-refreshed within the same warm instance.
// This avoids re-negotiating OAuth2 on every request (saves 200–400 ms per cold call).
const auth = new google.auth.JWT({
  email,
  key: privateKey,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

export const sheets = google.sheets({ version: "v4", auth });
