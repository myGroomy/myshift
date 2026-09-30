import { DomainError } from "@/lib/error-codes";

export const REPORT_TYPES = ["semua", "jadwal", "checklist", "handover", "pengajuan", "incident"] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

function isReportType(value: string): value is ReportType {
  return (REPORT_TYPES as readonly string[]).includes(value);
}

export interface ReportTypeRow {
  type: string;
}

export function parseReportType(value: string | null | undefined): ReportType {
  const reportType = value || "semua";
  if (isReportType(reportType)) return reportType;
  throw new DomainError("VALIDATION_ERROR", "Jenis laporan tidak valid", {
    data: { fields: ["reportType"] },
  });
}

export function filterReportRows<T extends ReportTypeRow>(rows: T[], reportType: ReportType): T[] {
  if (reportType === "semua") return rows;
  if (reportType === "pengajuan") return rows.filter((row) => row.type === "Swap" || row.type === "Izin");
  const labels: Record<Exclude<ReportType, "semua" | "pengajuan">, string> = {
    jadwal: "Jadwal",
    checklist: "Checklist",
    handover: "Handover",
    incident: "Incident",
  };
  return rows.filter((row) => row.type === labels[reportType]);
}
