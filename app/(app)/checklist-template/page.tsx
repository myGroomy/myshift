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

type ChecklistItem = {
  itemId: string;
  type: string;
  description: string;
  requiresPhoto: boolean;
  order: number;
  active: boolean;
};

type Session = {
  role: "admin" | "kepala_cabang" | "karyawan";
  activeBranchId: string;
  branches: Branch[];
};

export default function ChecklistTemplatePage() {
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [type, setType] = useState<"opening" | "closing">("opening");
  const [desc, setDesc] = useState("");
  const [photo, setPhoto] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      request<Session>("/api/auth/session"),
      request<Branch[]>("/api/branches").catch(() => []),
    ])
      .then(([s, bList]) => {
        setSession(s);
        setBranches(bList);
        const initialBranch =
          s.activeBranchId || bList[0]?.branchId || s.branches[0]?.branchId || "";
        setBranchId(initialBranch);
        if (initialBranch) void loadItems(initialBranch);
      })
      .catch((e: unknown) => {
        toast(e instanceof Error ? e.message : "Gagal memuat sesi", "error");
        setLoading(false);
      });
  }, [toast]);

  async function loadItems(targetBranch: string) {
    if (!targetBranch) return;
    setLoading(true);
    try {
      const data = await request<ChecklistItem[]>(
        `/api/checklist-templates?branchId=${targetBranch}`
      );
      setItems(data);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal memuat checklist", "error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function handleBranchChange(newBranchId: string) {
    setBranchId(newBranchId);
    void loadItems(newBranchId);
  }

  async function handleAdd() {
    if (!desc.trim() || !branchId) return;
    setSubmitting(true);
    try {
      await request(`/api/checklist-templates?branchId=${branchId}`, {
        method: "POST",
        body: JSON.stringify({ type, description: desc.trim(), requiresPhoto: photo }),
      });
      setDesc("");
      setPhoto(false);
      toast("Item checklist ditambahkan", "success");
      void loadItems(branchId);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menambah item", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(itemId: string) {
    if (!confirm("Hapus item checklist ini dari SOP cabang?")) return;
    setDeletingId(itemId);
    try {
      await request(`/api/checklist-templates/${itemId}?branchId=${branchId}`, {
        method: "DELETE",
      });
      toast("Item checklist dihapus", "success");
      void loadItems(branchId);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menghapus item", "error");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = items.filter((i) => i.type === type && i.active);

  return (
    <AdminShell
      title="Kelola Checklist SOP"
      lead="Atur butir tugas wajib pembukaan (opening) dan penutupan (closing) per outlet."
    >
      <div className="mb-6 grid max-w-2xl gap-4 sm:grid-cols-2">
        {session?.role === "admin" && (
          <div>
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
        )}

        <div>
          <Label htmlFor="type-select">Kategori SOP</Label>
          <Select
            id="type-select"
            value={type}
            onChange={(e) => setType(e.target.value as "opening" | "closing")}
            className={controlClass}
          >
            <option value="opening">Opening (Buka Outlet)</option>
            <option value="closing">Closing (Tutup Outlet)</option>
          </Select>
        </div>
      </div>

      {/* Tambah Form Card */}
      <div className="mb-8 max-w-2xl rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Tambah Item SOP {type === "opening" ? "Opening" : "Closing"}
        </h2>
        <div className="space-y-3">
          <div>
            <Label htmlFor="desc-input">Deskripsi Tugas</Label>
            <Input
              id="desc-input"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Misal: Periksa kebersihan mesin kopi dan area kasir"
              required
              className={controlClass}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={photo}
              onChange={(e) => setPhoto(e.target.checked)}
              className="size-4 rounded border-input"
            />
            <span>Wajib upload foto bukti oleh staf saat centang</span>
          </label>

          <Button
            onClick={handleAdd}
            disabled={!desc.trim() || submitting || !branchId}
            size="lg"
            className="w-full sm:w-auto"
          >
            {submitting ? "Menyimpan..." : "Tambah ke Daftar SOP"}
          </Button>
        </div>
      </div>

      {/* List items */}
      <div className="max-w-2xl">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Daftar Item Aktif ({filtered.length})
        </h3>

        {loading ? (
          <SkeletonTable rows={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="checklist"
            title="Belum ada item checklist"
            description={`Belum ada butir tugas ${type} untuk cabang ini.`}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <motion.div
                key={item.itemId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-sm"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{item.description}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    ID: {item.itemId} · {item.requiresPhoto ? "📷 Wajib Foto" : "Teks Saja"}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={deletingId === item.itemId}
                  onClick={() => handleDelete(item.itemId)}
                  className="text-destructive hover:bg-destructive-wash"
                >
                  {deletingId === item.itemId ? "..." : "Hapus"}
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
