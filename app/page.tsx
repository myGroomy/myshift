"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence, type Variants } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  Calendar,
  ArrowLeftRight,
  FileText,
  CheckSquare,
  Handshake,
} from "lucide-react";
import { SandTransitionImage } from "@/components/sand-transition";

const chaptersData = [
  {
    name: "Penjadwalan Shift",
    image: "https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=800&q=80",
    desc: "Admin menyusun roster tanpa khawatir tabrakan",
  },
  {
    name: "Swap Shift",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
    desc: "Petugas mengajukan tukar shift sendiri",
  },
  {
    name: "Pengajuan Izin",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80",
    desc: "Kategori izin kustom untuk kebutuhan cabang",
  },
  {
    name: "Checklist SOP",
    image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80",
    desc: "Daftar tugas standar wajib dicentang lengkap",
  },
  {
    name: "Handover Digital",
    image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80",
    desc: "Catatan kritis diteruskan ke shift berikutnya",
  },
];

const fadeUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const letterBlock: Variants = {
  initial: { y: 120, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const staggerHeader: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};
const staggerLogo: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const staggerLeft: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.15, delayChildren: 0.6 } },
};
const staggerRight: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.15, delayChildren: 0.9 } },
};

const navLinks = ["Fitur", "Cara Kerja", "FAQ", "Tentang"];

const actionPills = [
  { icon: Calendar, label: "Penjadwalan" },
  { icon: ArrowLeftRight, label: "Swap Shift" },
  { icon: FileText, label: "Izin" },
  { icon: CheckSquare, label: "Checklist" },
  { icon: Handshake, label: "Handover" },
];

