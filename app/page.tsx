'use client';

import { useState } from 'react';
import Script from 'next/script';

/* ─────────────────────────────────────────────
   Step data for "Cara Kerja" interactive section
   ───────────────────────────────────────────── */
type StepKey = 1 | 2 | 3 | 4;

const stepData: Record<StepKey, { title: string; stepTag: string; mono: string; desc: string; previewContent: React.ReactNode }> = {
  1: {
    title: 'Admin Menyusun Roster Tanpa Khawatir Tabrakan',
    stepTag: 'Pratinjau Langkah 1',
    mono: 'Dashboard Roster Cabang',
    desc: 'Tidak ada lagi rumus Excel yang mendadak rusak akibat salah hapus. Kepala Cabang cukup memilih nama staf dari daftar aktif dan memplot jam masuk. Jika staf tersebut sudah masuk di cabang lain, sistem otomatis memberi indikator merah ramah.',
    previewContent: (
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-slate-800">Senayan City — Shift Pagi (08:00 - 16:00)</span>
          <span className="text-emerald-600 font-semibold">Lengkap (3/3 Kru)</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">1 Head Barista</span>
          <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">1 Junior Barista</span>
          <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">1 Kasir</span>
        </div>
      </div>
    ),
  },
  2: {
    title: 'Karyawan Mengajukan Tukar Shift Sendiri',
    stepTag: 'Pratinjau Langkah 2',
    mono: 'Swap & Leave Engine',
    desc: 'Ada keperluan mendadak? Barista mengajukan tukar shift langsung dari browser ponselnya. Rekan yang dituju menerima notifikasi konfirmasi, dan Kepala Cabang cukup melakukan satu kali tap "Setujui" agar jadwal otomatis ter-update serentak.',
    previewContent: (
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex justify-between items-center text-xs flex-wrap gap-1">
          <span className="font-bold text-slate-800">Permintaan Tukar Shift #SW-204</span>
          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-bold">Menunggu Approval SPV</span>
        </div>
        <p className="text-xs text-slate-600"><strong>Dimas H.</strong> (Shift Pagi) ⇄ <strong>Siti K.</strong> (Shift Siang) pada Kamis, 24 Mei.</p>
        <div className="flex gap-2 pt-1">
          <button className="px-3 py-1 bg-[#0075de] text-white rounded-lg text-xs font-bold">Setujui Swap</button>
          <button className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">Tolak</button>
        </div>
      </div>
    ),
  },
  3: {
    title: 'Centang SOP Opening/Closing & Foto Verifikasi',
    stepTag: 'Pratinjau Langkah 3',
    mono: 'Visual SOP Compliance',
    desc: 'Sebelum staf boleh mengakhiri gilirannya, daftar SOP wajib dicentang lengkap. Mulai dari kebersihan mesin kopi, pembuangan ampas, hingga upload foto laci uang kasir. Semuanya terunggah langsung dengan stempel waktu terverifikasi.',
    previewContent: (
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
        <div className="text-xs font-bold text-slate-800 mb-1">Checklist Closing: Outlet Senayan City</div>
        <div className="space-y-1.5 text-xs text-slate-700">
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked disabled className="rounded w-4 h-4" />
            <span>Backflush mesin espresso dengan chemical</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked disabled className="rounded w-4 h-4" />
            <span>Kuras air boiler &amp; lap kering counter</span>
          </label>
          <label className="flex items-center gap-2 text-emerald-700 font-semibold">
            <input type="checkbox" defaultChecked disabled className="rounded w-4 h-4" />
            <span>Foto bukti kebersihan bar terunggah (bar_clean_2305.jpg)</span>
          </label>
        </div>
      </div>
    ),
  },
  4: {
    title: 'Handover Berjalan & Data Masuk ke Spreadsheet',
    stepTag: 'Pratinjau Langkah 4',
    mono: 'Cloud Sync & Audit',
    desc: 'Kru shift sore membaca catatan penting yang ditinggalkan shift pagi (misal: sirup vanilla tinggal 2 botol). Secara otomatis di belakang layar, rekap harian telah tersimpan rapi di spreadsheet Google pemilik tanpa ada data tersembunyi.',
    previewContent: (
      <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-emerald-400 font-bold">● Google Sheets Ter-update</span>
          <span className="text-slate-400 text-[10px]">Real-time API Sync</span>
        </div>
        <p className="text-xs text-slate-300">Baris laporan harian cabang telah ditambahkan: Kehadiran 100%, Checklist lengkap 10/10, Catatan stok kritis diteruskan.</p>
      </div>
    ),
  },
};

