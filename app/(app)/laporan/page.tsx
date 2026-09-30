"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, tdClass } from "@/components/ui/table";
import { request } from "@/lib/api";
import { AdminShell, StatusBadge } from "@/components/shell";
import { KaryawanShell } from "@/components/karyawan-shell";
import { useToast } from "@/components/ui/toast";
import { SkeletonTable } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { controlClass } from "@/lib/ui";
import { todayInWIB } from "@/lib/domain/date";
import { BarChart3, Search, Download } from "lucide-react";
import type { Branch } from "@/lib/types";
import { FilterPanel } from "@/components/ui/filter-panel";

type LaporanRow = {
  type: string;
  id: string;
  date: string;
  branchName: string;
  employeeId: string;
  employeeName: string;
  details: string;
  status: string;
};

type Session = {
  role: "admin" | "karyawan";
  activeBranchId: string;
  branches: Branch[];
};

const REPORT_TABS = [
  { id: "semua", label: "Semua" },
  { id: "jadwal", label: "Jadwal" },
  { id: "checklist", label: "Checklist" },
  { id: "handover", label: "Handover" },
  { id: "pengajuan", label: "Swap & Izin" },
  { id: "incident", label: "Incident" },
] as const;

export default function LaporanPage() {
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState("");

  const [rows, setRows] = useState<LaporanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searched, setSearched] = useState(false);
  const [reportType, setReportType] = useState<(typeof REPORT_TABS)[number]["id"]>("semua");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const PageShell = session?.role === "admin" ? AdminShell : KaryawanShell;

  useEffect(() => {
    Promise.all([
      request<Session>("/api/auth/session"),
      request<Branch[]>("/api/branches").catch(() => []),
    ])
      .then(([s, bList]) => {
        setSession(s);
        setBranches(bList);
        if (s.role === "admin") {
          setBranchFilter(""); // all branches by default
        } else {
          setBranchFilter(s.activeBranchId || "");
        }
      })
      .catch((e: unknown) => {
        toast(e instanceof Error ? e.message : "Gagal memuat sesi", "error");
      });
  }, [toast]);

  async function load(nextReportType = reportType) {
    setLoading(true);
    setSearched(true);
    setReportType(nextReportType);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (branchFilter) params.set("branchId", branchFilter);
      params.set("reportType", nextReportType);

      const data = await request<LaporanRow[]>(`/api/laporan?${params}`);
      setRows(data);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal memuat laporan", "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function exportCSV() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (branchFilter) params.set("branchId", branchFilter);
      params.set("reportType", reportType);
      params.set("format", "csv");

      const res = await fetch(`/api/laporan?${params}`);
      if (!res.ok) {
        const text = await res.text();
        let msg = `Gagal export (${res.status})`;
        try {
          const json = JSON.parse(text);
          if (json.error?.message) msg = json.error.message;
        } catch {}
        throw new Error(msg);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-${reportType}-${todayInWIB()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast("Export CSV berhasil diunduh!", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Export CSV gagal", "error");
    } finally {
      setExporting(false);
    }
  }

  return (
    <PageShell
      title="Laporan Operasional"
      lead={
        session?.role === "admin"
          ? "Rekap aktivitas kerja per periode: jadwal, pengajuan swap/izin, progres checklist, handover, dan incident. Ini bukan laporan absensi atau payroll."
          : "Ringkasan aktivitas jadwal dan operasional seluruh tim di cabang aktif. Ini bukan laporan absensi atau payroll."
      }
    >
      <FilterPanel
        className="max-w-4xl"
        contentClassName="lg:grid-cols-4"
        label="Filter laporan operasional"
      >
        {session?.role === "admin" && (
          <div>
            <Label htmlFor="branch-filter">Cabang</Label>
            <Select
              id="branch-filter"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className={controlClass}
            >
              <option value="">Semua Cabang</option>
              {branches.map((b) => (
                <option key={b.branchId} value={b.branchId}>
                  {b.nama}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div>
          <Label htmlFor="start-date">Dari Tanggal</Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={controlClass}
          />
        </div>

        <div>
          <Label htmlFor="end-date">Sampai Tanggal</Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={controlClass}
          />
        </div>

        <div className="flex min-w-0 gap-2 sm:col-span-2 lg:col-span-1">
          <Button onClick={() => void load()} disabled={loading} size="lg" className="h-11 min-w-0 flex-1">
            <Search size={14} />
            {loading ? "Mencari..." : "Tampilkan"}
          </Button>

          <Button
            onClick={exportCSV}
            disabled={exporting}
            variant="outline"
            size="lg"
            className="h-11 min-w-0 flex-1"
            title="Download file CSV spreadsheet"
          >
            <Download size={14} />
            CSV
          </Button>
        </div>
      </FilterPanel>

      <div
        role="group"
        aria-label="Pilih jenis laporan"
        className="mb-4 flex max-w-full gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1"
      >
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={reportType === tab.id}
            disabled={loading}
            onClick={() => searched ? void load(tab.id) : setReportType(tab.id)}
            className={`min-h-10 shrink-0 rounded-md px-3 text-sm font-medium transition-colors ${
              reportType === tab.id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        {reportType === "checklist"
          ? "Rekap checklist per shift mencakup progres tiap kategori SOP dan nama point yang belum selesai."
          : reportType === "pengajuan"
            ? "Menampilkan pengajuan swap dan izin. Detail swap menyebut pemohon, rekan tukar, tanggal, shift, dan alasan."
            : "Setiap baris adalah satu aktivitas atau ringkasan shift pada tanggal terpilih. Pilih jenis laporan untuk memfokuskan data."}
      </p>

      {loading ? (
        <SkeletonTable rows={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<BarChart3 size={40} />}
          title={searched ? "Tidak ada catatan laporan" : "Belum memuat laporan"}
          description={
            searched
              ? "Tidak ada aktivitas operasional di rentang filter ini."
              : "Atur tanggal atau klik Tampilkan untuk melihat data operasional."
          }
          actionLabel="Tampilkan Hari Ini"
          actionHref="#"
        />
      ) : (
        <DataTable columns={["Tipe", "ID", "Tanggal", "Cabang", "Karyawan", "Detail", "Status"]}>
          {rows.map((row, i) => (
            <motion.tr
              key={`${row.type}-${row.id}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.2 }}
              className="border-t border-border"
            >
              <td className={tdClass}>
                <span className="font-semibold text-foreground">{row.type}</span>
              </td>
              <td className={tdClass}>
                <span className="font-mono text-xs text-muted-foreground">{row.id}</span>
              </td>
              <td className={tdClass}>{row.date}</td>
              <td className={tdClass}>{row.branchName}</td>
              <td className={tdClass}>
                <span className="font-medium text-foreground">
                  {row.employeeName || row.employeeId}
                </span>
                {row.employeeName && (
                  <span className="block font-mono text-[11px] text-muted-foreground">
                    {row.employeeId}
                  </span>
                )}
              </td>
              <td className={tdClass}>{row.details}</td>
              <td className={tdClass}>
                <StatusBadge status={row.status} />
              </td>
            </motion.tr>
          ))}
        </DataTable>
      )}
    </PageShell>
  );
}
