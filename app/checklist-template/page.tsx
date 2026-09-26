"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { request } from "@/components/phase1";
import BottomNav from "@/components/bottom-nav";

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

  return (
    <main className="min-h-screen bg-[#faf9fe] pb-20 text-[#000000]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="mb-6 text-2xl font-bold">Kelola Checklist Template</h1>
          <div className="mb-6 rounded-lg border border-[#e5e5e5] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h2 className="mb-4 font-semibold">Tambah Item</h2>
            <div className="grid gap-3">
              <select value={type} onChange={(e) => setType(e.target.value)} className="h-11 w-full rounded-lg border-[#e5e5e5] px-4"><option value="opening">Opening</option><option value="closing">Closing</option></select>
              <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Deskripsi item" className="h-11 w-full rounded-lg border-[#e5e5e5] px-4" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={photo} onChange={(e) => setPhoto(e.target.checked)} />Wajib foto</label>
              <Button onClick={handleAdd} disabled={!desc.trim()} className="h-11 w-full rounded-lg bg-[#0075de] text-white">Tambah</Button>
            </div>
          </div>
          {loading ? <p className="text-[#615d59]">Memuat...</p> : (
            <div className="space-y-3">
              {filtered.map((item) => (
                <motion.div
                  key={item.itemId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center justify-between rounded-lg border border-[#e5e5e5] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                >
                  <div><p className="font-medium">{item.description}</p><p className="text-xs text-[#615d59]">{item.type} · Wajib foto: {item.requiresPhoto ? "Ya" : "Tidak"}</p></div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.itemId)} className="text-[#dc3545]">Hapus</Button>
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
