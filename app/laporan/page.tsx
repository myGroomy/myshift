"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { request } from "@/components/phase1";

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
  const [rows, setRows] = useState<LaporanRow[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const data = await request<LaporanRow[]>(`/api/laporan?${params}`);
      setRows(data);
    } catch { setRows([]); }
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
      a.href = url;
      a.download = `laporan-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Export gagal"); }
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
        <h1 className="mb-6 text-3xl font-bold">Laporan</h1>
        <div className="mb-6 flex flex-wrap gap-3">
          <input className="h-10 rounded-md border border-border px-3" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input className="h-10 rounded-md border border-border px-3" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <Button className="h-10" onClick={load}>Cari</Button>
          <Button className="h-10" variant="outline" onClick={exportCSV}>Export CSV</Button>
        </div>
        {loading && <p className="text-muted-foreground">Memuat...</p>}
        {!loading && rows.length === 0 && <p className="text-muted-foreground">Tidak ada data laporan.</p>}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="p-3">Tipe</th>
                <th className="p-3">ID</th>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Karyawan</th>
                <th className="p-3">Detail</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${row.type}-${row.id}-${i}`} className="border-t border-border">
                  <td className="p-3">{row.type}</td>
                  <td className="p-3">{row.id}</td>
                  <td className="p-3">{row.date}</td>
                  <td className="p-3">{row.employeeId}</td>
                  <td className="p-3">{row.details}</td>
                  <td className="p-3">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
