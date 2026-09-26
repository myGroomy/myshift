"use client";
import { useEffect, useState } from "react";
import { request } from "@/components/phase1";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

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

  return <main className="min-h-screen bg-background px-6 py-8 text-foreground"><div className="mx-auto max-w-4xl"><nav className="mb-10 flex flex-wrap items-center gap-4 border-b border-border pb-4 text-sm"><a href="/">MYSHIFT</a><a href="/jadwal">Jadwal</a><a href="/jadwal-saya">Jadwal Saya</a><a href="/cabang">Cabang</a></nav><h1 className="mb-6 text-3xl font-bold">Kelola Handover Template</h1><div className="mb-6 space-y-4 rounded-lg border border-border p-4"><h2 className="text-lg font-semibold">Tambah Field</h2><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label field" className="w-full rounded border border-input bg-background px-3 py-2 text-sm" /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />Field wajib</label><Button onClick={handleAdd} disabled={!label.trim()}><Plus className="mr-2 h-4 w-4" />Tambah</Button></div>{loading ? <p>Memuat...</p> : <div className="space-y-3">{fields.map((field) => <Card key={field.fieldId}><CardContent className="flex items-center justify-between p-4"><div><p className="font-medium">{field.label}</p><p className="text-xs text-muted-foreground">Wajib: {field.isRequired ? "Ya" : "Tidak"}</p></div><Button variant="ghost" size="icon" onClick={() => handleDelete(field.fieldId)}><Trash2 className="h-4 w-4" /></Button></CardContent></Card>)}</div>}</div></main>;
}
