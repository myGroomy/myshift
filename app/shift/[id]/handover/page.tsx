"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { request } from "@/components/phase1";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

type HandoverField = {
  fieldId: string;
  label: string;
  isRequired: boolean;
  value: string;
};

type HandoverResponse = { fields: HandoverField[]; filledCount: number; total: number; completed: boolean };
type PreviousHandover = { scheduleId: string; fields: { label: string; value: string }[] } | null;

export default function HandoverPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<HandoverResponse | null>(null);
  const [previous, setPrevious] = useState<PreviousHandover>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { void load(); }, [id]);

  async function load() {
    try {
      const d = await request<HandoverResponse>(`/api/schedules/${id}/handover`);
      setData(d);
      const p = await request<PreviousHandover>(`/api/schedules/${id}/handover/previous`);
      setPrevious(p);
    } catch {}
  }

  async function handleChange(fieldId: string, value: string) {
    setData((prev) => prev ? { ...prev, fields: prev.fields.map((f) => f.fieldId === fieldId ? { ...f, value } : f) } : null);
  }

  async function handleSubmit() {
    if (!data) return;
    setSubmitting(true);
    try {
      await request(`/api/schedules/${id}/handover`, { method: "POST", body: JSON.stringify({ fields: data.fields }) });
      alert("Handover tersubmit!");
    } catch (e) { alert(e instanceof Error ? e.message : "Gagal"); }
    finally { setSubmitting(false); }
  }

  const allRequiredFilled = data?.fields.every((f) => !f.isRequired || f.value.trim()) ?? false;

  return <main className="min-h-screen bg-background px-6 py-8 text-foreground"><div className="mx-auto max-w-4xl"><nav className="mb-10 flex flex-wrap items-center gap-4 border-b border-border pb-4 text-sm"><a href="/">MYSHIFT</a><a href="/jadwal-saya">Jadwal Saya</a><a href={`/shift/${id}`}>Detail Shift</a></nav><h1 className="mb-6 text-3xl font-bold">Handover Shift</h1>{previous && previous.fields.length > 0 && <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4"><h2 className="mb-2 font-semibold">Handover Shift Sebelumnya ({previous.scheduleId})</h2><div className="space-y-2">{previous.fields.map((f, i) => <div key={i}><p className="text-sm text-muted-foreground">{f.label}</p><p className="text-sm">{f.value || "-"}</p></div>)}</div></div>}{!data ? <p>Memuat...</p> : <div className="space-y-4"><div className="mb-2 text-sm text-muted-foreground">{data.filledCount}/{data.total} field terisi</div>{data.fields.map((field) => <div key={field.fieldId} className="rounded-lg border border-border p-4"><div className="mb-2"><label className="font-medium">{field.label}{field.isRequired && <span className="ml-1 text-destructive">*</span>}</label></div><textarea value={field.value} onChange={(e) => handleChange(field.fieldId, e.target.value)} placeholder={field.isRequired ? "Field wajib..." : "Opsional..."} className="w-full rounded border border-input bg-background px-3 py-2 text-sm" rows={3} /></div>)}<Button disabled={!allRequiredFilled || submitting} onClick={handleSubmit} className="mt-4"><Send className="mr-2 h-4 w-4" />{submitting ? "Mengirim..." : "Submit Handover"}</Button>{!allRequiredFilled && <p className="mt-2 text-sm text-destructive">Isi semua field wajib sebelum submit</p>}</div>}</div></main>;
}
