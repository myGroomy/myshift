"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type StepKey = 1 | 2 | 3 | 4;

const stepData: Record<StepKey, { title: string; desc: string }> = {
  1: {
    title: "Admin Menyusun Roster Tanpa Khawatir Tabrakan",
    desc: "Pilih nama staf dari daftar aktif dan plot jam masuk. Jika staf sudah masuk di cabang lain, sistem memberi indikator peringatan.",
  },
  2: {
    title: "Karyawan Mengajukan Tukar Shift Sendiri",
    desc: "Karyawan ajukan tukar shift langsung dari browser ponselnya. Rekan yang dituju menerima notifikasi konfirmasi.",
  },
  3: {
    title: "Centang SOP Opening & Closing",
    desc: "Sebelum staf mengakhiri gilirannya, daftar SOP wajib dicentang lengkap termasuk upload foto bukti.",
  },
  4: {
    title: "Handover Berjalan & Data Masuk ke Spreadsheet",
    desc: "Catatan penting dari shift sebelumnya otomatis tersimpan rapi di spreadsheet Google pemilik.",
  },
};

const faqs = [
  {
    q: "Apakah data shift bisa diakses dan diedit lewat Google Sheets biasa?",
    a: "Ya. Semua data shift, permohonan swap, checklist, dan log handover tersinkron langsung ke Google Sheets pemilik. Pemilik bebas membuat rumus tambahan, ekspor laporan, atau mengarsipkan data kapan pun.",
  },
  {
    q: "Bagaimana jika ada jadwal staf yang bentrok di dua cabang berbeda?",
    a: "Sistem memberi indikator visual peringatan saat Admin atau Kepala Cabang mencoba memasukkan nama staf yang sudah dialokasikan di outlet lain pada waktu yang sama.",
  },
  {
    q: "Apakah bisa langsung dipakai untuk banyak cabang sekaligus?",
    a: "Sangat bisa. Arsitektur MYSHIFT dirancang bagi bisnis kuliner multi-outlet mulai dari 2 cabang hingga puluhan cabang.",
  },
  {
    q: "Apakah ada fitur absensi clock-in/out atau penggajian (payroll)?",
    a: "Tidak. MYSHIFT fokus murni pada manajemen operasional shift toko, swap staf, checklist kepatuhan SOP harian, dan handover catatan stok antar tim.",
  },
];

export default function LandingPage() {
  const [activeStep, setActiveStep] = useState<StepKey>(1);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const current = stepData[activeStep];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold tracking-tight">
            <span className="grid size-6 place-items-center rounded-sm bg-primary text-[11px] font-bold text-primary-foreground">
              MS
            </span>
            MYSHIFT
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#fitur" className="transition-colors hover:text-foreground">Fitur</a>
            <a href="#cara-kerja" className="transition-colors hover:text-foreground">Cara Kerja</a>
            <a href="#faq" className="transition-colors hover:text-foreground">FAQ</a>
          </nav>
          <Button asChild size="sm">
            <Link href="/login">Masuk</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="border-b border-border">
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
                Atur Shift Kerja Cabang, Tanpa Bentrok & Ribet
              </h1>
              <p className="mt-4 text-base text-muted-foreground">
                Solusi pengatur jadwal shift, tukar shift, checklist SOP harian, dan handover antar tim untuk outlet F&B multi-cabang.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/login">Masuk Aplikasi</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                  <a href="#cara-kerja">Lihat Cara Kerja</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section id="fitur" className="border-b border-border">
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="mb-10 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight">Fitur Utama</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Lima modul esensial yang saling terhubung otomatis, menjaga disiplin kerja tim mulai dari buka outlet sampai tutup kasir.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: "schedule", title: "Penjadwalan Shift", desc: "Admin pilih cabang, staf, dan template shift. Sistem auto-detect menolak jika ada staf terjadwal ganda." },
                { icon: "swap_horiz", title: "Swap Shift", desc: "Karyawan ajukan tukar shift ke rekan yang berkualifikasi sama. Shift berganti resmi setelah disetujui." },
                { icon: "event_busy", title: "Pengajuan Izin", desc: "Kategori izin kustom. Slot kosong langsung di-highlight agar Kepala Cabang sigap mencari pengganti." },
                { icon: "checklist", title: "Checklist SOP", desc: "Daftar tugas standar per cabang. Wajib verifikasi foto sebelum shift diakhiri." },
                { icon: "handshake", title: "Handover Digital", desc: "Catatan kritis stok menipis, kondisi mesin, atau memo VIP langsung diteruskan ke shift berikutnya." },
                { icon: "table_chart", title: "Laporan & Audit", desc: "Semua log handover tersimpan aman di cloud spreadsheet untuk audit berkala oleh Owner." },
              ].map((f) => (
                <div key={f.title} className="rounded-lg border border-border bg-card p-5">
                  <span className="material-symbols-outlined mb-3 text-2xl text-primary">{f.icon}</span>
                  <h3 className="mb-1 text-base font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="cara-kerja" className="border-b border-border">
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="mb-10 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight">Cara Kerja</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Empat langkah cepat operasional harian.
              </p>
            </div>
            <div className="grid gap-8 lg:grid-cols-12">
              <div className="space-y-2 lg:col-span-5">
                {([1, 2, 3, 4] as StepKey[]).map((n) => (
                  <button
                    key={n}
                    onClick={() => setActiveStep(n)}
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${
                      activeStep === n
                        ? "border-border bg-accent text-accent-foreground"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                        activeStep === n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {n}
                      </span>
                      <span className="text-sm font-medium">{stepData[n].title}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="rounded-lg border border-border bg-card p-6 lg:col-span-7">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-subtle-foreground">
                  Langkah {activeStep}
                </p>
                <h3 className="mb-2 text-lg font-semibold">{current.title}</h3>
                <p className="text-sm text-muted-foreground">{current.desc}</p>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="border-b border-border">
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="mx-auto max-w-2xl">
              <h2 className="mb-8 text-2xl font-bold tracking-tight">Pertanyaan yang Sering Diajukan</h2>
              <div className="space-y-2">
                {faqs.map((item, i) => {
                  const isOpen = openFaq === i;
                  return (
                    <div key={i} className="rounded-lg border border-border bg-card">
                      <button
                        className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium"
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        aria-expanded={isOpen}
                      >
                        <span>{item.q}</span>
                        <span className="material-symbols-outlined text-muted-foreground">{isOpen ? "remove" : "add"}</span>
                      </button>
                      {isOpen && (
                        <div className="border-t border-border px-5 py-4 text-sm text-muted-foreground">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="rounded-lg bg-inverse-surface px-6 py-12 text-center sm:px-12 lg:py-16">
              <h2 className="mx-auto max-w-xl text-2xl font-bold tracking-tight text-inverse-foreground text-balance sm:text-3xl">
                Siap Merapikan Operasional Shift Outlet Anda?
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm text-inverse-foreground/80">
                Tinggalkan rekap WhatsApp yang berantakan. Berdayakan tim gerai Anda dengan sistem kerja yang rapi, transparan, dan terpercaya.
              </p>
              <Button asChild size="lg" className="mt-8">
                <Link href="/login">Masuk ke MYSHIFT</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-xs text-muted-foreground">
            MYSHIFT © 2026. Platform manajemen shift F&B UMKM.
          </p>
        </div>
      </footer>
    </div>
  );
}
