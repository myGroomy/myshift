"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { request } from "@/components/phase1";
import BottomNav from "@/components/bottom-nav";

type ChecklistItem = {
  itemId: string;
  description: string;
  requiresPhoto: boolean;
  checked: boolean;
};

type ChecklistResponse = { items: ChecklistItem[]; completed: number; total: number };

export default function ChecklistPage() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { void load(); }, [id]);

  async function load() {
    try {
      const data = await request<ChecklistResponse>(`/api/schedules/${id}/checklist`);
      setItems(data.items); setCompleted(data.completed); setTotal(data.total);
    } catch {}
  }

  async function handleCheck(itemId: string) {
    try {
      await request(`/api/schedules/${id}/checklist`, { method: "POST", body: JSON.stringify({ itemId }) });
      void load();
    } catch {}
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await request(`/api/schedules/${id}/checklist/submit`, { method: "POST" });
      alert("Checklist tersubmit!");
    } catch (e) { alert(e instanceof Error ? e.message : "Gagal"); }
    finally { setSubmitting(false); }
  }

  const allChecked = items.every((i) => i.checked);

  return (
    <main className="min-h-screen bg-[#faf9fe] pb-20 text-[#000000]">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <nav className="mb-8 flex flex-wrap items-center gap-4 border-b border-[#e5e5e5] pb-4 text-sm font-medium">
          <Link href="/" className="text-[#0075de]">MYSHIFT</Link>
          <Link href="/jadwal-saya" className="text-[#615d59] hover:text-[#0075de]">Jadwal Saya</Link>
          <Link href={`/shift/${id}`} className="text-[#615d59] hover:text-[#0075de]">Detail Shift</Link>
        </nav>
        <h1 className="mb-6 text-2xl font-bold">Checklist Shift</h1>
        <div className="mb-6 rounded-lg border border-[#e5e5e5] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="mb-2 flex justify-between text-sm"><span>Progress</span><span>{completed}/{total}</span></div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-[#f0f1f5]"><div className="h-full rounded-full bg-[#0075de] transition-all" style={{ width: `${total ? (completed / total) * 100 : 0}%` }} /></div>
        </div>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.itemId} className="flex items-center justify-between rounded-lg border border-[#e5e5e5] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-3">
                <label className="flex h-5 w-5 items-center justify-center rounded border border-[#e5e5e5]"><input type="checkbox" checked={item.checked} onChange={() => handleCheck(item.itemId)} className="h-4 w-4" /></label>
                <div><p className={item.checked ? "line-through text-[#615d59]" : ""}>{item.description}</p>{item.requiresPhoto && <p className="text-xs text-[#615d59]">Wajib foto</p>}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleCheck(item.itemId)} className="text-[#0075de]">Check</Button>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Button disabled={!allChecked || submitting} onClick={handleSubmit} className="h-11 rounded-lg bg-[#0075de] text-white">{submitting ? "Mengirim..." : "Submit Checklist"}</Button>
          {!allChecked && <p className="mt-2 text-sm text-[#dc3545]">Centang semua item sebelum submit</p>}
        </div>
        <BottomNav />
      </div>
    </main>
  );
}
