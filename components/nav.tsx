"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { request } from "@/lib/api";
import { Dock } from "@/components/dock";
import { useLogout } from "@/components/use-logout";
import { LogOut, Store, CircleUserRound } from "lucide-react";
import {
  ADMIN_DOCK_EXTRAS,
  ADMIN_DOCK_TABS,
  ADMIN_NAV_GROUPS,
  groupsForRole,
  groupsWithoutTabs,
  itemsForRole,
} from "@/components/nav-config";
import { cn } from "@/lib/utils";

type NavRole = "admin" | "karyawan";

type SessionInfo = {
  employeeId: string;
  nama: string;
  role: NavRole;
  activeBranchId: string;
  branches: { branchId: string; nama: string }[];
};

/**
 * Header navigasi Admin.
 *
 * Desktop (`lg+`): nav horizontal di header — ruangnya cukup, jadi semua menu tampil datar.
 * Mobile: tidak ada hamburger lagi; navigasi pindah ke dock 4 tab + "Lainnya" (`<Dock />`), satu
 * model navigasi yang sama dengan karyawan.
 */
export function Nav() {
  const pathname = usePathname();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const logout = useLogout();

  useEffect(() => {
    request<SessionInfo>("/api/auth/session")
      .then(setSession)
      .catch(() => {});
  }, []);

  const isAdmin = session?.role === "admin";

  // Satu sumber data untuk header dan dock: item yang jadi tab dock tidak boleh muncul dua kali.
  const desktopGroups = groupsForRole(ADMIN_NAV_GROUPS, isAdmin);
  const desktopItems = desktopGroups.flatMap((group) => group.items);
  const dockTabs = itemsForRole(ADMIN_DOCK_TABS, isAdmin);
  const dockGroups = groupsWithoutTabs(groupsForRole(ADMIN_NAV_GROUPS, isAdmin), dockTabs);

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
              {desktopItems.map((item) => (
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
                  <Store size={14} />
                  <span className="hidden md:inline">{session.activeBranchId}</span>
                </Link>
              </Button>
            )}

            <ThemeToggle />

            <Button asChild variant="ghost" size="icon" className="size-8" title="Profil saya">
              <Link href="/profil" aria-label="Profil Saya">
                <CircleUserRound size={18} />
              </Link>
            </Button>

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

      <Dock
        tabs={dockTabs}
        groups={dockGroups}
        extras={ADMIN_DOCK_EXTRAS}
        ariaLabel="Navigasi utama (mobile)"
      />
    </>
  );
}
