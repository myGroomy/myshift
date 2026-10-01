"use client";

import { History } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, tdClass } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonTable } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { AdminShell, RejectButton, StatusBadge } from "@/components/shell";
import { request } from "@/lib/api";
import type { Branch, Category, Izin, Schedule, Swap } from "@/lib/types";
import { controlClass } from "@/lib/ui";
import { FilterPanel } from "@/components/ui/filter-panel";
import type { EmployeeRole } from "@/lib/domain/employee-role";

function msg(error: unknown): string {
  return error instanceof Error ? error.message : "Terjadi kesalahan";
}

type Session = {
  employeeId: string;
  nama: string;
  role: EmployeeRole;
  activeBranchId: string;
  branches: Branch[];
};

type SwapPartner = {
  employeeId: string;
  name: string;
  role: string;
  branchId: string;
};

/**
 * Isi form Ajukan Swap TANPA shell sekarang jadi tab "Swap" di `/jadwal-saya`
 * (`components/jadwal-saya.tsx`), bukan halaman tersendiri.
 */
export function SwapAjukanContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scheduleId, setScheduleId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [reason, setReason] = useState("");
  const [partners, setPartners] = useState<SwapPartner[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);


  useEffect(() => {
    request<Session>("/api/auth/session")
      .then(setSession)
      .catch((e: unknown) => toast(msg(e), "error"));
  }, [toast]);

  useEffect(() => {
    if (!session) return;
    request<Schedule[]>("/api/schedules")
      .then(setSchedules)
      .catch((e: unknown) => toast(msg(e), "error"));
  }, [session, toast]);

  useEffect(() => {
    const schedule = schedules.find((entry) => `${entry.branchId}:${entry.scheduleId}` === scheduleId);
    if (!schedule?.branchId) {
      setPartners([]);
      return;
    }
    setPartners([]);
    let current = true;
    const params = new URLSearchParams({ scheduleId: schedule.scheduleId, branchId: schedule.branchId });
    request<SwapPartner[]>(`/api/swaps/eligible-partners?${params}`)
      .then((result) => {
        if (current) setPartners(result);
      })
      .catch((e: unknown) => {
        if (current) {
          toast(msg(e), "error");
          setPartners([]);
        }
      });
    return () => {
      current = false;
    };
  }, [scheduleId, schedules, toast]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const schedule = schedules.find((entry) => `${entry.branchId}:${entry.scheduleId}` === scheduleId);
    if (!schedule?.branchId || !partnerId || !reason.trim()) return;
    setLoading(true);
    try {
      await request("/api/swaps", {
        method: "POST",
        body: JSON.stringify({
          scheduleId: schedule.scheduleId,
          branchId: schedule.branchId,
          requestedWithEmployeeId: partnerId,
          reason: reason.trim(),
        }),
      });
      toast("Pengajuan swap terkirim", "success");
      setSubmitted(true);

    } catch (e) {
      toast(msg(e), "error");
    } finally {
      setLoading(false);
    }
  }

  const mySchedules = schedules.filter(
    (s) => s.employeeId === session?.employeeId && s.status === "scheduled"
  );
  return (
    <>
      {submitted && (
        <div className="mb-5 flex items-center justify-between rounded-md border border-success/30 bg-success/5 p-3">
          <div className="text-sm text-success-foreground">
            ✓ Permohonan tukar shift berhasil dikirim. Menunggu persetujuan Admin.
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="text-xs text-primary underline-offset-2 hover:underline"
              onClick={() => router.push("/jadwal-saya?tab=riwayat")}
            >
              Lihat Riwayat
            </button>
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => { setSubmitted(false); setScheduleId(""); setPartnerId(""); setReason(""); }}
            >
              Ajukan Lagi
            </button>
          </div>
        </div>
      )}
      <form onSubmit={submit} className="mb-6 grid max-w-2xl gap-4 sm:grid-cols-2">

        <div>
          <Label htmlFor="jadwal-swap">Jadwal Saya yang Ingin Ditukar</Label>
          <Select
            id="jadwal-swap"
            value={scheduleId}
            onChange={(e) => {
              setScheduleId(e.target.value);
              setPartnerId("");
            }}
            className={controlClass}
            required
          >
            <option value="">Pilih jadwal</option>
            {mySchedules.map((s) => (
              <option key={`${s.branchId}:${s.scheduleId}`} value={`${s.branchId}:${s.scheduleId}`}>
                {s.date} · {s.shiftName || s.shiftId} {s.startTime ? `(${s.startTime}–${s.endTime})` : ""} · {s.branchName || s.branchId}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="partner-swap">Rekan Kerja Pengganti (Sama Tanggal)</Label>
          <Select
            id="partner-swap"
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            disabled={!scheduleId}
            className={controlClass}
            required
          >
            <option value="">
              {!scheduleId
                ? "Pilih jadwal Anda terlebih dahulu"
                : partners.length === 0
                ? "Tidak ada rekan yang cocok di tanggal ini"
                : "Pilih rekan kerja"}
            </option>
            {partners.map((p) => (
              <option key={p.employeeId} value={p.employeeId}>
                {p.name} ({p.employeeId})
              </option>
            ))}
          </Select>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="alasan-swap">Alasan Tukar Shift</Label>
          <Input
            id="alasan-swap"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Misal: Keperluan keluarga mendesak"
            required
            className={controlClass}
          />
        </div>

        <div className="sm:col-span-2">
          <Button
            type="submit"
            size="lg"
            disabled={loading || !scheduleId || !partnerId || !reason.trim()}
            className="h-11 w-full sm:w-auto"
          >
            {loading ? "Mengajukan..." : "Kirim Permohonan Swap"}
          </Button>
        </div>
      </form>
    </>
  );
}

export function RiwayatContent() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"swap" | "izin">("swap");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [izins, setIzins] = useState<Izin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const p1 = request<Swap[]>("/api/swaps").then(setSwaps).catch(() => setSwaps([]));
    const p2 = request<Izin[]>("/api/izin").then(setIzins).catch(() => setIzins([]));
    Promise.all([p1, p2])
      .catch((e: unknown) => toast(msg(e), "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  const rawList = tab === "swap" ? swaps : izins;
  const filteredList =
    statusFilter === "all"
      ? rawList
      : rawList.filter((item) => item.status === statusFilter);

  return (
    <>
      <FilterPanel
        label="Filter riwayat pengajuan"
        contentClassName="md:grid-cols-[minmax(0,1fr)_14rem]"
      >
        <div role="group" aria-label="Kategori pengajuan" className="flex min-w-0 overflow-x-auto rounded-lg border border-border bg-card p-1">
          <button
            type="button"
            aria-pressed={tab === "swap"}
            onClick={() => setTab("swap")}
            className={`min-h-11 shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 ${
              tab === "swap"
                ? "bg-accent font-semibold text-accent-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Tukar Shift ({swaps.length})
          </button>
          <button
            type="button"
            aria-pressed={tab === "izin"}
            onClick={() => setTab("izin")}
            className={`min-h-11 shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 ${
              tab === "izin"
                ? "bg-accent font-semibold text-accent-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Izin ({izins.length})
          </button>
        </div>

        <div className="min-w-0">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={controlClass}
            aria-label="Filter status pengajuan"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu (Pending)</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
          </Select>
        </div>
      </FilterPanel>

      {loading ? (
        <SkeletonTable rows={4} />
      ) : filteredList.length === 0 ? (
        <EmptyState
          icon={<History size={40} />}
          title={`Belum ada pengajuan ${tab}`}
          description={
            statusFilter === "all"
              ? `Anda belum pernah mengajukan ${tab} shift.`
              : `Tidak ada riwayat ${tab} dengan status ${statusFilter}.`
          }
          actionLabel={tab === "swap" ? "Ajukan Swap" : "Ajukan Izin"}
          actionHref={tab === "swap" ? "/jadwal-saya?tab=swap" : "/jadwal-saya?tab=izin"}
        />
      ) : tab === "swap" ? (
        <DataTable columns={["ID", "Jadwal", "Rekan Tukar", "Alasan", "Status", "Keterangan"]}>
          {(filteredList as Swap[]).map((item) => (
            <tr key={item.swapId} className="border-t border-border">
              <td className={tdClass}>
                <span className="font-mono text-xs">{item.swapId}</span>
              </td>
              <td className={tdClass}>
                <Link
                  href={`/shift/${item.scheduleId}${item.branchId ? `?branchId=${encodeURIComponent(item.branchId)}` : ""}`}
                  className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                >
                  {item.scheduleId}
                </Link>
              </td>
              <td className={tdClass}>{item.requestedWith}</td>
              <td className={tdClass}>{item.reason}</td>
              <td className={tdClass}>
                <StatusBadge status={item.status} />
              </td>
              <td className={tdClass}>
                <span className="text-xs text-muted-foreground">
                  {item.status === "approved"
                    ? `Disetujui (${item.approvedBy || "Admin"})`
                    : item.status === "rejected"
                    ? `Ditolak: ${item.rejectReason || "-"}`
                    : "Menunggu persetujuan"}
                </span>
              </td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <DataTable columns={["ID", "Jadwal", "Kategori", "Catatan", "Status", "Keterangan"]}>
          {(filteredList as Izin[]).map((item) => (
            <tr key={item.izinId} className="border-t border-border">
              <td className={tdClass}>
                <span className="font-mono text-xs">{item.izinId}</span>
              </td>
              <td className={tdClass}>
                <Link
                  href={`/shift/${item.scheduleId}${item.branchId ? `?branchId=${encodeURIComponent(item.branchId)}` : ""}`}
                  className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                >
                  {item.scheduleId}
                </Link>
              </td>
              <td className={tdClass}>{item.categoryId}</td>
              <td className={tdClass}>{item.note}</td>
              <td className={tdClass}>
                <StatusBadge status={item.status} />
              </td>
              <td className={tdClass}>
                <span className="text-xs text-muted-foreground">
                  {item.status === "approved"
                    ? `Disetujui (${item.approvedBy || "Admin"})`
                    : item.status === "rejected"
                    ? `Ditolak: ${item.rejectReason || "-"}`
                    : "Menunggu persetujuan"}
                </span>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </>
  );
}

export function SwapApprovalPage() {
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  const [items, setItems] = useState<Swap[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      request<Session>("/api/auth/session"),
      request<Branch[]>("/api/branches").catch(() => []),
    ])
      .then(([s, bList]) => {
        setSession(s);
        setBranches(bList);
        const initial = s.activeBranchId || bList[0]?.branchId || s.branches[0]?.branchId || "";
        setBranchId(initial);
        if (initial) void load(initial, statusFilter);
      })
      .catch((e: unknown) => {
        setLoadError(msg(e));
        setLoading(false);
      });
  }, []);

  function load(targetBranch: string, targetStatus: string) {
    if (!targetBranch) return;
    setLoading(true);
    setLoadError(null);
    const params = new URLSearchParams({ branchId: targetBranch });
    if (targetStatus !== "all") params.set("status", targetStatus);

    request<Swap[]>(`/api/swaps?${params}`)
      .then(setItems)
      .catch((e: unknown) => {
        const m = msg(e);
        setLoadError(m);
        toast(m, "error");
        setItems([]);
      })
      .finally(() => setLoading(false));
  }

  function handleBranchChange(b: string) {
    setBranchId(b);
    load(b, statusFilter);
  }

  function handleStatusChange(s: string) {
    setStatusFilter(s);
    load(branchId, s);
  }

  async function approve(swapId: string) {
    try {
      await request(`/api/swaps/${swapId}/approve?branchId=${branchId}`, { method: "POST" });
      setItems((prev) => prev.filter((item) => item.swapId !== swapId));
      toast("Permohonan swap disetujui", "success");
      load(branchId, statusFilter);
    } catch (e) {
      toast(msg(e), "error");
    }
  }

  async function reject(swapId: string, reason: string) {
    try {
      await request(`/api/swaps/${swapId}/reject?branchId=${branchId}`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setItems((prev) => prev.filter((item) => item.swapId !== swapId));
      toast("Permohonan swap ditolak", "success");
      load(branchId, statusFilter);
    } catch (e) {
      toast(msg(e), "error");
    }
  }

  return (
    <AdminShell
      title="Approval Tukar Shift"
      lead="Tinjau dan setujui permohonan pertukaran shift antar karyawan per cabang."
    >
      <FilterPanel
        className="max-w-2xl"
        contentClassName="md:grid-cols-2"
        label="Filter permohonan swap"
      >
        {session?.role === "admin" && (
          <div className="min-w-0">
            <Label htmlFor="branch-filter">Pilih Cabang</Label>
            <Select
              id="branch-filter"
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

        <div className="min-w-0">
          <Label htmlFor="status-filter">Filter Status</Label>
          <Select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={controlClass}
          >
            <option value="pending">Menunggu (Pending)</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
            <option value="all">Semua Status</option>
          </Select>
        </div>
      </FilterPanel>

      {loading ? (
        <SkeletonTable rows={4} />
      ) : loadError ? (
        <div className="rounded-lg border border-destructive-wash bg-destructive-wash p-6 text-center">
          <p className="text-sm text-destructive-foreground">{loadError}</p>
          <Button variant="outline" size="sm" onClick={() => load(branchId, statusFilter)} className="mt-3">
            Coba Lagi
          </Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="check_circle"
          title="Tidak ada permohonan"
          description={
            statusFilter === "pending"
              ? "Tidak ada permohonan swap yang menunggu persetujuan di cabang ini."
              : `Tidak ada permohonan swap dengan status ${statusFilter}.`
          }
        />
      ) : (
        <DataTable columns={["ID", "Jadwal", "Pemohon", "Rekan Tukar", "Alasan", "Status", "Aksi"]}>
          {items.map((item) => (
            <tr key={item.swapId} className="border-t border-border">
              <td className={tdClass}>
                <span className="font-mono text-xs">{item.swapId}</span>
              </td>
              <td className={tdClass}>
                <span className="font-mono text-xs">{item.scheduleId}</span>
              </td>
              <td className={tdClass}>{item.requestedBy}</td>
              <td className={tdClass}>{item.requestedWith}</td>
              <td className={tdClass}>{item.reason}</td>
              <td className={tdClass}>
                <StatusBadge status={item.status} />
              </td>
              <td className={tdClass}>
                {item.status === "pending" ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approve(item.swapId)}>
                      Setuju
                    </Button>
                    <RejectButton onReject={(reason) => reject(item.swapId, reason)} />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {item.status === "approved"
                      ? `Oleh ${item.approvedBy || "Admin"}`
                      : `Ditolak: ${item.rejectReason || "-"}`}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </AdminShell>
  );
}

/**
 * Isi form Ajukan Izin TANPA shell sekarang jadi tab "Izin" di `/jadwal-saya`
 * (`components/jadwal-saya.tsx`), bukan halaman tersendiri.
 */
export function IzinAjukanContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [scheduleId, setScheduleId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);


  useEffect(() => {
    request<Session>("/api/auth/session")
      .then(setSession)
      .catch((e: unknown) => toast(msg(e), "error"));
  }, [toast]);

  useEffect(() => {
    if (!session) return;
    request<Schedule[]>("/api/schedules")
      .then(setSchedules)
      .catch((e: unknown) => toast(msg(e), "error"));
  }, [session, toast]);

  const mySchedules = schedules.filter(
    (schedule) => schedule.employeeId === session?.employeeId && schedule.status === "scheduled",
  );
  const selectedSchedule = mySchedules.find((schedule) => `${schedule.branchId}:${schedule.scheduleId}` === scheduleId);

  useEffect(() => {
    setCategoryId("");
    setCategories([]);
    if (!selectedSchedule?.branchId) return;
    let current = true;
    request<Category[]>(`/api/izin-categories?branchId=${encodeURIComponent(selectedSchedule.branchId)}`)
      .then((result) => {
        if (current) setCategories(result);
      })
      .catch((e: unknown) => {
        if (current) toast(msg(e), "error");
      });
    return () => {
      current = false;
    };
  }, [selectedSchedule?.branchId, toast]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedSchedule?.branchId || !categoryId || !note.trim()) return;
    setLoading(true);
    try {
      await request("/api/izin", {
        method: "POST",
        body: JSON.stringify({
          scheduleId: selectedSchedule.scheduleId,
          branchId: selectedSchedule.branchId,
          categoryId,
          note: note.trim(),
        }),
      });
      toast("Pengajuan izin terkirim", "success");
      setSubmitted(true);

    } catch (e) {
      toast(msg(e), "error");
    } finally {
      setLoading(false);
    }
  }

  const activeCategories = categories.filter((c) => c.aktif);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Ajukan Izin Tidak Masuk</h2>
        <p className="text-sm text-muted-foreground">Pilih jadwal shift dan alasan ketidakhadiran untuk diteruskan ke Admin.</p>
      </div>
      {submitted && (
        <div className="mb-5 flex items-center justify-between rounded-md border border-success/30 bg-success/5 p-3">
          <div className="text-sm text-success-foreground">
            ✓ Permohonan izin berhasil dikirim. Menunggu persetujuan Admin.
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="text-xs text-primary underline-offset-2 hover:underline"
              onClick={() => router.push("/jadwal-saya?tab=riwayat")}
            >
              Lihat Riwayat
            </button>
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => { setSubmitted(false); setScheduleId(""); setCategoryId(""); setNote(""); }}
            >
              Ajukan Lagi
            </button>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="mb-6 grid max-w-2xl gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 sm:p-5">
        <div>
          <Label htmlFor="jadwal-izin">Jadwal Shift yang Ditinggalkan</Label>
          <Select
            id="jadwal-izin"
            value={scheduleId}
            onChange={(e) => setScheduleId(e.target.value)}
            className={controlClass}
            required
          >
            <option value="">Pilih jadwal</option>
            {mySchedules.map((s) => (
              <option key={`${s.branchId}:${s.scheduleId}`} value={`${s.branchId}:${s.scheduleId}`}>
                {s.date} · {s.shiftName || s.shiftId} {s.startTime ? `(${s.startTime}–${s.endTime})` : ""} · {s.branchName || s.branchId}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="kategori-izin">Kategori Izin</Label>
          <Select
            id="kategori-izin"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={controlClass}
            required
          >
            <option value="">Pilih kategori</option>
            {activeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="catatan-izin">Keterangan / Alasan</Label>
          <Input
            id="catatan-izin"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Misal: Sakit demam berobat ke dokter"
            required
            className={controlClass}
          />
        </div>

        <div className="sm:col-span-2">
          <Button
            type="submit"
            size="lg"
            disabled={loading || !selectedSchedule || !categoryId || !note.trim()}
            className="h-11 w-full sm:w-auto"
          >
            {loading ? "Mengajukan..." : "Kirim Permohonan Izin"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function IzinApprovalPage() {
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  const [items, setItems] = useState<Izin[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      request<Session>("/api/auth/session"),
      request<Branch[]>("/api/branches").catch(() => []),
    ])
      .then(([s, bList]) => {
        setSession(s);
        setBranches(bList);
        const initial = s.activeBranchId || bList[0]?.branchId || s.branches[0]?.branchId || "";
        setBranchId(initial);
        if (initial) void load(initial, statusFilter);
      })
      .catch((e: unknown) => {
        setLoadError(msg(e));
        setLoading(false);
      });
  }, []);

  function load(targetBranch: string, targetStatus: string) {
    if (!targetBranch) return;
    setLoading(true);
    setLoadError(null);
    const params = new URLSearchParams({ branchId: targetBranch });
    if (targetStatus !== "all") params.set("status", targetStatus);

    request<Izin[]>(`/api/izin?${params}`)
      .then(setItems)
      .catch((e: unknown) => {
        const m = msg(e);
        setLoadError(m);
        toast(m, "error");
        setItems([]);
      })
      .finally(() => setLoading(false));
  }

  function handleBranchChange(b: string) {
    setBranchId(b);
    load(b, statusFilter);
  }

  function handleStatusChange(s: string) {
    setStatusFilter(s);
    load(branchId, s);
  }

  async function approve(izinId: string) {
    try {
      await request(`/api/izin/${izinId}/approve?branchId=${branchId}`, { method: "POST" });
      setItems((prev) => prev.filter((item) => item.izinId !== izinId));
      toast("Permohonan izin disetujui", "success");
      load(branchId, statusFilter);
    } catch (e) {
      toast(msg(e), "error");
    }
  }

  async function reject(izinId: string, reason: string) {
    try {
      await request(`/api/izin/${izinId}/reject?branchId=${branchId}`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setItems((prev) => prev.filter((item) => item.izinId !== izinId));
      toast("Permohonan izin ditolak", "success");
      load(branchId, statusFilter);
    } catch (e) {
      toast(msg(e), "error");
    }
  }

  return (
    <AdminShell
      title="Approval Izin Karyawan"
      lead="Tinjau dan setujui permohonan izin staf outlet per cabang."
    >
      <FilterPanel
        className="max-w-2xl"
        contentClassName="md:grid-cols-2"
        label="Filter permohonan izin"
      >
        {session?.role === "admin" && (
          <div className="min-w-0">
            <Label htmlFor="branch-izin-filter">Pilih Cabang</Label>
            <Select
              id="branch-izin-filter"
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

        <div className="min-w-0">
          <Label htmlFor="status-izin-filter">Filter Status</Label>
          <Select
            id="status-izin-filter"
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={controlClass}
          >
            <option value="pending">Menunggu (Pending)</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
            <option value="all">Semua Status</option>
          </Select>
        </div>
      </FilterPanel>

      {loading ? (
        <SkeletonTable rows={4} />
      ) : loadError ? (
        <div className="rounded-lg border border-destructive-wash bg-destructive-wash p-6 text-center">
          <p className="text-sm text-destructive-foreground">{loadError}</p>
          <Button variant="outline" size="sm" onClick={() => load(branchId, statusFilter)} className="mt-3">
            Coba Lagi
          </Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="check_circle"
          title="Tidak ada permohonan"
          description={
            statusFilter === "pending"
              ? "Tidak ada permohonan izin yang menunggu persetujuan di cabang ini."
              : `Tidak ada permohonan izin dengan status ${statusFilter}.`
          }
        />
      ) : (
        <DataTable columns={["ID", "Pemohon", "Jadwal", "Kategori", "Keterangan", "Status", "Aksi"]}>
          {items.map((item) => (
            <tr key={item.izinId} className="border-t border-border">
              <td className={tdClass}>
                <span className="font-mono text-xs">{item.izinId}</span>
              </td>
              <td className={tdClass}>{item.employeeId}</td>
              <td className={tdClass}>
                <span className="font-mono text-xs">{item.scheduleId}</span>
              </td>
              <td className={tdClass}>{item.categoryId}</td>
              <td className={tdClass}>{item.note}</td>
              <td className={tdClass}>
                <StatusBadge status={item.status} />
              </td>
              <td className={tdClass}>
                {item.status === "pending" ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approve(item.izinId)}>
                      Setuju
                    </Button>
                    <RejectButton onReject={(reason) => reject(item.izinId, reason)} />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {item.status === "approved"
                      ? `Oleh ${item.approvedBy || "Admin"}`
                      : `Ditolak: ${item.rejectReason || "-"}`}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </AdminShell>
  );
}
