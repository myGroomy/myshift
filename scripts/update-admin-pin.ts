import { config } from 'dotenv';
config({ path: '.env.local' });

import { isValidPin } from '../lib/domain/pin';

const EMPLOYEES_RANGE = 'Employees!A:J';

// Dev/recovery utility: set a PIN without printing it (or its hash) to the terminal.
async function main() {
  const pin = process.argv[2] ?? process.env.MYSHIFT_NEW_PIN ?? '';
  if (!isValidPin(pin)) {
    throw new Error('Usage: tsx scripts/update-admin-pin.ts <4-8 digit PIN> (or set MYSHIFT_NEW_PIN)');
  }

  const { sheets } = await import('../lib/google/client');
  const { hashPin } = await import('../lib/domain/pin');

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.REGISTRY_SPREADSHEET_ID!,
    range: EMPLOYEES_RANGE,
  });
  const rows = res.data.values || [];
  const header = rows[0] ?? [];
  const employeeIdCol = header.indexOf('Employee_ID');

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.REGISTRY_SPREADSHEET_ID!,
    range: 'Employees!C2',
    valueInputOption: 'RAW',
    requestBody: { values: [[hashPin(pin)]] },
  });

  console.log(`PIN updated for the first employee row (${employeeIdCol >= 0 ? 'Employee_ID column found' : 'header missing'}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

