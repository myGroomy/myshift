"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Nav, Footer } from "@/components/nav";
import { Sparkles, Clock, Users, Shield, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="overflow-x-hidden">
      <Nav />

      {/* Attention: Hero */}
      <section className="relative min-h-[100dvh] overflow-hidden bg-[#faf9fe]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(0,117,222,0.08)_0%,transparent_50%),radial-gradient(ellipse_at_80%_20%,rgba(0,117,222,0.05)_0%,transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,117,222,0.03)_0%,transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-32 md:py-48">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-4xl text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#e5e5e5] bg-white px-4 py-1.5 text-xs font-medium text-[#615d59] shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            >
              <Sparkles size={14} color="#0075de" />
              Manajemen Shift F&B UMKM
            </motion.div>

            <h1 className="mx-auto mb-6 text-4xl font-bold tracking-tight text-[#000000] md:text-5xl lg:text-6xl" style={{ maxWidth: "100%" }}>
              Atur Shift,
              <br />
              <span className="text-[#0075de]">Optimalkan Tim</span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mx-auto mb-10 max-w-2xl text-lg text-[#615d59]"
            >
              Platform digital untuk mengelola jadwal shift, swap, dan izin secara efisien. Bangun tim yang terorganisir dengan MYSHIFT.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center"
            >
              <Button asChild size="lg" className="h-14 rounded-xl bg-[#0075de] px-8 text-lg font-semibold text-white shadow-lg shadow-[#0075de]/20">
                <Link href="/login">Masuk ke MYSHIFT</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-14 rounded-xl border-[#e5e5e5] px-8 text-lg font-semibold">
                <Link href="/jadwal">Lihat Jadwal</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Interest: Features Bento Grid */}
      <section className="relative bg-[#faf9fe] py-32 md:py-48">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8 }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">Fitur Unggulan</h2>
            <p className="mx-auto max-w-xl text-[#615d59]">Semua kebutuhan manajemen shift dalam satu platform yang mudah digunakan.</p>
          </motion.div>

          <div className="grid grid-flow-dense grid-cols-1 gap-6 md:grid-cols-2 md:grid-rows-2 lg:grid-cols-3 lg:grid-rows-2">
            {/* Card 1 - Large */}
            <motion.div
              className="group col-span-1 row-span-1 rounded-2xl border border-[#e5e5e5] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-700 ease-out hover:scale-[1.02] hover:shadow-lg"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-[#e8f0fe] text-[#0075de]">
                <Clock size={28} />
              </div>
              <h3 className="mb-3 text-xl font-bold">Jadwal Terstruktur</h3>
              <p className="text-sm text-[#615d59]">Buat, atur, dan kelola jadwal shift per cabang dengan mudah. Lihat semua shift dalam satu pandangan.</p>
            </motion.div>

            {/* Card 2 */}
            <motion.div
              className="group col-span-1 row-span-1 rounded-2xl border border-[#e5e5e5] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-700 ease-out hover:scale-[1.02] hover:shadow-lg"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-[#e8f0fe] text-[#0075de]">
                <Users size={28} />
              </div>
              <h3 className="mb-3 text-xl font-bold">Swap & Izin</h3>
              <p className="text-sm text-[#615d59]">Ajukan swap shift atau izin langsung dari aplikasi. Proses persetujuan cepat dan transparan.</p>
            </motion.div>

            {/* Card 3 - Large */}
            <motion.div
              className="group col-span-1 row-span-1 rounded-2xl border border-[#e5e5e5] bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-700 ease-out hover:scale-[1.02] hover:shadow-lg md:col-span-2"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-[#0075de] text-white">
                <Shield size={28} />
              </div>
              <h3 className="mb-3 text-xl font-bold">Dashboard Lengkap</h3>
              <p className="text-sm text-[#615d59]">Pantau status shift, checklist, dan handover secara real-time. Data semua cabang terlihat dari satu dashboard.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Desire: GSAP Scroll Section */}
      <section className="relative overflow-hidden bg-[#0075de] py-32 md:py-48">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(255,255,255,0.1)_0%,transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="md:w-1/2"
          >
            <h2 className="mb-6 text-4xl font-bold tracking-tight text-white md:text-5xl">Tingkatkan Produktivitas</h2>
            <p className="mb-8 max-w-lg text-lg text-blue-100">Setiap shift terorganisir, setiap karyawan terlibat. MYSHIFT membantu Anda membangun sistem manajemen yang scalable.</p>
            <Button asChild size="lg" className="h-14 rounded-xl bg-white px-8 text-lg font-semibold text-[#0075de]">
              <Link href="/login">Mulai Sekarang <ArrowRight size={20} className="ml-2" /></Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Action: CTA + Footer */}
      <Footer />
    </main>
  );
}
