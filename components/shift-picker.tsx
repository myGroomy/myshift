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
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-slate-400 hover:shadow-md"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{shiftText}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {item.date}
                    </span>
                    <span>ID: {item.scheduleId}</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
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
        <div className="p-8 text-center text-sm text-slate-500">Memuat jadwal shift...</div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>
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
