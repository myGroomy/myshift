"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { request } from "@/components/phase1";
import BottomNav from "@/components/bottom-nav";
import { useToast } from "@/components/ui/toast";

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
  const { toast } = useToast();
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
      toast("Handover tersubmit!", "success");
    } catch (e) { toast(e instanceof Error ? e.message : "Gagal", "error"); }
    finally { setSubmitting(false); }
  }

  const allRequiredFilled = data?.fields.every((f) => !f.isRequired || f.value.trim()) ?? false;

  return (
    <main className="min-h-screen bg-[#faf9fe] pb-20 text-[#000000]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="mb-6 text-2xl font-bold">Handover Shift</h1>
          {previous && previous.fields.length > 0 && (
            <div className="mb-6 rounded-lg border border-[#0075de] bg-[#e8f0fe] p-4">
              <h2 className="mb-2 font-semibold">Handover Shift Sebelumnya ({previous.scheduleId})</h2>
              <div className="space-y-2">
                {previous.fields.map((f, i) => <div key={i}><p className="text-sm text-[#615d59]">{f.label}</p><p className="text-sm">{f.value || "-"}</p></div>)}
              </div>
            </div>
          )}
          {!data ? <p className="text-[#615d59]">Memuat...</p> : (
            <div className="space-y-4">
              <div className="mb-2 text-sm text-[#615d59]">{data.filledCount}/{data.total} field terisi</div>
              <div className="space-y-3">
                {data.fields.map((field) => (
                  <motion.div
                    key={field.fieldId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-lg border border-[#e5e5e5] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                  >
                    <label className="mb-2 font-medium">{field.label}{field.isRequired && <span className="ml-1 text-[#dc3545]">*</span>}</label>
                    <textarea value={field.value} onChange={(e) => handleChange(field.fieldId, e.target.value)} placeholder={field.isRequired ? "Field wajib..." : "Opsional..."} className="w-full rounded-lg border-[#e5e5e5] px-4 py-2 text-sm" rows={3} />
                  </motion.div>
                ))}
              </div>
              <Button disabled={!allRequiredFilled || submitting} onClick={handleSubmit} className="h-11 rounded-lg bg-[#0075de] text-white">{submitting ? "Mengirim..." : "Submit Handover"}</Button>
              {!allRequiredFilled && <p className="mt-2 text-sm text-[#dc3545]">Isi semua field wajib sebelum submit</p>}
            </div>
          )}
        </motion.div>
        <BottomNav />
      </div>
    </main>
  );
}
