"use client";

import { useEffect, useRef, useState, use, Suspense } from "react";
import { motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { request } from "@/lib/api";
import { PetugasShell } from "@/components/petugas-shell";
import { useToast } from "@/components/ui/toast";
import { SkeletonCard } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shell";
import { todayInWIB } from "@/lib/domain/date";
import { controlClass } from "@/lib/ui";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Info,
  ListChecks,
  ClipboardList,
  Play,
  Check,
  Camera,
  History,
  X,
  CheckCircle2,
} from "lucide-react";

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
  reportGeneratedAt: string;
};

type ChecklistItem = {
  itemId: string;
  type: string;
  description: string;
  requiresPhoto: boolean;
  order: number;
  active: boolean;
  checked: boolean;
};

type ChecklistResponse = {
  items: ChecklistItem[];
  completed: number;
  total: number;
};

type HandoverField = {
  fieldId: string;
  label: string;
  isRequired: boolean;
  value: string;
};

type HandoverResponse = {
  fields: HandoverField[];
  filledCount: number;
  total: number;
  completed: boolean;
};

type PreviousHandover = {
  scheduleId: string;
  fields: { label: string; value: string }[];
} | null;

const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function scheduleUrl(path: string, branchId: string) {
  return `${path}?${new URLSearchParams({ branchId }).toString()}`;
}

async function compressPhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_DIM = 1200;
      let width = img.width;
      let height = img.height;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
            type: "image/webp",
          });
          resolve(compressedFile);
        },
        "image/webp",
        0.8
      );
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
}

function ShiftTerpaduContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const router = useRouter();
  const searchParams = useSearchParams();
  const branchId = searchParams.get("branchId") ?? "";
  const branchSuffix = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
  const { toast } = useToast();

  const initialTab = (searchParams.get("tab") as "info" | "checklist" | "handover") || "info";
  const [activeTab, setActiveTab] = useState<"info" | "checklist" | "handover">(initialTab);

  const [detail, setDetail] = useState<ShiftDetail | null>(null);
  const [checklist, setChecklist] = useState<ChecklistResponse | null>(null);
  const [handover, setHandover] = useState<HandoverResponse | null>(null);
  const [previousHandover, setPreviousHandover] = useState<PreviousHandover>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // Checklist photo modal & action state
  const [photoModalItem, setPhotoModalItem] = useState<ChecklistItem | null>(null);
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [submittingChecklist, setSubmittingChecklist] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handover state
  const [submittingHandover, setSubmittingHandover] = useState(false);

  function resetPhotoModal() {
    setPhotoModalItem(null);
    setPhotoUrlInput("");
    setUploadedUrl("");
    setUploadingPhoto(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function loadAllData() {
    if (!id) return;
    setLoading(true);
    setLoadError(null);

    Promise.all([
      request<ShiftDetail>(scheduleUrl(`/api/schedules/${id}`, branchId)),
      request<ChecklistResponse>(scheduleUrl(`/api/schedules/${id}/checklist`, branchId)).catch(() => ({ items: [], completed: 0, total: 0 })),
      request<HandoverResponse>(scheduleUrl(`/api/schedules/${id}/handover`, branchId)).catch(() => ({ fields: [], filledCount: 0, total: 0, completed: false })),
      request<PreviousHandover>(scheduleUrl(`/api/schedules/${id}/handover/previous`, branchId)).catch(() => null),
    ])
      .then(([det, chk, hnd, prevHnd]) => {
        setDetail(det);
        setChecklist(chk);
        setHandover(hnd);
        setPreviousHandover(prevHnd);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Gagal memuat detail shift terpadu";
        setLoadError(msg);
        toast(msg, "error");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAllData();
  }, [id, branchId]);

  useEffect(() => {
    if (activeTab === "checklist") router.replace(`/shift/${id}/checklist${branchSuffix}`);
  }, [activeTab, branchSuffix, id, router]);

  async function startShift() {
    if (!detail) return;
    setStarting(true);
    try {
      const res = await request<{ scheduleId: string; startedAt: string }>(
        scheduleUrl(`/api/schedules/${id}/start-shift`, branchId),
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

  async function handleCheck(itemId: string, photoUrl?: string) {
    setCheckingId(itemId);
    try {
      await request(scheduleUrl(`/api/schedules/${id}/checklist`, branchId), {
        method: "POST",
        body: JSON.stringify({ itemId, photoUrl: photoUrl || undefined }),
      });
      toast("Item checklist dicentang", "success");
      resetPhotoModal();
      const updatedChk = await request<ChecklistResponse>(scheduleUrl(`/api/schedules/${id}/checklist`, branchId));
      setChecklist(updatedChk);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menyimpan centang", "error");
    } finally {
      setCheckingId(null);
    }
  }

  function onCheckboxClick(item: ChecklistItem) {
    if (item.checked) {
      toast("Item sudah tersimpan di log checklist", "info");
      return;
    }
    if (item.requiresPhoto) {
      resetPhotoModal();
      setPhotoModalItem(item);
      return;
    }
    handleCheck(item.itemId);
  }

  async function handleFilePicked(rawFile: File | undefined) {
    if (!rawFile || !photoModalItem) return;
    if (!ACCEPTED_PHOTO_TYPES.includes(rawFile.type)) {
      toast("Format foto harus JPEG, PNG, WEBP, atau HEIC.", "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (rawFile.size > MAX_PHOTO_BYTES) {
      toast("Ukuran foto maksimal 5 MB.", "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadingPhoto(true);
    try {
      const compressed = await compressPhoto(rawFile);
      const form = new FormData();
      form.append("file", compressed);
      const data = await request<{ photoUrl: string; fileId: string }>(
        `/api/schedules/${id}/checklist/photo?${new URLSearchParams({ itemId: photoModalItem.itemId, branchId }).toString()}`,
        { method: "POST", body: form }
      );
      setUploadedUrl(data.photoUrl);
      toast("Foto berhasil diunggah (terkompresi WebP)", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal mengunggah foto", "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSubmitChecklist() {
    setSubmittingChecklist(true);
    try {
      await request<{ submitted: boolean; status?: string }>(
        scheduleUrl(`/api/schedules/${id}/checklist/submit`, branchId),
        { method: "POST" }
      );
      toast("Checklist disubmit! Shift berhasil diselesaikan.", "success");
      loadAllData();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal submit checklist", "error");
    } finally {
      setSubmittingChecklist(false);
    }
  }

  function handleHandoverFieldChange(fieldId: string, value: string) {
    setHandover((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        fields: prev.fields.map((f) => (f.fieldId === fieldId ? { ...f, value } : f)),
      };
    });
  }

  async function handleSubmitHandover() {
    if (!handover) return;
    setSubmittingHandover(true);
    try {
      await request(scheduleUrl(`/api/schedules/${id}/handover`, branchId), {
        method: "POST",
        body: JSON.stringify({ fields: handover.fields }),
      });
      toast("Catatan Handover berhasil disimpan!", "success");
      const updatedHnd = await request<HandoverResponse>(scheduleUrl(`/api/schedules/${id}/handover`, branchId));
      setHandover(updatedHnd);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menyimpan handover", "error");
    } finally {
      setSubmittingHandover(false);
    }
  }

  const today = todayInWIB();
  const isToday = detail?.date === today;
  const canStart = detail?.status === "scheduled" && isToday;

  const checklistTotal = checklist?.total ?? 0;
  const checklistDone = checklist?.completed ?? 0;
  const allChecklistDone = checklistTotal > 0 && checklistDone === checklistTotal;
  const checklistPercent = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

  const handoverFields = handover?.fields ?? [];
  const handoverFilledCount = handoverFields.filter((f) => f.value.trim().length > 0).length;
  const allHandoverRequiredFilled = handoverFields.every((f) => !f.isRequired || f.value.trim().length > 0);

  return (
    <PetugasShell
      title="Layar Shift Terpadu"
      lead={detail ? `${detail.shiftName || detail.shiftId} · ${detail.date}` : "Memuat data shift..."}
    >
      {loading ? (
        <div className="max-w-2xl space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : loadError || !detail ? (
        <div className="max-w-2xl rounded-lg border border-destructive-wash bg-destructive-wash p-6 text-center">
          <AlertCircle size={36} className="text-destructive-foreground" />
          <h2 className="mt-2 text-base font-semibold text-destructive-foreground">Jadwal tidak dapat dibuka</h2>
          <p className="mt-1 text-sm text-destructive-foreground/80">{loadError || "Jadwal tidak ditemukan"}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/jadwal-saya">Kembali ke Jadwal Saya</Link>
          </Button>
        </div>
      ) : (
        <div className="max-w-2xl space-y-6">
          {/* Top 3-Tab Segmented Control Navigation */}
          <div className="flex rounded-lg border border-border bg-muted/50 p-1 shadow-inner">
            <button
              onClick={() => setActiveTab("info")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-all",
                activeTab === "info"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Info size={16} />
              <span>Ringkasan</span>
            </button>

            <button
              onClick={() => router.push(`/shift/${id}/checklist${branchSuffix}`)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-all",
                activeTab === "checklist"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ListChecks size={16} />
              <span>Checklist ({checklistDone}/{checklistTotal})</span>
            </button>

            <button
              onClick={() => setActiveTab("handover")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-all",
                activeTab === "handover"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ClipboardList size={16} />
              <span>Handover ({handoverFilledCount}/{handoverFields.length})</span>
            </button>
          </div>

          {/* TAB 1: INFO & MULAI SHIFT */}
          {activeTab === "info" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
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
                      {checklistDone}/{checklistTotal} item ({checklistPercent}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-muted-foreground">Status Handover</span>
                    <span className="font-medium text-foreground">
                      {handover?.completed ? (
                        <span className="text-success font-semibold">Selesai Terisi</span>
                      ) : (
                        <span className="text-warning font-semibold">{handoverFilledCount}/{handoverFields.length} field</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-muted-foreground">Laporan Shift</span>
                    <span className="font-medium text-foreground">{detail.reportGeneratedAt ? "Sudah digenerate" : "Belum digenerate"}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 sm:flex-row">
                {canStart && (
                  <Button
                    onClick={startShift}
                    loading={starting}
                    disabled={starting}
                    size="lg"
                    className="h-11 flex-1"
                  >
                    {!starting && <Play size={18} />}
                    {starting ? "Memulai Shift..." : "Mulai Shift (Timestamp)"}
                  </Button>
                )}

                {!isToday && detail.status === "scheduled" && (
                  <p className="w-full rounded bg-muted/60 p-3 text-xs text-muted-foreground">
                    Tombol &quot;Mulai Shift&quot; hanya aktif pada tanggal pelaksanaan ({detail.date}).
                  </p>
                )}

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => router.push(`/shift/${id}/checklist${branchSuffix}`)}
                  className="h-11 flex-1"
                >
                  <ListChecks size={18} />
                  Isi Checklist SOP
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setActiveTab("handover")}
                  className="h-11 flex-1"
                >
                  <ClipboardList size={18} />
                  Isi Handover
                </Button>
                <Button asChild variant="outline" size="lg" className="h-11 flex-1">
                  <Link href={`/shift/${id}/laporan${branchSuffix}`}>Laporan Shift</Link>
                </Button>
              </div>

              {/* Previous handover card preview */}
              {previousHandover && previousHandover.fields && previousHandover.fields.length > 0 && (
                <div className="rounded-lg border border-primary/30 bg-accent/40 p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                    <History size={16} />
                    Catatan Handover Shift Sebelumnya ({previousHandover.scheduleId})
                  </div>
                  <div className="mt-3 divide-y divide-border/60 text-sm">
                    {previousHandover.fields.map((f, i) => (
                      <div key={i} className="py-2 first:pt-0 last:pb-0">
                        <p className="text-xs font-medium text-muted-foreground">{f.label}</p>
                        <p className="mt-0.5 whitespace-pre-wrap text-foreground">
                          {f.value || <span className="italic text-muted-foreground">(kosong)</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: CHECKLIST SHIFT */}
          {activeTab === "checklist" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">Progres Checklist SOP</span>
                  <span className="font-semibold text-foreground">
                    {checklistDone} dari {checklistTotal} ({checklistPercent}%)
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${checklistPercent}%` }}
                  />
                </div>
              </div>

              {!checklist || checklist.items.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground sm:p-8">
                  Tidak ada item checklist aktif untuk cabang ini.
                </div>
              ) : (
                <div className="space-y-3">
                  {checklist.items.map((item) => {
                    const isBusy = checkingId === item.itemId;
                    return (
                      <div
                        key={item.itemId}
                        className={cn(
                          "flex items-start justify-between gap-3 rounded-lg border p-4 transition-colors",
                          item.checked
                            ? "border-success-wash bg-success-wash/20 text-muted-foreground"
                            : "border-border bg-card text-foreground"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => onCheckboxClick(item)}
                            disabled={item.checked || isBusy}
                            className={cn(
                              "mt-0.5 grid size-5 shrink-0 place-items-center rounded border transition-colors",
                              item.checked
                                ? "border-success bg-success text-success-wash"
                                : "border-input bg-card hover:border-primary"
                            )}
                            aria-label={item.checked ? "Sudah dicentang" : "Centang item"}
                          >
                            {item.checked && (
                              <Check size={14} strokeWidth={3} />
                            )}
                          </button>

                          <div>
                            <p
                              className={cn(
                                "text-sm font-medium",
                                item.checked && "line-through text-muted-foreground"
                              )}
                            >
                              {item.description}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                              <span className="rounded bg-muted px-1.5 py-0.5 uppercase text-[10px] font-semibold text-muted-foreground">
                                {item.type}
                              </span>
                              {item.requiresPhoto && (
                                <span className="inline-flex items-center gap-1 font-medium text-warning">
                                  <Camera size={12} />
                                  Wajib Bukti Foto
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {!item.checked && (
                          <Button
                            size="sm"
                            variant={item.requiresPhoto ? "outline" : "default"}
                            disabled={isBusy}
                            onClick={() => onCheckboxClick(item)}
                          >
                            {isBusy ? (
                              "..."
                            ) : item.requiresPhoto ? (
                              <>
                                <Camera size={14} />
                                Upload Foto
                              </>
                            ) : (
                              "Centang"
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-2">
                <Button
                  disabled={!allChecklistDone || submittingChecklist}
                  onClick={handleSubmitChecklist}
                  size="lg"
                  className="h-11 w-full"
                >
                  {submittingChecklist ? "Menyelesaikan Shift..." : "Submit Checklist & Selesaikan Shift"}
                </Button>
                {!allChecklistDone && checklistTotal > 0 && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Semua SOP wajib dicentang 100% sebelum shift dapat diselesaikan.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 3: HANDOVER SHIFT */}
          {activeTab === "handover" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {previousHandover && previousHandover.fields && previousHandover.fields.length > 0 && (
                <div className="rounded-lg border border-primary/30 bg-accent/40 p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                    <History size={16} />
                    Catatan Shift Sebelumnya ({previousHandover.scheduleId})
                  </div>
                  <div className="mt-3 divide-y divide-border/60 text-sm">
                    {previousHandover.fields.map((f, i) => (
                      <div key={i} className="py-2 first:pt-0 last:pb-0">
                        <p className="text-xs font-medium text-muted-foreground">{f.label}</p>
                        <p className="mt-0.5 whitespace-pre-wrap text-foreground">
                          {f.value || <span className="italic text-muted-foreground">(kosong)</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {handoverFilledCount} dari {handoverFields.length} field terisi
                  </span>
                  <span className={allHandoverRequiredFilled ? "text-success font-medium" : "text-warning font-medium"}>
                    {allHandoverRequiredFilled ? "Field wajib lengkap" : "Ada field wajib yang belum diisi"}
                  </span>
                </div>

                {handoverFields.map((field) => (
                  <div key={field.fieldId} className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
                    <Label htmlFor={field.fieldId} className="mb-2 block text-sm font-semibold text-foreground">
                      {field.label}
                      {field.isRequired && (
                        <span className="ml-1 text-xs font-semibold text-destructive">* wajib</span>
                      )}
                    </Label>
                    <Textarea
                      id={field.fieldId}
                      value={field.value}
                      onChange={(e) => handleHandoverFieldChange(field.fieldId, e.target.value)}
                      placeholder={
                        field.isRequired
                          ? "Isi catatan wajib ini untuk shift berikutnya..."
                          : "Catatan opsional..."
                      }
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                ))}

                <div className="pt-2">
                  <Button
                    disabled={!allHandoverRequiredFilled || submittingHandover}
                    onClick={handleSubmitHandover}
                    size="lg"
                    className="h-11 w-full"
                  >
                    {submittingHandover ? "Menyimpan Catatan..." : "Simpan Handover"}
                  </Button>
                  {!allHandoverRequiredFilled && (
                    <p className="mt-2 text-center text-xs text-destructive">
                      Semua field bertanda * wajib diisi sebelum menyimpan handover.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Bottom Back Button */}
          <div className="text-center pt-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/jadwal-saya">← Kembali ke Jadwal Saya</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Photo URL Modal */}
      {photoModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-xl sm:p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-warning">
                  Wajib Lampiran Foto
                </span>
                <h3 className="mt-1 text-base font-bold text-foreground">
                  {photoModalItem.description}
                </h3>
              </div>
              <button
                onClick={resetPhotoModal}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Foto akan otomatis dikompres ke WebP untuk kecepatan pengiriman.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="photo-file">Unggah Foto Bukti</Label>
                <input
                  id="photo-file"
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_PHOTO_TYPES.join(",")}
                  disabled={uploadingPhoto}
                  onChange={(e) => handleFilePicked(e.target.files?.[0])}
                  className="block w-full cursor-pointer rounded-md border border-border bg-background p-2 text-sm text-foreground file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  JPEG, PNG, WEBP, atau HEIC. Maksimal 5 MB.
                </p>
                {uploadingPhoto && (
                  <p className="mt-1 text-xs text-muted-foreground">Mengompresi & mengunggah foto...</p>
                )}
                {uploadedUrl && !uploadingPhoto && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-success">
                    <CheckCircle2 size={14} />
                    Foto tersimpan, siap dicentang.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="photo-url">Tautan URL Foto Bukti</Label>
                <Input
                  id="photo-url"
                  type="url"
                  value={photoUrlInput}
                  onChange={(e) => setPhotoUrlInput(e.target.value)}
                  placeholder="https://drive.google.com/... atau https://..."
                  className={controlClass}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() =>
                    handleCheck(photoModalItem.itemId, uploadedUrl || photoUrlInput.trim())
                  }
                  disabled={
                    (!uploadedUrl && !photoUrlInput.trim()) ||
                    checkingId === photoModalItem.itemId ||
                    uploadingPhoto
                  }
                  className="flex-1"
                >
                  {checkingId === photoModalItem.itemId
                    ? "Menyimpan..."
                    : uploadingPhoto
                      ? "Mengunggah..."
                      : "Simpan & Centang"}
                </Button>
                <Button variant="ghost" onClick={resetPhotoModal}>
                  Batal
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </PetugasShell>
  );
}

export default function ShiftTerpaduPage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<SkeletonCard />}>
      <ShiftTerpaduContent {...props} />
    </Suspense>
  );
}
