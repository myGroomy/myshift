"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, tdClass } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonTable } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { AdminShell, StatusBadge } from "@/components/shell";
import { request } from "@/lib/api";
import { controlClass } from "@/lib/ui";

type Category = {
  id: string;
  label: string;
  aktif: boolean;
};

export default function KategoriIzinPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Category[]>([]);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    request<Category[]>("/api/izin-categories")
      .then(setItems)
      .catch((e: unknown) => {
        toast(e instanceof Error ? e.message : "Gagal memuat kategori izin", "error");
        setItems([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!label.trim()) return;
    setSubmitting(true);
    try {
      await request("/api/izin-categories", {
        method: "POST",
        body: JSON.stringify({ label: label.trim() }),
      });
      setLabel("");
      toast("Kategori izin ditambahkan", "success");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menambahkan kategori", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Nonaktifkan kategori izin ini? Pengajuan lama tetap tersimpan.")) return;
    setDeletingId(id);
    try {
      await request(`/api/izin-categories/${id}`, { method: "DELETE" });
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
      title="Kelola Kategori Izin"
      lead="Daftar opsi izin yang dapat dipilih karyawan saat mengajukan ketidakhadiran."
    >
      <form onSubmit={submit} className="mb-6 flex max-w-2xl items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="kategori-label">Nama Kategori Baru</Label>
          <Input
            id="kategori-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Misal: Sakit, Cuti, Keperluan Keluarga"
            required
            className={controlClass}
          />
        </div>
        <Button type="submit" disabled={submitting || !label.trim()} size="lg" className="h-11">
          {submitting ? "Menyimpan..." : "Tambah"}
        </Button>
      </form>

      {loading ? (
        <SkeletonTable rows={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="category"
          title="Belum ada kategori izin"
          description="Tambahkan kategori pertama agar karyawan dapat mengajukan izin."
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