export default function LandingPage() {
  const [activeStep, setActiveStep] = useState<StepKey>(1);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => setOpenFaq(openFaq === index ? null : index);

  const faqs = [
    {
      q: 'Apakah data shift bisa diakses dan diedit lewat Google Sheets biasa?',
      a: 'Ya, 100%! Data operasional tidak disembunyikan dalam sistem tertutup ("black box"). Semua data shift, permohonan swap, checklist, dan log handover tersinkron langsung ke Google Sheets pemilik. Pemilik bebas membuat rumus tambahan, ekspor laporan, atau mengarsipkan data kapan pun diinginkan.',
    },
    {
      q: 'Bagaimana jika ada jadwal staf yang bentrok di dua cabang berbeda?',
      a: 'MYSHIFT memiliki fitur Conflict Detector cerdas. Ketika Admin atau Kepala Cabang mencoba memasukkan nama staf yang sudah dialokasikan di outlet lain pada waktu yang sama, sistem langsung memunculkan indikasi visual peringatan sehingga bentrok jadwal dapat digagalkan seketika sebelum dipublikasikan.',
    },
    {
      q: 'Apakah bisa langsung dipakai untuk banyak cabang sekaligus?',
      a: 'Sangat bisa. Arsitektur MYSHIFT sengaja dirancang bagi bisnis kuliner multi-outlet mulai dari 2 cabang hingga puluhan cabang. Setiap cabang memiliki tab dan filter checklist mandiri, namun tetap bermuara pada satu konsol pemantauan terpusat untuk Owner.',
    },
    {
      q: 'Apakah ada fitur absensi clock-in/out atau penggajian (payroll)?',
      a: 'Tidak. MYSHIFT fokus murni dan spesifik pada manajemen operasional shift toko, swap staf, checklist kepatuhan SOP harian, dan handover catatan stok antar tim. Absensi clock-in/out dan urusan payroll biasanya sudah ditangani oleh sistem POS kasir atau software HR korporat terpisah.',
    },
  ];

  const current = stepData[activeStep];

  return (
    <>
      {/* Tailwind CDN with custom brand config */}
      <Script src="https://cdn.tailwindcss.com?plugins=forms,container-queries" strategy="beforeInteractive" />
      <Script id="tw-config" strategy="beforeInteractive">{`
        if (typeof tailwind !== 'undefined') {
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  brand: { 50:'#f0f7ff', 100:'#e0effe', 500:'#0075de', 600:'#0062bc', 700:'#00529b', 800:'#003a6d', 900:'#0a2540' },
                  accent: { lime:'#bbf7d0', limeText:'#15803d', dark:'#111317', darkCard:'#181b20', muted:'#615d59' }
                },
                fontFamily: { sans: ['Plus Jakarta Sans','Inter','system-ui','-apple-system','sans-serif'] }
              }
            }
          }
        }
      `}</Script>

      {/* Google Font */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <style>{`
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #faf9fe; color: #111317; }
        .bento-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .bento-card:hover { transform: translateY(-2px); }
        .pill-badge { display: inline-flex; align-items: center; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.025em; }
      `}</style>

      <div className="antialiased text-slate-800 bg-[#faf9fe]">

        {/* ── NAVBAR ── */}
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <a className="flex items-center space-x-3 group" href="#">
              <div className="w-10 h-10 rounded-xl bg-[#0075de] flex items-center justify-center text-white font-extrabold text-sm shadow-sm border border-slate-100 group-hover:scale-105 transition-transform">MS</div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
                  MYSHIFT
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Mochikin</span>
                </span>
                <span className="text-[11px] font-medium text-slate-500 tracking-wide">Multi-Outlet F&amp;B Ops</span>
              </div>
            </a>

            <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-600">
              <a className="hover:text-blue-600 transition-colors" href="#masalah">Masalah</a>
              <a className="hover:text-blue-600 transition-colors" href="#fitur">Fitur</a>
              <a className="hover:text-blue-600 transition-colors" href="#cara-kerja">Cara Kerja</a>
              <a className="hover:text-blue-600 transition-colors" href="#keunggulan">Keunggulan</a>
              <a className="hover:text-blue-600 transition-colors" href="#faq">FAQ</a>
            </nav>

            <div className="flex items-center space-x-3">
              <a className="hidden sm:inline-flex text-xs font-semibold px-4 py-2 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-full transition-all hover:bg-slate-100" href="#hero-demo">
                Lihat Pratinjau
              </a>
              <a className="inline-flex items-center justify-center px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white bg-[#0075de] hover:bg-[#0062bc] active:bg-[#00529b] shadow-sm transition-all" href="/login">
                Masuk Aplikasi
              </a>
            </div>
          </div>
        </header>

        <main>

          {/* ── HERO ── */}
          <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Dirancang khusus ritel kuliner &amp; coffee shop multi-outlet
                </div>
              </div>

              <div className="text-center max-w-3xl mx-auto">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-950 tracking-tight leading-[1.15]">
                  Atur Shift Kerja Cabang, <br className="hidden sm:block" />
                  <span className="text-[#0075de] inline-block">Tanpa Bentrok</span> &amp; Ribet
                </h1>
                <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                  Solusi pengatur jadwal shift, tukar shift (swap), checklist SOP harian, dan handover antar tim untuk outlet F&amp;B multi-cabang — satu dashboard transparan untuk semua cabang.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                  <a className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-bold text-white bg-[#0075de] hover:bg-[#0062bc] shadow-md transition-all text-center" href="/login">
                    Masuk Aplikasi Sekarang
                  </a>
                  <a className="w-full sm:w-auto px-7 py-3.5 rounded-full text-sm font-bold text-slate-800 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-all text-center flex items-center justify-center gap-2" href="#hero-demo">
                    <svg className="w-4 h-4 text-[#0075de]" fill="currentColor" viewBox="0 0 20 20">
                      <path clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" fillRule="evenodd" />
                    </svg>
                    Lihat Demo Jadwal Live
                  </a>
                </div>

                <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-600">
                  {[
                    { icon: 'M5 13l4 4L19 7', color: 'text-emerald-500', label: '100% Bebas Bentrok Jadwal' },
                    { icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', color: 'text-blue-500', label: 'Real-time via Google Sheets Terbuka' },
                    { icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', color: 'text-indigo-500', label: 'Multi-Cabang dalam Satu Dashboard' },
                  ].map(({ icon, color, label }) => (
                    <span key={label} className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm flex items-center gap-1.5">
                      <svg className={`w-3.5 h-3.5 ${color}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Hero Demo Mockup */}
              <div className="mt-14 max-w-5xl mx-auto rounded-2xl bg-white border-2 border-slate-900/90 shadow-2xl overflow-hidden" id="hero-demo">
                <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                    <span className="text-xs font-semibold text-slate-300 ml-2">MYSHIFT Outlet Console — Roster Aktif Minggu Ini</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60">● Live Sync Aktif</span>
                </div>

                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Pilih Outlet:</span>
                    <button className="px-3 py-1.5 rounded-lg bg-[#0075de] text-white font-bold shadow-sm">Outlet 01: Senayan City</button>
                    <button className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold">Outlet 02: Grand Indonesia</button>
                    <button className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold">Outlet 03: Central Park</button>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-50 border border-amber-300 text-amber-900 font-medium text-xs">
                    <svg className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path clipRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" fillRule="evenodd" />
                    </svg>
                    Auto-Detector: 0 Jadwal Bentrok Terdeteksi
                  </div>
                </div>

                <div className="overflow-x-auto p-4 md:p-6 bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3">Peran / Staf</th>
                        {['Senin','Selasa','Rabu','Kamis','Jumat'].map(d => <th key={d} className="py-3 px-2">{d}</th>)}
                        <th className="py-3 px-2 bg-blue-50/50 rounded-t">Sabtu (Peak)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">DH</span>
                            <div><p className="font-bold">Dimas H.</p><p className="text-[10px] text-slate-400 font-normal">Head Barista</p></div>
                          </div>
                        </td>
                        <td className="py-3 px-2"><span className="px-2 py-1 rounded bg-blue-100 text-blue-800 font-semibold text-[11px]">Shift Pagi</span></td>
                        <td className="py-3 px-2"><span className="px-2 py-1 rounded bg-blue-100 text-blue-800 font-semibold text-[11px]">Shift Pagi</span></td>
                        <td className="py-3 px-2"><span className="px-2 py-1 rounded bg-slate-100 text-slate-500 font-semibold text-[11px]">OFF</span></td>
                        <td className="py-3 px-2"><span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-semibold text-[11px]">Shift Siang</span></td>
                        <td className="py-3 px-2"><span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-semibold text-[11px]">Shift Siang</span></td>
                        <td className="py-3 px-2 bg-blue-50/50"><span className="px-2 py-1 rounded bg-purple-100 text-purple-900 font-bold text-[11px]">Shift Pagi Full</span></td>
                      </tr>
                      <tr>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">SK</span>
                            <div><p className="font-bold">Siti Kartika</p><p className="text-[10px] text-slate-400 font-normal">Kasir Senior</p></div>
                          </div>
                        </td>
                        <td className="py-3 px-2"><span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-semibold text-[11px]">Shift Siang</span></td>
                        <td className="py-3 px-2"><span className="px-2 py-1 rounded bg-purple-100 text-purple-800 font-semibold text-[11px] border border-purple-300">Swap Disetujui ⇄</span></td>
                        <td className="py-3 px-2"><span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-semibold text-[11px]">Shift Siang</span></td>
                        <td className="py-3 px-2"><span className="px-2 py-1 rounded bg-slate-100 text-slate-500 font-semibold text-[11px]">OFF</span></td>
                        <td className="py-3 px-2"><span className="px-2 py-1 rounded bg-slate-900 text-white font-semibold text-[11px]">Shift Malam</span></td>
                        <td className="py-3 px-2 bg-blue-50/50"><span className="px-2 py-1 rounded bg-slate-900 text-white font-bold text-[11px]">Shift Malam (Closing)</span></td>
                      </tr>
                      <tr>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">AR</span>
                            <div><p className="font-bold">Ahmad Rizky</p><p className="text-[10px] text-slate-400 font-normal">Junior Barista</p></div>
                          </div>
                        </td>
                        <td className="py-3 px-2"><span className="px-2 py-1 rounded bg-slate-100 text-slate-500 font-semibold text-[11px]">OFF</span></td>
                        <td className="py-3 px-2"><span className="px-2 py-1 rounded bg-blue-100 text-blue-800 font-semibold text-[11px]">Shift Pagi</span></td>
                        <td className="py-3 px-2"><span className="px-2 py-1 rounded bg-blue-100 text-blue-800 font-semibold text-[11px]">Shift Pagi</span></td>
                        <td className="py-3 px-2"><span className="px-2 py-1 rounded bg-blue-100 text-blue-800 font-semibold text-[11px]">Shift Pagi</span></td>
                        <td className="py-3 px-2"><span className="px-2 py-1 rounded bg-amber-100 text-amber-900 font-semibold text-[11px]">Izin Resmi ✓</span></td>
                        <td className="py-3 px-2 bg-blue-50/50"><span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">Shift Siang</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Karyawan dapat langsung melihat jadwal ini dari browser smartphone masing-masing.
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">Spreadsheet DB: synced 2 mins ago</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── PROBLEM SECTION ── */}
          <section className="py-20 bg-white border-y border-slate-200/80" id="masalah">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-14">
                <span className="pill-badge bg-rose-100 text-rose-800 mb-3">Kekacauan Shift F&amp;B Tradisional</span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
                  Sebelum Pakai MYSHIFT, Pusingnya Operasional Harian Cabang
                </h2>
                <p className="mt-3 text-slate-600 text-sm sm:text-base">
                  Mengelola jadwal restoran &amp; kedai kopi dengan grup WhatsApp dan chat manual selalu menyisakan celah kelalaian di gerai.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { icon: '✕', title: 'Jadwal Jadul Versi WA Tertimbun', desc: 'Jadwal diketik manual atau gambar tabel disebar di grup WhatsApp. Begitu ada revisi mendadak, staf keliru melihat versi lama karena tertimbun ratusan chat lain.' },
                  { icon: '⇄', title: 'Tukar Shift Jadi Drama Chat Panjang', desc: 'Karyawan janjian tukar hari di chat pribadi, lupa konfirmasi ke kepala cabang. Saat hari-H, shift kosong atau dua barista masuk bersamaan karena salah paham.' },
                  { icon: '✓', title: 'Checklist SOP Lewat Tanpa Bukti Foto', desc: 'Tugas opening (kalibrasi grinder, sanitasi chiller) atau closing terlewat begitu saja. Di atas kertas sudah dicentang, tapi tidak ada dokumentasi foto riil yang tersimpan.' },
                  { icon: '☕', title: 'Handover Informasi Putus di Tengah Jalan', desc: 'Shift pagi tahu sirup hazelnut tinggal 1 botol atau mesin ice maker mampet, tapi lupa mengabari shift malam. Pelanggan kecewa karena pesanan tidak siap.' },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="p-6 rounded-2xl bg-[#faf9fe] border-2 border-slate-900/10 hover:border-slate-900 transition-all bento-card">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-bold text-lg mb-4">{icon}</div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
                  </div>
                ))}

                {/* Wide dark card */}
                <div className="p-6 rounded-2xl bg-slate-900 text-white border-2 border-slate-900 md:col-span-2 lg:col-span-2 transition-all bento-card flex flex-col justify-between">
                  <div>
                    <span className="inline-block px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 font-bold text-xs mb-3 border border-rose-500/30">Paling Kritis Saat Skala Bisnis Naik</span>
                    <h3 className="text-lg font-bold text-white mb-2">Makin Runyam Saat Cabang Bertambah Lebih Dari Satu</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">Pemilik dan manajer operasional harus membuka 5 hingga 10 grup WhatsApp berbeda tiap hari cuma untuk memastikan tiap outlet punya cukup orang. Tidak ada visibilitas terpusat yang bisa dicek dalam satu kali klik.</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-800 text-xs font-medium text-emerald-400 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    MYSHIFT menyelesaikan ini lewat sistem modular sederhana yang langsung siap pakai.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── FEATURES BENTO ── */}
          <section className="py-20 md:py-28" id="fitur">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
                <div>
                  <span className="pill-badge bg-blue-100 text-blue-700 mb-3">Fitur Utama Ritel</span>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">Bento Grid: Didesain untuk Ritme Cepat F&amp;B</h2>
                </div>
                <p className="mt-3 md:mt-0 text-slate-600 text-sm max-w-md">Lima modul esensial yang saling terhubung otomatis, menjaga disiplin kerja tim mulai dari buka outlet sampai tutup kasir.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Modul 01 */}
                <div className="bento-card bg-slate-950 text-white rounded-3xl p-7 border-2 border-slate-900 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-bold text-xs border border-blue-400/30">Modul 01</span>
                      <span className="text-xs text-slate-400 font-mono">Auto-Conflict Guard</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-white">Penjadwalan Shift Anti-Bentrok</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">Admin cukup pilih cabang, staf, dan template shift (Pagi, Siang, Malam). Sistem auto-detect langsung menolak jika ada staf terjadwal ganda di dua cabang di hari yang sama.</p>
                  </div>
                  <div className="mt-6 pt-5 border-t border-slate-800">
                    <div className="bg-slate-900 rounded-xl p-3 text-xs border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-300">Peringatan Bentrok Jadwal</span>
                      <span className="text-emerald-400 font-bold">Terproteksi 100%</span>
                    </div>
                  </div>
                </div>

                {/* Modul 02 */}
                <div className="bento-card bg-white rounded-3xl p-7 border-2 border-slate-900 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 font-bold text-xs">Modul 02</span>
                      <span className="text-xs text-slate-500 font-mono">1-Click Request</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-slate-950">Swap Shift Karyawan Mandiri</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Karyawan ajukan tukar shift ke rekan yang berkualifikasi sama lewat aplikasi web. Shift hanya berganti resmi setelah disetujui Kepala Cabang via 1 tombol.</p>
                  </div>
                  <div className="mt-6 pt-5 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 bg-purple-50 p-2.5 rounded-xl border border-purple-200">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      Riwayat tukar shift tercatat otomatis
                    </div>
                  </div>
                </div>

                {/* Modul 03 */}
                <div className="bento-card bg-white rounded-3xl p-7 border-2 border-slate-900 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">Modul 03</span>
                      <span className="text-xs text-slate-500 font-mono">Kategori Kustom</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-slate-950">Pengajuan Izin Fleksibel</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Kategori izin kustom (sakit dengan surat, cuti terencana, atau mendesak). Slot kosong langsung di-highlight agar Kepala Cabang sigap mencari pengganti.</p>
                  </div>
                  <div className="mt-6 pt-5 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 bg-slate-50 p-2.5 rounded-xl">
                      <span>Kuota &amp; Log Izin</span>
                      <span className="text-[#0075de] font-bold">Kalkulasi Otomatis</span>
                    </div>
                  </div>
                </div>

                {/* Modul 04 */}
                <div className="bento-card bg-white rounded-3xl p-7 border-2 border-slate-900 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">Modul 04</span>
                      <span className="text-xs text-slate-500 font-mono">SOP &amp; Bukti Foto</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-slate-950">Checklist Opening &amp; Closing</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">Daftar tugas standar per cabang: sanitasi mesin kopi, deep-clean fryer, cek suhu kulkas, hingga input foto kas laci. Wajib verifikasi foto sebelum shift diakhiri.</p>
                  </div>
                  <div className="mt-6 pt-5 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path clipRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fillRule="evenodd" /></svg>
                      Zero Checklist Terlewat
                    </div>
                  </div>
                </div>

                {/* Modul 05 – FEATURED */}
                <div className="bento-card bg-gradient-to-br from-slate-900 via-slate-900 to-[#003a6d] text-white rounded-3xl p-7 md:p-8 border-2 border-slate-900 md:col-span-2 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-[#0075de] text-white font-bold text-xs uppercase tracking-wide">Modul Unggulan ★</span>
                        <span className="px-3 py-1 rounded-full bg-white/10 text-white font-semibold text-xs">Modul 05: Seamless Handover</span>
                      </div>
                      <span className="text-xs text-blue-200 font-mono">Diteruskan Otomatis Antar Shift</span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                      <div>
                        <h3 className="text-2xl font-black text-white mb-3">Handover Digital Antar Shift</h3>
                        <p className="text-sm text-slate-300 leading-relaxed mb-4">Tak ada lagi alasan "shift pagi tidak bilang". Setiap catatan kritis seputar stok menipis, kondisi mesin bermasalah, atau memo VIP tamu langsung diteruskan ke beranda kru shift berikutnya.</p>
                        <ul className="space-y-2 text-xs text-slate-200">
                          {['Input sisa stok kritis tanpa perlu buka laptop','Catatan mesin rusak langsung diberi flag "Urgent Maintenance"','Shift berikutnya wajib menekan "Sudah Baca Handover"'].map(item => (
                            <li key={item} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-slate-950/80 rounded-2xl p-4 border border-white/10 font-sans text-xs">
                        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
                          <span className="font-bold text-amber-400 flex items-center gap-1.5">⚠️ Memo Shift Pagi ➜ Shift Sore</span>
                          <span className="text-[10px] text-slate-400">14:45 WIB</span>
                        </div>
                        <div className="space-y-2">
                          <div className="p-2 rounded bg-slate-900 border border-slate-800"><p className="text-slate-300 font-medium">1. Stok Susu Fresh Milk sisa 3 karton, vendor kirim jam 16:30.</p></div>
                          <div className="p-2 rounded bg-slate-900 border border-slate-800"><p className="text-slate-300 font-medium">2. Mesin seal cup kanan agak longgar bautnya, jangan ditekan keras.</p></div>
                        </div>
                        <div className="mt-3 pt-2">
                          <span className="text-[11px] text-emerald-400 font-semibold">Status: Diterima oleh Barista Shift Sore ✓</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400">Semua log handover tersimpan aman di cloud spreadsheet untuk audit berkala oleh Owner.</div>
                </div>
              </div>
            </div>
          </section>

          {/* ── HOW IT WORKS (Interactive Tabs) ── */}
          <section className="py-20 bg-white border-t border-slate-200/80" id="cara-kerja">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-14">
                <span className="pill-badge bg-emerald-100 text-emerald-800 mb-3">Sederhana &amp; Efektif</span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">Cara Kerja: 4 Langkah Cepat Operasional</h2>
                <p className="mt-3 text-slate-600 text-sm sm:text-base">Klik tiap tahapan di bawah untuk melihat bagaimana alur kerja berjalan di lapangan.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Step buttons */}
                <div className="lg:col-span-5 space-y-3">
                  {([1,2,3,4] as StepKey[]).map(n => {
                    const isActive = activeStep === n;
                    return (
                      <button
                        key={n}
                        onClick={() => setActiveStep(n)}
                        className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-start gap-4 ${isActive ? 'border-[#0075de] bg-blue-50/50 shadow-sm' : 'border-slate-200 hover:border-slate-400 bg-white'}`}
                      >
                        <span className={`w-8 h-8 rounded-full font-bold flex items-center justify-center flex-shrink-0 text-sm ${isActive ? 'bg-[#0075de] text-white' : 'bg-slate-200 text-slate-700'}`}>{n}</span>
                        <div>
                          <h3 className="text-base font-bold text-slate-900">{stepData[n].title.split(' ').slice(0,4).join(' ')}…</h3>
                          <p className="text-xs text-slate-600 mt-1">{stepData[n].desc.split('.')[0]}.</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Step preview */}
                <div className="lg:col-span-7 bg-[#faf9fe] border-2 border-slate-900 rounded-3xl p-6 sm:p-8 min-h-[380px] flex flex-col justify-between shadow-lg">
                  <div>
                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
                      <span className="px-3 py-1 rounded-full bg-[#0075de] text-white font-bold text-xs">{current.stepTag}</span>
                      <span className="text-xs text-slate-500 font-mono">{current.mono}</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-950 mb-3">{current.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-6">{current.desc}</p>
                    {current.previewContent}
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                    <span>Satu klik tombol publikasi — langsung aktif serentak ke HP staf.</span>
                    <span className="font-bold text-[#0075de]">SOP Terstandar 100%</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── COMPARISON ── */}
          <section className="py-20 bg-[#faf9fe]" id="keunggulan">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-14">
                <span className="pill-badge bg-purple-100 text-purple-800 mb-3">Mengapa Berbeda?</span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">Kenapa Beda Dari Cara Lama?</h2>
                <p className="mt-3 text-slate-600 text-sm sm:text-base">Bukan software korporat yang rumit, bukan pula rekap chat yang gampang hilang.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* vs WA */}
                <div className="bg-white rounded-3xl p-7 border-2 border-slate-300 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-lg mb-5">💬</div>
                    <h3 className="text-lg font-bold text-slate-950 mb-2">vs Grup WhatsApp</h3>
                    <p className="text-xs font-semibold uppercase tracking-wider text-rose-500 mb-4">Cara Lama yang Melelahkan</p>
                    <ul className="space-y-3 text-sm text-slate-600">
                      {['Jadwal tenggelam dalam ribuan chat stiker dan obrolan grup.','Tidak ada validasi bentrok saat staf saling tukar hari.','Foto opening/closing tercecer di galeri HP tanpa terdata rapi.'].map(t => (
                        <li key={t} className="flex items-start gap-2"><span className="text-rose-500 font-bold">✕</span><span>{t}</span></li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-medium text-slate-400">Hasil: Sering salah paham &amp; staf dobel shift.</div>
                </div>

                {/* vs Excel */}
                <div className="bg-white rounded-3xl p-7 border-2 border-slate-300 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-lg mb-5">📊</div>
                    <h3 className="text-lg font-bold text-slate-950 mb-2">vs Excel / Spreadsheet Manual</h3>
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-4">Rentan Human-Error</p>
                    <ul className="space-y-3 text-sm text-slate-600">
                      {['Rumus gampang rusak jika diedit banyak kepala cabang.','Karyawan repot melihatnya jika dibuka dari layar HP kecil.','Tidak ada modul checklist upload foto langsung di file sheet.'].map(t => (
                        <li key={t} className="flex items-start gap-2"><span className="text-amber-500 font-bold">✕</span><span>{t}</span></li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-medium text-slate-400">Hasil: File korup dan admin lembur rekap ulang.</div>
                </div>

                {/* MYSHIFT */}
                <div className="bg-slate-950 text-white rounded-3xl p-7 border-2 border-slate-950 shadow-xl flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-[#0075de] text-white text-[10px] font-extrabold uppercase px-4 py-1.5 rounded-bl-xl tracking-wider">Solusi Tepat</div>
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-[#0075de] text-white flex items-center justify-center font-bold text-lg mb-5 shadow-lg">✨</div>
                    <h3 className="text-lg font-bold text-white mb-2">Pendekatan MYSHIFT</h3>
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-4">Kombinasi UI Ringan + Spreadsheet</p>
                    <ul className="space-y-3 text-sm text-slate-200">
                      {[
                        ['UI Aplikasi Modern:', 'Karyawan akses via HP tanpa perlu install aplikasi berat.'],
                        ['Transparan & Terbuka:', 'Data tetap masuk langsung ke Google Sheets pemilik — tanpa sistem tertutup.'],
                        ['Bukan HR Rumit:', 'Murni fokus operasional toko (shift, swap, SOP, handover) tanpa fitur berbelit.'],
                      ].map(([bold, rest]) => (
                        <li key={bold} className="flex items-start gap-2"><span className="text-emerald-400 font-bold">✓</span><span><strong>{bold}</strong> {rest}</span></li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-800 text-xs font-medium text-emerald-400">Hasil: Tim disiplin, kepala cabang tenang, owner puas.</div>
                </div>
              </div>
            </div>
          </section>

          {/* ── PERSONA ── */}
          <section className="py-20 bg-white border-t border-slate-200/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-14">
                <span className="pill-badge bg-blue-100 text-blue-700 mb-3">Dirancang untuk Seluruh Tim</span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">Satu Aplikasi, Manfaat Nyata untuk 3 Peran</h2>
                <p className="mt-3 text-slate-600 text-sm sm:text-base">Dari pemilik resto dengan 10 cabang hingga barista di bar counter, semua punya tampilan yang pas.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { emoji: '👑', bg: 'bg-blue-600', shadow: 'shadow-blue-500/20', title: 'Owner & Manajer Area', sub: 'Kendali Multi-Cabang', color: 'text-[#0075de]', dot: 'text-[#0075de]', desc: 'Melihat kesehatan operasional seluruh gerai dalam satu layar tanpa perlu repot menelepon manajer toko satu per satu tiap pagi.', bullets: ['Pantau kepatuhan checklist opening/closing','Data langsung tersinkron di Google Sheets pribadi','Cegah outlet buka terlambat karena kurang orang'] },
                  { emoji: '📋', bg: 'bg-slate-900', shadow: 'shadow-slate-900/20', title: 'Kepala Cabang / Store Leader', sub: 'Eksekusi Harian Cepat', color: 'text-slate-500', dot: 'text-slate-900', desc: 'Menyusun jadwal mingguan staf tokonya dalam 5 menit, dan cukup ketuk satu tombol untuk menyetujui pengajuan tukar shift staf.', bullets: ['Approval swap shift instan tanpa ribet hitung manual','Cek bukti foto kebersihan bar sebelum kunci gerai','Bebas dari panggilan komplain soal shift bentrok'] },
                  { emoji: '☕', bg: 'bg-emerald-600', shadow: 'shadow-emerald-500/20', title: 'Barista, Kasir & Kitchen Crew', sub: 'Pengalaman Kerja Jelas', color: 'text-emerald-600', dot: 'text-emerald-500', desc: 'Melihat jadwal kerja resmi di ponsel kapan saja, request tukar hari dengan rekan tanpa drama, dan tahu catatan stok dari shift sebelumnya.', bullets: ['Tampilan mobile-friendly super cepat tanpa login ribet','Langsung tahu tugas closing apa yang harus diselesaikan','Baca handover catatan stok kritis secara jelas'] },
                ].map(({ emoji, bg, shadow, title, sub, color, dot, desc, bullets }) => (
                  <div key={title} className="bg-[#faf9fe] rounded-3xl p-7 border-2 border-slate-900 transition-all bento-card">
                    <div className={`w-12 h-12 rounded-2xl ${bg} text-white flex items-center justify-center font-bold text-xl mb-6 shadow-md ${shadow}`}>{emoji}</div>
                    <h3 className="text-xl font-bold text-slate-950 mb-1">{title}</h3>
                    <span className={`text-xs font-semibold ${color} uppercase tracking-wide block mb-3`}>{sub}</span>
                    <p className="text-sm text-slate-600 leading-relaxed mb-6">{desc}</p>
                    <ul className="text-xs space-y-2 text-slate-700 border-t border-slate-200/80 pt-4 font-medium">
                      {bullets.map(b => <li key={b} className="flex items-center gap-2"><span className={`${dot} font-bold`}>•</span>{b}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── FAQ ── */}
          <section className="py-20 bg-[#faf9fe] border-t border-slate-200/80" id="faq">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-xl mx-auto mb-14">
                <span className="pill-badge bg-slate-200 text-slate-800 mb-3">Tanya Jawab</span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">Pertanyaan yang Sering Diajukan</h2>
                <p className="mt-3 text-slate-600 text-sm">Semua yang perlu Anda ketahui tentang implementasi MYSHIFT di jaringan outlet kuliner Anda.</p>
              </div>

              <div className="space-y-4">
                {faqs.map((item, i) => {
                  const isOpen = openFaq === i;
                  return (
                    <div key={i} className="border-2 border-slate-900 rounded-2xl bg-white overflow-hidden shadow-sm transition-all">
                      <button
                        className="w-full px-6 py-4 text-left font-bold text-slate-950 flex items-center justify-between text-base"
                        onClick={() => toggleFaq(i)}
                      >
                        <span>{item.q}</span>
                        <span className={`text-xl font-mono text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}>+</span>
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ── FINAL CTA ── */}
          <section className="py-20 md:py-24 bg-white" id="cta">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-slate-950 text-white rounded-3xl p-8 sm:p-14 border-2 border-slate-900 relative overflow-hidden shadow-2xl">
                <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#0075de]/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10 text-center max-w-2xl mx-auto">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs uppercase tracking-wider mb-6 border border-emerald-500/30">
                    Bagian dari Ekosistem Mochikin
                  </span>
                  <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight mb-4">Siap Merapikan Operasional Shift Outlet Anda?</h2>
                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-8 max-w-lg mx-auto">
                    Tinggalkan rekap WhatsApp yang berantakan dan rawan bentrok. Berdayakan tim gerai Anda dengan sistem kerja yang rapi, transparan, dan terpercaya hari ini.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <a className="w-full sm:w-auto px-8 py-4 rounded-full text-sm font-extrabold text-white bg-[#0075de] hover:bg-[#0062bc] transition-all shadow-lg transform hover:-translate-y-0.5" href="/login">
                      Masuk Akun Cabang
                    </a>
                    <a className="w-full sm:w-auto px-7 py-4 rounded-full text-sm font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-700 hover:border-slate-500 transition-all" href="#masalah">
                      Pelajari Kembali Fitur
                    </a>
                  </div>
                  <p className="mt-8 text-xs text-slate-400">Tanpa instalasi rumit • Akses langsung dari smartphone seluruh staf</p>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* ── FOOTER ── */}
        <footer className="bg-white border-t border-slate-200 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[#0075de] flex items-center justify-center text-white font-extrabold text-xs border border-slate-200">MS</div>
                <div>
                  <span className="text-lg font-extrabold tracking-tight text-slate-950">MYSHIFT</span>
                  <span className="text-xs text-slate-500 block">Sistem Shift, Swap &amp; Handover F&amp;B Multi-Cabang</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-600">
                {['#masalah','#fitur','#cara-kerja','#keunggulan','#faq'].map((href, i) => (
                  <a key={href} className="hover:text-[#0075de]" href={href}>{['Masalah','Fitur Bento','Cara Kerja','Perbandingan','FAQ'][i]}</a>
                ))}
              </div>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
              <p>© 2025 <strong>MYSHIFT</strong>. Seluruh hak cipta dilindungi undang-undang.</p>
              <p className="text-slate-600 font-medium">MYSHIFT merupakan bagian dari ekosistem <strong>Mochikin</strong> — memberdayakan operasional ritel F&amp;B multi-cabang di Indonesia.</p>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
