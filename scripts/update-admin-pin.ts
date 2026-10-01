import { config } from 'dotenv';
config({ path: '.env.local' });

import { isValidPin } from '../lib/domain/pin';

const EMPLOYEES_RANGE = 'Employees!A:Z';

// Dev/recovery utility: set a PIN without printing it (or its hash) to the terminal.
async function main() {
  const pin = process.argv[2] ?? process.env.MYSHIFT_NEW_PIN ?? '';
  if (!isValidPin(pin)) {
    throw new Error('Usage: tsx scripts/update-admin-pin.ts <4-8 digit PIN> (or set MYSHIFT_NEW_PIN)');
  }

  const { sheets } = await import('../lib/google/client');
  const { hashPin } = await import('../lib/domain/pin');
  const { columnLetter } = await import('../lib/google/sheet-schema');

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.REGISTRY_SPREADSHEET_ID!,
    range: EMPLOYEES_RANGE,
  });
  const rows = res.data.values || [];
  const header = rows[0] ?? [];
  const pinColumn = header.indexOf('PIN_Hash');
  const employeeIdCol = header.indexOf('Employee_ID');
  if (pinColumn < 0 || employeeIdCol < 0 || rows.length < 2) {
    throw new Error('Employees harus memiliki header PIN_Hash dan Employee_ID serta minimal satu karyawan.');
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.REGISTRY_SPREADSHEET_ID!,
    range: `Employees!${columnLetter(pinColumn + 1)}2`,
    valueInputOption: 'RAW',
    requestBody: { values: [[hashPin(pin)]] },
  });

  console.log(`PIN updated for the first employee row (${String(rows[1][employeeIdCol] ?? 'unknown ID')}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
