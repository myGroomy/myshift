"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { request } from "@/lib/api";
import { AdminShell } from "@/components/shell";
import { KaryawanShell } from "@/components/karyawan-shell";
import { SkeletonCard } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shell";
import { LogOut, User, Store } from "lucide-react";

type Session = {
  employeeId: string;
  nama: string;
  role: "admin" | "karyawan";
  activeBranchId: string;
  branches: { branchId: string; nama: string }[];
};

export default function ProfilPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    request<Session>("/api/auth/session")
      .then(setSession)
      .catch((e: unknown) => {
        toast(e instanceof Error ? e.message : "Gagal memuat sesi", "error");
      })
      .finally(() => setLoading(false));
  }, [toast]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await request("/api/auth/logout", { method: "POST" });
      toast("Berhasil keluar", "success");
      router.push("/login");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal keluar", "error");
      setLoggingOut(false);
    }
  }

  const Shell = session?.role === "karyawan" ? KaryawanShell : AdminShell;
  const activeBranch = session?.branches.find((b) => b.branchId === session.activeBranchId);

  return (
    <Shell title="Profil Saya" lead="Informasi akun dan akses cabang operasional Anda.">
      {loading ? (
        <div className="max-w-4xl">
          <SkeletonCard />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid gap-6 lg:grid-cols-3"
        >
          {/* Profile Card */}
          <div className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6 lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {session?.employeeId}
                </p>
                <h2 className="mt-1 text-xl font-bold text-foreground">{session?.nama}</h2>
                <div className="mt-2">
                  <StatusBadge status={session?.role ?? "karyawan"} />
                </div>
              </div>
              <div className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <User size={28} />
              </div>
            </div>

            <div className="mt-6 divide-y divide-border border-t border-border pt-4 text-sm">
              <div className="flex items-center justify-between py-3">
                <span className="text-muted-foreground">Cabang Aktif</span>
                <span className="font-medium text-foreground">
                  {activeBranch ? `${activeBranch.nama} (${activeBranch.branchId})` : "-"}
                </span>
              </div>
              <div className="flex items-start justify-between py-3">
                <span className="text-muted-foreground">Cabang Terafiliasi</span>
                <div className="text-right">
                  {session?.branches && session.branches.length > 0 ? (
                    session.branches.map((b) => (
                      <p key={b.branchId} className="font-medium text-foreground">
                        {b.nama}
                      </p>
                    ))
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
              </div>
            </div>

            {session?.branches && session.branches.length > 1 && (
              <div className="mt-4 pt-2">
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link href="/pilih-cabang">
                    <Store size={14} />
                    Ganti Cabang Kerja
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* Session Card */}
          <div className="h-fit rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
            <h3 className="mb-2 text-base font-semibold text-foreground">Sesi Akun</h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Akhiri sesi kerja Anda saat bertukar perangkat atau selesai shift.
            </p>
            <Button
              variant="destructive"
              disabled={loggingOut}
              onClick={handleLogout}
              className="w-full"
            >
              <LogOut size={16} />
              {loggingOut ? "Mengakhiri sesi..." : "Keluar dari Akun"}
            </Button>
          </div>
        </motion.div>
      )}
    </Shell>
  );
}
