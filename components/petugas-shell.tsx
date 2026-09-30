"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Dock } from "@/components/dock";
import { useLogout } from "@/components/use-logout";
import { LogOut } from "lucide-react";
import { Nav } from "@/components/nav";
import { PETUGAS_DOCK_EXTRAS, PETUGAS_DOCK_TABS, PETUGAS_NAV_ITEMS } from "@/components/nav-config";
import { cn } from "@/lib/utils";
import { request } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import type { EmployeeRole } from "@/lib/domain/employee-role";

/** Shell untuk layar kerja petugas; saat dipakai Admin, shell menampilkan navigasi Admin penuh. */
export function PetugasShell({
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
  const { toast } = useToast();
  const [role, setRole] = useState<EmployeeRole | null>(null);
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    request<{ role: EmployeeRole }>("/api/auth/session")
      .then((session) => setRole(session.role))
      .catch((error: unknown) => {
        toast(error instanceof Error ? error.message : "Gagal memuat navigasi akun", "error");
      });
  }, [toast]);

  return (
    <div className="min-h-[100dvh] bg-background pb-28 text-foreground lg:pb-0">
      {role === "admin" ? (
        <Nav />
      ) : (
        <header className="border-b border-border">
          <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-3 px-4 sm:px-6">
            <Link href="/jadwal-saya" className="flex shrink-0 items-center gap-2 text-sm font-bold text-foreground">
              <span className="grid size-6 place-items-center rounded-sm bg-primary text-[11px] font-bold text-primary-foreground">
                MS
              </span>
              MYSHIFT
            </Link>

            {role === null && (
              <nav aria-hidden="true" className="hidden min-w-0 flex-1 items-center gap-2 lg:flex">
                {Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="h-7 w-16 animate-pulse rounded-md bg-muted" />
                ))}
              </nav>
            )}

            {role === "petugas" && (
              <nav aria-label="Navigasi petugas" className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto lg:flex">
                {PETUGAS_NAV_ITEMS.map((item) => (
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
            )}

            {role === "petugas" && (
              <div className="ml-auto flex items-center gap-1.5">
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
            )}
            {role === null && <div aria-hidden="true" className="ml-auto h-8 w-24 animate-pulse rounded-md bg-muted" />}
          </div>
        </header>
      )}

      <main id="main" className="mx-auto w-full max-w-[1200px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-5 flex min-w-0 flex-wrap items-start justify-between gap-3 sm:mb-6 sm:items-end">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground text-balance sm:text-2xl">{title}</h1>
            {lead ? <p className="mt-1 text-sm text-muted-foreground">{lead}</p> : null}
          </div>
          {actions ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div> : null}
        </div>
        {children}
      </main>

      {role === "petugas" && (
        <Dock
          tabs={PETUGAS_DOCK_TABS}
          groups={[]}
          extras={PETUGAS_DOCK_EXTRAS}
          onLogout={logout}
          ariaLabel="Navigasi petugas (mobile)"
        />
      )}
      {role === null && (
        <div aria-hidden="true" className="fixed inset-x-0 bottom-4 z-50 mx-auto grid h-16 max-w-md grid-cols-5 gap-1 px-4 lg:hidden">
          {Array.from({ length: 5 }, (_, index) => <div key={index} className="animate-pulse rounded-lg bg-muted" />)}
        </div>
      )}
    </div>
  );
}
