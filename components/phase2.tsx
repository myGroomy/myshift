"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KaryawanShell } from "@/components/bottom-nav";
import { Footer } from "@/components/nav";

export type Branch = { branchId: string; nama: string; aktif: boolean; spreadsheetId: string };
export type Employee = { employeeId: string; username: string; nama: string; role: string; cabangAktif: string; aktif: boolean };
export type Schedule = { scheduleId: string; employeeId: string; shiftId: string; date: string; status: string };
export type Swap = { swapId: string; scheduleId: string; requestedBy: string; requestedWith: string; reason: string; status: string; approvedBy: string; rejectReason: string };
export type Izin = { izinId: string; employeeId: string; scheduleId: string; categoryId: string; note: string; status: string; approvedBy: string; rejectReason: string };
export type Category = { id: string; label: string; aktif: boolean };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error(body.error?.message ?? "Request gagal");
  return body.data as T;
}

function statusBadge(status: string) {
  const cls = status === "approved" ? "bg-[#0075de] text-white" : status === "rejected" ? "bg-[#dc3545] text-white" : "bg-[#615d59] text-white";
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
}

function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#faf9fe] text-[#000000]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 text-2xl font-bold"
        >
          {title}
        </motion.h1>
        {children}
        <Footer />
      </div>
    </main>
  );
}

