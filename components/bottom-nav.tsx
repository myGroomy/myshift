"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";

const navItems = [
  { href: "/jadwal-saya", label: "Jadwal", icon: "calendar_today" },
  { href: "/jadwal", label: "Semua Jadwal", icon: "view_day" },
  { href: "/shift-template", label: "Template", icon: "content_paste" },
  { href: "/", label: "Beranda", icon: "home" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#e5e5e5] bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.04)] dark:bg-[#1a1b1f] dark:border-[#3a3a3e]"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid h-16 grid-cols-4">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <motion.div
                className={`flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${isActive(item.href) ? "text-[#0075de]" : "text-[#615d59]"}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="material-symbols-outlined text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </motion.nav>
  );
}

export function KaryawanShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#faf9fe] pb-20 pt-4 text-[#000000]">
      <div className="mx-auto max-w-6xl px-4">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 text-2xl font-bold"
        >
          {title}
        </motion.h1>
        {children}
      </div>
      <BottomNav />
    </main>
  );
}
