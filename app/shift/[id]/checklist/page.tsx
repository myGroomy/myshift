"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { request } from "@/components/phase1";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";

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

  async function handleCheck(itemId: string, photoUrl?: string) {
    try {
      await request(`/api/schedules/${id}/checklist`, { method: "POST", body: JSON.stringify({ itemId, photoUrl }) });
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

  return <main className="min-h-screen bg-background px-6 py-8 text-foreground"><div className="mx-auto max-w-4xl"><nav className="mb-10 flex flex-wrap items-center gap-4 border-b border-border pb-4 text-sm"><a href="/">MYSHIFT</a><a href="/jadwal-saya">Jadwal Saya</a><a href={`/shift/${id}`}>Detail Shift</a></nav><h1 className="mb-6 text-3xl font-bold">Checklist Shift</h1><div className="mb-6 rounded-lg border border-border p-4"><div className="mb-2 flex justify-between text-sm"><span>Progress</span><span>{completed}/{total}</span></div><div className="h-3 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${total ? (completed / total) * 100 : 0}%` }} /></div></div>{items.map((item) => <Card key={item.itemId} className="mb-3"><CardContent className="flex items-center justify-between p-4"><div className="flex items-center gap-3"><label className="flex h-5 w-5 items-center justify-center rounded border border-input"><input type="checkbox" checked={item.checked} onChange={() => handleCheck(item.itemId)} className="h-4 w-4" /></label><div><p className={item.checked ? "line-through text-muted-foreground" : ""}>{item.description}</p>{item.requiresPhoto && <p className="text-xs text-muted-foreground"><Camera className="mr-1 inline h-3 w-3" />Wajib foto</p>}</div></div><Button variant="ghost" size="icon" onClick={() => handleCheck(item.itemId, "placeholder_photo_url")}><Camera className="h-4 w-4" /></Button></CardContent></Card>)}<div className="mt-6"><Button disabled={!allChecked || submitting} onClick={handleSubmit}>{submitting ? "Mengirim..." : "Submit Checklist"}</Button>{!allChecked && <p className="mt-2 text-sm text-destructive">Centang semua item sebelum submit</p>}</div></div></main>;
}