export function SwapAjukanPage() {
  const router = useRouter();
  const [session, setSession] = useState<{ employeeId: string; nama: string; activeBranchId: string; branches: Branch[] } | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scheduleId, setScheduleId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [reason, setReason] = useState("");
  const [partners, setPartners] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { request<{ employeeId: string; nama: string; activeBranchId: string; branches: Branch[] }>("/api/auth/session").then((s) => { setSession(s); }).catch(() => {}); }, []);
  useEffect(() => {
    if (!session?.activeBranchId) return;
    void request<Schedule[]>(`/api/schedules?branchId=${session.activeBranchId}`).then(setSchedules).catch(() => {});
  }, [session?.activeBranchId]);
  useEffect(() => {
    if (!scheduleId || !session?.activeBranchId) { setPartners([]); return; }
    const params = new URLSearchParams({ scheduleId, branchId: session.activeBranchId });
    void request<Employee[]>(`/api/swaps/eligible-partners?${params}`).then(setPartners).catch(() => setPartners([]));
  }, [scheduleId, session?.activeBranchId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(""); setLoading(true);
    try { await request("/api/swaps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scheduleId, requestedWithEmployeeId: partnerId, reason }) }); router.push("/riwayat"); }
    catch (e) { setError(e instanceof Error ? e.message : "Gagal"); } finally { setLoading(false); }
  }

  const mySchedules = schedules.filter((s) => s.employeeId === session?.employeeId && s.status === "scheduled");

  return (
    <KaryawanShell title="Ajukan Swap Shift">
      <form onSubmit={submit} className="mb-6 grid max-w-xl gap-4">
        <div><Label>Jadwal Saya</Label><select className="h-11 w-full rounded-lg border-[#e5e5e5] px-4" value={scheduleId} onChange={(e) => setScheduleId(e.target.value)}><option value="">Pilih jadwal</option>{mySchedules.map((s) => <option key={s.scheduleId} value={s.scheduleId}>{s.date} · {s.shiftId}</option>)}</select></div>
        <div><Label>Partner Tukar</Label><select className="h-11 w-full rounded-lg border-[#e5e5e5] px-4" value={partnerId} onChange={(e) => setPartnerId(e.target.value)}><option value="">Pilih partner</option>{partners.map((p) => <option key={p.employeeId} value={p.employeeId}>{p.nama} ({p.employeeId})</option>)}</select></div>
        <div><Label>Alasan</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Alasan swap" required className="rounded-lg border-[#e5e5e5] px-4" /></div>
        <Button type="submit" disabled={loading || !scheduleId || !partnerId} className="h-11 rounded-lg bg-[#0075de] text-white">{loading ? "Mengajukan..." : "Ajukan Swap"}</Button>
      </form>
      {error && <p className="mb-4 text-[#dc3545]">{error}</p>}
      <Footer />
    </KaryawanShell>
  );
}

export function RiwayatPage() {
  const [tab, setTab] = useState<"swap" | "izin">("swap");
  const [items, setItems] = useState<(Swap | Izin)[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    const endpoint = tab === "swap" ? "/api/swaps" : "/api/izin";
    void request<(Swap | Izin)[]>(endpoint).then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, [tab]);

  const itemId = (item: Swap | Izin) => "swapId" in item ? item.swapId : item.izinId;
  const itemScheduleId = (item: Swap | Izin) => item.scheduleId;

  return (
    <KaryawanShell title="Riwayat">
      <div className="mb-4 flex gap-2">
        <Button variant={tab === "swap" ? "default" : "outline"} onClick={() => setTab("swap")} className={tab === "swap" ? "bg-[#0075de] text-white" : ""}>Swap</Button>
        <Button variant={tab === "izin" ? "default" : "outline"} onClick={() => setTab("izin")} className={tab === "izin" ? "bg-[#0075de] text-white" : ""}>Izin</Button>
      </div>
      {loading ? <p className="text-[#615d59]">Memuat...</p> : items.length === 0 ? <p className="text-[#615d59]">Tidak ada data.</p> : (
        <div className="overflow-x-auto rounded-lg border border-[#e5e5e5]">
          <table className="w-full text-left text-sm">
            <thead><tr className="bg-[#f0f1f5]"><th className="p-3">ID</th><th className="p-3">Jadwal</th><th className="p-3">Status</th><th className="p-3">Aksi</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={itemId(item)} className="border-t border-[#e5e5e5]">
                  <td className="p-3">{itemId(item)}</td>
                  <td className="p-3">{itemScheduleId(item)}</td>
                  <td className="p-3">{statusBadge(item.status)}</td>
                  <td className="p-3"><Button variant="link" onClick={() => router.push(`/shift/${itemScheduleId(item)}`)} className="text-[#0075de]">Lihat</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Footer />
    </KaryawanShell>
  );
}

export function SwapApprovalPage() {
  const [items, setItems] = useState<Swap[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { void request<Swap[]>("/api/swaps?status=pending").then(setItems).catch(() => setItems([])).finally(() => setLoading(false)); }, []);

  async function approve(swapId: string) {
    try { await request(`/api/swaps/${swapId}/approve`, { method: "POST" }); setItems(items.filter((item) => item.swapId !== swapId)); }
    catch (e) { alert(e instanceof Error ? e.message : "Gagal"); }
  }
  async function reject(swapId: string) {
    const reason = prompt("Alasan penolakan:");
    if (!reason) return;
    try { await request(`/api/swaps/${swapId}/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) }); setItems(items.filter((item) => item.swapId !== swapId)); }
    catch (e) { alert(e instanceof Error ? e.message : "Gagal"); }
  }

  return (
    <AdminShell title="Approval Swap">
      <div className="overflow-x-auto rounded-lg border border-[#e5e5e5]">
        <table className="w-full text-left text-sm">
          <thead><tr className="bg-[#f0f1f5]"><th className="p-3">Swap ID</th><th className="p-3">Jadwal</th><th className="p-3">Diminta</th><th className="p-3">Alasan</th><th className="p-3">Aksi</th></tr></thead>
          <tbody>
            {loading ? <tr><td className="p-3" colSpan={5}>Memuat...</td></tr> : items.map((item) => (
              <tr key={item.swapId} className="border-t border-[#e5e5e5]">
                <td className="p-3">{item.swapId}</td>
                <td className="p-3">{item.scheduleId}</td>
                <td className="p-3">{item.requestedWith}</td>
                <td className="p-3">{item.reason}</td>
                <td className="p-3"><div className="flex gap-2"><Button variant="default" onClick={() => approve(item.swapId)} className="bg-[#0075de]">Setuju</Button><Button variant="destructive" onClick={() => reject(item.swapId)}>Tolak</Button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

export function IzinAjukanPage() {
  const router = useRouter();
  const [session, setSession] = useState<{ employeeId: string; activeBranchId: string } | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [scheduleId, setScheduleId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { request<{ employeeId: string; activeBranchId: string }>("/api/auth/session").then(setSession).catch(() => {}); }, []);
  useEffect(() => {
    if (!session?.activeBranchId) return;
    void request<Schedule[]>(`/api/schedules?branchId=${session.activeBranchId}`).then(setSchedules).catch(() => {});
    void request<Category[]>(`/api/izin-categories?branchId=${session.activeBranchId}`).then(setCategories).catch(() => {});
  }, [session?.activeBranchId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(""); setLoading(true);
    try { await request("/api/izin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scheduleId, categoryId, note }) }); router.push("/riwayat"); }
    catch (e) { setError(e instanceof Error ? e.message : "Gagal"); } finally { setLoading(false); }
  }

  return (
    <KaryawanShell title="Ajukan Izin">
      <form onSubmit={submit} className="mb-6 grid max-w-lg gap-4">
        <div><Label>Jadwal</Label><select className="h-11 w-full rounded-lg border-[#e5e5e5] px-4" value={scheduleId} onChange={(e) => setScheduleId(e.target.value)}><option value="">Pilih jadwal</option>{schedules.map((s) => <option key={s.scheduleId} value={s.scheduleId}>{s.date} · {s.shiftId}</option>)}</select></div>
        <div><Label>Kategori</Label><select className="h-11 w-full rounded-lg border-[#e5e5e5] px-4" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">Pilih kategori</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
        <div><Label>Catatan</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Alasan izin" required className="rounded-lg border-[#e5e5e5] px-4" /></div>
        <Button type="submit" disabled={loading || !scheduleId || !categoryId} className="h-11 rounded-lg bg-[#0075de] text-white">{loading ? "Mengajukan..." : "Ajukan Izin"}</Button>
      </form>
      {error && <p className="mb-4 text-[#dc3545]">{error}</p>}
      <Footer />
    </KaryawanShell>
  );
}

export function IzinApprovalPage() {
  const [items, setItems] = useState<Izin[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { void request<Izin[]>("/api/izin?status=pending").then(setItems).catch(() => setItems([])).finally(() => setLoading(false)); }, []);

  async function approve(izinId: string) {
    try { await request(`/api/izin/${izinId}/approve`, { method: "POST" }); setItems(items.filter((item) => item.izinId !== izinId)); }
    catch (e) { alert(e instanceof Error ? e.message : "Gagal"); }
  }
  async function reject(izinId: string) {
    const reason = prompt("Alasan penolakan:");
    if (!reason) return;
    try { await request(`/api/izin/${izinId}/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) }); setItems(items.filter((item) => item.izinId !== izinId)); }
    catch (e) { alert(e instanceof Error ? e.message : "Gagal"); }
  }

  return (
    <AdminShell title="Approval Izin">
      <div className="overflow-x-auto rounded-lg border border-[#e5e5e5]">
        <table className="w-full text-left text-sm">
          <thead><tr className="bg-[#f0f1f5]"><th className="p-3">Izin ID</th><th className="p-3">Karyawan</th><th className="p-3">Jadwal</th><th className="p-3">Status</th><th className="p-3">Aksi</th></tr></thead>
          <tbody>
            {loading ? <tr><td className="p-3" colSpan={5}>Memuat...</td></tr> : items.map((item) => (
              <tr key={item.izinId} className="border-t border-[#e5e5e5]">
                <td className="p-3">{item.izinId}</td>
                <td className="p-3">{item.employeeId}</td>
                <td className="p-3">{item.scheduleId}</td>
                <td className="p-3">{statusBadge(item.status)}</td>
                <td className="p-3"><div className="flex gap-2"><Button variant="default" onClick={() => approve(item.izinId)} className="bg-[#0075de]">Setuju</Button><Button variant="destructive" onClick={() => reject(item.izinId)}>Tolak</Button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
