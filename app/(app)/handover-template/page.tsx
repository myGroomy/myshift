"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { request } from "@/components/phase1";
import BottomNav from "@/components/bottom-nav";

type HandoverField = {
  fieldId: string;
  label: string;
  isRequired: boolean;
  order: number;
};

export default function HandoverTemplatePage() {
  const [fields, setFields] = useState<HandoverField[]>([]);
  const [label, setLabel] = useState("");
  const [required, setRequired] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); }, []);

  async function load() {
    try {
      const data = await request<HandoverField[]>("/api/handover-templates");
      setFields(data);
    } catch {}
    finally { setLoading(false); }
  }

  async function handleAdd() {
    if (!label.trim()) return;
    try {
      await request("/api/handover-templates", { method: "POST", body: JSON.stringify({ label, isRequired: required }) });
      setLabel(""); void load();
    } catch {}
  }

  async function handleDelete(fieldId: string) {
    try {
      await fetch(`/api/handover-templates/${fieldId}`, { method: "DELETE" });
      void load();
    } catch {}
  }

  return (
    <main className="min-h-screen bg-[#faf9fe] pb-20 text-[#000000]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="mb-6 text-2xl font-bold">Kelola Handover Template</h1>
          <div className="mb-6 rounded-lg border border-[#e5e5e5] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h2 className="mb-4 font-semibold">Tambah Field</h2>
            <div className="grid gap-3">
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label field" className="h-11 w-full rounded-lg border-[#e5e5e5] px-4" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />Field wajib</label>
              <Button onClick={handleAdd} disabled={!label.trim()} className="h-11 w-full rounded-lg bg-[#0075de] text-white">Tambah</Button>
            </div>
          </div>
          {loading ? <p className="text-[#615d59]">Memuat...</p> : (
            <div className="space-y-3">
              {fields.map((field) => (
                <motion.div
                  key={field.fieldId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center justify-between rounded-lg border border-[#e5e5e5] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                >
                  <div><p className="font-medium">{field.label}</p><p className="text-xs text-[#615d59]">Wajib: {field.isRequired ? "Ya" : "Tidak"}</p></div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(field.fieldId)} className="text-[#dc3545]">Hapus</Button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
        <BottomNav />
      </div>
    </main>
  );
}
