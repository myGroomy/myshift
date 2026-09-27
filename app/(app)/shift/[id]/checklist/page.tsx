"use client";

import { useEffect, useState } from "react";
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
      setPhotoModalItem(null);
      setPhotoUrlInput("");
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
      setPhotoModalItem(item);
      setPhotoUrlInput("");
      return;
    }

    handleCheck(item.itemId);
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
                onClick={() => setPhotoModalItem(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Masukkan tautan foto bukti SOP (misal link Google Drive, Cloudinary, atau URL publik foto).
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="photo-url">Tautan URL Foto Bukti</Label>
                <Input
                  id="photo-url"
                  type="url"
                  value={photoUrlInput}
                  onChange={(e) => setPhotoUrlInput(e.target.value)}
                  placeholder="https://drive.google.com/... atau https://..."
                  required
                  className={controlClass}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => handleCheck(photoModalItem.itemId, photoUrlInput.trim())}
                  disabled={!photoUrlInput.trim() || checkingId === photoModalItem.itemId}
                  className="flex-1"
                >
                  {checkingId === photoModalItem.itemId ? "Menyimpan..." : "Simpan & Centang"}
                </Button>
                <Button variant="ghost" onClick={() => setPhotoModalItem(null)}>
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
