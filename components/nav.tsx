"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { request } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type NavRole = "admin" | "kepala_cabang" | "karyawan";

type SessionInfo = {
  employeeId: string;
  nama: string;
  role: NavRole;
  activeBranchId: string;
  branches: { branchId: string; nama: string }[];
};

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [session, setSession] = useState<SessionInfo | null>(null);

  useEffect(() => {
    request<SessionInfo>("/api/auth/session")
      .then(setSession)
      .catch(() => {});
  }, []);

  async function handleLogout() {
    try {
      await request("/api/auth/logout", { method: "POST" });
      toast("Berhasil keluar", "success");
      router.push("/login");
    } catch {
      router.push("/login");
    }
  }

  const role = session?.role ?? "admin";
  const isAdmin = role === "admin";
  

  const navGroups = [
    {
      label: "Operasional",
      items: [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/jadwal", label: "Jadwal" },
        { href: "/laporan", label: "Laporan" },
      ],
    },
    ...(isAdmin
      ? [
          {
            label: "Master Data",
            items: [
              { href: "/cabang", label: "Cabang" },
              { href: "/karyawan", label: "Karyawan" },
              { href: "/shift-template", label: "Shift Template" },
              { href: "/kategori-izin", label: "Kategori Izin" },
            ],
          },
        ]
      : []),
    {
      label: "Template",
      items: [
        { href: "/checklist-template", label: "Checklist" },
        ...(isAdmin ? [{ href: "/handover-template", label: "Handover" }] : []),
      ],
    },
    {
      label: "Approval",
      items: [
        { href: "/approval/swap", label: "Swap" },
        { href: "/approval/izin", label: "Izin" },
      ],
    },
  ];

  const allItems = navGroups.flatMap((group) => group.items);

  function isCurrent(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-2 text-sm font-bold tracking-tight text-foreground"
          >
            <span className="grid size-6 place-items-center rounded-sm bg-primary text-[11px] font-bold text-primary-foreground">
              MS
            </span>
            MYSHIFT
          </Link>

          <nav aria-label="Navigasi utama" className="hidden min-w-0 flex-1 lg:block">
            <ul className="flex items-center gap-0.5 overflow-x-auto">
              {allItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isCurrent(item.href) ? "page" : undefined}
                    className={cn(
                      "block whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                      isCurrent(item.href)
                        ? "bg-accent font-semibold text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            {session?.branches && session.branches.length > 1 && (
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex text-xs">
                <Link href="/pilih-cabang" title="Pindah cabang">
                  <span className="material-symbols-outlined text-sm">storefront</span>
                  <span className="hidden md:inline">{session.activeBranchId}</span>
                </Link>
              </Button>
            )}

            <ThemeToggle />

            <Button asChild variant="ghost" size="icon" className="size-8" title="Profil saya">
              <Link href="/profil" aria-label="Profil Saya">
                <span className="material-symbols-outlined text-lg">account_circle</span>
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="size-8 text-destructive"
              title="Keluar"
              aria-label="Keluar dari akun"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              aria-label="Buka menu"
              className="lg:hidden"
            >
              <span className="material-symbols-outlined text-xl">menu</span>
            </Button>
          </div>
        </div>
      </header>

      <Sheet open={mobileOpen} onClose={() => setMobileOpen(false)} side="left">
        <div className="flex h-full flex-col p-4">
          <div className="mb-6 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-bold text-foreground">
              <span className="grid size-6 place-items-center rounded-sm bg-primary text-[11px] font-bold text-primary-foreground">
                MS
              </span>
              MYSHIFT
            </span>
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Tutup menu">
              <span className="material-symbols-outlined text-xl">close</span>
            </Button>
          </div>

          <nav aria-label="Navigasi mobile" className="flex-1 overflow-y-auto">
            {navGroups.map((group) => (
              <div key={group.label} className="mb-5">
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-widest text-subtle-foreground">
                  {group.label}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        aria-current={isCurrent(item.href) ? "page" : undefined}
                        className={cn(
                          "block rounded-md px-3 py-2 text-sm transition-colors",
                          isCurrent(item.href)
                            ? "bg-accent font-semibold text-accent-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="border-t border-border pt-4">
            <Link
              href="/profil"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              <span className="material-symbols-outlined text-lg">person</span>
              <span>Profil Saya ({session?.nama || "User"})</span>
            </Link>
            <button
              onClick={() => {
                setMobileOpen(false);
                handleLogout();
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              <span>Keluar dari Akun</span>
            </button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
