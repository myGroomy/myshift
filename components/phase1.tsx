"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BottomNav, { KaryawanShell } from "@/components/bottom-nav";

export type Branch = { branchId: string; nama: string; aktif: boolean; spreadsheetId: string };
export type Employee = { employeeId: string; username: string; nama: string; role: string; cabangAktif: string; aktif: boolean };
export type Shift = { shiftId: string; branchId: string; name: string; startTime: string; endTime: string };
export type Schedule = { scheduleId: string; employeeId: string; shiftId: string; date: string; status: string; conflictWarning?: boolean };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error(body.error?.message ?? "Request gagal");
  return body.data as T;
}

export { request };

function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#faf9fe] text-[#000000]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <nav className="mb-8 flex flex-wrap items-center gap-4 border-b border-[#e5e5e5] pb-4 text-sm font-medium">
          <Link href="/" className="text-[#0075de]">MYSHIFT</Link>
          <Link href="/jadwal" className="text-[#615d59] hover:text-[#0075de]">Jadwal</Link>
          <Link href="/jadwal-saya" className="text-[#615d59] hover:text-[#0075de]">Jadwal Saya</Link>
          <Link href="/karyawan" className="text-[#615d59] hover:text-[#0075de]">Karyawan</Link>
          <Link href="/cabang" className="text-[#615d59] hover:text-[#0075de]">Cabang</Link>
          <Link href="/shift-template" className="text-[#615d59] hover:text-[#0075de]">Shift Template</Link>
          <Link href="/checklist-template" className="text-[#615d59] hover:text-[#0075de]">Checklist</Link>
          <Link href="/handover-template" className="text-[#615d59] hover:text-[#0075de]">Handover</Link>
          <Link href="/dashboard" className="text-[#615d59] hover:text-[#0075de]">Dashboard</Link>
          <Link href="/laporan" className="text-[#615d59] hover:text-[#0075de]">Laporan</Link>
          <Link href="/riwayat" className="text-[#615d59] hover:text-[#0075de]">Riwayat</Link>
          <Link href="/approval/swap" className="text-[#615d59] hover:text-[#0075de]">Approval Swap</Link>
          <Link href="/approval/izin" className="text-[#615d59] hover:text-[#0075de]">Approval Izin</Link>
        </nav>
        <h1 className="mb-6 text-2xl font-bold">{title}</h1>
        {children}
      </div>
    </main>
  );
}

