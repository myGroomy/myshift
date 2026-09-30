"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { request } from "@/lib/api";
import { AdminShell } from "@/components/shell";
import { SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { RefreshCw, AlertCircle } from "lucide-react";

type DashboardItem = {
  branchId: string;
  branchName: string;
  shiftsToday: number;
  shiftsStarted: number;
  shiftsCompleted: number;
  checklistPercent: number;
  handoverCount: number;
  pendingSwaps: number;
  pendingIzins: number;
  openIncidents?: number;
  highIncidents?: number;
};

export default function DashboardPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await request<DashboardItem[]>("/api/dashboard");
      setItems(data);
    } catch (e) {
      const m = e instanceof Error ? e.message : "Gagal memuat ringkasan dashboard";
      setErrorMsg(m);
      toast(m, "error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell
      title="Dashboard Operasional"
      lead="Ringkasan aktivitas shift, SOP checklist, dan permohonan persetujuan hari ini."
      actions={
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} />
          Refresh
        </Button>
      }
    >
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : errorMsg ? (
        <div className="rounded-lg border border-destructive-wash bg-destructive-wash p-6 text-center">
          <AlertCircle size={36} className="text-destructive-foreground" />
          <p className="mt-2 text-sm text-destructive-foreground">{errorMsg}</p>
          <Button variant="outline" size="sm" onClick={load} className="mt-3">
            Coba Lagi
          </Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="storefront"
          title="Belum ada cabang terdaftar"
          description="Tambahkan cabang pertama untuk mulai mengelola shift dan SOP."
          actionLabel="Tambah Cabang"
          actionHref="/cabang"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <motion.div
              key={item.branchId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="flex min-w-0 flex-col justify-between rounded-lg border border-border bg-card p-4 shadow-xs transition-shadow hover:shadow-sm sm:p-5"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {item.branchId}
                  </span>
                  {(item.pendingSwaps > 0 || item.pendingIzins > 0) && (
                    <span className="rounded-full bg-warning-wash px-2 py-0.5 text-xs font-medium text-warning">
                      {item.pendingSwaps + item.pendingIzins} Perlu Ditinjau
                    </span>
                  )}
                </div>
                <h2 className="mt-1 text-lg font-bold text-foreground">{item.branchName}</h2>

                <div className="mt-4 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Shift Hari Ini</span>
                    <span className="font-semibold text-foreground">{item.shiftsToday}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Berjalan (Started)</span>
                    <span className="font-medium text-foreground">{item.shiftsStarted}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Selesai (Completed)</span>
                    <span className="font-medium text-success">{item.shiftsCompleted}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-muted-foreground">Kepatuhan SOP</span>
                    <span className="font-semibold text-primary">{item.checklistPercent}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${item.checklistPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-muted-foreground">Log Handover</span>
                    <span className="font-medium text-foreground">{item.handoverCount} catatan</span>
                  </div>

                  {(item.openIncidents ?? 0) > 0 && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-muted-foreground">Incident Open</span>
                      <span
                        className={`font-semibold ${
                          (item.highIncidents ?? 0) > 0 ? "text-destructive" : "text-warning"
                        }`}
                      >
                        {item.openIncidents}
                        {(item.highIncidents ?? 0) > 0 && ` (${item.highIncidents} high)`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link href={`/jadwal?branchId=${item.branchId}`}>Jadwal</Link>
                </Button>
                {item.pendingSwaps > 0 && (
                  <Button asChild size="sm" variant="secondary" className="text-xs">
                    <Link href="/approval?tab=swap">Swap ({item.pendingSwaps})</Link>
                  </Button>
                )}
                {item.pendingIzins > 0 && (
                  <Button asChild size="sm" variant="secondary" className="text-xs">
                    <Link href="/approval?tab=izin">Izin ({item.pendingIzins})</Link>
                  </Button>
                )}
                {(item.openIncidents ?? 0) > 0 && (
                  <Button asChild size="sm" variant="secondary" className="text-xs">
                    <Link href="/incident">Incident ({item.openIncidents})</Link>
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
