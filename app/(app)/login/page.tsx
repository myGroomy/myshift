"use client";

import { FormEvent, Suspense, useState } from "react";
import { motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { request } from "@/lib/api";
import { controlClass } from "@/lib/ui";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");

  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await request<{
        role?: "admin" | "kepala_cabang" | "karyawan";
        branches?: { branchId: string; nama: string }[];
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, pin }),
      });

      if (nextParam && nextParam.startsWith("/") && nextParam !== "/login") {
        router.push(nextParam);
        return;
      }

      if (res?.branches && res.branches.length > 1) {
        router.push("/pilih-cabang");
        return;
      }

      if (res?.role === "admin" || res?.role === "kepala_cabang") {
        router.push("/dashboard");
      } else {
        router.push("/jadwal-saya");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal masuk");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="w-full max-w-sm">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0, 1] }}
          className="mb-8 text-center"
        >
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-lg bg-primary text-base font-bold text-primary-foreground shadow-sm">
            MS
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Masuk ke MYSHIFT</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manajemen shift & operasional outlet</p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          onSubmit={submit}
          className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm"
        >
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username karyawan"
              autoComplete="username"
              autoCapitalize="none"
              required
              className={controlClass}
            />
          </div>

          <div>
            <Label htmlFor="pin">PIN (4–8 digit)</Label>
            <div className="relative">
              <Input
                id="pin"
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="PIN angka"
                autoComplete="current-password"
                required
                className={`${controlClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                aria-label={showPin ? "Sembunyikan PIN" : "Tampilkan PIN"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="material-symbols-outlined text-lg">
                  {showPin ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive-wash bg-destructive-wash p-3 text-xs font-medium text-destructive-foreground"
            >
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} size="lg" className="h-11 w-full text-base">
            {loading ? "Memeriksa..." : "Masuk"}
          </Button>
        </motion.form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-foreground hover:underline">
            ← Kembali ke Beranda
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center text-sm text-muted-foreground">
          Memuat...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
