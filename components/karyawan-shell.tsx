"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Dock } from "@/components/dock";
import { useLogout } from "@/components/use-logout";
import { LogOut, Store } from "lucide-react";
import {
  KARYAWAN_DOCK_EXTRAS,
  KARYAWAN_DOCK_TABS,
  KARYAWAN_NAV_ITEMS,
} from "@/components/nav-config";
import { cn } from "@/lib/utils";

/**
 * Shell untuk karyawan: header + dock 4 tab + "Lainnya" di layar kecil, nav horizontal di `lg+`.
 *
 * Kenapa karyawan juga dapat nav horizontal di desktop: dock disembunyikan di layar lebar, jadi
 * tanpa itu karyawan kehilangan navigasi (dan jalan keluar dari akun) di desktop. Karena itu
 * tombol logout ada di header — dulu tidak ada, keluar hanya lewat halaman Profil.
 */
export function KaryawanShell({
  title,
  lead,
  actions,
  children,
}: {
  title: string;
  lead?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const logout = useLogout();
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-[100dvh] bg-background pb-28 text-foreground lg:pb-0">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-3 px-4 sm:px-6">
          <Link href="/jadwal-saya" className="flex shrink-0 items-center gap-2 text-sm font-bold text-foreground">
            <span className="grid size-6 place-items-center rounded-sm bg-primary text-[11px] font-bold text-primary-foreground">
              MS
            </span>
            MYSHIFT
          </Link>

          <nav aria-label="Navigasi karyawan" className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto lg:flex">
            {KARYAWAN_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isCurrent(item.href) ? "page" : undefined}
                className={cn(
                  "block whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  isCurrent(item.href)
                    ? "bg-accent font-semibold text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <Button asChild variant="ghost" size="icon" className="size-8" title="Pilih cabang">
              <Link href="/pilih-cabang" aria-label="Pilih cabang">
                <Store size={18} />
              </Link>
            </Button>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="size-8 text-destructive"
              title="Keluar"
              aria-label="Keluar dari akun"
            >
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-[1200px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">{title}</h1>
            {lead ? <p className="mt-1 text-sm text-muted-foreground">{lead}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        {children}
      </main>

      <Dock
        tabs={KARYAWAN_DOCK_TABS}
        groups={[]}
        extras={KARYAWAN_DOCK_EXTRAS}
        onLogout={logout}
        ariaLabel="Navigasi karyawan (mobile)"
      />
    </div>
  );
}
