"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  const router = useRouter();
  return (
    <main className="min-h-screen bg-[#faf9fe] flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-bold text-[#0075de]">MYSHIFT</h1>
        <p className="mt-2 text-[#615d59]">Manajemen shift F&B UMKM</p>
        <div className="mt-8 flex flex-col gap-3">
          <Button onClick={() => router.push("/login")} className="h-12 rounded-lg bg-[#0075de] text-white text-lg">Masuk</Button>
          <Link href="/login" className="text-sm text-[#0075de] hover:underline">Masuk ke MYSHIFT</Link>
        </div>
      </div>
    </main>
  );
}
