"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { request } from "@/components/phase1";

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
    <main className="min-h-screen bg-background px-6 py-8 text-foreground">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-10 flex flex-wrap items-center gap-4 border-b border-border pb-4 text-sm">
          <a href="/">MYSHIFT</a>
          <a href="/jadwal">Jadwal</a>
          <a href="/jadwal-saya">Jadwal Saya</a>
          <a href="/karyawan">Karyawan</a>
          <a href="/cabang">Cabang</a>
          <a href="/shift-template">Shift Template</a>
          <a href="/checklist-template">Checklist</a>
          <a href="/handover-template">Handover</a>
          <a href="/dashboard">Dashboard</a>
          <a href="/laporan">Laporan</a>
          <a href="/riwayat">Riwayat</a>
          <a href="/approval/swap">Approval Swap</a>
          <a href="/approval/izin">Approval Izin</a>
        </nav>
        <h1 className="mb-6 text-3xl font-bold">Dashboard</h1>
        {loading && <p className="text-muted-foreground">Memuat...</p>}
        {!loading && items.length === 0 && <p className="text-muted-foreground">Tidak ada data cabang.</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.branchId}>
              <CardHeader>
                <CardTitle>{item.branchName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm">
                  <div>Shift hari ini: <strong>{item.shiftsToday}</strong></div>
                  <div>Dimulai: <strong>{item.shiftsStarted}</strong></div>
                  <div>Selesai: <strong>{item.shiftsCompleted}</strong></div>
                  <div>Checklist: <strong>{item.checklistPercent}%</strong></div>
                  <div>Handover: <strong>{item.handoverCount}</strong></div>
                  <div>Swap pending: <strong>{item.pendingSwaps}</strong></div>
                  <div>Izin pending: <strong>{item.pendingIzins}</strong></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
