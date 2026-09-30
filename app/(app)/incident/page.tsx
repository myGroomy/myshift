"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, tdClass } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonTable } from "@/components/ui/skeleton";
import { AdminShell, StatusBadge } from "@/components/shell";
import { KaryawanShell } from "@/components/karyawan-shell";
import { useToast } from "@/components/ui/toast";
import { request } from "@/lib/api";
import { controlClass } from "@/lib/ui";
import { AlertTriangle, Plus } from "lucide-react";

type Incident = {
  incidentId: string;
  kategoriId: string;
  kategoriLabel: string;
  deskripsi: string;
  severity: "low" | "medium" | "high";
  status: "open" | "resolved";
  createdBy: string;
  createdAt: string;
  resolvedBy?: string;
  resolvedAt?: string;
};

type Session = {
  role: "admin" | "karyawan";
  activeBranchId: string;
  branches: { branchId: string; nama: string }[];
};

const severityColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

const severityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export default function IncidentPage() {
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [kategoriFilter, setKategoriFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    request<Session>("/api/auth/session")
      .then(setSession)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    request<Incident[]>("/api/incidents")
      .then(setItems)
      .catch((e: unknown) => {
        toast(e instanceof Error ? e.message : "Gagal memuat incident", "error");
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [session, toast]);

  const filtered = items.filter((item) => {
    if (kategoriFilter !== "all" && item.kategoriId !== kategoriFilter) return false;
    if (severityFilter !== "all" && item.severity !== severityFilter) return false;
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    return true;
  });

  const Shell = session?.role === "karyawan" ? KaryawanShell : AdminShell;

  return (
    <Shell
      title="Incident / Catatan Operasional"
      lead="Catat kejadian abnormal selama operasi: mesin rusak, komplain, stok habis, dll."
    >
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Label htmlFor="kategori-filter">Kategori</Label>
          <Select
            id="kategori-filter"
            value={kategoriFilter}
            onChange={(e) => setKategoriFilter(e.target.value)}
            className={controlClass}
          >
            <option value="all">Semua Kategori</option>
            {[...new Set(items.map((i) => i.kategoriLabel))].map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-40">
          <Label htmlFor="severity-filter">Severity</Label>
          <Select
            id="severity-filter"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className={controlClass}
          >
            <option value="all">Semua</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </div>

        <div className="w-40">
          <Label htmlFor="status-filter">Status</Label>
          <Select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={controlClass}
          >
            <option value="all">Semua</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </Select>
        </div>

        <div className="ml-auto">
          <Button asChild size="lg" className="h-11">
            <Link href="/incident/ajukan">
              <Plus size={16} />
              Buat Incident
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle size={40} />}
          title="Belum ada incident"
          description="Catat kejadian abnormal pertama: mesin rusak, komplain customer, stok habis, dll."
          actionLabel="Buat Incident"
          actionHref="/incident/ajukan"
        />
      ) : (
        <DataTable columns={["ID", "Kategori", "Deskripsi", "Severity", "Status", "Pelapor", "Tanggal"]}>
          {filtered.map((item) => (
            <tr key={item.incidentId} className="border-t border-border">
              <td className={tdClass}>
                <Link
                  href={`/incident/${item.incidentId}`}
                  className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                >
                  {item.incidentId}
                </Link>
              </td>
              <td className={tdClass}>
                <span className="font-medium">{item.kategoriLabel}</span>
              </td>
              <td className={tdClass}>
                <span className="text-sm line-clamp-2 max-w-md">{item.deskripsi}</span>
              </td>
              <td className={tdClass}>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${severityColors[item.severity]}`}>
                  {severityLabels[item.severity]}
                </span>
              </td>
              <td className={tdClass}>
                <StatusBadge status={item.status === "open" ? "pending" : "active"} />
              </td>
              <td className={tdClass}>
                <span className="text-xs text-muted-foreground">{item.createdBy}</span>
              </td>
              <td className={tdClass}>
                <span className="text-xs text-muted-foreground">{item.createdAt}</span>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </Shell>
  );
}
