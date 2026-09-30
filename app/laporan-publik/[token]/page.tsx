"use client";

import { use, useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { ShiftReportView, type ShiftReport } from "@/components/shift-report-view";
import { request } from "@/lib/api";

export default function PublicShiftReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [report, setReport] = useState<ShiftReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    request<ShiftReport>(`/api/public/reports/${encodeURIComponent(token)}`)
      .then(setReport)
      .catch((failure: unknown) => setError(failure instanceof Error ? failure.message : "Laporan tidak tersedia"));
  }, [token]);

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-3xl">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">MYSHIFT · Laporan Publik</p>
        {report ? <ShiftReportView report={report} /> : error ? (
          <div className="rounded-lg border border-destructive-wash bg-destructive-wash p-5 text-sm text-destructive-foreground">
            <AlertCircle className="mr-2 inline" size={16} />{error}
          </div>
        ) : <div className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">Memuat laporan shift...</div>}
      </div>
    </main>
  );
}
