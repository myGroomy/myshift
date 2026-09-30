import { CheckCircle2, CircleAlert, Clock3 } from "lucide-react";

export type ShiftReport = {
  scheduleId: string;
  branchId: string;
  branchName: string;
  date: string;
  shiftName: string;
  employeeName: string;
  status: string;
  startedAt: string;
  reportGeneratedAt: string;
  reportToken: string;
  checklist: {
    items: {
      pointId: string;
      categoryId: string;
      categoryName: string;
      description: string;
      completionType: string;
      value: string;
      photoUrl: string;
      checked: boolean;
      warning: boolean;
      checkedBy: string;
      checkedAt: string;
    }[];
    completed: number;
    total: number;
    complete: boolean;
  };
  handover: {
    fields: { fieldId: string; label: string; isRequired: boolean; value: string; createdBy: string; createdAt: string }[];
    complete: boolean;
  };
  auditHistory: {
    auditId: string;
    section: string;
    recordLabel: string;
    field: string;
    oldValue: string;
    newValue: string;
    actorName: string;
    changedAt: string;
  }[];
};

export function ShiftReportView({ report }: { report: ShiftReport }) {
  const groups = [...new Set(report.checklist.items.map((item) => item.categoryId))].map((categoryId) => ({
    categoryId,
    name: report.checklist.items.find((item) => item.categoryId === categoryId)?.categoryName ?? "SOP",
    items: report.checklist.items.filter((item) => item.categoryId === categoryId),
  }));
  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
        <h1 className="text-xl font-bold text-foreground">Laporan Shift</h1>
        <p className="mt-1 text-sm text-muted-foreground">{report.branchName} · {report.shiftName} · {report.date}</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Karyawan</dt><dd className="font-medium">{report.employeeName}</dd></div>
          <div><dt className="text-muted-foreground">ID Jadwal</dt><dd className="font-medium">{report.scheduleId}</dd></div>
          <div><dt className="text-muted-foreground">Status shift</dt><dd className="font-medium">{report.status}</dd></div>
          <div><dt className="text-muted-foreground">Laporan digenerate</dt><dd className="font-medium">{report.reportGeneratedAt ? new Date(report.reportGeneratedAt).toLocaleString("id-ID") : "Preview"}</dd></div>
        </dl>
      </section>
      <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Checklist</h2>
          <span className="text-sm font-medium">{report.checklist.completed}/{report.checklist.total} selesai</span>
        </div>
        <div className="mt-4 space-y-4">
          {groups.map((group) => <div key={group.categoryId}>
            <h3 className="mb-2 text-sm font-semibold">{group.name}</h3>
            <div className="space-y-2">
              {group.items.map((item) => (
                <div key={item.pointId} className="flex items-start gap-2 rounded-md bg-muted/40 p-3 text-sm">
                  {item.checked ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" /> : <CircleAlert size={16} className="mt-0.5 shrink-0 text-warning" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.description}</p>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                      {item.completionType === "centang" || item.completionType === "centang_foto"
                        ? item.value === "TRUE" ? "Selesai" : "Belum selesai"
                        : item.value || "(belum diisi)"}
                      {item.completionType === "centang_foto" && item.photoUrl ? " · Foto terlampir" : ""}
                    </p>
                    {item.warning && <p className="mt-1 text-xs text-warning">Nilai berada di luar batas yang disarankan.</p>}
                    {item.checkedBy && <p className="mt-1 text-xs text-muted-foreground">Diisi oleh {item.checkedBy}{item.checkedAt ? ` · ${new Date(item.checkedAt).toLocaleString("id-ID")}` : ""}</p>}
                    {item.photoUrl && <a href={item.photoUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-primary underline">Lihat foto</a>}
                  </div>
                </div>
              ))}
              {group.items.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada point.</p>}
            </div>
          </div>)}
          {report.checklist.total === 0 && <p className="text-sm text-muted-foreground">Tidak ada checklist point yang berlaku untuk shift ini.</p>}
        </div>
      </section>
      <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-semibold">Handover</h2>
        <div className="mt-3 space-y-3">
          {report.handover.fields.map((field) => (
            <div key={field.fieldId} className="border-b border-border pb-3 last:border-0 last:pb-0">
              <p className="text-xs font-semibold text-muted-foreground">{field.label}{field.isRequired ? " · Wajib" : ""}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{field.value || "(kosong)"}</p>
              {field.createdBy && <p className="mt-1 text-xs text-muted-foreground">Diisi oleh {field.createdBy}</p>}
            </div>
          ))}
          {report.handover.fields.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada field handover.</p>}
        </div>
      </section>
      <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold"><Clock3 size={16} />Riwayat Perubahan</h2>
        <div className="mt-3 space-y-3">
          {report.auditHistory.map((entry) => (
            <div key={entry.auditId} className="border-l-2 border-border pl-3 text-sm">
              <p className="font-medium">{entry.recordLabel} · {entry.field}</p>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">“{entry.oldValue || "(kosong)"}” → “{entry.newValue || "(kosong)"}”</p>
              <p className="mt-1 text-xs text-muted-foreground">{entry.actorName} · {new Date(entry.changedAt).toLocaleString("id-ID")}</p>
            </div>
          ))}
          {report.auditHistory.length === 0 && <p className="text-sm text-muted-foreground">Belum ada perubahan setelah laporan dibuat.</p>}
        </div>
      </section>
    </div>
  );
}
