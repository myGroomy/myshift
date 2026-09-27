import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  const { sheets } = await import('../lib/google/client');
  console.log('Testing Google Sheets connection...');
  console.log('REGISTRY_SPREADSHEET_ID:', process.env.REGISTRY_SPREADSHEET_ID);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.REGISTRY_SPREADSHEET_ID!,
    range: 'Employees!A:J',
  });

  const rows = res.data.values || [];
  console.log('Total rows:', rows.length);
  console.log('Header:', rows[0]);
  console.log('First employee:', rows[1]);
  console.log('Second employee:', rows[2]);
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
