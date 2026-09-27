import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 text-foreground">
      <div className="text-center">
        <p className="mb-2 text-6xl font-bold text-primary">404</p>
        <h1 className="mb-2 text-2xl font-bold">Halaman tidak ditemukan</h1>
        <p className="mb-8 text-muted-foreground">Halaman yang Anda cari tidak ada atau telah dipindahkan.</p>
        <Button asChild size="lg">
          <Link href="/dashboard">Kembali ke Beranda</Link>
        </Button>
      </div>
    </main>
  );
}
