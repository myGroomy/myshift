"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, tdClass } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonTable } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { AdminShell, RejectButton, StatusBadge } from "@/components/shell";
import { request } from "@/lib/api";
import type { Branch, Izin, Swap } from "@/lib/types";
import { controlClass } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { FilterPanel } from "@/components/ui/filter-panel";
import type { EmployeeRole } from "@/lib/domain/employee-role";

type Session = {
  employeeId: string;
  nama: string;
  role: EmployeeRole;
  activeBranchId: string;
  branches: Branch[];
};

type UnifiedApprovalItem =
  | {
      type: "swap";
      id: string;
      scheduleId: string;
      applicant: string;
      target: string;
      reason: string;
      status: string;
      approvedBy?: string;
      rejectReason?: string;
    }
  | {
      type: "izin";
      id: string;
      scheduleId: string;
      applicant: string;
      target: string;
      reason: string;
      status: string;
      approvedBy?: string;
      rejectReason?: string;
    };

function UnifiedApprovalContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialType = (searchParams.get("tab") as "all" | "swap" | "izin") || "all";

  const [typeTab, setTypeTab] = useState<"all" | "swap" | "izin">(initialType);
  const [session, setSession] = useState<Session | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [izins, setIzins] = useState<Izin[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [batchApproving, setBatchApproving] = useState(false);

  useEffect(() => {
    Promise.all([
      request<Session>("/api/auth/session"),
      request<Branch[]>("/api/branches").catch(() => []),
    ])
      .then(([s, bList]) => {
        setSession(s);
        setBranches(bList);
        const initialBranch = s.activeBranchId || bList[0]?.branchId || s.branches[0]?.branchId || "";
        setBranchId(initialBranch);
        if (initialBranch) void loadData(initialBranch, statusFilter);
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Gagal memuat sesi");
        setLoading(false);
      });
  }, []);

  function loadData(targetBranch: string, targetStatus: string) {
    if (!targetBranch) return;
    setLoading(true);
    setLoadError(null);

    const swapParams = new URLSearchParams({ branchId: targetBranch });
    if (targetStatus !== "all") swapParams.set("status", targetStatus);

    const izinParams = new URLSearchParams({ branchId: targetBranch });
    if (targetStatus !== "all") izinParams.set("status", targetStatus);

    Promise.all([
      request<Swap[]>(`/api/swaps?${swapParams}`).catch(() => []),
      request<Izin[]>(`/api/izin?${izinParams}`).catch(() => []),
    ])
      .then(([swapList, izinList]) => {
        setSwaps(swapList);
        setIzins(izinList);
      })
      .catch((e: unknown) => {
        const m = e instanceof Error ? e.message : "Gagal memuat permohonan";
        setLoadError(m);
        toast(m, "error");
      })
      .finally(() => setLoading(false));
  }

  function handleBranchChange(b: string) {
    setBranchId(b);
    loadData(b, statusFilter);
  }

  function handleStatusChange(s: string) {
    setStatusFilter(s);
    loadData(branchId, s);
  }

  async function approveSwap(swapId: string) {
    setProcessingId(swapId);
    try {
      await request(`/api/swaps/${swapId}/approve?branchId=${branchId}`, { method: "POST" });
      toast("Permohonan Swap disetujui", "success");
      loadData(branchId, statusFilter);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menyetujui Swap", "error");
    } finally {
      setProcessingId(null);
    }
  }

  async function rejectSwap(swapId: string, reason: string) {
    setProcessingId(swapId);
    try {
      await request(`/api/swaps/${swapId}/reject?branchId=${branchId}`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      toast("Permohonan Swap ditolak", "success");
      loadData(branchId, statusFilter);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menolak Swap", "error");
    } finally {
      setProcessingId(null);
    }
  }

  async function approveIzin(izinId: string) {
    setProcessingId(izinId);
    try {
      await request(`/api/izin/${izinId}/approve?branchId=${branchId}`, { method: "POST" });
      toast("Permohonan Izin disetujui", "success");
      loadData(branchId, statusFilter);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menyetujui Izin", "error");
    } finally {
      setProcessingId(null);
    }
  }

  async function rejectIzin(izinId: string, reason: string) {
    setProcessingId(izinId);
    try {
      await request(`/api/izin/${izinId}/reject?branchId=${branchId}`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      toast("Permohonan Izin ditolak", "success");
      loadData(branchId, statusFilter);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menolak Izin", "error");
    } finally {
      setProcessingId(null);
    }
  }

  async function approveAllPending(itemsToApprove: UnifiedApprovalItem[]) {
    const pendings = itemsToApprove.filter((item) => item.status === "pending");
    if (pendings.length === 0) return;
    if (!confirm(`Setujui sekaligus ${pendings.length} permohonan yang berstatus pending?`)) return;

    setBatchApproving(true);
    let successCount = 0;
    try {
      for (const item of pendings) {
        if (item.type === "swap") {
          await request(`/api/swaps/${item.id}/approve?branchId=${branchId}`, { method: "POST" });
        } else {
          await request(`/api/izin/${item.id}/approve?branchId=${branchId}`, { method: "POST" });
        }
        successCount++;
      }
      toast(`Berhasil menyetujui ${successCount} permohonan!`, "success");
      loadData(branchId, statusFilter);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menyelesaikan sebagian persetujuan", "error");
      loadData(branchId, statusFilter);
    } finally {
      setBatchApproving(false);
    }
  }

  // Combine items into unified projection
  const unifiedItems: UnifiedApprovalItem[] = [];

  if (typeTab === "all" || typeTab === "swap") {
    swaps.forEach((s) => {
      unifiedItems.push({
        type: "swap",
        id: s.swapId,
        scheduleId: s.scheduleId,
        applicant: s.requestedBy,
        target: `Tukar: ${s.requestedWith}`,
        reason: s.reason,
        status: s.status,
        approvedBy: s.approvedBy,
        rejectReason: s.rejectReason,
      });
    });
  }

  if (typeTab === "all" || typeTab === "izin") {
    izins.forEach((i) => {
      unifiedItems.push({
        type: "izin",
        id: i.izinId,
        scheduleId: i.scheduleId,
        applicant: i.employeeId,
        target: `Kategori: ${i.categoryId}`,
        reason: i.note,
        status: i.status,
        approvedBy: i.approvedBy,
        rejectReason: i.rejectReason,
      });
    });
  }

  const pendingSwapCount = swaps.filter((s) => s.status === "pending").length;
  const pendingIzinCount = izins.filter((i) => i.status === "pending").length;

  const filteredItems = unifiedItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.id.toLowerCase().includes(q) ||
      item.scheduleId.toLowerCase().includes(q) ||
      item.applicant.toLowerCase().includes(q) ||
      item.target.toLowerCase().includes(q) ||
      item.reason.toLowerCase().includes(q)
    );
  });

  const pendingCount = unifiedItems.filter((i) => i.status === "pending").length;

  return (
    <AdminShell
      title="Unified Approval Hub"
      lead="Pusat persetujuan permohonan Tukar Shift (Swap) dan Izin Tidak Masuk dalam satu pintu."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {pendingCount > 0 && (
            <Button
              size="sm"
              onClick={() => approveAllPending(unifiedItems)}
              disabled={batchApproving}
              loading={batchApproving}
            >
              Setujui Semua Pending ({pendingCount})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(branchId, statusFilter)}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      }
    >
      {/* Top Filter Controls */}
      <FilterPanel
        label="Filter permohonan approval"
        contentClassName="lg:grid-cols-[minmax(0,1fr)_minmax(16rem,auto)]"
      >
        <div className="min-w-0">
          {/* Segmented Type Control */}
          <div role="group" aria-label="Jenis permohonan" className="flex min-w-0 overflow-x-auto rounded-lg border border-border bg-muted/50 p-1">
            <button
              type="button"
              aria-pressed={typeTab === "all"}
              onClick={() => setTypeTab("all")}
              className={cn(
                "flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
                typeTab === "all"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>Semua</span>
              <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                {pendingSwapCount + pendingIzinCount}
              </span>
            </button>

            <button
              type="button"
              aria-pressed={typeTab === "swap"}
              onClick={() => setTypeTab("swap")}
              className={cn(
                "flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
                typeTab === "swap"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>Swap Shift</span>
              <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                {pendingSwapCount}
              </span>
            </button>

            <button
              type="button"
              aria-pressed={typeTab === "izin"}
              onClick={() => setTypeTab("izin")}
              className={cn(
                "flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
                typeTab === "izin"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>Izin Tidak Masuk</span>
              <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                {pendingIzinCount}
              </span>
            </button>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 lg:min-w-[26rem] lg:grid-cols-2">
            {session?.role === "admin" && (
              <div className="min-w-0">
                <Label htmlFor="branch-filter" className="sr-only">Cabang</Label>
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
              <Label htmlFor="status-filter" className="sr-only">Status</Label>
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
        </div>

        <div className="w-full lg:col-span-2 pt-2">
          <Input
            placeholder="Cari ID tiket, jadwal, nama pemohon, rekan, atau alasan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={controlClass}
          />
        </div>
      </FilterPanel>

      {loading ? (
        <SkeletonTable rows={4} />
      ) : loadError ? (
        <div className="rounded-lg border border-destructive-wash bg-destructive-wash p-6 text-center">
          <p className="text-sm text-destructive-foreground">{loadError}</p>
          <Button variant="outline" size="sm" onClick={() => loadData(branchId, statusFilter)} className="mt-3">
            Coba Lagi
          </Button>
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon="check_circle"
          title={searchQuery ? "Tidak ditemukan permohonan" : "Tidak Ada Permohonan"}
          description={
            searchQuery
              ? `Tidak ada tiket yang cocok dengan "${searchQuery}". Coba kata kunci lain.`
              : statusFilter === "pending"
              ? "Semua permohonan swap dan izin sudah selesai ditinjau. Tidak ada antrean pending."
              : `Tidak ada permohonan dengan status ${statusFilter}.`
          }
        />
      ) : (
        <DataTable columns={["Tipe", "ID", "Jadwal", "Pemohon", "Detail / Rekan", "Alasan / Keterangan", "Status", "Aksi"]}>
          {filteredItems.map((item) => (
            <tr key={`${item.type}-${item.id}`} className="border-t border-border">
              <td className={tdClass}>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    item.type === "swap"
                      ? "bg-primary/10 text-primary"
                      : "bg-warning-wash text-warning"
                  )}
                >
                  {item.type === "swap" ? "SWAP" : "IZIN"}
                </span>
              </td>
              <td className={tdClass}>
                <span className="font-mono text-xs">{item.id}</span>
              </td>
              <td className={tdClass}>
                <span className="font-mono text-xs">{item.scheduleId}</span>
              </td>
              <td className={tdClass}>{item.applicant}</td>
              <td className={tdClass}>{item.target}</td>
              <td className={tdClass}>{item.reason}</td>
              <td className={tdClass}>
                <StatusBadge status={item.status} />
              </td>
              <td className={tdClass}>
                {item.status === "pending" ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      loading={processingId === item.id}
                      onClick={() => (item.type === "swap" ? approveSwap(item.id) : approveIzin(item.id))}
                    >
                      Setuju
                    </Button>
                    <RejectButton
                      onReject={(reason) =>
                        item.type === "swap" ? rejectSwap(item.id, reason) : rejectIzin(item.id, reason)
                      }
                    />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {item.status === "approved"
                      ? `Disetujui (${item.approvedBy || "Admin"})`
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

export default function UnifiedApprovalPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={4} />}>
      <UnifiedApprovalContent />
    </Suspense>
  );
}
