"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PetugasShell } from "@/components/petugas-shell";
import { StatusBadge } from "@/components/shell";
import { request } from "@/lib/api";
import { todayInWIB } from "@/lib/domain/date";

type Schedule = {
  scheduleId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  date: string;
  status: string;
  reportGeneratedAt: string;
};

type Session = { activeBranchId?: string };

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00+07:00`);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(parsed);
}

export function ChecklistHistoryPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const session = await request<Session>("/api/auth/session");
        const query = session.activeBranchId ? `?branchId=${encodeURIComponent(session.activeBranchId)}` : "";
        const result = await request<Schedule[]>(`/api/schedules${query}`);
        const today = todayInWIB();
        setSchedules(
          result
            .filter((schedule) => schedule.date < today || (schedule.date === today && schedule.status === "completed"))
            .sort((a, b) => b.date.localeCompare(a.date) || (b.startTime ?? "").localeCompare(a.startTime ?? ""))
        );
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Gagal memuat riwayat checklist.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <PetugasShell
      title="Riwayat Checklist"
      lead="Daftar shift sebelumnya dan laporan operasional yang sudah dibuat."
      actions={<Button asChild variant="outline" size="sm"><Link href="/checklist">Isi Checklist</Link></Button>}
    >
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Memuat riwayat...</p>
      ) : error ? (
        <div role="alert" className="rounded-lg border border-destructive-wash bg-destructive-wash p-4 text-sm text-destructive-foreground">{error}</div>
      ) : schedules.length === 0 ? (
        <EmptyState icon={<Calendar size={40} />} title="Belum Ada Riwayat Shift" description="Shift yang sudah lewat akan muncul di sini." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {schedules.map((schedule) => (
            <article key={schedule.scheduleId} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground">{schedule.shiftName || "Shift"}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{formatDate(schedule.date)}</p>
                  <p className="text-xs text-muted-foreground">{schedule.startTime || "--:--"}–{schedule.endTime || "--:--"} · {schedule.scheduleId}</p>
                </div>
                <StatusBadge status={schedule.status} />
              </div>
              {schedule.reportGeneratedAt ? (
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/shift/${schedule.scheduleId}/laporan`}><FileText size={15} /> Lihat Laporan</Link>
                </Button>
              ) : (
                <p className="rounded-md bg-muted px-3 py-2 text-center text-xs text-muted-foreground">Laporan belum dibuat</p>
              )}
            </article>
          ))}
        </div>
      )}
    </PetugasShell>
  );
}
