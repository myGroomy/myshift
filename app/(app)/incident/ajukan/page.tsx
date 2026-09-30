"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KaryawanShell } from "@/components/karyawan-shell";
import { useToast } from "@/components/ui/toast";
import { request } from "@/lib/api";
import { controlClass } from "@/lib/ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type Category = {
  id: string;
  label: string;
};

export default function IncidentAjukanPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [kategoriId, setKategoriId] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    request<Category[]>("/api/incident-categories")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!kategoriId || !deskripsi.trim()) return;
    setLoading(true);
    try {
      await request("/api/incidents", {
        method: "POST",
        body: JSON.stringify({
          kategoriId,
          deskripsi: deskripsi.trim(),
          severity,
        }),
      });
      toast("Incident berhasil dilaporkan", "success");
      router.push("/incident");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal membuat incident", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KaryawanShell
      title="Buat Incident Baru"
      lead="Laporkan kejadian abnormal: mesin rusak, komplain, stok habis, dll."
    >
      <div className="mb-6">
        <Link
          href="/incident"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Kembali ke Daftar Incident
        </Link>
      </div>

      <form onSubmit={submit} className="max-w-2xl space-y-5 rounded-lg border border-border bg-card p-6 shadow-sm">
        <div>
          <Label htmlFor="kategori-incident">Kategori Incident</Label>
          <Select
            id="kategori-incident"
            value={kategoriId}
            onChange={(e) => setKategoriId(e.target.value)}
            className={controlClass}
            required
          >
            <option value="">Pilih kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="deskripsi-incident">Deskripsi Kejadian</Label>
          <Input
            id="deskripsi-incident"
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            placeholder="Jelaskan kejadian yang terjadi, minimal 10 karakter"
            required
            minLength={10}
            className={controlClass}
          />
        </div>

        <div>
          <Label>Severity</Label>
          <div className="flex gap-3">
            {(["low", "medium", "high"] as const).map((level) => (
              <label
                key={level}
                className={`flex-1 cursor-pointer rounded-lg border p-3 text-center transition-all ${
                  severity === level
                    ? level === "high"
                      ? "border-red-500 bg-red-50 ring-2 ring-red-200"
                      : level === "medium"
                      ? "border-yellow-500 bg-yellow-50 ring-2 ring-yellow-200"
                      : "border-green-500 bg-green-50 ring-2 ring-green-200"
                    : "border-border hover:bg-accent"
                }`}
              >
                <input
                  type="radio"
                  name="severity"
                  value={level}
                  checked={severity === level}
                  onChange={() => setSeverity(level)}
                  className="sr-only"
                />
                <span
                  className={`text-sm font-semibold ${
                    level === "high"
                      ? "text-red-700"
                      : level === "medium"
                      ? "text-yellow-700"
                      : "text-green-700"
                  }`}
                >
                  {level === "high" ? "High" : level === "medium" ? "Medium" : "Low"}
                </span>
                <p className="mt-1 text-xs text-muted-foreground">
                  {level === "high"
                    ? "Keamanan, kecelakaan"
                    : level === "medium"
                    ? "Mesin rusak, stok habis"
                    : "Minor, komplain kecil"}
                </p>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            size="lg"
            disabled={loading || !kategoriId || deskripsi.trim().length < 10}
            className="h-11"
          >
            {loading ? "Mengirim..." : "Kirim Laporan Incident"}
          </Button>
          <Button asChild variant="outline" size="lg" className="h-11">
            <Link href="/incident">Batal</Link>
          </Button>
        </div>
      </form>
    </KaryawanShell>
  );
}
