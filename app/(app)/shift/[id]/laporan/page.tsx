"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Share2 } from "lucide-react";
import { PetugasShell } from "@/components/petugas-shell";
import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { ShiftReportView, type ShiftReport } from "@/components/shift-report-view";
import { request } from "@/lib/api";

function ShiftReportPageContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branchId?: string }>;
}) {
  const { id } = use(params);
  const { branchId = "" } = use(searchParams);
  const { toast } = useToast();
  const [report, setReport] = useState<ShiftReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  async function loadReport() {
    const result = await request<ShiftReport>(`/api/schedules/${id}/report?branchId=${encodeURIComponent(branchId)}`);
    setReport(result);
  }

  useEffect(() => {
    loadReport()
      .catch((error: unknown) => toast(error instanceof Error ? error.message : "Gagal memuat laporan shift", "error"))
      .finally(() => setLoading(false));
  }, [branchId, id, toast]);

  async function generate() {
    setGenerating(true);
    try {
      const result = await request<ShiftReport>(`/api/schedules/${id}/report?branchId=${encodeURIComponent(branchId)}`, { method: "POST" });
      setReport(result);
      toast("Laporan shift berhasil digenerate", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal membuat laporan shift", "error");
    } finally {
      setGenerating(false);
    }
  }

  function shareWhatsApp() {
    if (!report?.reportToken) return;
    const publicUrl = `${window.location.origin}/laporan-publik/${report.reportToken}`;
    const problems = report.checklist.items
      .filter((item) => !item.checked || item.warning)
      .map((item) => `⚠️ ${item.description}${item.warning ? " (di luar batas)" : " (belum selesai)"}`);
    const handover = report.handover.fields
      .filter((field) => field.value.trim())
      .map((field) => `${field.label}: ${field.value}`)
      .join("\n") || "(belum ada catatan)";
    const message = [
      `📋 *Laporan Shift* ${report.branchName}`,
      `🕐 ${report.shiftName} · ${report.date} · ${report.employeeName}`,
      "",
      `✅ Checklist: ${report.checklist.completed}/${report.checklist.total} selesai`,
      problems.join("\n"),
      "",
      "📝 Handover:",
      handover,
      "",
      "Lihat detail lengkap:",
      publicUrl,
    ].filter((line) => line !== "").join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  if (loading) return <PetugasShell title="Laporan Shift" lead="Memuat laporan..."><SkeletonCard /></PetugasShell>;
  if (!report) return <PetugasShell title="Laporan Shift"><p className="rounded-lg border border-border bg-card p-4 text-sm sm:p-5">Laporan shift tidak dapat dimuat.</p></PetugasShell>;
  const canGenerate = report.checklist.complete && report.handover.complete;

  return (
    <PetugasShell title="Laporan Shift" lead={`${report.shiftName} · ${report.date}`}>
      <div className="max-w-3xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button asChild variant="ghost" size="sm"><Link href={`/shift/${id}?branchId=${encodeURIComponent(branchId)}`}><ArrowLeft size={16} />Kembali ke shift</Link></Button>
          <div className="flex gap-2">
            {!report.reportGeneratedAt && <Button onClick={generate} disabled={!canGenerate || generating}>{generating ? "Membuat laporan..." : "Generate Laporan"}</Button>}
            {report.reportGeneratedAt && <Button onClick={shareWhatsApp}><Share2 size={16} />Share ke WhatsApp</Button>}
          </div>
        </div>
        {!report.reportGeneratedAt && !canGenerate && <p className="rounded-lg border border-warning/30 bg-warning-wash p-3 text-sm text-warning-foreground">Laporan bisa dibuat setelah semua checklist selesai dan field handover wajib terisi.</p>}
        {report.reportGeneratedAt && <p className="rounded-lg border border-primary/20 bg-accent/20 p-3 text-sm">Laporan publik aktif tanpa batas waktu. Jika checklist atau handover diedit, perubahan akan tercatat pada riwayat.</p>}
        {report.reportGeneratedAt && <a
          href={`/laporan-publik/${report.reportToken}`}
          target="_blank"
          rel="noreferrer"
          className="block break-all text-sm text-primary underline"
        >
          Buka tautan laporan publik
        </a>}
        <ShiftReportView report={report} />
      </div>
    </PetugasShell>
  );
}

export default function ShiftReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branchId?: string }>;
}) {
  return <ShiftReportPageContent params={params} searchParams={searchParams} />;
}
