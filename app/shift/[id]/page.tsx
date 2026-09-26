"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { request } from "@/components/phase1";

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
    try { await request(`/api/schedules/${id}/start-shift`, { method: "POST" }); setDetail((d) => d ? { ...d, status: "started", startedAt: new Date().toISOString() } : null); } catch (e) { alert(e instanceof Error ? e.message : "Gagal"); }
    finally { setStarting(false); }
  }

  if (!detail) return <main className="min-h-screen bg-background px-6 py-8 text-foreground"><div className="mx-auto max-w-4xl"><h1 className="mb-6 text-3xl font-bold">Detail Shift</h1><p>Memuat...</p></div></main>;

  const statusClass = detail.status === "started" ? "bg-green-600 text-white" : detail.status === "scheduled" ? "bg-yellow-600 text-white" : "bg-gray-600 text-white";

  return <main className="min-h-screen bg-background px-6 py-8 text-foreground"><div className="mx-auto max-w-4xl"><nav className="mb-10 flex flex-wrap items-center gap-4 border-b border-border pb-4 text-sm"><a href="/">MYSHIFT</a><a href="/jadwal">Jadwal</a><a href="/jadwal-saya">Jadwal Saya</a><a href="/karyawan">Karyawan</a><a href="/cabang">Cabang</a><a href="/shift-template">Shift Template</a><a href="/checklist-template">Checklist</a><a href="/handover-template">Handover</a><a href="/riwayat">Riwayat</a></nav><h1 className="mb-6 text-3xl font-bold">Detail Shift</h1><Card className="mb-6"><CardHeader><CardTitle>{detail.date} · {detail.shiftId}</CardTitle></CardHeader><CardContent><div className="grid gap-4"><div className="flex justify-between"><span className="text-sm text-muted-foreground">Status</span><span className={`rounded px-2 py-1 text-xs font-medium ${statusClass}`}>{detail.status}</span></div><div className="flex justify-between"><span className="text-sm text-muted-foreground">Karyawan</span><span>{detail.employeeId}</span></div><div className="flex justify-between"><span className="text-sm text-muted-foreground">Dimulai</span><span>{detail.startedAt || "-"}</span></div></div></CardContent></Card>{detail.status === "scheduled" && <Button onClick={startShift} disabled={starting}>{starting ? "Memulai..." : "Mulai Shift"}</Button>}<div className="mt-4 flex gap-2"><Button variant="outline" onClick={() => router.push(`/shift/${id}/checklist`)}>Checklist ({completed ?? "-"})</Button><Button variant="outline" onClick={() => router.push(`/shift/${id}/handover`)}>Handover</Button><Button variant="outline" onClick={() => router.push("/jadwal-saya")}>Kembali</Button></div></div></main>;
}