"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shell";
import { AdminShell } from "@/components/shell";
import { useToast } from "@/components/ui/toast";
import { SkeletonTable } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { KanbanBoard } from "@/components/schedule-kanban";
import { request } from "@/lib/api";
import { todayInWIB } from "@/lib/domain/date";
import type { Branch, Employee, Schedule, Shift } from "@/lib/types";
import { controlClass } from "@/lib/ui";
import { Plus, Pencil, Trash2 } from "lucide-react";

function msg(error: unknown): string {
  return error instanceof Error ? error.message : "Terjadi kesalahan";
}

export function JadwalPetugasPage() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [items, setItems] = useState<Schedule[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [form, setForm] = useState({ shiftId: "", date: todayInWIB() });

  const load = () => {
    setLoading(true);
    Promise.all([
      request<Employee[]>("/api/employees"),
      request<Branch[]>("/api/branches"),
    ])
      .then(([empList, branchList]) => {
        setEmployees(empList);
        setBranches(branchList);
        const firstEmp = empList[0]?.employeeId || "";
        setSelectedEmployeeId(firstEmp);
        if (firstEmp) {
          loadSchedules(firstEmp);
        } else {
          setItems([]);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        toast(msg(e), "error");
        setLoading(false);
      });
  };

  const loadSchedules = (employeeId: string) => {
    if (!employeeId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    request<Schedule[]>(`/api/schedules?employeeId=${encodeURIComponent(employeeId)}`)
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

  // Load shifts when branch changes (use first active branch)
  useEffect(() => {
    const activeBranch = branches.find((b) => b.aktif);
    if (activeBranch) {
      request<Shift[]>(`/api/shifts?branchId=${activeBranch.branchId}`)
        .then(setShifts)
        .catch(() => setShifts([]));
    }
  }, [branches]);

  function handleEmployeeChange(employeeId: string) {
    setSelectedEmployeeId(employeeId);
    loadSchedules(employeeId);
  }

  function openAddModal() {
    setEditingSchedule(null);
    setForm({ shiftId: "", date: todayInWIB() });
    setModalOpen(true);
  }

  function openEditModal(schedule: Schedule) {
    setEditingSchedule(schedule);
    setForm({ shiftId: schedule.shiftId, date: schedule.date });
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedEmployeeId || !form.shiftId || !form.date) return;
    setSaving(true);
    try {
      const employee = employees.find((e) => e.employeeId === selectedEmployeeId);
      const branchId = employee?.cabangAktif || branches[0]?.branchId || "";

      if (editingSchedule) {
        await request(`/api/schedules/${editingSchedule.scheduleId}`, {
          method: "PATCH",
          body: JSON.stringify({ shiftId: form.shiftId, date: form.date }),
        });
        toast("Jadwal berhasil diperbarui", "success");
      } else {
        await request("/api/schedules", {
          method: "POST",
          body: JSON.stringify({
            employeeId: selectedEmployeeId,
            shiftId: form.shiftId,
            date: form.date,
            branchId,
          }),
        });
        toast("Jadwal berhasil ditambahkan", "success");
      }
      setModalOpen(false);
      loadSchedules(selectedEmployeeId);
    } catch (e) {
      toast(msg(e), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingSchedule) return;
    setDeleting(true);
    try {
      await request(`/api/schedules/${editingSchedule.scheduleId}`, {
        method: "DELETE",
      });
      toast("Jadwal berhasil dihapus", "success");
      setModalOpen(false);
      loadSchedules(selectedEmployeeId);
    } catch (e) {
      toast(msg(e), "error");
    } finally {
      setDeleting(false);
    }
  }

  async function moveSchedule(scheduleId: string, newDate: string) {
    try {
      await request(`/api/schedules/${scheduleId}`, {
        method: "PATCH",
        body: JSON.stringify({ date: newDate }),
      });
      toast("Jadwal berhasil dipindahkan", "success");
      loadSchedules(selectedEmployeeId);
    } catch (e) {
      toast(msg(e), "error");
    }
  }

  const selectedEmployee = employees.find((e) => e.employeeId === selectedEmployeeId);
  const empMap = new Map(employees.map((e) => [e.employeeId, e.nama]));
  const shiftMap = new Map<string, string>(shifts.map((s) => [s.shiftId, s.name]));
  for (const item of items) {
    if (item.shiftName) shiftMap.set(item.shiftId, item.shiftName);
  }

  return (
    <AdminShell
      title="Jadwal Petugas"
      lead="Kelola jadwal shift per petugas: lihat, tambah, edit, dan hapus jadwal."
    >
      {/* Employee selector + add button */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Label htmlFor="petugas-select">Pilih Petugas</Label>
          <Select
            id="petugas-select"
            value={selectedEmployeeId}
            onChange={(e) => handleEmployeeChange(e.target.value)}
            className={controlClass}
          >
            <option value="">Pilih Petugas</option>
            {employees
              .filter((e) => e.aktif)
              .map((e) => (
                <option key={e.employeeId} value={e.employeeId}>
                  {e.nama} ({e.employeeId})
                </option>
              ))}
          </Select>
        </div>
        <Button
          type="button"
          onClick={openAddModal}
          disabled={!selectedEmployeeId}
          size="lg"
          className="h-11"
        >
          <Plus size={16} />
          Tambah Jadwal
        </Button>
      </div>

      {/* Info petugas terpilih */}
      {selectedEmployee && (
        <div className="mb-4 rounded-lg border border-border bg-card p-3">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{selectedEmployee.nama}</span>
            <span className="ml-2 text-muted-foreground">
              {selectedEmployee.cabangAktif} • {selectedEmployee.role}
            </span>
          </p>
        </div>
      )}

      {/* Kanban board */}
      {loading ? (
        <SkeletonTable rows={4} />
      ) : !selectedEmployeeId ? (
        <EmptyState
          icon="group"
          title="Pilih petugas"
          description="Pilih petugas untuk melihat dan mengelola jadwalnya."
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon="event"
          title="Belum ada jadwal"
          description={`Belum ada jadwal untuk ${selectedEmployee?.nama || "petugas ini"}. Klik "Tambah Jadwal" untuk membuat jadwal pertama.`}
        />
      ) : (
        <KanbanBoard
          items={items}
          empMap={empMap}
          shiftMap={shiftMap}
          branchId={selectedEmployee?.cabangAktif || ""}
          onMove={moveSchedule}
        />
      )}

      {/* Modal tambah/edit */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-xl sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-4 text-base font-bold text-foreground">
                {editingSchedule ? "Edit Jadwal" : "Tambah Jadwal"}
              </h3>
              <p className="mb-4 text-xs text-muted-foreground">
                {selectedEmployee?.nama} ({selectedEmployee?.employeeId})
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="modal-shift">Shift</Label>
                  <Select
                    id="modal-shift"
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
                  <Label htmlFor="modal-date">Tanggal</Label>
                  <Input
                    id="modal-date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className={controlClass}
                    required
                  />
                </div>

                {editingSchedule && (
                  <div className="rounded-md border border-border bg-background p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {shiftMap.get(editingSchedule.shiftId) || editingSchedule.shiftId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {editingSchedule.date}
                        </p>
                      </div>
                      <StatusBadge status={editingSchedule.status} />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {editingSchedule && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="text-destructive hover:bg-destructive-wash"
                    >
                      <Trash2 size={14} />
                      {deleting ? "Menghapus..." : "Hapus"}
                    </Button>
                  )}
                  <div className="flex-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setModalOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Menyimpan..." : editingSchedule ? "Simpan" : "Tambah"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminShell>
  );
}
