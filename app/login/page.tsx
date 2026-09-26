"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, pin }),
      });
      const data = (await res.json()) as { success: boolean; error?: { message: string } };
      if (!data.success) { setError(data.error?.message || "Login gagal"); setLoading(false); return; }
      router.push("/");
    } catch { setError("Terjadi kesalahan"); setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-[#faf9fe] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#0075de]">MYSHIFT</h1>
          <p className="mt-2 text-sm text-[#615d59]">Masuk ke manajemen shift</p>
        </div>
        <div className="rounded-lg border border-[#e5e5e5] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {error && <p className="mb-4 text-center text-[#dc3545]">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label htmlFor="username">Username</Label><Input id="username" type="text" placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} required className="h-11 rounded-lg border-[#e5e5e5] px-4" /></div>
            <div><Label htmlFor="pin">PIN</Label><Input id="pin" type="password" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} required className="h-11 rounded-lg border-[#e5e5e5] px-4" /></div>
            <Button type="submit" disabled={loading} className="h-11 w-full rounded-lg bg-[#0075de] text-white">{loading ? "Masuk..." : "Masuk"}</Button>
          </form>
        </div>
        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-[#615d59] hover:text-[#0075de]">Kembali ke beranda</Link>
        </div>
      </div>
    </main>
  );
}
