"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { request, AdminShell } from "@/components/phase1";
import { useToast } from "@/components/ui/toast";
import { SkeletonTable } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

type LaporanRow = {
  type: string;
  id: string;
  date: string;
  employeeId: string;
  employeeName: string;
  details: string;
  status: string;
};

export default function LaporanPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<LaporanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const data = await request<LaporanRow[]>(`/api/laporan?${params}`);
      setRows(data);
    } catch { setRows([]); }
    setLoading(false);
  }

  async function exportCSV() {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/laporan?${params}&format=csv`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `laporan-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast("Export CSV berhasil!", "success");
    } catch { toast("Export gagal", "error"); }
  }

  return (
    <AdminShell title="Laporan">
      <div className="mb-6 flex flex-wrap gap-3">
        <input className="h-11 rounded-lg border-[#e5e5e5] px-4" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input className="h-11 rounded-lg border-[#e5e5e5] px-4" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <Button className="h-11 rounded-lg bg-[#0075de] text-white" onClick={load}>Cari</Button>
        <Button className="h-11 rounded-lg border border-[#e5e5e5] bg-white" onClick={exportCSV}>Export CSV</Button>
      </div>
      {loading ? (
        <SkeletonTable rows={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="assessment"
          title="Belum ada laporan"
          description="Atur filter tanggal lalu klik Cari untuk melihat laporan."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#e5e5e5]">
          <table className="w-full text-left text-sm">
            <thead><tr className="bg-[#f0f1f5]"><th className="p-3">Tipe</th><th className="p-3">ID</th><th className="p-3">Tanggal</th><th className="p-3">Karyawan</th><th className="p-3">Detail</th><th className="p-3">Status</th></tr></thead>
            <tbody>
              {rows.map((row, i) => (
                <motion.tr
                  key={`${row.type}-${row.id}-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="border-t border-[#e5e5e5]"
                >
                  <td className="p-3">{row.type}</td>
                  <td className="p-3">{row.id}</td>
                  <td className="p-3">{row.date}</td>
                  <td className="p-3">{row.employeeId}</td>
                  <td className="p-3">{row.details}</td>
                  <td className="p-3">{row.status}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
