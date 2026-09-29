"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { NavGroup, NavItem } from "@/components/nav-config";

/**
 * Dock untuk layar kecil: 4 tab esensial + tombol "Lainnya" yang membuka sheet berisi sisa menu.
 * Menggantikan hamburger (admin) dan bar bawah 5 tab (karyawan) supaya kedua shell punya satu
 * model navigasi yang sama.
 *
 * Styling memakai token yang sudah dipakai halaman lain: `rounded-xl` (24px), `bg-card`,
 * `border-border`, active state `bg-accent text-accent-foreground`. Tidak ada shadow berat —
 * `atlassian-DESIGN.md` menyebut hierarki datar: pemisahan lewat warna dan spasi, bukan kedalaman.
 * Target sentuh tiap item `min-h-14` (≥44px), plus `env(safe-area-inset-bottom)` untuk iOS.
 *
 * Kolom grid dihitung dari `tabs.length + 1` lewat inline style, bukan kelas Tailwind dinamis —
 * kelas hasil interpolasi tidak dibuat compiler, jadi dock-nya bisa jadi rusak diam-diam.
 */
export function Dock({
  tabs,
  groups,
  extras = [],
  onLogout,
  ariaLabel,
}: {
  tabs: NavItem[];
  groups: NavGroup[];
  extras?: NavItem[];
  onLogout?: () => void;
  ariaLabel: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  // Halaman yang sedang dibuka boleh tersembunyi di dalam "Lainnya" — tombolnya lalu diberi state
  // aktif supaya pengguna tidak kehilangan jejak halaman mana yang sedang dibuka.
  const insideGroup =
    groups.some((group) => group.items.some((item) => isCurrent(item.href))) ||
    extras.some((item) => isCurrent(item.href));
  const close = () => setOpen(false);

  const tabClass = (current: boolean) =>
    cn(
      "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[11px] font-medium transition-colors",
      current
        ? "bg-accent font-semibold text-accent-foreground"
        : "text-muted-foreground hover:text-foreground",
    );

  const linkClass = (current: boolean) =>
    cn(
      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
      current ? "bg-accent font-semibold text-accent-foreground" : "text-foreground hover:bg-muted",
    );

  return (
    <>
      <nav
        aria-label={ariaLabel}
        className="fixed inset-x-0 bottom-4 z-50 mx-auto w-full max-w-md px-4 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div
          className="grid gap-1 rounded-xl border border-border bg-card p-1.5"
          style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}
        >
          {tabs.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isCurrent(item.href) ? "page" : undefined}
              className={tabClass(isCurrent(item.href))}
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
            className={tabClass(insideGroup)}
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">
              apps
            </span>
            <span>Lainnya</span>
          </button>
        </div>
      </nav>

      <Sheet open={open} onClose={close} side="bottom">
        <div className="flex max-h-[80dvh] flex-col p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Menu lain</h2>
              <p className="text-xs text-muted-foreground">Semua halaman di luar 4 tab utama.</p>
            </div>
            <Button variant="ghost" size="icon" onClick={close} aria-label="Tutup menu" className="size-8">
              <span className="material-symbols-outlined text-xl">close</span>
            </Button>
          </div>

          <div className="-mx-1 flex-1 overflow-y-auto">
            {groups.map((group) => (
              <div key={group.label} className="mb-4 last:mb-0">
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-widest text-subtle-foreground">
                  {group.label}
                </p>
                <ul>
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={close}
                        aria-current={isCurrent(item.href) ? "page" : undefined}
                        className={linkClass(isCurrent(item.href))}
                      >
                        <span className="material-symbols-outlined text-lg" aria-hidden="true">
                          {item.icon}
                        </span>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {extras.length > 0 && (
              <ul>
                {extras.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={close}
                      aria-current={isCurrent(item.href) ? "page" : undefined}
                      className={linkClass(isCurrent(item.href))}
                    >
                      <span className="material-symbols-outlined text-lg" aria-hidden="true">
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  close();
                  onLogout();
                }}
                className="mt-2 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                <span className="material-symbols-outlined text-lg" aria-hidden="true">
                  logout
                </span>
                Keluar dari Akun
              </button>
            )}
          </div>
        </div>
      </Sheet>
    </>
  );
}

