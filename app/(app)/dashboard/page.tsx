"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { request, AdminShell } from "@/components/phase1";
import { SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

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
};

export default function DashboardPage() {
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); }, []);

  async function load() {
    try {
      const data = await request<DashboardItem[]>("/api/dashboard");
      setItems(data);
    } catch { setItems([]); }
    setLoading(false);
  }

  return (
    <AdminShell title="Dashboard">
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="business"
          title="Belum ada cabang"
          description="Tambahkan cabang pertama untuk mulai mengelola shift."
          actionLabel="Tambah Cabang"
          actionHref="/cabang"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <motion.div
              key={item.branchId}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              whileHover={{ scale: 1.02 }}
              className="cursor-pointer rounded-lg border border-[#e5e5e5] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-700 ease-out"
            >
              <h2 className="mb-3 font-bold">{item.branchName}</h2>
              <div className="grid gap-2 text-sm">
                <div>Shift hari ini: <strong>{item.shiftsToday}</strong></div>
                <div>Dimulai: <strong>{item.shiftsStarted}</strong></div>
                <div>Selesai: <strong>{item.shiftsCompleted}</strong></div>
                <div>Checklist: <strong>{item.checklistPercent}%</strong></div>
                <div>Handover: <strong>{item.handoverCount}</strong></div>
                <div>Swap pending: <strong>{item.pendingSwaps}</strong></div>
                <div>Izin pending: <strong>{item.pendingIzins}</strong></div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
