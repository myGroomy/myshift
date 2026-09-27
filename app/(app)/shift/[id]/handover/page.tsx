"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { request } from "@/lib/api";
import { KaryawanShell } from "@/components/bottom-nav";
import { useToast } from "@/components/ui/toast";
import { SkeletonCard } from "@/components/ui/skeleton";

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

export default function HandoverPage() {
  const { id } = useParams<{ id: string }>();
  
  const { toast } = useToast();

  const [data, setData] = useState<HandoverResponse | null>(null);
  const [previous, setPrevious] = useState<PreviousHandover>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    if (!id) return;
    setLoading(true);
    setLoadError(null);

    Promise.all([
      request<HandoverResponse>(`/api/schedules/${id}/handover`),
      request<PreviousHandover>(`/api/schedules/${id}/handover/previous`).catch(() => null),
    ])
      .then(([current, prev]) => {
        setData(current);
        setPrevious(prev);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Gagal memuat form handover";
        setLoadError(msg);
        toast(msg, "error");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [id]);

  function handleChange(fieldId: string, value: string) {
    setData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        fields: prev.fields.map((f) => (f.fieldId === fieldId ? { ...f, value } : f)),
      };
    });
  }

  // Live count based on client text:
  const fields = data?.fields ?? [];
  const filledCountLive = fields.filter((f) => f.value.trim().length > 0).length;
  const allRequiredFilled = fields.every((f) => !f.isRequired || f.value.trim().length > 0);

  async function handleSubmit() {
    if (!data) return;
    setSubmitting(true);
    try {
      await request(`/api/schedules/${id}/handover`, {
        method: "POST",
        body: JSON.stringify({ fields: data.fields }),
      });
      toast("Handover berhasil disimpan!", "success");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menyimpan handover", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KaryawanShell
      title="Handover Shift"
      lead="Catat informasi penting, sisa stok, atau kendala toko untuk shift selanjutnya."
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
          {/* Previous shift handover info */}
          {previous && previous.fields && previous.fields.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-primary/30 bg-accent/40 p-5 shadow-sm"
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <span className="material-symbols-outlined text-base">history</span>
                Catatan Shift Sebelumnya ({previous.scheduleId})
              </div>
              <div className="mt-3 divide-y divide-border/60 text-sm">
                {previous.fields.map((f, i) => (
                  <div key={i} className="py-2 first:pt-0 last:pb-0">
                    <p className="text-xs font-medium text-muted-foreground">{f.label}</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-foreground">
                      {f.value || <span className="italic text-muted-foreground">(kosong)</span>}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Current handover form */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {filledCountLive} dari {fields.length} field terisi
              </span>
              <span className={allRequiredFilled ? "text-success font-medium" : "text-warning font-medium"}>
                {allRequiredFilled ? "Field wajib lengkap" : "Ada field wajib yang belum diisi"}
              </span>
            </div>

            {fields.map((field) => (
              <div key={field.fieldId} className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <Label htmlFor={field.fieldId} className="mb-2 block text-sm font-semibold text-foreground">
                  {field.label}
                  {field.isRequired && (
                    <span className="ml-1 text-xs font-semibold text-destructive">* wajib</span>
                  )}
                </Label>
                <Textarea
                  id={field.fieldId}
                  value={field.value}
                  onChange={(e) => handleChange(field.fieldId, e.target.value)}
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
                disabled={!allRequiredFilled || submitting}
                onClick={handleSubmit}
                size="lg"
                className="h-11 w-full"
              >
                {submitting ? "Menyimpan Catatan..." : "Simpan Handover"}
              </Button>
              {!allRequiredFilled && (
                <p className="mt-2 text-center text-xs text-destructive">
                  Semua field bertanda * wajib diisi sebelum menyimpan handover.
                </p>
              )}
            </div>

            <div className="text-center">
              <Button asChild variant="ghost" size="sm">
                <Link href={`/shift/${id}`}>← Kembali ke Detail Shift</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </KaryawanShell>
  );
}
