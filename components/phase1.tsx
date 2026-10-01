"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, tdClass } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonTable } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { PetugasShell } from "@/components/petugas-shell";
import { AdminShell, StatusBadge } from "@/components/shell";
import { request } from "@/lib/api";
import { todayInWIB } from "@/lib/domain/date";
import type { Branch, Employee, Schedule, Shift } from "@/lib/types";
import { controlClass } from "@/lib/ui";
import { FilterPanel } from "@/components/ui/filter-panel";
import { Copy, FolderOpen, Pencil, Sheet } from "lucide-react";
import type { EmployeeRole } from "@/lib/domain/employee-role";
import { KanbanBoard } from "@/components/schedule-kanban";
import { CalendarView } from "@/components/schedule-calendar";
import { ScheduleViewToggle, type ScheduleViewMode } from "@/components/schedule-view-toggle";

function msg(error: unknown): string {
  return error instanceof Error ? error.message : "Terjadi kesalahan";
}

// ---------------------------------------------------------------------------
// 1. KELOLA CABANG (UI-PLAN §2.13)
// ---------------------------------------------------------------------------
export function BranchesPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Branch[]>([]);
  const [name, setName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editName, setEditName] = useState("");

  const load = () => {
    setLoading(true);
    request<Branch[]>("/api/branches")
      .then(setItems)
      .catch((e: unknown) => {
        toast(msg(e), "error");
        setItems([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await request("/api/branches", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      setName("");
      toast("Cabang baru berhasil dibuat dan diprovisioning!", "success");
      load();
    } catch (e) {
      toast(msg(e), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(branch: Branch) {
    const action = branch.aktif ? "menonaktifkan" : "mengaktifkan";
    if (!confirm(`Yakin ingin ${action} cabang ${branch.nama}?`)) return;
    try {
      await request(`/api/branches/${branch.branchId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !branch.aktif }),
      });
      toast(`Cabang berhasil di-${branch.aktif ? "nonaktifkan" : "aktifkan"}`, "success");
      load();
    } catch (e) {
      toast(msg(e), "error");
    }
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingBranch || !editName.trim()) return;
    try {
      await request(`/api/branches/${editingBranch.branchId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editName.trim() }),
      });
      toast("Nama cabang diperbarui", "success");
      setEditingBranch(null);
      load();
    } catch (e) {
      toast(msg(e), "error");
    }
  }

  // Retry half-finished provisioning (API-CONTRACT §3 `retry-provision`). The endpoint refuses a
  // `ready` branch, so the button is only offered for `pending`/`failed` rows.
  async function retryProvision(branch: Branch) {
    try {
      await request(`/api/branches/${branch.branchId}/retry-provision`, { method: "POST" });
      toast(`Provisioning ${branch.branchId} selesai`, "success");
      load();
    } catch (e) {
      toast(msg(e), "error");
    }
  }

  return (
    <AdminShell
      title="Kelola Cabang"
      lead="Daftar outlet aktif dan pengaturan provisioning spreadsheet per cabang."
    >
      <form onSubmit={submit} className="mb-6 flex max-w-xl items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="branch-name-input">Nama Cabang Baru</Label>
          <Input
            id="branch-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Misal: Mochikin Cabang Barat"
            required
            className={controlClass}
          />
        </div>
        <Button type="submit" disabled={submitting || !name.trim()} size="lg" className="h-11">
          {submitting ? "Membuat..." : "Tambah Cabang"}
        </Button>
      </form>

      {/* Edit modal inline */}
      {editingBranch && (
        <div className="mb-6 max-w-xl rounded-lg border border-primary/40 bg-accent/30 p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold">Edit Nama Cabang ({editingBranch.branchId})</h3>
          <form onSubmit={saveEdit} className="flex gap-2">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={controlClass}
              required
            />
            <Button type="submit" size="sm">
              Simpan
            </Button>
            <Button variant="ghost" size="sm" type="button" onClick={() => setEditingBranch(null)}>
              Batal
            </Button>
          </form>
        </div>
      )}

      {items.length > 0 && (
        <div className="mb-4 max-w-xl">
          <Input
            placeholder="Cari nama atau ID cabang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={controlClass}
          />
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="storefront"
          title="Belum ada cabang"
          description="Tambahkan cabang pertama untuk mulai mengelola shift."
        />
      ) : (
        <DataTable columns={["ID", "Nama Cabang", "Spreadsheet", "Status", "Provisioning", "Aksi"]}>
          {items
            .filter((item) => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              return item.nama.toLowerCase().includes(q) || item.branchId.toLowerCase().includes(q);
            })
            .map((item) => (
            <tr key={item.branchId} className="border-t border-border">
              <td className={tdClass}>
                <span className="font-mono text-xs">{item.branchId}</span>
              </td>
              <td className={tdClass}>
                <span className="font-semibold text-foreground">{item.nama}</span>
              </td>
              <td className={tdClass}>
                <span className="font-mono text-xs text-muted-foreground">
                  {item.spreadsheetId || "Belum dikonfigurasi"}
                </span>
              </td>
              <td className={tdClass}>
                <StatusBadge status={item.aktif ? "active" : "inactive"} />
              </td>
              {/* A branch whose provisioning never finished is unusable the API rejects it so its
                  state has to be visible here, not just in the registry sheet. */}
              <td className={tdClass}>
                <StatusBadge status={item.provisionStatus ?? "pending"} />
              </td>
              <td className={tdClass}>
                <div className="flex flex-wrap gap-2">
                  {item.folderId && (
                    <a
                      href={`https://drive.google.com/drive/folders/${item.folderId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <FolderOpen size={12} />
                      Folder
                    </a>
                  )}
                  {item.spreadsheetId && (
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${item.spreadsheetId}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <Sheet size={12} />
                      Spreadsheet
                    </a>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingBranch(item);
                      setEditName(item.nama);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(item)}
                    className={item.aktif ? "text-destructive hover:bg-destructive-wash" : ""}
                  >
                    {item.aktif ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                  {(item.provisionStatus ?? "pending") !== "ready" && (
                    <Button variant="outline" size="sm" onClick={() => retryProvision(item)}>
                      Retry
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </AdminShell>
  );
}

// ---------------------------------------------------------------------------
// 2. KELOLA KARYAWAN (UI-PLAN §2.12)
// ---------------------------------------------------------------------------
export function EmployeesPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filterBranch, setFilterBranch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState({ name: "", username: "", role: "petugas" as EmployeeRole, branchId: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  // Form create
  const [form, setForm] = useState({
    name: "",
    username: "",
    pin: "",
    role: "petugas",
    branchId: "",
  });

  // Modal reset PIN
  const [resettingUser, setResettingUser] = useState<Employee | null>(null);
  const [newPin, setNewPin] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([
      request<Employee[]>("/api/employees"),
      request<Branch[]>("/api/branches").catch(() => []),
    ])
      .then(([empList, branchList]) => {
        setItems(empList);
        setBranches(branchList);
        setForm((current) => ({
          ...current,
          branchId: current.branchId || branchList[0]?.branchId || "",
        }));
      })
      .catch((e: unknown) => {
        toast(msg(e), "error");
        setItems([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !form.username.trim() || !form.pin.trim()) return;
    setSubmitting(true);
    try {
      await request("/api/employees", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm({ ...form, name: "", username: "", pin: "" });
      toast("Karyawan baru berhasil didaftarkan", "success");
      load();
    } catch (e) {
      toast(msg(e), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(employee: Employee) {
    const action = employee.aktif ? "menonaktifkan" : "mengaktifkan";
    if (!confirm(`Yakin ingin ${action} akun ${employee.nama}?`)) return;
    try {
      await request(`/api/employees/${employee.employeeId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !employee.aktif }),
      });
      toast(`Karyawan di-${employee.aktif ? "nonaktifkan" : "aktifkan"}`, "success");
      load();
    } catch (e) {
      toast(msg(e), "error");
    }
  }

  function startEditing(employee: Employee) {
    setEditingEmployee(employee);
    setEditForm({
      name: employee.nama,
      username: employee.username,
      role: employee.role,
      branchId: employee.cabangAktif,
    });
  }

  async function saveEmployee(event: FormEvent) {
    event.preventDefault();
    if (!editingEmployee) return;
    setSavingEdit(true);
    try {
      await request(`/api/employees/${editingEmployee.employeeId}`, {
        method: "PATCH",
        body: JSON.stringify(editForm),
      });
      toast(`Data ${editingEmployee.nama} berhasil diperbarui`, "success");
      setEditingEmployee(null);
      load();
    } catch (e) {
      toast(msg(e), "error");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleResetPin(event: FormEvent) {
    event.preventDefault();
    if (!resettingUser || !/^\d{4,8}$/.test(newPin)) {
      toast("PIN harus berupa 4–8 angka digit", "error");
      return;
    }
    try {
      await request(`/api/employees/${resettingUser.employeeId}/reset-pin`, {
        method: "POST",
        body: JSON.stringify({ pin: newPin }),
      });
      toast(`PIN ${resettingUser.nama} berhasil direset`, "success");
      setResettingUser(null);
      setNewPin("");
    } catch (e) {
      toast(msg(e), "error");
    }
  }

  const filtered = items.filter((emp) => {
    if (filterBranch && emp.cabangAktif !== filterBranch) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        emp.nama.toLowerCase().includes(q) ||
        emp.username.toLowerCase().includes(q) ||
        emp.employeeId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <AdminShell
      title="Kelola Petugas"
      lead="Buat akun, edit nama/username/role/cabang, nonaktifkan akun, dan reset PIN."
    >
      {/* Form Pendaftaran Card */}
      <form
        onSubmit={submit}
        className="mb-8 grid max-w-3xl gap-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:grid-cols-2 sm:p-6"
      >
        <h2 className="sm:col-span-2 text-base font-semibold text-foreground">
          Pendaftaran Akun Baru
        </h2>

        <div>
          <Label htmlFor="emp-name">Nama Lengkap</Label>
          <Input
            id="emp-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Misal: Siti Rahayu"
            required
            className={controlClass}
          />
        </div>

        <div>
          <Label htmlFor="emp-username">Username Login</Label>
          <Input
            id="emp-username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="siti (huruf kecil)"
            autoCapitalize="none"
            required
            className={controlClass}
          />
        </div>

        <div>
          <Label htmlFor="emp-pin">PIN Akses (4–8 Digit Angka)</Label>
          <Input
            id="emp-pin"
            type="password"
            inputMode="numeric"
            value={form.pin}
            onChange={(e) => setPinSafe(e.target.value)}
            placeholder="PIN angka"
            required
            className={controlClass}
          />
        </div>

        <div>
          <Label htmlFor="emp-role">Peran (Role)</Label>
          <Select
            id="emp-role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className={controlClass}
          >
            <option value="petugas">Petugas Outlet</option>
            <option value="admin">Admin Pusat</option>
          </Select>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="emp-branch">Cabang Penugasan Awal</Label>
          <Select
            id="emp-branch"
            value={form.branchId}
            onChange={(e) => setForm({ ...form, branchId: e.target.value })}
            required
            className={controlClass}
          >
            <option value="">Pilih Cabang</option>
            {branches.map((b) => (
              <option key={b.branchId} value={b.branchId}>
                {b.nama} ({b.branchId})
              </option>
            ))}
          </Select>
        </div>

        <div className="sm:col-span-2 pt-2">
          <Button type="submit" disabled={submitting} size="lg" className="w-full">
            {submitting ? "Mendaftarkan..." : "Daftarkan Karyawan"}
          </Button>
        </div>
      </form>

      {/* Filter and Search Bar */}
      <FilterPanel
        className="max-w-3xl"
        contentClassName="md:grid-cols-[minmax(0,1fr)_minmax(14rem,16rem)]"
        label="Filter daftar karyawan"
      >
        <div className="min-w-0">
          <Label htmlFor="emp-search">Cari Karyawan</Label>
          <Input
            id="emp-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Nama, username, atau ID..."
            className={controlClass}
          />
        </div>

        <div className="min-w-0">
          <Label htmlFor="emp-branch-filter">Filter Cabang</Label>
          <Select
            id="emp-branch-filter"
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className={controlClass}
          >
            <option value="">Semua Cabang</option>
            {branches.map((b) => (
              <option key={b.branchId} value={b.branchId}>
                {b.nama}
              </option>
            ))}
          </Select>
        </div>
      </FilterPanel>

      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-4 shadow-xl sm:p-6">
            <h2 className="text-base font-bold text-foreground">Edit Petugas</h2>
            <p className="mt-1 text-xs text-muted-foreground">{editingEmployee.employeeId}</p>
            <form onSubmit={saveEmployee} className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="edit-emp-name">Nama Lengkap</Label>
                <Input
                  id="edit-emp-name"
                  value={editForm.name}
                  onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                  required
                  className={controlClass}
                />
              </div>
              <div>
                <Label htmlFor="edit-emp-username">Username</Label>
                <Input
                  id="edit-emp-username"
                  value={editForm.username}
                  onChange={(event) => setEditForm({ ...editForm, username: event.target.value })}
                  autoCapitalize="none"
                  required
                  className={controlClass}
                />
              </div>
              <div>
                <Label htmlFor="edit-emp-role">Role</Label>
                <Select
                  id="edit-emp-role"
                  value={editForm.role}
                  onChange={(event) => setEditForm({ ...editForm, role: event.target.value as EmployeeRole })}
                  className={controlClass}
                >
                  <option value="petugas">Petugas</option>
                  <option value="admin">Admin</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-emp-branch">Cabang Aktif</Label>
                <Select
                  id="edit-emp-branch"
                  value={editForm.branchId}
                  onChange={(event) => setEditForm({ ...editForm, branchId: event.target.value })}
                  required
                  className={controlClass}
                >
                  {branches.filter((branch) => branch.aktif).map((branch) => (
                    <option key={branch.branchId} value={branch.branchId}>{branch.nama} ({branch.branchId})</option>
                  ))}
                </Select>
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={savingEdit} className="flex-1">
                  {savingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setEditingEmployee(null)}>Batal</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset PIN Modal */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-4 shadow-xl sm:p-6">
            <h3 className="text-base font-bold text-foreground">
              Reset PIN: {resettingUser.nama}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Masukkan PIN baru (4–8 digit angka) untuk staf ini.
            </p>
            <form onSubmit={handleResetPin} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="new-pin-input">PIN Baru</Label>
                <Input
                  id="new-pin-input"
                  type="password"
                  inputMode="numeric"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="PIN baru"
                  required
                  autoFocus
                  className={controlClass}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Simpan PIN
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setResettingUser(null);
                    setNewPin("");
                  }}
                >
                  Batal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="group"
          title="Tidak ada karyawan"
          description={
            searchQuery || filterBranch
              ? "Tidak ada staf yang sesuai dengan kriteria filter."
              : "Belum ada karyawan terdaftar. Daftarkan karyawan pertama di atas."
          }
        />
      ) : (
        <DataTable columns={["ID", "Nama Lengkap", "Username", "Peran", "Cabang", "Status", "Aksi"]}>
          {filtered.map((item) => (
            <tr key={item.employeeId} className="border-t border-border">
              <td className={tdClass}>
                <span className="font-mono text-xs">{item.employeeId}</span>
              </td>
              <td className={tdClass}>
                <span className="font-medium text-foreground">{item.nama}</span>
              </td>
              <td className={tdClass}>
                <span className="font-mono text-xs text-muted-foreground">{item.username}</span>
              </td>
              <td className={tdClass}>
                <StatusBadge status={item.role} />
              </td>
              <td className={tdClass}>{item.cabangAktif}</td>
              <td className={tdClass}>
                <StatusBadge status={item.aktif ? "active" : "inactive"} />
              </td>
              <td className={tdClass}>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => startEditing(item)} aria-label={`Edit ${item.nama}`}>
                    <Pencil size={14} /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setResettingUser(item);
                      setNewPin("");
                    }}
                  >
                    Reset PIN
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(item)}
                    className={item.aktif ? "text-destructive hover:bg-destructive-wash" : ""}
                  >
                    {item.aktif ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </AdminShell>
  );

  function setPinSafe(val: string) {
    setForm({ ...form, pin: val });
  }
}

// ---------------------------------------------------------------------------
// 3. KELOLA SHIFT TEMPLATE (UI-PLAN §2.14)
// ---------------------------------------------------------------------------
export function ShiftsPage() {
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    branchId: "",
    name: "",
    startTime: "08:00",
    endTime: "16:00",
  });

  const loadShifts = (targetBranch: string) => {
    if (!targetBranch) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    request<Shift[]>(`/api/shifts?branchId=${targetBranch}`)
      .then(setItems)
      .catch((e: unknown) => {
        toast(msg(e), "error");
        setItems([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    request<Branch[]>("/api/branches")
      .then((list) => {
        setBranches(list);
        const id = list[0]?.branchId || "";
        setForm((current) => ({ ...current, branchId: id }));
        loadShifts(id);
      })
      .catch((e: unknown) => {
        toast(msg(e), "error");
        setLoading(false);
      });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !form.branchId) return;
    setSubmitting(true);
    try {
      await request("/api/shifts", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm({ ...form, name: "" });
      toast("Template shift ditambahkan", "success");
      loadShifts(form.branchId);
    } catch (e) {
      toast(msg(e), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(shiftId: string) {
    if (!confirm("Hapus template shift ini dari cabang terpilih?")) return;
    setDeletingId(shiftId);
    try {
      await request(`/api/shifts/${shiftId}?branchId=${form.branchId}`, {
        method: "DELETE",
      });
      toast("Template shift dihapus", "success");
      loadShifts(form.branchId);
    } catch (e) {
      toast(msg(e), "error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AdminShell
      title="Kelola Shift Template"
      lead="Definisikan jam kerja standar (Opening, Middle, Closing) per outlet."
    >
      <div className="mb-6 max-w-xl">
        <Label htmlFor="shift-branch-select">Pilih Cabang</Label>
        <Select
          id="shift-branch-select"
          value={form.branchId}
          onChange={(e) => {
            const b = e.target.value;
            setForm({ ...form, branchId: b });
            loadShifts(b);
          }}
          className={controlClass}
        >
          {branches.map((b) => (
            <option key={b.branchId} value={b.branchId}>
              {b.nama} ({b.branchId})
            </option>
          ))}
        </Select>
      </div>

      <form
        onSubmit={submit}
        className="mb-8 grid max-w-xl gap-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:grid-cols-2 sm:p-5"
      >
        <h2 className="sm:col-span-2 text-sm font-semibold text-foreground">
          Tambah Template Shift Baru
        </h2>

        <div className="sm:col-span-2">
          <Label htmlFor="shift-name">Nama Shift</Label>
          <Input
            id="shift-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Misal: Opening, Middle, Closing"
            required
            className={controlClass}
          />
        </div>

        <div>
          <Label htmlFor="shift-start">Jam Mulai</Label>
          <Input
            id="shift-start"
            type="time"
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            required
            className={controlClass}
          />
        </div>

        <div>
          <Label htmlFor="shift-end">Jam Selesai</Label>
          <Input
            id="shift-end"
            type="time"
            value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            required
            className={controlClass}
          />
        </div>

        <div className="sm:col-span-2 pt-1">
          <Button type="submit" disabled={submitting || !form.name.trim()} size="lg" className="w-full">
            {submitting ? "Menyimpan..." : "Tambah Shift"}
          </Button>
        </div>
      </form>

      <div className="max-w-xl">
        {loading ? (
          <SkeletonTable rows={3} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="schedule"
            title="Belum ada shift"
            description="Tambahkan template shift kerja pertama untuk cabang ini."
          />
        ) : (
          <DataTable columns={["ID", "Nama Shift", "Jam Masuk", "Jam Selesai", "Aksi"]}>
            {items.map((item) => (
              <tr key={item.shiftId} className="border-t border-border">
                <td className={tdClass}>
                  <span className="font-mono text-xs">{item.shiftId}</span>
                </td>
                <td className={tdClass}>
                  <span className="font-semibold text-foreground">{item.name}</span>
                </td>
                <td className={tdClass}>{item.startTime} WIB</td>
                <td className={tdClass}>{item.endTime} WIB</td>
                <td className={tdClass}>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deletingId === item.shiftId}
                    onClick={() => handleDelete(item.shiftId)}
                    className="text-destructive hover:bg-destructive-wash"
                  >
                    {deletingId === item.shiftId ? "..." : "Hapus"}
                  </Button>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </div>
    </AdminShell>
  );
}

// ---------------------------------------------------------------------------
// 4. JADWAL (UI-PLAN §2.3 / §2.11)
// ---------------------------------------------------------------------------
/**
 * Isi halaman jadwal TANPA shell dipakai dua tempat: `/jadwal` (admin, `mine=false`)
 * lewat `SchedulePage`, dan tab pertama `/jadwal-saya` (petugas) lewat `JadwalSayaPage`.
 * Tanpa dipisah begini, keduanya akan menaruh `PetugasShell` di dalam `PetugasShell`
 * sehingga header dan dock ter-render dua kali.
 */
export function ScheduleContent({ mine = false }: { mine?: boolean }) {
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [items, setItems] = useState<Schedule[]>([]);
  const [branchId, setBranchId] = useState("");
  const [form, setForm] = useState({ employeeId: "", shiftId: "", date: todayInWIB() });
  const [session, setSession] = useState<{ employeeId: string; activeBranchId: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [viewMode, setViewMode] = useState<ScheduleViewMode>(mine ? "calendar" : "kanban");
  const [dateFilter, setDateFilter] = useState<string>(todayInWIB());

  const load = (id: string) => {
    if (!mine && !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    request<Schedule[]>(mine ? "/api/schedules" : `/api/schedules?branchId=${encodeURIComponent(id)}`)
      .then(setItems)
      .catch((e: unknown) => {
        toast(msg(e), "error");
        setItems([]);
      })
      .finally(() => setLoading(false));

    if (!mine) {
      request<Shift[]>(`/api/shifts?branchId=${id}`)
        .then(setShifts)
        .catch(() => setShifts([]));
    }
  };

  async function duplicateLastWeek() {
    if (!branchId) return;
    setDuplicating(true);
    try {
      const todayDate = new Date();
      const lastWeekStart = new Date(todayDate);
      lastWeekStart.setDate(todayDate.getDate() - 7);
      const lastWeekEnd = new Date(todayDate);
      lastWeekEnd.setDate(todayDate.getDate() - 1);

      const startStr = lastWeekStart.toISOString().slice(0, 10);
      const endStr = lastWeekEnd.toISOString().slice(0, 10);

      const pastSchedules = items.filter((s) => s.date >= startStr && s.date <= endStr);
      if (pastSchedules.length === 0) {
        toast("Tidak ada jadwal minggu lalu (7 hari terakhir) untuk diduplikat.", "info");
        return;
      }

      let createdCount = 0;
      for (const oldSch of pastSchedules) {
        const oldDate = new Date(oldSch.date);
        oldDate.setDate(oldDate.getDate() + 7);
        const newDateStr = oldDate.toISOString().slice(0, 10);

        await request("/api/schedules", {
          method: "POST",
          body: JSON.stringify({
            branchId,
            employeeId: oldSch.employeeId,
            shiftId: oldSch.shiftId,
            date: newDateStr,
          }),
        }).catch(() => null);
        createdCount++;
      }

      toast(`${createdCount} jadwal minggu lalu berhasil diduplikat ke minggu ini!`, "success");
      load(branchId);
    } catch (e) {
      toast(msg(e), "error");
    } finally {
      setDuplicating(false);
    }
  }

  useEffect(() => {
    if (mine) {
      request<{ activeBranchId: string; employeeId: string }>("/api/auth/session")
        .then((s) => {
          setSession(s);
          setBranchId(s.activeBranchId);
          load("");
        })
        .catch((e: unknown) => {
          toast(msg(e), "error");
          setLoading(false);
        });
    } else {
      Promise.all([
        request<Branch[]>("/api/branches"),
        request<Employee[]>("/api/employees"),
      ])
        .then(([branchList, employeeList]) => {
          setBranches(branchList);
          setEmployees(employeeList);
          const id = branchList[0]?.branchId || "";
          setBranchId(id);
          setForm((current) => ({ ...current, employeeId: employeeList[0]?.employeeId || "" }));
          load(id);
        })
        .catch((e: unknown) => {
          toast(msg(e), "error");
          setLoading(false);
        });
    }
  }, [mine]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.employeeId || !form.shiftId || !form.date || !branchId) return;
    try {
      await request("/api/schedules", {
        method: "POST",
        body: JSON.stringify({ ...form, branchId }),
      });
      toast("Jadwal shift berhasil dibuat", "success");
      load(branchId);
    } catch (e) {
      toast(msg(e), "error");
    }
  }

  async function startShift(scheduleId: string, scheduleBranchId: string) {
    const scheduleKey = `${scheduleBranchId}:${scheduleId}`;
    setStartingId(scheduleKey);
    try {
      await request(`/api/schedules/${scheduleId}/start-shift?branchId=${encodeURIComponent(scheduleBranchId)}`, {
        method: "POST",
      });
      setItems((prev) =>
        prev.map((item) =>
          item.scheduleId === scheduleId && item.branchId === scheduleBranchId
            ? { ...item, status: "started", startedAt: new Date().toISOString() }
            : item
        )
      );
      toast("Shift berhasil dimulai!", "success");
    } catch (e) {
      toast(msg(e), "error");
    } finally {
      setStartingId(null);
    }
  }

  const today = todayInWIB();

  // Maps for names
  const empMap = new Map(employees.map((e) => [e.employeeId, e.nama]));
  // Nama shift datang dari response schedules (shiftName) supaya petugas tidak melihat ID mentah;
  // fallback ke daftar shift admin untuk baris yang belum terproyeksi.
  const shiftMap = new Map<string, string>(shifts.map((s) => [s.shiftId, s.name]));
  for (const item of items) {
    if (item.shiftName) shiftMap.set(item.shiftId, item.shiftName);
  }

  async function moveSchedule(scheduleId: string, newDate: string) {
    try {
      await request(`/api/schedules/${scheduleId}`, {
        method: "PATCH",
        body: JSON.stringify({ date: newDate }),
      });
      toast("Jadwal berhasil dipindahkan", "success");
      load(branchId);
    } catch (e) {
      toast(msg(e), "error");
    }
  }

  async function changeShift(scheduleId: string, newShiftId: string) {
    try {
      await request(`/api/schedules/${scheduleId}`, {
        method: "PATCH",
        body: JSON.stringify({ shiftId: newShiftId }),
      });
      toast("Shift berhasil diganti", "success");
      load(branchId);
    } catch (e) {
      toast(msg(e), "error");
    }
  }

  return (
    <>
      {!mine && (
        <form
          onSubmit={submit}
          className="mb-8 grid max-w-4xl gap-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:grid-cols-4 sm:p-5"
        >
          <div className="sm:col-span-4 flex items-center justify-between border-b border-border/60 pb-3">
            <h2 className="text-sm font-semibold text-foreground">Plot Jadwal Baru</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={duplicating || !branchId}
              onClick={duplicateLastWeek}
              className="text-xs"
            >
              <Copy size={14} />
              {duplicating ? "Menduplikat..." : "Duplikat Minggu Lalu"}
            </Button>
          </div>

          <div>
            <Label htmlFor="sch-branch">Cabang</Label>
            <Select
              id="sch-branch"
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                load(e.target.value);
              }}
              className={controlClass}
            >
              {branches.map((branch) => (
                <option key={branch.branchId} value={branch.branchId}>
                  {branch.nama}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="sch-employee">Karyawan</Label>
            <Select
              id="sch-employee"
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              className={controlClass}
              required
            >
              <option value="">Pilih Karyawan</option>
              {employees
                .filter((employee) => employee.cabangAktif === branchId && employee.aktif)
                .map((employee) => (
                  <option key={employee.employeeId} value={employee.employeeId}>
                    {employee.nama}
                  </option>
                ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="sch-shift">Shift</Label>
            <Select
              id="sch-shift"
              value={form.shiftId}
              onChange={(e) => setForm({ ...form, shiftId: e.target.value })}
              className={controlClass}
              required
            >
              <option value="">Pilih Shift</option>
              {shifts.map((shift) => (
                <option key={shift.shiftId} value={shift.shiftId}>
                  {shift.name} ({shift.startTime}–{shift.endTime})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="sch-date">Tanggal</Label>
            <Input
              id="sch-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
              className={controlClass}
            />
          </div>

          <div className="sm:col-span-4 pt-1">
            <Button type="submit" size="lg" className="h-11 w-full">
              Buat Jadwal
            </Button>
          </div>
        </form>
      )}

      {/* View toggle + date filter for admin */}
      {!mine && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="date-filter" className="text-xs text-muted-foreground">Tanggal:</Label>
            <Input
              id="date-filter"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={controlClass}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDateFilter(todayInWIB())}
              className="h-9 px-2 text-xs"
            >
              Hari ini
            </Button>
          </div>
          <ScheduleViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="event"
          title="Belum ada jadwal"
          description={
            mine ? "Jadwal kerja Anda akan muncul di sini." : "Buat jadwal pertama untuk cabang ini."
          }
        />
      ) : mine || viewMode === "calendar" ? (
        <CalendarView items={items} empMap={empMap} shiftMap={shiftMap} branchId={branchId} />
      ) : viewMode === "kanban" ? (
        <KanbanBoard items={items.filter((item) => item.date === dateFilter)} empMap={empMap} shiftMap={shiftMap} branchId={branchId} shifts={shifts} onMove={moveSchedule} onShiftChange={changeShift} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const isToday = item.date === today;
            const isOwner = item.employeeId === session?.employeeId;
            const canStart = mine && isOwner && item.status === "scheduled" && isToday;
            const scheduleKey = `${item.branchId ?? branchId}:${item.scheduleId}`;

            return (
              <motion.article
                key={scheduleKey}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex min-w-0 flex-col justify-between rounded-lg border p-4 shadow-xs transition-shadow hover:shadow-sm sm:p-5 ${
                  item.conflictWarning
                    ? "border-destructive-wash bg-destructive-wash/30 text-destructive-foreground"
                    : "border-border bg-card"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">{item.date}</p>
                      <h3 className="mt-1 text-base font-bold text-foreground">
                        {shiftMap.get(item.shiftId) || item.shiftId}
                      </h3>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>

                  {mine && item.branchId && <p className="mt-1 text-xs text-muted-foreground">Cabang: {item.branchName || item.branchId}</p>}
                  <p className="mt-2 text-sm text-foreground">
                    Petugas:{" "}
                    <strong>{empMap.get(item.employeeId) || item.employeeId}</strong>
                  </p>

                  {item.conflictWarning && (
                    <div className="mt-2 rounded-md bg-destructive-wash p-2 text-xs font-semibold text-destructive-foreground">
                      ⚠️ Peringatan: Jam staf ini bertabrakan dengan shift lain di tanggal yang sama.
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/shift/${item.scheduleId}${item.branchId ? `?branchId=${encodeURIComponent(item.branchId)}` : ""}`}>Detail Shift →</Link>
                  </Button>

                  {canStart && (
                    <Button
                      size="sm"
                      disabled={startingId === scheduleKey}
                      onClick={() => startShift(item.scheduleId, item.branchId ?? branchId)}
                    >
                      {startingId === scheduleKey ? "Memulai..." : "Mulai Shift"}
                    </Button>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </>
  );
}

/**
 * Halaman `/jadwal` versi admin. Petugas tidak memakai ini; dia masuk lewat
 * `JadwalSayaPage` (`components/jadwal-saya.tsx`) yang membungkus `ScheduleContent`.
 */
export function SchedulePage({ mine = false }: { mine?: boolean }) {
  const Shell = mine ? PetugasShell : AdminShell;
  return (
    <Shell
      title={mine ? "Jadwal Saya" : "Kelola Jadwal"}
      lead={
        mine
          ? "Daftar penugasan shift kerja Anda di outlet."
          : "Plot giliran kerja mingguan karyawan per cabang."
      }
    >
      <ScheduleContent mine={mine} />
    </Shell>
  );
}
