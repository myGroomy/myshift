/**
 * Diagnostic satu-perintah untuk "kenapa bridge tidak menjawab?".
 *
 * Menembak endpoint dengan aksi `ping` (tidak efek samping: script membalas
 * `{ok:false, error:"UNKNOWN_ACTION"}` kalau permintaannya benar-benar sampai ke `doPost`).
 * Yang ditampilkan: apakah ada redirect ke `script.googleusercontent.com`, content-type, dan teks
 * halaman karena kesalahan paling umum di sini bukan kode, tapi setelan deployment:
 * halaman "Anda tidak memiliki izin" = "Who has access" bukan Anyone, sedangkan halaman
 * `<title>Salah</title>` = deployment-nya read-only/test sehingga URL `/exec`-nya tidak valid.
 *
 *   pnpm exec tsx scripts/probe-bridge.ts
 *
 * Untuk uji penuh (copy + upload + idempotensi + cleanup), pakai `pnpm check:bridge`.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const url = process.env.GAS_DRIVE_BRIDGE_URL!;
const secret = process.env.GAS_BRIDGE_SECRET!;
const body = JSON.stringify({ secret, action: "ping" });
const snippet = (text: string) => text.slice(0, 400).replace(/\s+/g, " ");

async function main() {
  // 1) Apa yang di-return Apps Script sebelum ikut redirect?
  const manual = await fetch(url, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/json" },
    body,
  });
  console.log("[no-redirect] status:", manual.status);
  console.log("[no-redirect] content-type:", manual.headers.get("content-type"));
  console.log("[no-redirect] location:", manual.headers.get("location"));
  console.log("[no-redirect] body:", snippet(await manual.text()));

  // 2) Kalau redirect diikuti, seperti yang dilakukan lib/google/drive-bridge.ts
  const followed = await fetch(url, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "application/json" },
    body,
  });
  console.log("\n[follow] status:", followed.status);
  console.log("[follow] final url:", followed.url);
  console.log("[follow] content-type:", followed.headers.get("content-type"));
  const html = await followed.text();
  console.log("[follow] body:", snippet(html));

  const keywords = [
    "Sign in",
    "accounts.google.com",
    "ServiceLogin",
    "You need access",
    "not authorized",
    "not available",
    "only the owner",
    "App is blocked",
    "Script error",
    "MYSHIFT_BRIDGE_SECRET",
    "UNKNOWN_ACTION",
  ];
  console.log("\n[keywords in page]");
  for (const keyword of keywords) {
    if (html.includes(keyword)) console.log(`  ada: "${keyword}"`);
  }
  console.log("  <title>:", html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "(tidak ada)");
  const urls = [...html.matchAll(/https:\/\/accounts\.google\.com\/[^"'\\ ]{0,60}/g)].map((m) => m[0]);
  console.log("  href accounts.google.com:", urls.slice(0, 3).join(" | ") || "(tidak ada)");

  // Ambil teks yang terlihat di halaman pesannya lebih berguna daripada keyword tebakan.
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  console.log("  teks halaman:", text.slice(0, 500) || "(kosong)");
  if (followed.status !== 200) {
    // Untuk 401/403, pesan specificsnya biasanya jauh di dalam HTML tampilkan lebih banyak.
    console.log("  teks lengkap:", text.slice(0, 2000) || "(kosong)");
    const codes = [...html.matchAll(/"(error|reason|message)"\s*:\s*"([^"]{5,120})"/g)].map((m) => m[2]);
    console.log("  kode/pesan di HTML:", [...new Set(codes)].slice(0, 8).join(" | ") || "(tidak ada)");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
