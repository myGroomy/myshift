"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";

export function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  const navItems = [
    { href: "/", label: "Beranda" },
    { href: "/jadwal", label: "Jadwal" },
    { href: "/jadwal-saya", label: "Jadwal Saya" },
    { href: "/karyawan", label: "Karyawan" },
    { href: "/cabang", label: "Cabang" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/laporan", label: "Laporan" },
    { href: "/riwayat", label: "Riwayat" },
  ];

  useEffect(() => {
    const stored = localStorage.getItem("myshift-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefersDark;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("myshift-theme", next ? "dark" : "light");
  }

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-0 z-50 border-b border-[#e5e5e5] bg-[#faf9fe]/80 backdrop-blur-xl dark:bg-[#1a1b1f]/80"
      >
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-tight text-[#0075de]">
              MYSHIFT
            </Link>
            <div className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <motion.span
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${isActive(item.href) ? "bg-[#0075de] text-white" : "text-[#615d59] hover:text-[#0075de] hover:bg-[#f0f1f5]"}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {item.label}
                  </motion.span>
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDark}
                aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
                className="h-9 w-9 rounded-lg"
              >
                <span className="material-symbols-outlined text-lg">{dark ? "light_mode" : "dark_mode"}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                className="h-9 w-9 rounded-lg md:hidden"
              >
                <span className="material-symbols-outlined text-lg">menu</span>
              </Button>
            </div>
          </div>
        </div>
      </motion.nav>

      <Sheet open={mobileOpen} onClose={() => setMobileOpen(false)} side="left">
        <div className="flex h-full flex-col p-4">
          <div className="mb-6 flex items-center justify-between">
            <Link href="/" onClick={() => setMobileOpen(false)} className="text-xl font-bold tracking-tight text-[#0075de]">
              MYSHIFT
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close menu" className="h-9 w-9 rounded-lg">
              <span className="material-symbols-outlined text-lg">close</span>
            </Button>
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-[#0075de] text-white"
                    : "text-[#615d59] hover:bg-[#f0f1f5] hover:text-[#0075de]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto border-t border-[#e5e5e5] pt-4">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center rounded-lg bg-[#0075de] px-4 py-3 text-sm font-medium text-white"
            >
              Masuk
            </Link>
          </div>
        </div>
      </Sheet>
    </>
  );
}

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
      className="border-t border-[#e5e5e5] bg-[#f0f1f5] py-16 dark:bg-[#2d2d30]"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <h3 className="mb-4 text-xl font-bold text-[#0075de]">MYSHIFT</h3>
            <p className="text-sm text-[#615d59]">Manajemen shift F&B UMKM. Solusi digital untuk pengaturan jadwal kerja.</p>
          </div>
          <div>
            <h4 className="mb-4 font-semibold">Navigasi</h4>
            <ul className="space-y-2 text-sm text-[#615d59]">
              <li><Link href="/jadwal" className="hover:text-[#0075de]">Jadwal</Link></li>
              <li><Link href="/jadwal-saya" className="hover:text-[#0075de]">Jadwal Saya</Link></li>
              <li><Link href="/karyawan" className="hover:text-[#0075de]">Karyawan</Link></li>
              <li><Link href="/cabang" className="hover:text-[#0075de]">Cabang</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 font-semibold">Fitur</h4>
            <ul className="space-y-2 text-sm text-[#615d59]">
              <li><Link href="/swap/ajukan" className="hover:text-[#0075de]">Swap Shift</Link></li>
              <li><Link href="/izin/ajukan" className="hover:text-[#0075de]">Izin</Link></li>
              <li><Link href="/dashboard" className="hover:text-[#0075de]">Dashboard</Link></li>
              <li><Link href="/laporan" className="hover:text-[#0075de]">Laporan</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 font-semibold">Akses</h4>
            <Button asChild className="h-11 rounded-lg bg-[#0075de] text-white">
              <Link href="/login">Masuk</Link>
            </Button>
          </div>
        </div>
        <div className="mt-12 border-t border-[#e5e5e5] pt-8 text-center text-xs text-[#615d59]">
          <p>MYSHIFT &copy; 2026. Platform manajemen shift F&B UMKM.</p>
        </div>
      </div>
    </motion.footer>
  );
}
