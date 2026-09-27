"use client";

import { FormEvent, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { request } from "@/components/phase1";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await request<{ role?: string }>("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, pin }) });
      window.location.href = res?.role === "admin" ? "/dashboard" : "/jadwal-saya";
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal"); }
    finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-[#faf9fe]">
      <div className="mx-auto max-w-md px-4 py-24">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <h1 className="mb-2 text-4xl font-bold text-[#0075de]">MYSHIFT</h1>
          <p className="mb-8 text-sm text-[#615d59]">Masuk ke manajemen shift</p>
        </motion.div>
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          onSubmit={submit}
          className="space-y-4 rounded-lg border border-[#e5e5e5] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
        >
          <div>
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" required className="h-11 rounded-lg border-[#e5e5e5] px-4" />
          </div>
          <div>
            <Label htmlFor="pin">PIN</Label>
            <div className="relative">
              <Input id="pin" type={showPin ? "text" : "password"} value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" required className="h-11 rounded-lg border-[#e5e5e5] px-4 pr-11" />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                aria-label={showPin ? "Sembunyikan PIN" : "Tampilkan PIN"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#615d59] hover:text-[#0075de]"
              >
                <span className="material-symbols-outlined text-lg">{showPin ? "visibility_off" : "visibility"}</span>
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-[#dc3545]">{error}</p>}
          <Button type="submit" disabled={loading} className="h-11 w-full rounded-lg bg-[#0075de] text-white">
            {loading ? "Masuk..." : "Masuk"}
          </Button>
        </motion.form>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-4 text-center"
        >
          <Link href="/" className="text-sm text-[#0075de] hover:underline">Kembali ke beranda</Link>
        </motion.div>
      </div>
    </main>
  );
}