export default function LandingPage() {
  const [showVideo, setShowVideo] = useState(false);
  const [activeChapter, setActiveChapter] = useState(2);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowVideo(true), 2800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveChapter((prev) => (prev + 1) % 5);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full min-h-screen bg-[#fcfcfc] text-[#111] overflow-x-hidden">
      {/* SECTION 1: HERO */}
      <section className="relative w-full min-h-screen flex flex-col overflow-hidden pb-24">
        {/* Background Video */}
        {showVideo && (
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            >
              <source
                src="https://cdn.coverr.co/videos/coverr-coffee-shop-1584/1080p.mp4"
                type="video/mp4"
              />
            </video>
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
          </div>
        )}

        {/* 1A: HEADER */}
        <motion.header
          className="pt-8 md:pt-10 px-8 md:px-20 relative z-20"
          initial="initial"
          animate="animate"
          variants={staggerHeader}
        >
          {/* Logo */}
          <motion.h1
            variants={staggerLogo}
            className="text-3xl md:text-4xl font-semibold tracking-tight"
          >
            {"MYSHIFT".split("").map((letter, i) => (
              <motion.span
                key={i}
                variants={letterBlock}
                className="inline-block"
              >
                {letter}
              </motion.span>
            ))}
          </motion.h1>

          {/* 1B: SUB-NAV BAR */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex justify-between items-start mt-10 md:mt-12"
          >
            {/* Left column */}
            <div className="w-[15%] text-[11px] md:text-[12px] font-mono tracking-[0.2em] uppercase">
              <div className="text-gray-400">Multi</div>
              <div className="text-gray-400">Cabang</div>
              <div className="text-gray-400">F&B</div>
            </div>

            {/* Arrow separator */}
            <div className="w-[5%] hidden md:flex justify-center">
              <ArrowRight size={14} strokeWidth={1} className="text-gray-400" />
            </div>

            {/* Center column */}
            <div className="flex-1 md:w-[30%] text-[11px] md:text-[12px] font-mono tracking-[0.2em] uppercase text-gray-300 leading-relaxed">
              <span className="hidden md:inline">
                Mengelola shift kerja cabang dengan rapi, transparan, dan tanpa bentrok.
              </span>
              <span className="md:hidden">
                Mengelola shift kerja cabang dengan rapi, transparan, dan tanpa bentrok.
              </span>
            </div>

            {/* Arrow separator */}
            <div className="w-[5%] hidden md:flex justify-center">
              <ArrowRight size={14} strokeWidth={1} className="text-gray-400" />
            </div>

            {/* Right column - Nav links */}
            <div className="w-[15%] hidden md:block text-[11px] md:text-[12px] font-mono tracking-[0.2em] uppercase text-gray-300">
              {navLinks.map((link) => (
                <div key={link} className="hover:text-white hover:underline cursor-pointer py-0.5">
                  {link}
                </div>
              ))}
            </div>

            {/* Hamburger button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="z-60 flex flex-col gap-[6px] md:hidden"
              aria-label="Toggle menu"
            >
              <motion.div
                className="h-[1.5px] bg-white"
                animate={{
                  width: isMobileMenuOpen ? 24 : 32,
                  rotate: isMobileMenuOpen ? 45 : 0,
                  y: isMobileMenuOpen ? 3.75 : 0,
                }}
                transition={{ duration: 0.3 }}
              />
              <motion.div
                className="h-[1.5px] bg-white"
                animate={{
                  width: isMobileMenuOpen ? 24 : 40,
                  rotate: isMobileMenuOpen ? -45 : 0,
                  y: isMobileMenuOpen ? -3.75 : 0,
                }}
                transition={{ duration: 0.3 }}
              />
            </button>
          </motion.div>
        </motion.header>

        {/* 1C: MOBILE MENU OVERLAY */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="bg-[#1c2b42] border-b border-gray-700 shadow-xl md:hidden relative z-50"
            >
              <div className="px-6 py-8 space-y-6">
                {navLinks.map((link) => (
                  <div
                    key={link}
                    className="text-sm font-mono tracking-[0.2em] uppercase text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1E: LEFT SIDEBAR CONTENT */}
        <motion.div
          className="px-10 md:px-20 mt-16 sm:mt-20 md:mt-24 w-[340px] md:w-[400px] relative z-10"
          initial="initial"
          animate="animate"
          variants={staggerLeft}
        >
          {/* Section indicator */}
          <motion.div variants={fadeUp} className="flex items-center gap-4 mb-8">
            <span className="text-xs font-mono text-gray-400">01</span>
            <div className="w-16 h-[1.5px] bg-white/30" />
          </motion.div>

          {/* Headline */}
          <motion.h2
            variants={fadeUp}
            className="text-[3rem] md:text-[4.5rem] font-normal tracking-tight leading-[1] text-white drop-shadow-lg"
          >
            ATUR SHIFT
            <br />
            KERJA CABANG
          </motion.h2>

          {/* Description */}
          <motion.p
            variants={fadeUp}
            className="mt-6 text-sm md:text-[15px] text-white/90 w-[260px] md:w-[300px] leading-[1.6] drop-shadow-md"
          >
            Kelola jadwal, swap shift, dan checklist SOP dalam satu platform yang rapi dan transparan.
          </motion.p>

          {/* CTA Button */}
          <motion.div variants={fadeUp} className="mt-10">
            <Link
              href="/login"
              className="group relative inline-flex items-center gap-3 bg-[#1c2b42] px-7 py-4 border border-[#1c2b42] rounded-md shadow-lg overflow-hidden transition-all duration-300 hover:-translate-y-[0.5px] hover:shadow-[4px_4px_0px_rgba(255,255,255,0.3)] active:translate-y-0 active:shadow-none"
            >
              {/* Sliding background */}
              <div className="absolute inset-0 bg-white -translate-x-[101%] group-hover:translate-x-0 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" />
              {/* Icon */}
              <Calendar
                size={18}
                className="relative z-10 text-white group-hover:text-[#1c2b42] group-hover:scale-110 group-hover:-rotate-12 group-hover:-translate-y-1 transition-all duration-300"
              />
              {/* Text */}
              <span className="relative z-10 text-[15px] font-medium text-white group-hover:text-[#1c2b42] transition-colors duration-300">
                Mulai Sekarang
              </span>
            </Link>
          </motion.div>
        </motion.div>

        {/* 1F: RIGHT SIDEBAR (hidden on mobile) */}
        <motion.div
          className="w-[220px] mt-16 md:mt-24 absolute right-10 md:right-20 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-10 z-10"
          initial="initial"
          animate="animate"
          variants={staggerRight}
        >
          {/* Specimen info */}
          <motion.div variants={fadeUp}>
            <h3 className="text-[11px] font-bold font-mono tracking-widest uppercase text-white/90">
              Platform Shift
            </h3>
            <p className="mt-3 text-[13px] text-white/70 leading-[1.6]">
              Untuk UMKM F&B multi-cabang. Tanpa instalasi, langsung pakai dari browser.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div variants={fadeUp} className="space-y-4">
            <div>
              <div className="text-[11px] font-mono tracking-widest uppercase text-white/50">
                Cabang
              </div>
              <div className="text-sm font-medium text-white mt-1">2 - 50+ outlet</div>
            </div>
            <div>
              <div className="text-[11px] font-mono tracking-widest uppercase text-white/50">
                Petugas
              </div>
              <div className="text-sm font-medium text-white mt-1">10 - 500+ staf</div>
            </div>
          </motion.div>

          {/* View Details button */}
          <motion.div variants={fadeUp}>
            <Link
              href="/login"
              className="group flex items-center gap-3"
            >
              <div className="w-11 h-11 rounded-full border border-white/40 flex items-center justify-center group-hover:border-white group-hover:bg-white transition-all duration-300">
                <Plus
                  size={16}
                  strokeWidth={1.5}
                  className="text-white/60 group-hover:text-[#1c2b42] transition-colors duration-300"
                />
              </div>
              <span className="text-[11px] font-mono uppercase tracking-widest font-bold text-white/60 group-hover:text-white transition-colors duration-300">
                Lihat Detail
              </span>
            </Link>
          </motion.div>
        </motion.div>

        {/* 1G: BOTTOM-LEFT "SCROLL TO EXPLORE" */}
        <motion.div
          className="absolute bottom-12 left-[2.5rem] md:left-[5rem] hidden md:flex items-center gap-4 z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <div className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center gap-[4px]">
            <div className="w-[1px] h-[12px] bg-white/60" />
            <div className="w-[1px] h-[12px] bg-white/60" />
          </div>
          <span className="text-[11px] font-mono tracking-widest uppercase text-white/50 font-semibold">
            Scroll to explore
          </span>
        </motion.div>
      </section>

      {/* SECTION 2: "FITUR MYSHIFT" */}
      <section className="relative w-full min-h-[75vh] md:min-h-screen bg-[#fcfcfc] flex flex-col items-center pt-28 md:pt-36 pb-0 z-20">
        {/* 2A: SECTION LABEL */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-[11px] md:text-[12px] font-mono tracking-[0.2em] mb-14"
        >
          <span className="text-gray-500">[ 02 ]</span>{" "}
          <span className="text-gray-900 font-bold uppercase">Fitur MYSHIFT</span>
        </motion.div>

        {/* 2B: MAIN HEADING */}
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-[2rem] md:text-[3rem] lg:text-[3.8rem] leading-[1.1] font-medium tracking-tight text-[#111] max-w-[900px] text-center px-6"
        >
          Semua yang kamu butuhkan untuk mengelola shift kerja cabang.
        </motion.h2>

        {/* 2C: ACTION PILLS */}
        <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-14 md:mt-20 mb-12 md:mb-28 px-6">
          {actionPills.map((pill, i) => (
            <motion.div
              key={pill.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="group flex items-center gap-2 px-6 py-3 rounded-full border border-gray-300 text-[12px] font-medium uppercase tracking-wider bg-white/50 backdrop-blur-sm text-gray-800 cursor-pointer hover:border-[#1c2b42] hover:bg-[#1c2b42] hover:text-white transition-all duration-300"
            >
              <pill.icon size={14} strokeWidth={2} />
              {pill.label}
            </motion.div>
          ))}
        </div>

        {/* 2D: SPACER */}
        <div className="min-h-[200px] md:min-h-[400px]" />

        {/* 2E: BOTTOM TEXT */}
        <div className="absolute bottom-0 left-0 right-0 px-8 md:px-20 pb-10 md:pb-14 pointer-events-none">
          <div className="flex justify-between">
            <span className="text-[11px] font-mono tracking-widest uppercase text-gray-500 font-medium hidden md:block">
              KAMI TIDAK HANYA MENGATUR JADWAL.
            </span>
            <span className="text-[11px] font-mono tracking-widest uppercase text-gray-500 font-medium hidden md:block">
              MYSHIFT (C) 2026
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 3: "CARA KERJA" (Dark Section) */}
      <section className="relative w-full bg-[#0a0a0a] text-white flex flex-col z-30">
        {/* 3A: OVERLAPPING IMAGE */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[160vw] md:w-[1100px] pointer-events-none z-0">
          <motion.img
            src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=1200&q=80"
            alt="Restaurant team"
            className="w-full h-auto object-cover"
            style={{ maxHeight: "600px", objectPosition: "center 30%" }}
            initial={{ y: "-65%", opacity: 0 }}
            whileInView={{ y: "-78%", opacity: 1 }}
            viewport={{ once: true, margin: "100px" }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          />
        </div>

        {/* 3B: HEADING AREA */}
        <div className="px-8 md:px-20 pt-40 md:pt-56 mb-20 relative z-10">
          <div className="flex flex-col xl:flex-row justify-between gap-16">
            {/* Left -- Main heading */}
            <motion.h2
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="text-[1.6rem] md:text-[2.8rem] lg:text-[3.5rem] xl:text-[3.8rem] leading-[1.15] font-medium tracking-tight text-white"
            >
              Dari jadwal sampai laporan,{" "}
              <span className="inline-flex gap-2 md:gap-3 align-middle mx-2 md:mx-4 translate-y-[-4px]">
                {[Calendar, ArrowLeftRight, CheckSquare].map((Icon, i) => (
                  <span
                    key={i}
                    className="w-10 h-10 md:w-14 md:h-14 rounded-full border border-gray-600 bg-black text-gray-400 flex items-center justify-center hover:bg-white hover:text-black hover:border-white transition-all duration-300 cursor-pointer"
                  >
                    <Icon size={22} />
                  </span>
                ))}
              </span>{" "}
              semua otomatis.
            </motion.h2>

            {/* Right -- Tagline + pills */}
            <div className="flex flex-col justify-end">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-[10px] md:text-[11px] font-mono tracking-widest text-gray-400 uppercase mb-8 leading-relaxed"
              >
                KAMI TIDAK HANYA MENGATUR JADWAL
                <br />
                KAMI MEMBANGUN SISTEM KERJA YANG RAPI
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="flex gap-3"
              >
                {["Otomatis", "Transparan", "Terpercaya"].map((pill) => (
                  <span
                    key={pill}
                    className="px-6 py-2.5 rounded-full border border-gray-600 text-[10px] font-mono tracking-widest uppercase text-gray-300 hover:bg-white hover:text-black hover:border-white transition-all duration-300 cursor-pointer"
                  >
                    {pill}
                  </span>
                ))}
              </motion.div>
            </div>
          </div>
        </div>

        {/* 3C: TWO-COLUMN PANEL */}
        <div className="relative z-10">
          <div className="h-[1px] bg-gray-800" />
          <div className="flex flex-col md:flex-row">
            {/* Left panel (35%) - Chapter image */}
            <div className="md:w-[35%] border-b md:border-b-0 md:border-r border-gray-800 min-h-[450px] md:min-h-[550px] relative">
              <div className="absolute top-10 left-10 text-gray-500 text-xl tracking-[0.3em]">
                ***
              </div>
              <SandTransitionImage
                src={chaptersData[activeChapter].image}
                alt={chaptersData[activeChapter].name}
                className="absolute inset-0 w-[85%] h-[85%] m-auto"
              />
              <div className="absolute bottom-10 left-10 right-10 flex items-center gap-3">
                <span className="text-[11px] font-mono tracking-widest text-[#888] uppercase">
                  Chapter
                </span>
                <motion.span
                  key={activeChapter}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-[11px] font-mono tracking-widest text-white uppercase"
                >
                  {String(activeChapter + 1).padStart(2, "0")}
                </motion.span>
                <span className="text-[11px] font-mono tracking-widest text-[#333]">
                  / {String(chaptersData.length).padStart(2, "0")}
                </span>
              </div>
            </div>

            {/* Right panel (65%) - Chapter list */}
            <div className="md:w-[65%]">
              {/* Top bar */}
              <div className="border-b border-gray-800 p-10 flex justify-between items-center">
                <span className="text-[11px] font-mono text-gray-400 tracking-widest">
                  Jelajahi fitur. Pahami cara kerjanya.
                </span>
                <motion.span
                  key={activeChapter}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-[11px] font-mono text-gray-400 tracking-widest"
                >
                  Chapter {String(activeChapter + 1).padStart(2, "0")}
                </motion.span>
              </div>

              {/* Chapter list */}
              <div>
                {chaptersData.map((chapter, i) => (
                  <motion.div
                    key={chapter.name}
                    onClick={() => setActiveChapter(i)}
                    className={`border-b border-gray-800/80 py-10 px-10 cursor-pointer transition-colors duration-300 ${
                      activeChapter === i
                        ? "text-white"
                        : "text-[#444] hover:text-[#999]"
                    }`}
                    whileHover={{ x: 4 }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl md:text-[2rem] font-medium tracking-tight">
                          {chapter.name}
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">{chapter.desc}</p>
                      </div>
                      <AnimatePresence>
                        {activeChapter === i && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                          >
                            <ArrowUpRight
                              size={22}
                              strokeWidth={1}
                              className="text-gray-400"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* 3D: BOTTOM FOOTER */}
          <div className="h-[1px] bg-gray-800" />
          <div className="px-8 md:px-20 py-10 text-[11px] font-mono tracking-widest text-gray-500 uppercase bg-[#0a0a0a]">
            Membangun sistem kerja yang rapi untuk F&B UMKM
          </div>
        </div>
      </section>

      {/* SECTION 4: CTA + FOOTER */}
      <section className="relative w-full">
        {/* CTA with background image */}
        <div className="relative h-[70vh] md:h-[80vh] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80"
            alt="Restaurant interior"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: "center 40%" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1c2b42]/85 via-[#1c2b42]/75 to-[#1c2b42]/85" />
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
            <motion.h2
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="text-[1.8rem] md:text-[3rem] lg:text-[3.5rem] font-medium tracking-tight text-white max-w-3xl leading-[1.1]"
            >
              Siap merapikan operasional shift outlet Anda?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mt-6 text-white/80 max-w-lg text-sm md:text-base leading-relaxed"
            >
              Tinggalkan rekap WhatsApp yang berantakan. Berdayakan tim gerai Anda dengan sistem kerja yang rapi, transparan, dan terpercaya.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-10"
            >
              <Link
                href="/login"
                className="group relative inline-flex items-center gap-3 bg-white px-8 py-4 border border-white rounded-md shadow-lg overflow-hidden transition-all duration-300 hover:-translate-y-[0.5px] hover:shadow-[4px_4px_0px_rgba(255,255,255,0.3)]"
              >
                <div className="absolute inset-0 bg-[#1c2b42] -translate-x-[101%] group-hover:translate-x-0 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" />
                <span className="relative z-10 text-[15px] font-medium text-[#1c2b42] group-hover:text-white transition-colors duration-300">
                  Masuk ke MYSHIFT
                </span>
                <ArrowRight
                  size={18}
                  className="relative z-10 text-[#1c2b42] group-hover:text-white transition-colors duration-300"
                />
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-[#0a0a0a] text-white py-14 px-6 md:px-20">
          <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
              <div className="text-xl font-semibold tracking-tight">MYSHIFT</div>
              <p className="text-sm text-gray-500 mt-2">
                Platform manajemen shift F&B UMKM multi-cabang.
              </p>
            </div>
            <div className="flex gap-8 text-sm text-gray-500">
              <a href="#" className="hover:text-white transition-colors">Fitur</a>
              <a href="#" className="hover:text-white transition-colors">Cara Kerja</a>
              <a href="#" className="hover:text-white transition-colors">FAQ</a>
              <a href="#" className="hover:text-white transition-colors">Kontak</a>
            </div>
          </div>
          <div className="max-w-[1200px] mx-auto mt-10 pt-8 border-t border-gray-800">
            <p className="text-[11px] font-mono tracking-widest text-gray-600 uppercase">
              MYSHIFT (c) 2026. Platform manajemen shift F&B UMKM.
            </p>
          </div>
        </footer>
      </section>
    </div>
  );
}
