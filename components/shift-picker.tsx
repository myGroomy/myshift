"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PetugasShell } from "@/components/petugas-shell";
import { StatusBadge } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { request } from "@/lib/api";
import { todayInWIB } from "@/lib/domain/date";
import { selectDefaultChecklistSchedule } from "@/lib/domain/checklist-schedule";
import { Calendar, ChevronRight, ClipboardCheck, ArrowRightLeft } from "lucide-react";
import type { EmployeeRole } from "@/lib/domain/employee-role";

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
  reportGeneratedAt?: string;
  shiftName?: string;
  startTime?: string;
  endTime?: string;
};

type Session = {
  employeeId: string;
  role: EmployeeRole;
  activeBranchId?: string;
};

export function ShiftPicker({ mode }: { mode: "checklist" | "handover" }) {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [role, setRole] = useState<Session["role"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chooseSchedule, setChooseSchedule] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const session = await request<Session>("/api/auth/session");
        setRole(session.role);
        const isChoosing = new URLSearchParams(window.location.search).get("choose") === "1";
        setChooseSchedule(isChoosing);
        const branchId = session.activeBranchId;
        const res = await request<Schedule[]>(`/api/schedules${branchId ? `?branchId=${branchId}` : ""}`);
        setSchedules(res);
        if (mode === "checklist" && session.role === "petugas" && !isChoosing) {
          const currentTime = new Intl.DateTimeFormat("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
            timeZone: "Asia/Jakarta",
          }).format(new Date());
          const schedule = selectDefaultChecklistSchedule(res, todayInWIB(), currentTime);
          if (schedule) {
            router.replace(`/shift/${schedule.scheduleId}/checklist`);
          }
        }
      } catch (err) {
        setError(msg(err));
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, [mode, router]);

  const todayStr = todayInWIB();
  const sevenDaysAgoDate = new Date(`${todayStr}T00:00:00Z`);
  sevenDaysAgoDate.setUTCDate(sevenDaysAgoDate.getUTCDate() - 7);
  const sevenDaysAgo = sevenDaysAgoDate.toISOString().slice(0, 10);

  const todaySchedules = schedules.filter((s) => s.date === todayStr);
  const upcomingSchedules = schedules.filter((s) => s.date > todayStr);
  const pastSchedules = schedules.filter((s) => s.date < todayStr && s.date >= sevenDaysAgo);

  const isChecklist = mode === "checklist";
  const title = isChecklist && role === "petugas" && !chooseSchedule ? "Checklist Shift" : isChecklist ? "Pilih Shift Checklist" : "Pilih Shift Handover";
  const lead = isChecklist
    ? role === "admin"
      ? "Pilih shift di cabang aktif untuk memeriksa atau mengoreksi checklist operasional."
      : "Pilih jadwal shift Anda untuk mengisi atau mengecek checklist operasional."
    : role === "admin"
      ? "Pilih shift di cabang aktif untuk memeriksa atau mengoreksi handover."
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
    <PetugasShell title={title} lead={lead}>
      {loading ? (
        <div className="p-6 text-center text-sm text-muted-foreground">Memuat jadwal shift…</div>
      ) : error ? (
        <div className="rounded-lg border border-destructive-wash bg-destructive-wash p-4 text-sm text-destructive-foreground">{error}</div>
      ) : !hasAnySchedules ? (
        <div className="space-y-4">
          <EmptyState
            icon={isChecklist ? <ClipboardCheck size={40} /> : <ArrowRightLeft size={40} />}
            title="Tidak Ada Jadwal Shift"
            description={
              role === "admin"
                ? "Belum ada jadwal shift di cabang aktif untuk menampilkan checklist atau handover."
                : "Tidak ada jadwal checklist untuk hari ini."
            }
          />
          {isChecklist && role === "petugas" && (
            <div className="text-center">
              <Button asChild variant="outline"><Link href="/checklist/history">Buka Riwayat Checklist</Link></Button>
            </div>
          )}
        </div>
      ) : (
        <div>
          {isChecklist && role === "petugas" && (
            <div className="mb-5 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Pilih jadwal untuk membuka checklist.</p>
              <Button asChild variant="outline" size="sm"><Link href="/checklist/history">Riwayat Checklist</Link></Button>
            </div>
          )}
          {renderGroup("Hari Ini", todaySchedules)}
          {renderGroup("Mendatang", upcomingSchedules)}
          {renderGroup("Shift Sebelumnya (7 Hari Terakhir)", pastSchedules)}
        </div>
      )}
    </PetugasShell>
  );
}
