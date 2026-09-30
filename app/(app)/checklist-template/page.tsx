"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { request } from "@/lib/api";
import { AdminShell } from "@/components/shell";
import { SkeletonTable } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { controlClass } from "@/lib/ui";
import type { Branch } from "@/lib/types";

type Session = { activeBranchId: string; branches: Branch[] };
type SopCategory = { categoryId: string; name: string; order: number; active: boolean };
type Shift = { shiftId: string; name: string; startTime: string; endTime: string };
type CompletionType = "centang" | "centang_foto" | "angka" | "teks" | "pilihan";
type Point = {
  pointId: string;
  categoryId: string;
  description: string;
  completionType: CompletionType;
  unit: string;
  min: string;
  max: string;
  options: string[];
  appliesAllShifts: boolean;
  shiftIds: string[];
  order: number;
  active: boolean;
  hasLogs: boolean;
};
type PointForm = Omit<Point, "pointId" | "active" | "hasLogs">;

const blankForm = (categoryId = ""): PointForm => ({
  categoryId,
  description: "",
  completionType: "centang",
  unit: "",
  min: "",
  max: "",
  options: [],
  appliesAllShifts: true,
  shiftIds: [],
  order: 0,
});

export default function ChecklistTemplatePage() {
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [categories, setCategories] = useState<SopCategory[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShift, setSelectedShift] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [form, setForm] = useState<PointForm>(blankForm());
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    request<Session>("/api/auth/session")
      .then((value) => {
        setSession(value);
        setBranches(value.branches);
        setBranchId(value.activeBranchId || value.branches[0]?.branchId || "");
      })
      .catch((error: unknown) => toast(error instanceof Error ? error.message : "Gagal memuat sesi", "error"));
  }, [toast]);

  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      request<SopCategory[]>(`/api/sop-categories?branchId=${encodeURIComponent(branchId)}`),
      request<Point[]>(`/api/checklist-points?branchId=${encodeURIComponent(branchId)}`),
      request<Shift[]>(`/api/shifts?branchId=${encodeURIComponent(branchId)}`),
    ])
      .then(([categoryList, pointList, shiftList]) => {
        if (cancelled) return;
        setCategories(categoryList.sort((a, b) => a.order - b.order));
        setPoints(pointList.sort((a, b) => a.order - b.order));
        setShifts(shiftList);
        setSelectedShift((current) => current || shiftList[0]?.shiftId || "");
        setForm(blankForm(categoryList.find((category) => category.active)?.categoryId ?? ""));
      })
      .catch((error: unknown) => {
        if (!cancelled) toast(error instanceof Error ? error.message : "Gagal memuat checklist", "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, toast]);

  const displayedPoints = useMemo(
    () => points.filter((point) =>
      point.appliesAllShifts || point.shiftIds.includes(selectedShift)
    ),
    [points, selectedShift]
  );
  const sections = categories.map((category) => ({
    category,
    items: displayedPoints.filter((point) => point.categoryId === category.categoryId),
  })).filter(({ items }) => items.length > 0);

  async function reload() {
    if (!branchId) return;
    const [categoryList, pointList] = await Promise.all([
      request<SopCategory[]>(`/api/sop-categories?branchId=${encodeURIComponent(branchId)}`),
      request<Point[]>(`/api/checklist-points?branchId=${encodeURIComponent(branchId)}`),
    ]);
    setCategories(categoryList.sort((a, b) => a.order - b.order));
    setPoints(pointList.sort((a, b) => a.order - b.order));
  }

  async function createCategory() {
    if (!newCategory.trim()) return;
    try {
      const category = await request<SopCategory>(`/api/sop-categories?branchId=${encodeURIComponent(branchId)}`, {
        method: "POST",
        body: JSON.stringify({ name: newCategory.trim(), order: categories.length + 1 }),
      });
      setCategories((previous) => [...previous, category]);
      setForm((previous) => ({ ...previous, categoryId: category.categoryId }));
      setNewCategory("");
      toast("Kategori SOP ditambahkan", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal membuat kategori", "error");
    }
  }

  async function toggleCategory(category: SopCategory) {
    try {
      await request(`/api/sop-categories/${category.categoryId}?branchId=${encodeURIComponent(branchId)}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !category.active }),
      });
      await reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal mengubah kategori", "error");
    }
  }

  function editPoint(point: Point) {
    setEditingId(point.pointId);
    setForm({
      categoryId: point.categoryId,
      description: point.description,
      completionType: point.completionType,
      unit: point.unit,
      min: point.min,
      max: point.max,
      options: point.options,
      appliesAllShifts: point.appliesAllShifts,
      shiftIds: point.shiftIds,
      order: point.order,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId("");
    setForm(blankForm(categories.find((category) => category.active)?.categoryId ?? ""));
  }

  async function savePoint() {
    if (!branchId) return;
    setSaving(true);
    try {
      const path = editingId ? `/api/checklist-points/${editingId}` : "/api/checklist-points";
      const point = await request<Point>(`${path}?branchId=${encodeURIComponent(branchId)}`, {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(form),
      });
      toast(editingId ? "Checklist point diperbarui" : "Checklist point ditambahkan", "success");
      resetForm();
      await reload();
      if (point.hasLogs && editingId) toast("Data log lama dipertahankan; perubahan berlaku untuk pengisian berikutnya.", "info");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal menyimpan checklist point", "error");
    } finally {
      setSaving(false);
    }
  }

  async function togglePoint(point: Point) {
    try {
      await request(`/api/checklist-points/${point.pointId}?branchId=${encodeURIComponent(branchId)}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !point.active }),
      });
      await reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal mengubah status point", "error");
    }
  }

  async function deletePoint(point: Point) {
    if (!confirm(point.hasLogs
      ? "Point ini sudah punya log. Nonaktifkan tanpa menghapus riwayatnya?"
      : "Hapus checklist point ini secara permanen?")) return;
    try {
      const result = await request<{ deleted: boolean }>(`/api/checklist-points/${point.pointId}?branchId=${encodeURIComponent(branchId)}`, {
        method: "DELETE",
      });
      toast(result.deleted ? "Checklist point dihapus" : "Point dinonaktifkan, log dipertahankan", "success");
      await reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Gagal menghapus point", "error");
    }
  }

  function toggleShift(shiftId: string) {
    setForm((previous) => ({
      ...previous,
      shiftIds: previous.shiftIds.includes(shiftId)
        ? previous.shiftIds.filter((id) => id !== shiftId)
        : [...previous.shiftIds, shiftId],
    }));
  }

  return (
    <AdminShell title="Kelola Checklist" lead="Atur kategori SOP dan checklist point untuk setiap shift.">
      <div className="mb-5 grid max-w-3xl gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="branch-select">Pilih Cabang</Label>
          <Select id="branch-select" value={branchId} onChange={(event) => setBranchId(event.target.value)} className={controlClass}>
            {branches.map((branch) => <option key={branch.branchId} value={branch.branchId}>{branch.nama} ({branch.branchId})</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="shift-select">Tampilkan Shift</Label>
          <Select id="shift-select" value={selectedShift} onChange={(event) => setSelectedShift(event.target.value)} className={controlClass}>
            {shifts.map((shift) => <option key={shift.shiftId} value={shift.shiftId}>{shift.name}</option>)}
          </Select>
        </div>
      </div>

      <section className="mb-8 max-w-3xl rounded-lg border border-border bg-card p-5">
        <h2 className="text-base font-semibold">{editingId ? "Edit Checklist Point" : "Tambah Checklist Point"}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="sop-select">Kategori SOP</Label>
            <Select id="sop-select" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} className={controlClass}>
              {categories.filter((category) => category.active).map((category) =>
                <option key={category.categoryId} value={category.categoryId}>{category.name}</option>
              )}
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Nama SOP baru" aria-label="Nama SOP baru" className={controlClass} />
            <Button type="button" variant="outline" onClick={createCategory} disabled={!newCategory.trim()}>Buat SOP</Button>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="point-description">Deskripsi Checklist Point</Label>
            <Textarea id="point-description" rows={2} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={controlClass} />
          </div>
          <div>
            <Label htmlFor="completion-type">Tipe Penyelesaian</Label>
            <Select id="completion-type" value={form.completionType} onChange={(event) => setForm({ ...form, completionType: event.target.value as CompletionType, unit: "", min: "", max: "", options: [] })} className={controlClass}>
              <option value="centang">Centang</option>
              <option value="centang_foto">Centang + Foto</option>
              <option value="angka">Angka</option>
              <option value="teks">Teks</option>
              <option value="pilihan">Pilihan</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="point-order">Urutan</Label>
            <Input id="point-order" type="number" min="0" value={form.order} onChange={(event) => setForm({ ...form, order: Number(event.target.value) })} className={controlClass} />
          </div>
          {form.completionType === "angka" && <>
            <div><Label htmlFor="unit">Satuan</Label><Input id="unit" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="°C, gram, ml" className={controlClass} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label htmlFor="min">Batas minimum</Label><Input id="min" type="number" value={form.min} onChange={(event) => setForm({ ...form, min: event.target.value })} className={controlClass} /></div>
              <div><Label htmlFor="max">Batas maksimum</Label><Input id="max" type="number" value={form.max} onChange={(event) => setForm({ ...form, max: event.target.value })} className={controlClass} /></div>
            </div>
          </>}
          {form.completionType === "pilihan" && (
            <div className="sm:col-span-2">
              <Label htmlFor="options">Opsi (pisahkan dengan koma)</Label>
              <Input id="options" value={form.options.join(", ")} onChange={(event) => setForm({ ...form, options: event.target.value.split(",").map((option) => option.trim()).filter(Boolean) })} placeholder="Baik, Perlu perhatian, Rusak" className={controlClass} />
            </div>
          )}
        </div>
        <fieldset className="mt-4 space-y-3">
          <legend className="text-sm font-medium">Cakupan Shift</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={form.appliesAllShifts} onChange={() => setForm({ ...form, appliesAllShifts: true, shiftIds: [] })} />
            Berlaku untuk semua shift
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={!form.appliesAllShifts} onChange={() => setForm({ ...form, appliesAllShifts: false, shiftIds: form.shiftIds.length ? form.shiftIds : (selectedShift ? [selectedShift] : []) })} />
            Hanya shift tertentu
          </label>
          {!form.appliesAllShifts && <div className="flex flex-wrap gap-4 pl-6">
            {shifts.map((shift) => (
              <label key={shift.shiftId} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.shiftIds.includes(shift.shiftId)} onChange={() => toggleShift(shift.shiftId)} />
                {shift.name}
              </label>
            ))}
          </div>}
        </fieldset>
        <div className="mt-5 flex gap-2">
          <Button onClick={savePoint} disabled={saving || !form.description.trim() || !form.categoryId}>
            {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah Checklist Point"}
          </Button>
          {editingId && <Button variant="outline" onClick={resetForm}>Batal</Button>}
        </div>
        {editingId && points.find((point) => point.pointId === editingId)?.hasLogs && (
          <p className="mt-3 text-xs text-muted-foreground">Perubahan tipe tidak mengubah log sebelumnya; hanya memengaruhi pengisian berikutnya.</p>
        )}
      </section>

      <section className="mb-8 max-w-3xl">
        <h2 className="mb-3 text-base font-semibold">Kategori SOP</h2>
        <div className="space-y-2">
          {categories.map((category) => (
            <div key={category.categoryId} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <span>{category.name} <span className="text-xs text-muted-foreground">({category.categoryId})</span></span>
              <Button size="sm" variant="outline" onClick={() => toggleCategory(category)}>{category.active ? "Nonaktifkan" : "Aktifkan"}</Button>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-4xl">
        <h2 className="mb-3 text-base font-semibold">Checklist Point menurut SOP</h2>
        {loading ? <SkeletonTable rows={4} /> : sections.length === 0 ? (
          <EmptyState icon="checklist" title="Belum ada checklist point" description="Tambahkan point untuk shift ini." />
        ) : <div className="space-y-5">
          {sections.map(({ category, items }) => (
            <details key={category.categoryId} open className="rounded-lg border border-border bg-card">
              <summary className="cursor-pointer border-b border-border px-4 py-3 font-semibold">{category.name} <span className="text-xs font-normal text-muted-foreground">({items.length})</span></summary>
              <div className="divide-y divide-border">
                {items.map((point) => (
                  <div key={point.pointId} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{point.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {point.pointId} · {point.completionType}{point.unit ? ` · ${point.unit}` : ""}
                        {point.appliesAllShifts ? " · Semua shift" : ` · ${point.shiftIds.map((shiftId) => shifts.find((shift) => shift.shiftId === shiftId)?.name ?? shiftId).join(", ")}`}
                        {point.hasLogs ? " · Ada riwayat" : ""}
                      </p>
                      {point.completionType === "pilihan" && <p className="text-xs text-muted-foreground">Opsi: {point.options.join(", ")}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => editPoint(point)}>Edit</Button>
                      <Button size="sm" variant="outline" onClick={() => togglePoint(point)}>{point.active ? "Nonaktifkan" : "Aktifkan"}</Button>
                      <Button size="sm" variant="outline" onClick={() => deletePoint(point)}>{point.hasLogs ? "Arsipkan" : "Hapus"}</Button>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>}
      </section>
      <p className="mt-6 text-xs text-muted-foreground">Login saat ini: {session ? "Admin" : "Memuat sesi"}</p>
    </AdminShell>
  );
}
