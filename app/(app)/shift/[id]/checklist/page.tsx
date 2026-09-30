"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Camera, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PetugasShell } from "@/components/petugas-shell";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { request } from "@/lib/api";
import { checklistNumericWarning } from "@/lib/domain/checklist-values";
import { controlClass } from "@/lib/ui";

type Schedule = {
  shiftName: string;
  shiftId: string;
  date: string;
  branchId: string;
  branchName: string;
  employeeName: string;
  startTime: string;
  endTime: string;
  startedAt: string;
  reportGeneratedAt: string;
  status: string;
};
type Point = {
  pointId: string;
  categoryId: string;
  description: string;
  completionType: "centang" | "centang_foto" | "angka" | "teks" | "pilihan";
  unit: string;
  min: string;
  max: string;
  options: string[];
  value: string;
  photoUrl: string;
  checked: boolean;
  warning: boolean;
};
type Group = { categoryId: string; categoryName: string; items: Point[] };
type Checklist = { groups: Group[]; items: Point[]; completed: number; total: number };
type PageData = { schedule: Schedule; checklist: Checklist };
type SaveStatus = "saving" | "saved" | "needs-photo" | "error";

type SaveJob = { point: Point; value: string; file?: File };

function scheduleUrl(path: string, branchId: string) {
  return `${path}?${new URLSearchParams({ branchId }).toString()}`;
}

const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

async function compressPhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  return new Promise((resolve) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      const maxDimension = 1200;
      const ratio = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * ratio);
      canvas.height = Math.round(image.height * ratio);
      const context = canvas.getContext("2d");
      if (!context) return resolve(file);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const encode = (quality: number) => canvas.toBlob((blob) => {
        if (!blob) return resolve(file);
        if (blob.size > 500 * 1024 && quality > 0.45) return encode(quality - 0.15);
        resolve(new File([blob], `${file.name.replace(/\.[^/.]+$/, "")}.webp`, { type: "image/webp" }));
      }, "image/webp", quality);
      encode(0.8);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    image.src = url;
  });
}

