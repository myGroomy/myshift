"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AdminShell, StatusBadge } from "@/components/shell";
import { KaryawanShell } from "@/components/karyawan-shell";
import { useToast } from "@/components/ui/toast";
import { request } from "@/lib/api";
import { ArrowLeft, CheckCircle, Clock, User } from "lucide-react";

type IncidentDetail = {
  incidentId: string;
  kategoriId: string;
  kategoriLabel: string;
  deskripsi: string;
  severity: "low" | "medium" | "high";
  status: "open" | "resolved";
  fotoUrl?: string;
  createdBy: string;
  createdAt: string;
  resolvedBy?: string;
  resolvedAt?: string;
};

type Session = {
  role: "admin" | "karyawan";
  employeeId: string;
  activeBranchId: string;
};

const severityColors = {
  low: "bg-green-100 text-green-800 border-green-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-red-100 text-red-800 border-red-200",
};

const severityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export default function IncidentDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    request<Session>("/api/auth/session")
      .then(setSession)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    request<IncidentDetail>(`/api/incidents/${params.id}`)
      .then(setIncident)
      .catch(() => setIncident(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleResolve() {
    if (!incident) return;
    if (!confirm("Tandai incident ini sebagai resolved?")) return;
    setResolving(true);
    try {
      await request(`/api/incidents/${incident.incidentId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "resolved" }),
      });
      toast("Incident berhasil di-resolve", "success");
      setIncident({ ...incident, status: "resolved" });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal resolve incident", "error");
    } finally {
      setResolving(false);
    }
  }

  const Shell = session?.role === "karyawan" ? KaryawanShell : AdminShell;

  if (loading) {
    return (
      <Shell title="Detail Incident" lead="Memuat detail incident...">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-3/4 bg-muted rounded" />
        </div>
      </Shell>
    );
  }

  if (!incident) {
    return (
      <Shell title="Detail Incident" lead="Incident tidak ditemukan">
        <Link
          href="/incident"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Kembali ke Daftar Incident
        </Link>
      </Shell>
    );
  }

  return (
    <Shell title={`Incident ${incident.incidentId}`} lead="Detail kejadian dan status penanganan.">
      <div className="mb-6">
        <Link
          href="/incident"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Kembali ke Daftar Incident
        </Link>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Header Card */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-mono text-muted-foreground">{incident.incidentId}</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">{incident.kategoriLabel}</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${severityColors[incident.severity]}`}>
                {severityLabels[incident.severity]}
              </span>
              <StatusBadge status={incident.status === "open" ? "pending" : "active"} />
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm text-foreground leading-relaxed">{incident.deskripsi}</p>
          </div>

          {incident.fotoUrl && (
            <div className="mt-4">
              <a
                href={incident.fotoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Lihat foto bukti
              </a>
            </div>
          )}
        </div>

        {/* Meta Info */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Informasi</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                <User size={16} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pelapor</p>
                <p className="text-sm font-medium text-foreground">{incident.createdBy}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                <Clock size={16} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Waktu Kejadian</p>
                <p className="text-sm font-medium text-foreground">{incident.createdAt}</p>
              </div>
            </div>
            {incident.resolvedBy && (
              <>
                <div className="flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-full bg-green-100 text-green-700">
                    <CheckCircle size={16} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Resolved Oleh</p>
                    <p className="text-sm font-medium text-foreground">{incident.resolvedBy}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-full bg-green-100 text-green-700">
                    <CheckCircle size={16} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Waktu Resolve</p>
                    <p className="text-sm font-medium text-foreground">{incident.resolvedAt}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Resolve Action (Admin only) */}
        {session?.role === "admin" && incident.status === "open" && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-6">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Tindakan Admin</h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Tandai incident ini sebagai resolved setelah ditangani.
            </p>
            <Button
              onClick={handleResolve}
              disabled={resolving}
              size="lg"
              className="h-11"
            >
              <CheckCircle size={16} />
              {resolving ? "Memproses..." : "Tandai Resolved"}
            </Button>
          </div>
        )}
      </div>
    </Shell>
  );
}
