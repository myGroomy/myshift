"use client";

import { FormEvent, Suspense, useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { request } from "@/lib/api";
import type { EmployeeRole } from "@/lib/domain/employee-role";
import { controlClass } from "@/lib/ui";
import { Eye, EyeOff } from "lucide-react";

function PinInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [showPin, setShowPin] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, char: string) => {
    if (!/^\d*$/.test(char)) return;
    const newVal = value.slice(0, index) + char + value.slice(index + 1);
    onChange(newVal);
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      onChange(pasted);
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  return (
    <div>
      <div className="flex justify-center gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type={showPin ? "text" : "password"}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={value[i] || ""}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className="w-12 h-14 text-center text-xl font-mono font-semibold border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all"
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => setShowPin(!showPin)}
        className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
      >
        {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
        {showPin ? "Sembunyikan" : "Tampilkan"} PIN
      </button>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");

  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pin.length !== 6) {
      setError("PIN harus 6 digit angka.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await request<{
        role?: EmployeeRole;
        branches?: { branchId: string; nama: string }[];
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, pin }),
      });

      if (nextParam && nextParam.startsWith("/") && nextParam !== "/login") {
        router.push(nextParam);
        return;
      }

      if (res?.role === "admin" && res.branches && res.branches.length > 1) {
        router.push("/pilih-cabang");
        return;
      }

      if (res?.role === "admin") {
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
          className="space-y-5 rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6"
        >
          <div>
            <Label htmlFor="username">Username</Label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username petugas"
              autoComplete="username"
              autoCapitalize="none"
              required
              className={`${controlClass} h-11 w-full rounded-md border border-input bg-background px-3 text-sm`}
            />
          </div>

          <div>
            <Label>PIN (6 digit)</Label>
            <PinInput value={pin} onChange={setPin} />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive-wash bg-destructive-wash p-3 text-xs font-medium text-destructive-foreground"
            >
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading || pin.length !== 6} size="lg" className="h-11 w-full text-base">
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