export function ShiftChecklistEditor({ id }: { id: string }) {
  const { toast } = useToast();
  const [data, setData] = useState<PageData | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState<string | null>(null);
  const pointsRef = useRef(new Map<string, Point>());
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const savingRef = useRef(new Set<string>());
  const queuedRef = useRef(new Map<string, SaveJob>());

  async function reload() {
    if (branchId === null) return;
    const [schedule, checklist] = await Promise.all([
      request<Schedule>(scheduleUrl(`/api/schedules/${id}`, branchId)),
      request<Checklist>(scheduleUrl(`/api/schedules/${id}/checklist`, branchId)),
    ]);
    setData({ schedule, checklist });
    setDrafts(Object.fromEntries(checklist.items.map((item) => [item.pointId, item.value])));
    pointsRef.current = new Map(checklist.items.map((item) => [item.pointId, item]));
  }

  useEffect(() => {
    setBranchId(new URLSearchParams(window.location.search).get("branchId") ?? "");
  }, []);

  useEffect(() => {
    if (branchId === null) return;
    reload()
      .catch((error: unknown) => toast(error instanceof Error ? error.message : "Gagal memuat checklist shift", "error"))
      .finally(() => setLoading(false));
  }, [id, branchId, toast]);

  async function persistPoint(pointId: string) {
    if (savingRef.current.has(pointId)) return;
    savingRef.current.add(pointId);
    setSaveStatus((previous) => ({ ...previous, [pointId]: "saving" }));

    while (queuedRef.current.has(pointId)) {
      const job = queuedRef.current.get(pointId)!;
      queuedRef.current.delete(pointId);
      const currentPoint = pointsRef.current.get(pointId) ?? job.point;

      try {
        let photoUrl = currentPoint.photoUrl;
        if (job.file) {
          if (!ACCEPTED_PHOTO_TYPES.includes(job.file.type)) throw new Error("Foto harus JPEG, PNG, WEBP, atau HEIC.");
          if (job.file.size > MAX_PHOTO_BYTES) throw new Error("Ukuran foto maksimal 5 MB.");
          const file = await compressPhoto(job.file);
          const form = new FormData();
          form.append("file", file);
          const uploaded = await request<{ photoUrl: string }>(
            `/api/schedules/${id}/checklist/photo?${new URLSearchParams({ itemId: pointId, branchId: branchId ?? "" }).toString()}`,
            { method: "POST", body: form }
          );
          photoUrl = uploaded.photoUrl;
        }

        const result = await request<{ value: string; photoUrl: string; checked: boolean }>(
          scheduleUrl(`/api/schedules/${id}/checklist`, branchId ?? ""),
          {
            method: "POST",
            body: JSON.stringify({ pointId, value: job.value, photoUrl }),
          }
        );
        const updatedPoint = { ...currentPoint, value: result.value, photoUrl: result.photoUrl, checked: result.checked };
        pointsRef.current.set(pointId, updatedPoint);
        setData((previous) => {
          if (!previous) return previous;
          const items = previous.checklist.items.map((item) => item.pointId === pointId ? updatedPoint : item);
          const groups = previous.checklist.groups.map((group) => ({
            ...group,
            items: group.items.map((item) => item.pointId === pointId ? updatedPoint : item),
          }));
          return {
            ...previous,
            checklist: {
              ...previous.checklist,
              items,
              groups,
              completed: items.filter((item) => item.checked).length,
            },
          };
        });
        setFiles((previous) => previous[pointId] === job.file ? { ...previous, [pointId]: undefined } : previous);
        setSaveErrors((previous) => ({ ...previous, [pointId]: "" }));
        if (!queuedRef.current.has(pointId)) {
          setSaveStatus((previous) => ({ ...previous, [pointId]: "saved" }));
        }
      } catch (error) {
        setSaveErrors((previous) => ({
          ...previous,
          [pointId]: error instanceof Error ? error.message : "Gagal menyimpan checklist.",
        }));
        setSaveStatus((previous) => ({ ...previous, [pointId]: "error" }));
      }
    }

    savingRef.current.delete(pointId);
    if (queuedRef.current.has(pointId)) void persistPoint(pointId);
  }

  function scheduleSave(point: Point, value: string, file?: File, immediate = false) {
    const pointId = point.pointId;
    const savedPoint = pointsRef.current.get(pointId) ?? point;
    if (point.completionType === "centang_foto" && value === "TRUE" && !file && !savedPoint.photoUrl) {
      queuedRef.current.delete(pointId);
      setSaveStatus((previous) => ({ ...previous, [pointId]: "needs-photo" }));
      return;
    }

    queuedRef.current.set(pointId, { point: savedPoint, value, file });
    setSaveStatus((previous) => ({ ...previous, [pointId]: "saving" }));
    setSaveErrors((previous) => ({ ...previous, [pointId]: "" }));
    const existingTimer = timersRef.current.get(pointId);
    if (existingTimer) clearTimeout(existingTimer);
    const timer = setTimeout(() => {
      timersRef.current.delete(pointId);
      void persistPoint(pointId);
    }, immediate ? 0 : 700);
    timersRef.current.set(pointId, timer);
  }

  function updateDraft(point: Point, value: string, immediate = false) {
    setDrafts((previous) => ({ ...previous, [point.pointId]: value }));
    scheduleSave(point, value, files[point.pointId], immediate);
  }

  function retrySave(point: Point) {
    scheduleSave(point, drafts[point.pointId] ?? point.value, files[point.pointId], true);
  }

  async function submitChecklist() {
    setSubmitting(true);
    try {
      await request(scheduleUrl(`/api/schedules/${id}/checklist/submit`, branchId ?? ""), { method: "POST" });
      toast("Shift berhasil diselesaikan", "success");
      await reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal menyelesaikan shift", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function renderControl(point: Point) {
    const value = drafts[point.pointId] ?? point.value;
    if (point.completionType === "centang" || point.completionType === "centang_foto") {
      return (
        <div className="space-y-3">
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={value === "TRUE"}
              onChange={(event) => updateDraft(point, event.target.checked ? "TRUE" : "", true)}
              className="size-5 accent-primary"
            />
            Selesai
          </label>
          {point.completionType === "centang_foto" && (
            <div className="space-y-2">
              <Label htmlFor={`photo-${point.pointId}`}><Camera size={14} className="mr-1 inline" />Foto bukti</Label>
              <input
                id={`photo-${point.pointId}`}
                type="file"
                accept={ACCEPTED_PHOTO_TYPES.join(",")}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setFiles((previous) => ({ ...previous, [point.pointId]: file }));
                  if (file) scheduleSave(point, value, file, true);
                }}
                className="block w-full text-sm"
              />
              {files[point.pointId] && <p className="text-xs text-muted-foreground">{files[point.pointId]?.name}</p>}
              {!files[point.pointId] && point.photoUrl && <a className="text-xs text-primary underline" href={point.photoUrl} target="_blank" rel="noreferrer">Lihat foto tersimpan</a>}
            </div>
          )}
        </div>
      );
    }
    if (point.completionType === "angka") {
      const warning = checklistNumericWarning({
        completionType: point.completionType,
        min: point.min,
        max: point.max,
      }, value);
      return (
        <div>
          <div className="flex items-center gap-2">
            <Input type="number" value={value} onChange={(event) => updateDraft(point, event.target.value)} onBlur={() => scheduleSave(point, drafts[point.pointId] ?? point.value, files[point.pointId], true)} className={controlClass} />
            {point.unit && <span className="text-sm text-muted-foreground">{point.unit}</span>}
          </div>
          {warning && <p className="mt-1 text-xs text-warning">Nilai di luar batas SOP. Tetap bisa disimpan.</p>}
        </div>
      );
    }
    if (point.completionType === "pilihan") {
      return (
        <select value={value} onChange={(event) => updateDraft(point, event.target.value, true)} className={controlClass}>
          <option value="">Pilih jawaban</option>
          {point.options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      );
    }
    return <Textarea rows={3} value={value} onChange={(event) => updateDraft(point, event.target.value)} onBlur={() => scheduleSave(point, drafts[point.pointId] ?? point.value, files[point.pointId], true)} className={controlClass} placeholder="Tulis hasil pemeriksaan..." />;
  }

  if (loading) {
    return <PetugasShell title="Checklist Shift" lead="Memuat detail shift..."><SkeletonCard /></PetugasShell>;
  }
  if (!data) {
    return <PetugasShell title="Checklist Shift"><div className="rounded-lg border border-destructive-wash bg-destructive-wash p-5 text-sm text-destructive-foreground"><AlertCircle className="mr-2 inline" size={16} />Checklist tidak dapat dimuat.</div></PetugasShell>;
  }

  const { checklist, schedule } = data;
  const percent = checklist.total ? Math.round(checklist.completed * 100 / checklist.total) : 100;
  const hasUnsavedChanges = checklist.items.some((point) =>
    saveStatus[point.pointId] === "saving"
    || saveStatus[point.pointId] === "error"
    || saveStatus[point.pointId] === "needs-photo"
  );
  return (
    <PetugasShell title={`Checklist – ${schedule.shiftName}`} lead={`${schedule.date} · ${schedule.branchName || schedule.branchId}`}>
      <div className="max-w-3xl space-y-5">
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm"><Link href={`/shift/${id}${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ""}`}><ArrowLeft size={16} /> Kembali ke shift</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href={`/shift/${id}/laporan${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ""}`}>Laporan Shift</Link></Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="ghost" size="sm"><Link href="/checklist?choose=1">Ganti Jadwal</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link href="/checklist/history">Riwayat Checklist</Link></Button>
        </div>
        {schedule.reportGeneratedAt && <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-accent/20 p-3 text-sm"><Info size={16} className="mt-0.5 shrink-0" />Laporan sudah dibuat. Perubahan selanjutnya tetap bisa disimpan dan akan muncul di riwayat perubahan laporan.</div>}
        <div className="grid gap-3 rounded-lg border border-border bg-card p-4 text-sm sm:grid-cols-2">
          <div><span className="text-xs text-muted-foreground">Petugas</span><p className="font-medium">{schedule.employeeName || "—"}</p></div>
          <div><span className="text-xs text-muted-foreground">Jadwal</span><p className="font-medium">{schedule.date} · {schedule.startTime || "--:--"}–{schedule.endTime || "--:--"}</p></div>
          <div><span className="text-xs text-muted-foreground">Cabang</span><p className="font-medium">{schedule.branchName || schedule.branchId}</p></div>
          <div><span className="text-xs text-muted-foreground">Status shift</span><p className="font-medium capitalize">{schedule.status === "started" ? "Sedang berjalan" : schedule.status === "completed" ? "Selesai" : "Belum dimulai"}</p></div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex justify-between text-sm"><span>Progress Checklist</span><strong>{checklist.completed}/{checklist.total} ({percent}%)</strong></div>
          <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} /></div>
        </div>
        {checklist.groups.length === 0 ? <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground sm:p-6">Tidak ada checklist point yang berlaku untuk shift ini.</div> :
          checklist.groups.map((group) => (
            <section key={group.categoryId} className="space-y-3">
              <h2 className="text-base font-semibold">{group.categoryName}</h2>
              {group.items.map((point) => (
                <article key={point.pointId} className="space-y-3 rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 className="text-sm font-medium">{point.description}</h3><p className="mt-1 text-xs text-muted-foreground">{point.completionType}</p></div>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
                      {saveStatus[point.pointId] === "saving" ? "Menyimpan..." :
                        saveStatus[point.pointId] === "needs-photo" ? "Pilih foto untuk menyimpan" :
                          saveStatus[point.pointId] === "error" ? "Gagal tersimpan" :
                            <><CheckCircle2 size={14} />Tersimpan</>}
                    </span>
                  </div>
                  {renderControl(point)}
                  {saveStatus[point.pointId] === "error" && (
                    <div className="flex items-center justify-between gap-3 text-xs text-destructive">
                      <span>{saveErrors[point.pointId]}</span>
                      <Button size="sm" variant="outline" onClick={() => retrySave(point)}>Coba lagi</Button>
                    </div>
                  )}
                </article>
              ))}
            </section>
          ))
        }
        {schedule.status !== "completed" && (
          <div className="rounded-lg border border-border bg-card p-4">
            <Button className="w-full" onClick={submitChecklist} disabled={checklist.completed !== checklist.total || hasUnsavedChanges || submitting}>
              {submitting ? "Menyelesaikan shift..." : "Submit Checklist & Selesaikan Shift"}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Checklist harus 100% dan field handover wajib harus sudah tersimpan.
            </p>
          </div>
        )}
      </div>
    </PetugasShell>
  );
}

export default function ShiftChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ShiftChecklistEditor id={id} />;
}
