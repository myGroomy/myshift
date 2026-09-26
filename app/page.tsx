"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-8">
      <h1 className="text-4xl font-bold text-foreground">MYSHIFT</h1>
      <p className="mt-4 text-foreground">Selamat datang di MYSHIFT</p>
      <button
        onClick={() => {
          fetch("/api/auth/logout", { method: "POST" })
            .then(() => router.push("/login"));
        }}
        className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded"
      >
        Keluar
      </button>
    </main>
  );
}
