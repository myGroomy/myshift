"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { request } from "@/components/phase1";
import BottomNav from "@/components/bottom-nav";

type ShiftDetail = {
  scheduleId: string;
  employeeId: string;
  shiftId: string;
  date: string;
  status: string;
  startedAt: string;
  employeeName: string;
};

export default function ShiftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<ShiftDetail | null>(null);
  const [starting, setStarting] = useState(false);
  const [completed, setCompleted] = useState(0);

  useEffect(() => {
    if (!id) return;
    void request<ShiftDetail>(`/api/schedules/${id}`).then(setDetail).catch(() => {});
    void request<{ completed: number }>(`/api/schedules/${id}/checklist`).then((d) => setCompleted(d.completed)).catch(() => {});
  }, [id]);

  async function startShift() {
    setStarting(true);
    try { await request(`/api/schedules/${id}/start-shift`, { method: "POST" }); setDetail((d) => d ? { ...d, status: "started", startedAt: new Date().toISOString() } : null); }
    catch (e) { alert(e instanceof Error ? e.message : "Gagal"); }
    finally { setStarting(false); }
  }

  if (!detail) return <main className="min-h-screen bg-[#faf9fe] pb-20 text-[#000000]"><div className="mx-auto max-w-6xl px-4 py-6"><h1 className="mb-6 text-2xl font-bold">Detail Shift</h1><p className="text-[#615d59]">Memuat...</p></div></main>;

  const statusClass = detail.status === "started" ? "bg-[#0075de] text-white" : detail.status === "scheduled" ? "bg-[#615d59] text-white" : "bg-[#615d59] text-white";

  return (
    <main className="min-h-screen bg-[#faf9fe] pb-20 text-[#000000]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="mb-6 text-2xl font-bold">Detail Shift</h1>
          <div className="mb-6 rounded-lg border border-[#e5e5e5] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="grid gap-4">
              <div className="flex justify-between"><span className="text-sm text-[#615d59]">Status</span><span className={`rounded px-2 py-1 text-xs font-medium ${statusClass}`}>{detail.status}</span></div>
              <div className="flex justify-between"><span className="text-sm text-[#615d59]">Karyawan</span><span>{detail.employeeId}</span></div>
              <div className="flex justify-between"><span className="text-sm text-[#615d59]">Dimulai</span><span>{detail.startedAt || "-"}</span></div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {detail.status === "scheduled" ? <Button onClick={startShift} disabled={starting} className="rounded-lg bg-[#0075de] text-white">{starting ? "Memulai..." : "Mulai Shift"}</Button> : null}
            <Button variant="outline" onClick={() => router.push(`/shift/${id}/checklist`)} className="rounded-lg border-[#e5e5e5]">Checklist ({completed ?? "-"})</Button>
            <Button variant="outline" onClick={() => router.push(`/shift/${id}/handover`)} className="rounded-lg border-[#e5e5e5]">Handover</Button>
            <Button variant="outline" onClick={() => router.push("/jadwal-saya")} className="rounded-lg border-[#e5e5e5]">Kembali</Button>
          </div>
        </motion.div>
        <BottomNav />
      </div>
    </main>
  );
}
