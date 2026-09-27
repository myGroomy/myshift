import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  const { sheets } = await import('../lib/google/client');
  const { hashPin } = await import('../lib/auth');

  const pinHash = hashPin('123456');
  console.log('New PIN hash:', pinHash);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.REGISTRY_SPREADSHEET_ID!,
    range: 'Employees!A:J',
  });
  const rows = res.data.values || [];
  const header = rows[0];
  const pinHashCol = header.indexOf('PIN_Hash') + 1;
  console.log('PIN_Hash column:', pinHashCol);

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.REGISTRY_SPREADSHEET_ID!,
    range: `Employees!C2`,
    valueInputOption: 'RAW',
    requestBody: { values: [[pinHash]] },
  });
  console.log('PIN updated successfully');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
