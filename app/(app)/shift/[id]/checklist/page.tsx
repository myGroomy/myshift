"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { request } from "@/lib/api";
import { KaryawanShell } from "@/components/bottom-nav";
import { useToast } from "@/components/ui/toast";
import { SkeletonCard } from "@/components/ui/skeleton";
import { controlClass } from "@/lib/ui";
import { cn } from "@/lib/utils";

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

// Mirrors the whitelist in lib/google/photo-upload.ts, restated here rather than imported: that
// module pulls in the Drive client, which must not reach the browser bundle. The `accept` string
// and this list are two halves of the same filter; the server is the authority.
const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export default function ChecklistPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Photo modal/popover state
  const [photoModalItem, setPhotoModalItem] = useState<ChecklistItem | null>(null);
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Upload state for the file picker. The uploaded file becomes a Drive URL that feeds the same
  // handleCheck path as the manual field, so a photo uploaded from the phone behaves identically to
  // one pasted by hand.
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function resetPhotoModal() {
    setPhotoModalItem(null);
    setPhotoUrlInput("");
    setUploadedUrl("");
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function load() {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    request<ChecklistResponse>(`/api/schedules/${id}/checklist`)
      .then((data) => {
        setItems(data.items);
        setCompleted(data.completed);
        setTotal(data.total);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Gagal memuat checklist";
        setLoadError(msg);
        toast(msg, "error");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleCheck(itemId: string, photoUrl?: string) {
    setCheckingId(itemId);
    try {
      await request(`/api/schedules/${id}/checklist`, {
        method: "POST",
        body: JSON.stringify({ itemId, photoUrl: photoUrl || undefined }),
      });
      toast("Item checklist dicentang", "success");
      resetPhotoModal();
      load();
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

  // Client-side checks are for a fast error message only — the backend re-validates type, size and
  // ownership (API-CONTRACT §8). A file that slips past these still gets rejected server-side.
  async function handleFilePicked(file: File | undefined) {
    if (!file || !photoModalItem) return;
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      toast("Format foto harus JPEG, PNG, WEBP, atau HEIC.", "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast("Ukuran foto maksimal 5 MB.", "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      // No Content-Type header: the browser must set it so the multipart boundary is included.
      const data = await request<{ photoUrl: string; fileId: string }>(
        `/api/schedules/${id}/checklist/photo?itemId=${encodeURIComponent(photoModalItem.itemId)}`,
        { method: "POST", body: form }
      );
      setUploadedUrl(data.photoUrl);
      toast("Foto berhasil diunggah", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal mengunggah foto", "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await request<{ submitted: boolean; status?: string }>(
        `/api/schedules/${id}/checklist/submit`,
        { method: "POST" }
      );
      toast("Checklist berhasil disubmit! Shift telah selesai.", "success");
      router.push(`/shift/${id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal submit checklist", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const allChecked = total > 0 && completed === total;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <KaryawanShell
      title="Checklist SOP Shift"
      lead="Centang kepatuhan SOP pembukaan atau penutupan sebelum shift diselesaikan."
    >
      {loading ? (
        <div className="max-w-2xl space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : loadError ? (
        <div className="max-w-2xl rounded-lg border border-destructive-wash bg-destructive-wash p-6 text-center">
          <span className="material-symbols-outlined text-4xl text-destructive-foreground">error</span>
          <p className="mt-2 text-sm text-destructive-foreground">{loadError}</p>
          <Button variant="outline" onClick={load} className="mt-4">
            Coba Lagi
          </Button>
        </div>
      ) : (
        <div className="max-w-2xl space-y-6">
          {/* Progress bar card */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Progres Checklist</span>
              <span className="font-semibold text-foreground">
                {completed} dari {total} ({percent}%)
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* List items */}
          {items.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Tidak ada item checklist aktif untuk cabang ini.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const isBusy = checkingId === item.itemId;
                return (
                  <motion.div
                    key={item.itemId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
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
                          <span className="material-symbols-outlined text-sm font-bold">check</span>
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
                              <span className="material-symbols-outlined text-xs">photo_camera</span>
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
                            <span className="material-symbols-outlined text-sm">photo_camera</span>
                            Isi Foto
                          </>
                        ) : (
                          "Centang"
                        )}
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Submit Shift Button */}
          <div className="pt-2">
            <Button
              disabled={!allChecked || submitting}
              onClick={handleSubmit}
              size="lg"
              className="h-11 w-full"
            >
              {submitting ? "Menyelesaikan Shift..." : "Submit Checklist & Selesaikan Shift"}
            </Button>
            {!allChecked && total > 0 && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Semua SOP wajib dicentang 100% sebelum shift dapat diselesaikan.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Photo URL Modal */}
      {photoModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl"
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
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Unggah foto bukti langsung dari perangkat, atau tempel tautan foto bila sudah ada di
              Drive.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="photo-file">Unggah Foto Bukti</Label>
                <input
                  id="photo-file"
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_PHOTO_TYPES.join(",")}
                  disabled={uploading}
                  onChange={(e) => handleFilePicked(e.target.files?.[0])}
                  className="block w-full cursor-pointer rounded-md border border-border bg-background p-2 text-sm text-foreground file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  JPEG, PNG, WEBP, atau HEIC. Maksimal 5 MB.
                </p>
                {uploading && (
                  <p className="mt-1 text-xs text-muted-foreground">Mengunggah foto ke Drive...</p>
                )}
                {uploadedUrl && !uploading && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-success">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
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
                <p className="mt-1 text-xs text-muted-foreground">
                  Opsional bila foto sudah diunggah di atas.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() =>
                    handleCheck(photoModalItem.itemId, uploadedUrl || photoUrlInput.trim())
                  }
                  disabled={
                    (!uploadedUrl && !photoUrlInput.trim()) ||
                    checkingId === photoModalItem.itemId ||
                    uploading
                  }
                  className="flex-1"
                >
                  {checkingId === photoModalItem.itemId
                    ? "Menyimpan..."
                    : uploading
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
    </KaryawanShell>
  );
}
