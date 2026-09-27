import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#faf9fe] px-4 dark:bg-[#1a1b1f]">
      <div className="text-center">
        <p className="mb-2 text-6xl font-bold text-[#0075de]">404</p>
        <h1 className="mb-2 text-2xl font-bold text-[#000000] dark:text-[#f5f5f5]">Halaman tidak ditemukan</h1>
        <p className="mb-8 text-[#615d59]">Halaman yang Anda cari tidak ada atau telah dipindahkan.</p>
        <Button asChild className="h-11 rounded-lg bg-[#0075de] px-6 text-white">
          <Link href="/">Kembali ke Beranda</Link>
        </Button>
      </div>
    </main>
  );
}
