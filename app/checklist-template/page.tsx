"use client";
import { useEffect, useState } from "react";
import { request } from "@/components/phase1";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

type ChecklistItem = {
  itemId: string;
  type: string;
  description: string;
  requiresPhoto: boolean;
  order: number;
  active: boolean;
};

export default function ChecklistTemplatePage() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [type, setType] = useState("opening");
  const [desc, setDesc] = useState("");
  const [photo, setPhoto] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); }, []);

  async function load() {
    try {
      const data = await request<ChecklistItem[]>("/api/checklist-templates");
      setItems(data);
    } catch {}
    finally { setLoading(false); }
  }

  async function handleAdd() {
    if (!desc.trim()) return;
    try {
      await request("/api/checklist-templates", { method: "POST", body: JSON.stringify({ type, description: desc, requiresPhoto: photo }) });
      setDesc(""); void load();
    } catch {}
  }

  async function handleDelete(itemId: string) {
    try {
      await fetch(`/api/checklist-templates/${itemId}`, { method: "DELETE" });
      void load();
    } catch {}
  }

  const filtered = items.filter((i) => i.type === type);

  return <main className="min-h-screen bg-background px-6 py-8 text-foreground"><div className="mx-auto max-w-4xl"><nav className="mb-10 flex flex-wrap items-center gap-4 border-b border-border pb-4 text-sm"><a href="/">MYSHIFT</a><a href="/jadwal">Jadwal</a><a href="/jadwal-saya">Jadwal Saya</a><a href="/cabang">Cabang</a><a href="/kategori-izin">Kategori Izin</a></nav><h1 className="mb-6 text-3xl font-bold">Kelola Checklist Template</h1><div className="mb-6 space-y-4 rounded-lg border border-border p-4"><h2 className="text-lg font-semibold">Tambah Item</h2><select value={type} onChange={(e) => setType(e.target.value)} className="rounded border border-input bg-background px-3 py-2 text-sm"><option value="opening">Opening</option><option value="closing">Closing</option></select><input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Deskripsi item" className="w-full rounded border border-input bg-background px-3 py-2 text-sm" /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={photo} onChange={(e) => setPhoto(e.target.checked)} />Wajib foto</label><Button onClick={handleAdd} disabled={!desc.trim()}><Plus className="mr-2 h-4 w-4" />Tambah</Button></div>{loading ? <p>Memuat...</p> : <div className="space-y-3">{filtered.map((item) => <Card key={item.itemId}><CardContent className="flex items-center justify-between p-4"><div><p className="font-medium">{item.description}</p><p className="text-xs text-muted-foreground">{item.type} · Wajib foto: {item.requiresPhoto ? "Ya" : "Tidak"}</p></div><Button variant="ghost" size="icon" onClick={() => handleDelete(item.itemId)}><Trash2 className="h-4 w-4" /></Button></CardContent></Card>)}</div>}</div></main>;
}
