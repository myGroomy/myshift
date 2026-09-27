"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/jadwal-saya", label: "Jadwal", icon: "calendar_today" },
  { href: "/swap/ajukan", label: "Swap", icon: "swap_horiz" },
  { href: "/izin/ajukan", label: "Izin", icon: "event_busy" },
  { href: "/riwayat", label: "Riwayat", icon: "history" },
  { href: "/profil", label: "Profil", icon: "person" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi karyawan"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] shadow-sm"
    >
      <ul className="mx-auto grid max-w-[1200px] grid-cols-5 px-2">
        {navItems.map((item) => {
          const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-2 text-[11px] font-medium transition-colors",
                  current
                    ? "bg-accent font-semibold text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function KaryawanShell({
  title,
  lead,
  actions,
  children,
}: {
  title: string;
  lead?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-background pb-20 text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-3 px-4 sm:px-6">
          <Link href="/jadwal-saya" className="flex items-center gap-2 text-sm font-bold text-foreground">
            <span className="grid size-6 place-items-center rounded-sm bg-primary text-[11px] font-bold text-primary-foreground">
              MS
            </span>
            MYSHIFT
          </Link>
          <div className="ml-auto flex items-center gap-1.5">
            <Button asChild variant="ghost" size="icon" className="size-8" title="Pindah cabang">
              <Link href="/pilih-cabang" aria-label="Pilih cabang">
                <span className="material-symbols-outlined text-lg">storefront</span>
              </Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main
        id="main"
        className="mx-auto w-full max-w-[1200px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8"
      >
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">{title}</h1>
            {lead ? <p className="mt-1 text-sm text-muted-foreground">{lead}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