export function BranchesPage() {
  const [items, setItems] = useState<Branch[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const load = () => request<Branch[]>("/api/branches").then(setItems).catch((e) => setError(e.message));
  useEffect(() => { void load(); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await request("/api/branches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      setName(""); setError(""); load();
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal"); }
  }
  return (
    <AdminShell title="Kelola Cabang">
      <form onSubmit={submit} className="mb-6 flex max-w-xl gap-3">
        <Input className="h-11 flex-1 rounded-lg border-[#e5e5e5] px-4" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama cabang" required />
        <Button type="submit" className="h-11 rounded-lg bg-[#0075de] px-6 text-white">Tambah</Button>
      </form>
      {error && <p className="mb-4 text-[#dc3545]">{error}</p>}
      <div className="overflow-x-auto rounded-lg border border-[#e5e5e5]">
        <table className="w-full text-left text-sm">
          <thead><tr className="bg-[#f0f1f5]"><th className="p-3">ID</th><th className="p-3">Nama</th><th className="p-3">Status</th><th className="p-3">Spreadsheet</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.branchId} className="border-t border-[#e5e5e5]">
                <td className="p-3">{item.branchId}</td>
                <td className="p-3">{item.nama}</td>
                <td className="p-3">{item.aktif ? "Aktif" : "Nonaktif"}</td>
                <td className="p-3">{item.spreadsheetId || "Belum dikonfigurasi"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

export function EmployeesPage() {
  const [items, setItems] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState({ name: "", username: "", pin: "", role: "karyawan", branchId: "" });
  const [error, setError] = useState("");
  const load = () => Promise.all([request<Employee[]>("/api/employees"), request<Branch[]>("/api/branches")]).then(([employees, branchList]) => {
    setItems(employees); setBranches(branchList);
    setForm((current) => ({ ...current, branchId: current.branchId || branchList[0]?.branchId || "" }));
  }).catch((e) => setError(e.message));
  useEffect(() => { void load(); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await request("/api/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setForm({ ...form, name: "", username: "", pin: "" }); load();
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal"); }
  }
  return (
    <AdminShell title="Kelola Karyawan">
      <form onSubmit={submit} className="mb-6 grid max-w-3xl gap-4 sm:grid-cols-2">
        <div><Label>Nama</Label><Input className="h-11 rounded-lg border-[#e5e5e5] px-4" placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
        <div><Label>Username</Label><Input className="h-11 rounded-lg border-[#e5e5e5] px-4" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></div>
        <div><Label>PIN 4-8 digit</Label><Input className="h-11 rounded-lg border-[#e5e5e5] px-4" placeholder="PIN" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} required /></div>
        <div><Label>Role</Label><select className="h-11 w-full rounded-lg border-[#e5e5e5] px-4" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="karyawan">Karyawan</option><option value="kepala_cabang">Kepala Cabang</option><option value="admin">Admin</option></select></div>
        <div className="sm:col-span-2"><Label>Cabang</Label><select className="h-11 w-full rounded-lg border-[#e5e5e5] px-4" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} required><option value="">Pilih cabang</option>{branches.map((branch) => <option key={branch.branchId} value={branch.branchId}>{branch.nama}</option>)}</select></div>
        <div className="sm:col-span-2"><Button type="submit" className="h-11 w-full rounded-lg bg-[#0075de] text-white">Tambah Karyawan</Button></div>
      </form>
      {error && <p className="mb-4 text-[#dc3545]">{error}</p>}
      <div className="overflow-x-auto rounded-lg border border-[#e5e5e5]">
        <table className="w-full text-left text-sm">
          <thead><tr className="bg-[#f0f1f5]"><th className="p-3">ID</th><th className="p-3">Nama</th><th className="p-3">Username</th><th className="p-3">Role</th><th className="p-3">Cabang</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.employeeId} className="border-t border-[#e5e5e5]">
                <td className="p-3">{item.employeeId}</td>
                <td className="p-3">{item.nama}</td>
                <td className="p-3">{item.username}</td>
                <td className="p-3">{item.role}</td>
                <td className="p-3">{item.cabangAktif}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

export function ShiftsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<Shift[]>([]);
  const [form, setForm] = useState({ branchId: "", name: "", startTime: "08:00", endTime: "16:00" });
  const [error, setError] = useState("");
  const load = (branchId: string) => branchId && request<Shift[]>(`/api/shifts?branchId=${branchId}`).then(setItems).catch((e) => setError(e.message));
  useEffect(() => {
    request<Branch[]>("/api/branches").then((list) => {
      setBranches(list); const id = list[0]?.branchId || ""; setForm((current) => ({ ...current, branchId: id })); load(id);
    }).catch((e) => setError(e.message));
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await request("/api/shifts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setForm({ ...form, name: "" }); load(form.branchId);
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal"); }
  }
  return (
    <AdminShell title="Shift Template">
      <form onSubmit={submit} className="mb-6 grid max-w-3xl gap-4 sm:grid-cols-4">
        <select className="h-11 w-full rounded-lg border-[#e5e5e5] px-4" value={form.branchId} onChange={(e) => { setForm({ ...form, branchId: e.target.value }); load(e.target.value); }} required><option value="">Cabang</option>{branches.map((branch) => <option key={branch.branchId} value={branch.branchId}>{branch.nama}</option>)}</select>
        <Input className="h-11 rounded-lg border-[#e5e5e5] px-4" placeholder="Nama shift" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <Input className="h-11 rounded-lg border-[#e5e5e5] px-4" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
        <Input className="h-11 rounded-lg border-[#e5e5e5] px-4" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
        <Button type="submit" className="h-11 rounded-lg bg-[#0075de] text-white sm:col-span-4">Tambah Shift</Button>
      </form>
      {error && <p className="mb-4 text-[#dc3545]">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <article key={item.shiftId} className="rounded-lg border border-[#e5e5e5] p-4">
            <strong>{item.name}</strong>
            <p className="text-sm text-[#615d59]">{item.startTime} - {item.endTime}</p>
            <small>{item.shiftId}</small>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}

export function SchedulePage({ mine = false }: { mine?: boolean }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [items, setItems] = useState<Schedule[]>([]);
  const [branchId, setBranchId] = useState("");
  const [form, setForm] = useState({ employeeId: "", shiftId: "", date: new Date().toISOString().slice(0, 10) });
  const [error, setError] = useState("");
  const [session, setSession] = useState<{ employeeId: string } | null>(null);
  const load = (id: string) => {
    if (!id) return;
    const params = new URLSearchParams({ branchId: id });
    request<Schedule[]>(`/api/schedules?${params}`).then(setItems).catch((e) => setError(e.message));
    if (!mine) request<Shift[]>(`/api/shifts?branchId=${id}`).then(setShifts).catch((e) => setError(e.message));
  };
  useEffect(() => {
    if (mine) {
      request<{ activeBranchId: string; employeeId: string }>("/api/auth/session").then((s) => {
        setSession({ employeeId: s.employeeId }); setBranchId(s.activeBranchId); load(s.activeBranchId);
      }).catch((e) => setError(e.message));
    } else {
      Promise.all([request<Branch[]>("/api/branches"), request<Employee[]>("/api/employees")]).then(([branchList, employeeList]) => {
        setBranches(branchList); setEmployees(employeeList);
        const id = branchList[0]?.branchId || ""; setBranchId(id);
        setForm((current) => ({ ...current, employeeId: employeeList[0]?.employeeId || "" }));
        load(id);
      }).catch((e) => setError(e.message));
    }
  }, [mine]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    try { await request("/api/schedules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, branchId }) }); load(branchId); }
    catch (e) { setError(e instanceof Error ? e.message : "Gagal"); }
  }
  async function startShift(scheduleId: string) {
    try {
      await request(`/api/schedules/${scheduleId}/start-shift`, { method: "POST" });
      setItems(items.map((item) => item.scheduleId === scheduleId ? { ...item, status: "started", startedAt: new Date().toISOString() } : item));
    } catch (e) { alert(e instanceof Error ? e.message : "Gagal memulai shift"); }
  }

  const isKaryawanPage = mine;
  const shell = isKaryawanPage ? KaryawanShell : AdminShell;

  return shell({
    title: mine ? "Jadwal Saya" : "Kelola Jadwal",
    children: (
      <>
        {!mine && (
          <form onSubmit={submit} className="mb-6 grid max-w-4xl gap-4 sm:grid-cols-4">
            <select className="h-11 w-full rounded-lg border-[#e5e5e5] px-4" value={branchId} onChange={(e) => { setBranchId(e.target.value); load(e.target.value); }}><option value="">Cabang</option>{branches.map((branch) => <option key={branch.branchId} value={branch.branchId}>{branch.nama}</option>)}</select>
            <select className="h-11 w-full rounded-lg border-[#e5e5e5] px-4" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}><option value="">Karyawan</option>{employees.filter((employee) => employee.cabangAktif === branchId).map((employee) => <option key={employee.employeeId} value={employee.employeeId}>{employee.nama}</option>)}</select>
            <select className="h-11 w-full rounded-lg border-[#e5e5e5] px-4" value={form.shiftId} onChange={(e) => setForm({ ...form, shiftId: e.target.value })}><option value="">Shift</option>{shifts.map((shift) => <option key={shift.shiftId} value={shift.shiftId}>{shift.name}</option>)}</select>
            <Input className="h-11 rounded-lg border-[#e5e5e5] px-4" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Button type="submit" className="h-11 rounded-lg bg-[#0075de] text-white sm:col-span-4">Buat Jadwal</Button>
          </form>
        )}
        {error && <p className="mb-4 text-[#dc3545]">{error}</p>}
        <div className="grid gap-4">
          {items.map((item) => (
            <article key={item.scheduleId} className={`rounded-lg border p-4 ${item.conflictWarning ? "border-[#dc3545] bg-[#dc3545]/10" : "border-[#e5e5e5]"}`}>
              <div className="flex justify-between"><strong>{item.date}</strong><span>{item.status}</span></div>
              <p className="text-sm">{item.employeeId} · {item.shiftId}</p>
              {item.conflictWarning && <p className="mt-2 text-sm text-[#dc3545]">Peringatan: jadwal bentrok.</p>}
              {mine && item.status === "scheduled" && item.employeeId === session?.employeeId ? (
                <Button className="mt-2 h-8 rounded-lg bg-[#0075de] text-white" onClick={() => startShift(item.scheduleId)}>Mulai Shift</Button>
              ) : null}
            </article>
          ))}
        </div>
        {isKaryawanPage ? <BottomNav /> : null}
      </>
    ),
  });
}
