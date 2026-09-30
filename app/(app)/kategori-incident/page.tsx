"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, tdClass } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonTable } from "@/components/ui/skeleton";
import { AdminShell, StatusBadge } from "@/components/shell";
import { useToast } from "@/components/ui/toast";
import { request } from "@/lib/api";
import { controlClass } from "@/lib/ui";
import { Tag } from "lucide-react";

type Category = {
  id: string;
  label: string;
  aktif: boolean;
};

type Session = {
  role: "admin" | "karyawan";
  activeBranchId: string;
  branches: { branchId: string; nama: string }[];
};

export default function KategoriIncidentPage() {
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<Category[]>([]);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    request<Category[]>("/api/incident-categories")
      .then(setItems)
      .catch((e: unknown) => {
        toast(e instanceof Error ? e.message : "Gagal memuat kategori", "error");
        setItems([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    request<Session>("/api/auth/session")
      .then(setSession)
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!label.trim()) return;
    setSubmitting(true);
    try {
      await request("/api/incident-categories", {
        method: "POST",
        body: JSON.stringify({ label: label.trim() }),
      });
      setLabel("");
      toast("Kategori ditambahkan", "success");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menambahkan kategori", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Nonaktifkan kategori ini? Incident lama tetap tersimpan.")) return;
    setDeletingId(id);
    try {
      await request(`/api/incident-categories/${id}`, { method: "DELETE" });
      toast("Kategori dinonaktifkan", "success");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menghapus kategori", "error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AdminShell
      title="Kelola Kategori Incident"
      lead="Daftar kategori kejadian yang bisa dipilih karyawan saat melaporkan incident."
    >
      <form onSubmit={submit} className="mb-6 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <Label htmlFor="kategori-label">Nama Kategori Baru</Label>
          <Input
            id="kategori-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Misal: Kebocoran Gas, Kebakaran, dll."
            required
            className={controlClass}
          />
        </div>
        <Button type="submit" disabled={submitting || !label.trim()} size="lg" className="h-11 w-full sm:w-auto">
          {submitting ? "Menyimpan..." : "Tambah"}
        </Button>
      </form>

      {loading ? (
        <SkeletonTable rows={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Tag size={40} />}
          title="Belum ada kategori"
          description="Tambahkan kategori pertama agar karyawan bisa melaporkan incident."
        />
      ) : (
        <DataTable columns={["ID", "Label", "Status", "Aksi"]}>
          {items.map((cat) => (
            <tr key={cat.id} className="border-t border-border">
              <td className={tdClass}>
                <span className="font-mono text-xs">{cat.id}</span>
              </td>
              <td className={tdClass}>
                <span className="font-medium">{cat.label}</span>
              </td>
              <td className={tdClass}>
                <StatusBadge status={cat.aktif ? "active" : "inactive"} />
              </td>
              <td className={tdClass}>
                {cat.aktif ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deletingId === cat.id}
                    onClick={() => handleDelete(cat.id)}
                    className="text-destructive hover:bg-destructive-wash"
                  >
                    {deletingId === cat.id ? "Memproses..." : "Nonaktifkan"}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </AdminShell>
  );
}
