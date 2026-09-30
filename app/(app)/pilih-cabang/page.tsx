"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { request } from "@/lib/api";
import { AdminShell } from "@/components/shell";
import { PetugasShell } from "@/components/petugas-shell";
import { SkeletonCard } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { EmployeeRole } from "@/lib/domain/employee-role";

type Session = {
  employeeId: string;
  nama: string;
  role: EmployeeRole;
  activeBranchId: string;
  branches: { branchId: string; nama: string }[];
};

export default function PilihCabangPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    request<Session>("/api/auth/session")
      .then((s) => {
        setSession(s);
        // Petugas get branch context from each assigned schedule, not a manually selected branch.
        if (s.role === "petugas") {
          router.replace("/jadwal-saya");
        } else if (s.branches.length <= 1) {
          router.replace("/dashboard");
        }
      })
      .catch((e: unknown) => {
        toast(e instanceof Error ? e.message : "Gagal memuat sesi", "error");
      })
      .finally(() => setLoading(false));
  }, [router, toast]);

  async function selectBranch(branchId: string) {
    if (branchId === session?.activeBranchId) {
      router.push(session.role === "petugas" ? "/jadwal-saya" : "/dashboard");
      return;
    }

    setSwitching(branchId);
    try {
      await request("/api/auth/select-branch", {
        method: "POST",
        body: JSON.stringify({ branchId }),
      });
      toast("Cabang aktif diperbarui", "success");
      router.push(session?.role === "petugas" ? "/jadwal-saya" : "/dashboard");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal memilih cabang", "error");
      setSwitching(null);
    }
  }

  const Shell = session?.role === "petugas" ? PetugasShell : AdminShell;

  if (loading) {
    return <div className="mx-auto max-w-[1200px] px-4 py-8 text-sm text-muted-foreground">Memuat cabang pengelolaan...</div>;
  }

  return (
    <Shell
      title="Pilih Cabang"
      lead="Tentukan cabang kerja aktif Anda saat ini. Data jadwal dan checklist akan disesuaikan."
    >
      {loading ? (
        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          {session?.branches.map((b, i) => {
            const isActive = b.branchId === session.activeBranchId;
            const isBusy = switching === b.branchId;
            return (
              <motion.div
                key={b.branchId}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.3 }}
                className={cn(
                  "flex flex-col justify-between rounded-lg border p-5 transition-all",
                  isActive
                    ? "border-primary bg-accent/40 shadow-sm"
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {b.branchId}
                    </span>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-wash px-2 py-0.5 text-xs font-medium text-success">
                        <Check size={14} />
                        Aktif
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-foreground">{b.nama}</h3>
                </div>

                <div className="mt-6">
                  <Button
                    onClick={() => selectBranch(b.branchId)}
                    disabled={isBusy}
                    variant={isActive ? "secondary" : "default"}
                    className="w-full"
                  >
                    {isBusy ? "Beralih..." : isActive ? "Gunakan Cabang Ini" : "Pilih Cabang"}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
