"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KaryawanShell } from "@/components/karyawan-shell";
import { StatusBadge } from "@/components/shell";
import { EmptyState } from "@/components/ui/empty-state";
import { request } from "@/lib/api";
import { Calendar, ChevronRight, ClipboardCheck, ArrowRightLeft } from "lucide-react";

function msg(error: unknown): string {
  return error instanceof Error ? error.message : "Terjadi kesalahan";
}

type Schedule = {
  scheduleId: string;
  employeeId: string;
  shiftId: string;
  date: string;
  status: string;
  startedAt?: string;
  shiftName?: string;
  startTime?: string;
  endTime?: string;
};

type Session = {
  employeeId: string;
  role: string;
  activeBranchId?: string;
};

export function ShiftPicker({ mode }: { mode: "checklist" | "handover" }) {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const session = await request<Session>("/api/auth/session");
        const branchId = session.activeBranchId;
        const res = await request<Schedule[]>(`/api/schedules${branchId ? `?branchId=${branchId}` : ""}`);
        setSchedules(res);
      } catch (err) {
        setError(msg(err));
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const todaySchedules = schedules.filter((s) => s.date === todayStr);
  const upcomingSchedules = schedules.filter((s) => s.date > todayStr);
  const pastSchedules = schedules.filter((s) => s.date < todayStr && s.date >= sevenDaysAgo);

  const isChecklist = mode === "checklist";
  const title = isChecklist ? "Pilih Shift — Checklist" : "Pilih Shift — Handover";
  const lead = isChecklist
    ? "Pilih jadwal shift Anda untuk mengisi atau mengecek checklist operasional."
    : "Pilih jadwal shift Anda untuk mengisi atau membaca berita acara handover.";

  function renderGroup(groupTitle: string, items: Schedule[]) {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {groupTitle} ({items.length})
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => {
            const shiftText = item.shiftName
              ? `${item.shiftName} (${item.startTime || ""} - ${item.endTime || ""})`
              : item.shiftId;

            return (
              <button
                key={item.scheduleId}
                type="button"
                onClick={() => router.push(isChecklist ? `/shift/${item.scheduleId}/checklist` : `/shift/${item.scheduleId}?tab=handover`)}
                className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-4"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="break-words font-semibold text-foreground">{shiftText}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {item.date}
                    </span>
                    <span>ID: {item.scheduleId}</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const hasAnySchedules = todaySchedules.length > 0 || upcomingSchedules.length > 0 || pastSchedules.length > 0;

  return (
    <KaryawanShell title={title} lead={lead}>
      {loading ? (
        <div className="p-6 text-center text-sm text-muted-foreground">Memuat jadwal shift…</div>
      ) : error ? (
        <div className="rounded-lg border border-destructive-wash bg-destructive-wash p-4 text-sm text-destructive-foreground">{error}</div>
      ) : !hasAnySchedules ? (
        <EmptyState
          icon={isChecklist ? <ClipboardCheck size={40} /> : <ArrowRightLeft size={40} />}
          title="Tidak Ada Jadwal Shift"
          description="Anda belum memiliki jadwal shift aktif untuk mengakses checklist atau handover."
        />
      ) : (
        <div>
          {renderGroup("Hari Ini", todaySchedules)}
          {renderGroup("Mendatang", upcomingSchedules)}
          {renderGroup("Selesai (7 Hari Terakhir)", pastSchedules)}
        </div>
      )}
    </KaryawanShell>
  );
}
