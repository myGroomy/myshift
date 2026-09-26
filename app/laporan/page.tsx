"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { request } from "@/components/phase1";
import BottomNav from "@/components/bottom-nav";

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
      a.href = url; a.download = `laporan-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } catch { alert("Export gagal"); }
  }

  return (
    <main className="min-h-screen bg-[#faf9fe] pb-20 text-[#000000]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <nav className="mb-8 flex flex-wrap items-center gap-4 border-b border-[#e5e5e5] pb-4 text-sm font-medium">
          <Link href="/" className="text-[#0075de]">MYSHIFT</Link>
          <Link href="/jadwal" className="text-[#615d59] hover:text-[#0075de]">Jadwal</Link>
          <Link href="/jadwal-saya" className="text-[#615d59] hover:text-[#0075de]">Jadwal Saya</Link>
          <Link href="/dashboard" className="text-[#0075de]">Dashboard</Link>
          <Link href="/laporan" className="text-[#0075de]">Laporan</Link>
        </nav>
        <h1 className="mb-6 text-2xl font-bold">Laporan</h1>
        <div className="mb-6 flex flex-wrap gap-3">
          <input className="h-11 rounded-lg border-[#e5e5e5] px-4" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input className="h-11 rounded-lg border-[#e5e5e5] px-4" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <Button className="h-11 rounded-lg bg-[#0075de] text-white" onClick={load}>Cari</Button>
          <Button className="h-11 rounded-lg border border-[#e5e5e5] bg-white" onClick={exportCSV}>Export CSV</Button>
        </div>
        {loading && <p className="text-[#615d59]">Memuat...</p>}
        {!loading && rows.length === 0 && <p className="text-[#615d59]">Tidak ada data laporan.</p>}
        <div className="overflow-x-auto rounded-lg border border-[#e5e5e5]">
          <table className="w-full text-left text-sm">
            <thead><tr className="bg-[#f0f1f5]"><th className="p-3">Tipe</th><th className="p-3">ID</th><th className="p-3">Tanggal</th><th className="p-3">Karyawan</th><th className="p-3">Detail</th><th className="p-3">Status</th></tr></thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${row.type}-${row.id}-${i}`} className="border-t border-[#e5e5e5]">
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
        <BottomNav />
      </div>
    </main>
  );
}
