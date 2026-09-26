"use client";

/*
<design_plan>
1. Python RNG Execution:
   Hero Architecture: Cinematic Center with Gradient Glow & Live Metrics
   Typography Stack: Geist Sans & Mono
   Component Arsenal: Gapless Bento Grid, Interactive Tab Flow, Metric Counters
   GSAP/Motion: Hover Physics (scale 1.02), Staggered In-View Fade, Ambient Radial Mesh
2. AIDA Check:
   - Attention: Hero with ultra-wide container, 2-line headline, clear CTAs
   - Interest: Gapless Bento Grid for core features
   - Desire: Interactive Workflow Showcase & Metric Stats
   - Action: High-contrast CTA Section + Footer
3. Hero Math: H1 max-w-5xl, 2 lines max at desktop.
4. Bento Density: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 grid-flow-dense, 0 empty slots.
5. Label Sweep & Button Check: No cheap "SECTION 01" meta labels. High contrast buttons.
</design_plan>
*/

import { useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Nav, Footer } from "@/components/nav";
import {
  Sparkles,
  Clock,
  Users,
  Shield,
  ArrowRight,
  CheckCircle2,
  Repeat,
  FileText,
  Building2,
  CalendarDays,
} from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"jadwal" | "swap" | "checklist" | "handover">("jadwal");

  return (
    <main className="overflow-x-hidden w-full max-w-full bg-[#faf9fe] text-[#000000]">
      <Nav />

      {/* Hero Section */}
      <section className="relative min-h-[90dvh] flex items-center justify-center overflow-hidden bg-[#faf9fe] py-24 md:py-36">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,117,222,0.12)_0%,transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(0,117,222,0.05)_0%,transparent_50%)] pointer-events-none" />

        <div className="relative mx-auto max-w-6xl px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-5xl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#e5e5e5] bg-white px-4 py-1.5 text-xs font-semibold text-[#0075de] shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
            >
              <Sparkles className="h-4 w-4" />
              <span>Platform Shift Standalone F&B UMKM</span>
            </motion.div>

            <h1 className="mx-auto mb-6 text-4xl font-extrabold tracking-tight md:text-6xl lg:text-7xl leading-[1.08]">
              Atur Shift Kerja Cabang, <br className="hidden md:inline" />
              <span className="bg-gradient-to-r from-[#0075de] to-[#00529b] bg-clip-text text-transparent">
                Tanpa Bentrok & Ribet
              </span>
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-lg text-[#615d59] leading-relaxed">
              Solusi modern pengatur jadwal shift, pengajuan tukar shift, dan lapor checklist harian untuk outlet & cabang F&B Anda.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button asChild size="lg" className="h-14 rounded-xl bg-[#0075de] px-8 text-base font-semibold text-white shadow-lg shadow-[#0075de]/25 hover:bg-[#0060b8] transition-all">
                <Link href="/login">
                  Masuk Aplikasi <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-14 rounded-xl border-[#e5e5e5] bg-white px-8 text-base font-semibold text-[#000000] hover:bg-[#f0f1f5]">
                <Link href="/jadwal">Lihat Demo Jadwal</Link>
              </Button>
            </div>

            {/* Quick Metrics Strip */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mx-auto grid max-w-3xl grid-cols-3 gap-4 rounded-2xl border border-[#e5e5e5] bg-white/80 p-6 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
            >
              <div>
                <div className="text-2xl md:text-3xl font-bold text-[#0075de]">100%</div>
                <div className="text-xs md:text-sm text-[#615d59] font-medium">Bebas Bentrok</div>
              </div>
              <div className="border-x border-[#e5e5e5] px-2">
                <div className="text-2xl md:text-3xl font-bold text-[#0075de]">Real-time</div>
                <div className="text-xs md:text-sm text-[#615d59] font-medium">Update Google Sheets</div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-bold text-[#0075de]">Multi-Cabang</div>
                <div className="text-xs md:text-sm text-[#615d59] font-medium">Satu Dashboard</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Feature Bento Grid Section */}
      <section className="relative py-28 md:py-40 bg-[#faf9fe]">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Dirancang Khusus Operational F&B
            </h2>
            <p className="mt-3 text-base text-[#615d59]">
              Kelola seluruh proses operasional shift cabang dalam satu alur yang transparan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 grid-flow-dense">
            {/* Bento Card 1 */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              className="group col-span-1 rounded-2xl border border-[#e5e5e5] bg-white p-8 shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#e8f0fe] text-[#0075de]">
                <CalendarDays className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Penjadwalan Shift</h3>
              <p className="text-sm text-[#615d59] leading-relaxed">
                Pilih cabang, karyawan, dan template shift. Sistem otomatis mendeteksi jika terjadi bentrok jadwal kerja.
              </p>
            </motion.div>

            {/* Bento Card 2 */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              className="group col-span-1 rounded-2xl border border-[#e5e5e5] bg-white p-8 shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#e8f0fe] text-[#0075de]">
                <Repeat className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Swap Shift Karyawan</h3>
              <p className="text-sm text-[#615d59] leading-relaxed">
                Karyawan dapat mengajukan tukar shift ke rekan tim. Perubahan berlaku setelah mendapat persetujuan Admin/Manager.
              </p>
            </motion.div>

            {/* Bento Card 3 */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              className="group col-span-1 rounded-2xl border border-[#e5e5e5] bg-white p-8 shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#e8f0fe] text-[#0075de]">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Checklist Opening & Closing</h3>
              <p className="text-sm text-[#615d59] leading-relaxed">
                Pastikan standar kebersihan dan operasional terpenuhi dengan checklist wajib foto sebelum dan sesudah shift.
              </p>
            </motion.div>

            {/* Bento Card 4 - Wide Span */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              className="group col-span-1 md:col-span-2 lg:col-span-2 rounded-2xl border border-[#0075de]/20 bg-gradient-to-br from-white to-[#e8f0fe]/30 p-8 shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0075de] text-white">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Handover Antar Shift</h3>
              <p className="text-sm text-[#615d59] leading-relaxed max-w-xl">
                Catatan stok bahan baku, kendala peralatan, dan pesan khusus langsung tersampaikan ke tim shift berikutnya secara otomatis.
              </p>
            </motion.div>

            {/* Bento Card 5 */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              className="group col-span-1 rounded-2xl border border-[#e5e5e5] bg-white p-8 shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#e8f0fe] text-[#0075de]">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Multi-Cabang Synchronized</h3>
              <p className="text-sm text-[#615d59] leading-relaxed">
                Kelola banyak outlet F&B sekaligus dengan data terpisah yang tetap terpantau di pusat.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Interactive Workflow Section */}
      <section className="relative py-28 md:py-36 bg-white border-y border-[#e5e5e5]">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Cara Kerja MYSHIFT</h2>
            <p className="mt-2 text-base text-[#615d59]">Satu alur praktis dari pembuatan jadwal hingga laporan harian.</p>
          </div>

          <div className="flex justify-center gap-2 mb-8 flex-wrap">
            <Button
              variant={activeTab === "jadwal" ? "default" : "outline"}
              onClick={() => setActiveTab("jadwal")}
              className={`rounded-xl px-5 h-11 ${activeTab === "jadwal" ? "bg-[#0075de] text-white" : "border-[#e5e5e5]"}`}
            >
              1. Jadwal Shift
            </Button>
            <Button
              variant={activeTab === "swap" ? "default" : "outline"}
              onClick={() => setActiveTab("swap")}
              className={`rounded-xl px-5 h-11 ${activeTab === "swap" ? "bg-[#0075de] text-white" : "border-[#e5e5e5]"}`}
            >
              2. Swap & Izin
            </Button>
            <Button
              variant={activeTab === "checklist" ? "default" : "outline"}
              onClick={() => setActiveTab("checklist")}
              className={`rounded-xl px-5 h-11 ${activeTab === "checklist" ? "bg-[#0075de] text-white" : "border-[#e5e5e5]"}`}
            >
              3. Checklist Shift
            </Button>
            <Button
              variant={activeTab === "handover" ? "default" : "outline"}
              onClick={() => setActiveTab("handover")}
              className={`rounded-xl px-5 h-11 ${activeTab === "handover" ? "bg-[#0075de] text-white" : "border-[#e5e5e5]"}`}
            >
              4. Handover & Laporan
            </Button>
          </div>

          <div className="rounded-2xl border border-[#e5e5e5] bg-[#faf9fe] p-8 md:p-12 shadow-sm">
            {activeTab === "jadwal" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <h3 className="text-2xl font-bold text-[#0075de]">Buat & Bagikan Jadwal Shift</h3>
                <p className="text-[#615d59]">Admin atau Kepala Cabang menentukan alokasi karyawan pada shift Pagi, Siang, atau Malam per tanggal. Validasi sistem memastikan karyawan tidak ditugaskan ganda pada jam yang sama.</p>
                <div className="inline-block rounded-lg bg-white border border-[#e5e5e5] p-4 text-sm font-mono text-[#000000]">
                  Shift Pagi (08:00 - 16:00) &bull; Shift Malam (16:00 - 23:00)
                </div>
              </motion.div>
            )}
            {activeTab === "swap" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <h3 className="text-2xl font-bold text-[#0075de]">Pengajuan Tukar Shift Transparan</h3>
                <p className="text-[#615d59]">Karyawan yang berhalangan dapat memilih rekan tim yang memenuhi syarat untuk tukar shift. Setelah di-approve supervisor, jadwal otomatis terbarui di kedua pihak.</p>
                <div className="inline-block rounded-lg bg-white border border-[#e5e5e5] p-4 text-sm font-mono text-[#000000]">
                  Status Swap: PENDING &rarr; APPROVED BY MANAGER
                </div>
              </motion.div>
            )}
            {activeTab === "checklist" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <h3 className="text-2xl font-bold text-[#0075de]">Pengisian Checklist & Bukti Foto</h3>
                <p className="text-[#615d59]">Saat mulai atau mengakhiri shift, karyawan mencentang daftar tugas opening/closing serta melampirkan foto verifikasi area kerja.</p>
                <div className="inline-block rounded-lg bg-white border border-[#e5e5e5] p-4 text-sm font-mono text-[#000000]">
                  [✓] Kebersihan Meja Bar  [✓] Cek Suhu Chiller
                </div>
              </motion.div>
            )}
            {activeTab === "handover" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <h3 className="text-2xl font-bold text-[#0075de]">Handover Catatan & Rekapitualasi Laporan</h3>
                <p className="text-[#615d59]">Sampaikan informasi sisa bahan, catatan komplain, atau instruksi khusus sebelum meninggalkan outlet. Semua riwayat tersimpan utuh dalam laporan ekspor CSV.</p>
                <div className="inline-block rounded-lg bg-white border border-[#e5e5e5] p-4 text-sm font-mono text-[#000000]">
                  Handover Shift: "Susu UHT sisa 4 kotak, es batu baru diisi."
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* High Impact Call To Action Section */}
      <section className="relative overflow-hidden bg-[#0075de] py-28 md:py-36 text-white text-center">
        <div className="relative mx-auto max-w-4xl px-4">
          <h2 className="mb-6 text-3xl font-extrabold tracking-tight md:text-5xl">
            Siap Merapikan Operasional Shift Outlet Anda?
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-lg text-blue-100">
            Masuk dengan kredensial cabang atau daftarkan akun baru untuk mengelola shift tim F&B Anda sekarang.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild size="lg" className="h-14 rounded-xl bg-white px-8 text-base font-bold text-[#0075de] hover:bg-blue-50">
              <Link href="/login">Masuk Akun Cabang</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
