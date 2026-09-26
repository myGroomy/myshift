"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

export function Nav() {
  const pathname = usePathname();
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

  return (
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
          <Button variant="ghost" size="icon" asChild className="md:hidden">
            <Link href="/">Menu</Link>
          </Button>
        </div>
      </div>
    </motion.nav>
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
