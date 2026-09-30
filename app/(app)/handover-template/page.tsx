"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { request } from "@/lib/api";
import { AdminShell } from "@/components/shell";
import { SkeletonTable } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { controlClass } from "@/lib/ui";
import type { Branch } from "@/lib/types";

type HandoverField = {
  fieldId: string;
  label: string;
  isRequired: boolean;
  order: number;
};

type Session = {
  role: "admin" | "karyawan";
  activeBranchId: string;
  branches: Branch[];
};

export default function HandoverTemplatePage() {
  const { toast } = useToast();
  
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");

  const [fields, setFields] = useState<HandoverField[]>([]);
  const [label, setLabel] = useState("");
  const [required, setRequired] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      request<Session>("/api/auth/session"),
      request<Branch[]>("/api/branches").catch(() => []),
    ])
      .then(([s, bList]) => {
        setBranches(bList);
        const initialBranch =
          s.activeBranchId || bList[0]?.branchId || s.branches[0]?.branchId || "";
        setBranchId(initialBranch);
        if (initialBranch) void loadFields(initialBranch);
      })
      .catch((e: unknown) => {
        toast(e instanceof Error ? e.message : "Gagal memuat sesi", "error");
        setLoading(false);
      });
  }, [toast]);

  async function loadFields(targetBranch: string) {
    if (!targetBranch) return;
    setLoading(true);
    try {
      const data = await request<HandoverField[]>(
        `/api/handover-templates?branchId=${targetBranch}`
      );
      setFields(data);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal memuat template handover", "error");
      setFields([]);
    } finally {
      setLoading(false);
    }
  }

  function handleBranchChange(newBranchId: string) {
    setBranchId(newBranchId);
    void loadFields(newBranchId);
  }

  async function handleAdd() {
    if (!label.trim() || !branchId) return;
    setSubmitting(true);
    try {
      await request(`/api/handover-templates?branchId=${branchId}`, {
        method: "POST",
        body: JSON.stringify({ label: label.trim(), isRequired: required }),
      });
      setLabel("");
      setRequired(false);
      toast("Field handover ditambahkan", "success");
      void loadFields(branchId);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menambah field handover", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(fieldId: string) {
    if (!confirm("Hapus field ini dari template handover?")) return;
    setDeletingId(fieldId);
    try {
      await request(`/api/handover-templates/${fieldId}?branchId=${branchId}`, {
        method: "DELETE",
      });
      toast("Field handover dihapus", "success");
      void loadFields(branchId);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menghapus field", "error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AdminShell
      title="Kelola Handover Template"
      lead="Definisikan kolom form handover wajib dan opsional yang harus diisi staf di akhir shift."
    >
      <div className="mb-6 max-w-2xl">
        <Label htmlFor="branch-select">Pilih Cabang</Label>
        <Select
          id="branch-select"
          value={branchId}
          onChange={(e) => handleBranchChange(e.target.value)}
          className={controlClass}
        >
          {branches.map((b) => (
            <option key={b.branchId} value={b.branchId}>
              {b.nama} ({b.branchId})
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Add Field Form */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm sticky top-24">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Tambah Field Handover Baru</h2>
            <div className="space-y-3">
              <div>
                <Label htmlFor="label-input">Nama / Label Field</Label>
                <Input
                  id="label-input"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Misal: Kondisi Kasir, Sisa Bahan Kritis"
                  required
                  className={controlClass}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                  className="size-4 rounded border-input"
                />
                <span>Field wajib diisi staf sebelum shift dapat ditutup</span>
              </label>

              <Button
                onClick={handleAdd}
                disabled={!label.trim() || submitting || !branchId}
                size="lg"
                className="w-full"
              >
                {submitting ? "Menyimpan..." : "Tambah Field Handover"}
              </Button>
            </div>
          </div>
        </div>

        {/* Field List */}
        <div className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Daftar Field Handover ({fields.length})
          </h3>

          {loading ? (
            <SkeletonTable rows={4} />
          ) : fields.length === 0 ? (
            <EmptyState
              icon="assignment"
              title="Belum ada field handover"
              description="Tambahkan field pertanyaan agar staf mencatat informasi penting ke shift berikutnya."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((field) => (
                <motion.div
                  key={field.fieldId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-sm"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{field.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      ID: {field.fieldId} ·{" "}
                      {field.isRequired ? (
                        <span className="font-semibold text-destructive">* Wajib Diisi</span>
                      ) : (
                        "Opsional"
                      )}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deletingId === field.fieldId}
                    onClick={() => handleDelete(field.fieldId)}
                    className="text-destructive hover:bg-destructive-wash shrink-0"
                  >
                    {deletingId === field.fieldId ? "..." : "Hapus"}
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
