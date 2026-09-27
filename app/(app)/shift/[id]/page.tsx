"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { request } from "@/lib/api";
import { KaryawanShell } from "@/components/bottom-nav";
import { useToast } from "@/components/ui/toast";
import { SkeletonCard } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shell";
import { todayInWIB } from "@/lib/domain/date";

type ShiftDetail = {
  scheduleId: string;
  employeeId: string;
  employeeName: string;
  shiftId: string;
  shiftName: string;
  date: string;
  status: string;
  startedAt: string;
  branchId: string;
};

type ChecklistProgress = { completed: number; total: number };

export default function ShiftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [detail, setDetail] = useState<ShiftDetail | null>(null);
  const [checklist, setChecklist] = useState<ChecklistProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);

    Promise.all([
      request<ShiftDetail>(`/api/schedules/${id}`),
      request<ChecklistProgress>(`/api/schedules/${id}/checklist`).catch(() => ({ completed: 0, total: 0 })),
    ])
      .then(([d, c]) => {
        setDetail(d);
        setChecklist(c);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Gagal memuat jadwal shift";
        setLoadError(msg);
        toast(msg, "error");
      })
      .finally(() => setLoading(false));
  }, [id, toast]);

  async function startShift() {
    if (!detail) return;
    setStarting(true);
    try {
      const res = await request<{ scheduleId: string; startedAt: string }>(
        `/api/schedules/${id}/start-shift`,
        { method: "POST" }
      );
      setDetail((d) => (d ? { ...d, status: "started", startedAt: res.startedAt } : null));
      toast("Shift berhasil dimulai!", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal memulai shift", "error");
    } finally {
      setStarting(false);
    }
  }

  const today = todayInWIB();
  const isToday = detail?.date === today;
  const canStart = detail?.status === "scheduled" && isToday;

  return (
    <KaryawanShell
      title="Detail Shift"
      lead={detail ? `${detail.shiftName || detail.shiftId} · ${detail.date}` : "Memeriksa data shift..."}
    >
      {loading ? (
        <div className="max-w-xl">
          <SkeletonCard />
        </div>
      ) : loadError || !detail ? (
        <div className="max-w-xl rounded-lg border border-destructive-wash bg-destructive-wash p-6 text-center">
          <span className="material-symbols-outlined text-4xl text-destructive-foreground">error</span>
          <h2 className="mt-2 text-base font-semibold text-destructive-foreground">Jadwal tidak dapat dibuka</h2>
          <p className="mt-1 text-sm text-destructive-foreground/80">{loadError || "Jadwal tidak ditemukan"}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/jadwal-saya">Kembali ke Jadwal Saya</Link>
          </Button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-xl space-y-6"
        >
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  ID: {detail.scheduleId}
                </p>
                <h2 className="mt-1 text-xl font-bold text-foreground">
                  {detail.shiftName || detail.shiftId}
                </h2>
                <p className="text-sm text-muted-foreground">{detail.date}</p>
              </div>
              <StatusBadge status={detail.status} />
            </div>

            <div className="mt-6 divide-y divide-border border-t border-border pt-4 text-sm">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-muted-foreground">Petugas</span>
                <span className="font-medium text-foreground">
                  {detail.employeeName ? `${detail.employeeName} (${detail.employeeId})` : detail.employeeId}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-muted-foreground">Waktu Mulai Shift</span>
                <span className="font-medium text-foreground">
                  {detail.startedAt
                    ? new Date(detail.startedAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }) + " WIB"
                    : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-muted-foreground">Progress SOP Checklist</span>
                <span className="font-medium text-foreground">
                  {checklist ? `${checklist.completed}/${checklist.total} item` : "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            {canStart && (
              <Button
                onClick={startShift}
                disabled={starting}
                size="lg"
                className="h-11 flex-1 sm:flex-none"
              >
                <span className="material-symbols-outlined text-lg">play_arrow</span>
                {starting ? "Memulai..." : "Mulai Shift"}
              </Button>
            )}

            {!isToday && detail.status === "scheduled" && (
              <p className="w-full text-xs text-muted-foreground">
                Tombol &quot;Mulai Shift&quot; hanya aktif pada hari pelaksanaan ({detail.date}).
              </p>
            )}

            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push(`/shift/${id}/checklist`)}
              className="h-11 flex-1 sm:flex-none"
            >
              <span className="material-symbols-outlined text-lg">checklist</span>
              Checklist SOP ({checklist?.completed ?? 0}/{checklist?.total ?? 0})
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push(`/shift/${id}/handover`)}
              className="h-11 flex-1 sm:flex-none"
            >
              <span className="material-symbols-outlined text-lg">assignment</span>
              Form Handover
            </Button>

            <Button
              asChild
              variant="ghost"
              size="lg"
              className="h-11"
            >
              <Link href="/jadwal-saya">← Kembali</Link>
            </Button>
          </div>
        </motion.div>
      )}
    </KaryawanShell>
  );
}
