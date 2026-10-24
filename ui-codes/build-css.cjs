/* Build CSS pratinjau statis ui-codes — bukan bagian dari aplikasi Next.js.
   Jalankan dari root repo:
     node ui-codes/build-css.cjs ui-codes/tailwind-input.css ui-codes/assets/app.css
   Input: tailwind-input.css (mengimpor token dari app/globals.css + @source
   seluruh html/js di ui-codes, plus app/components/lib sebagai jaring pengaman
   kelas yang dipakai dinamis). Output: assets/app.css (sudah ter-commit sebagai
   artefak pratinjau; rebuild setelah mengubah kelas di html). */
const path = require('path');
const fs = require('fs');
const twPath = require.resolve('@tailwindcss/postcss');
const postcss = require(require.resolve('postcss', { paths: [path.dirname(twPath)] }));
const tailwind = require(twPath);
const input = fs.readFileSync(process.argv[2], 'utf8');
postcss([tailwind]).process(input, { from: path.resolve(process.argv[2]), to: process.argv[3] })
  .then(r => { fs.writeFileSync(process.argv[3], r.css); console.log('OK bytes=', r.css.length); })
  .catch(e => { console.error('FAIL', e.message); process.exit(1); });
