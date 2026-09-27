import type { ReactNode } from "react";
import { MotionProvider } from "@/components/motion-provider";
import { Nav } from "@/components/nav";

// Layout untuk semua halaman app (dashboard, jadwal, karyawan, dll).
// Landing page (/) TIDAK masuk route group ini sehingga tidak dapat Nav ganda.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <MotionProvider>
      <Nav />
      {children}
    </MotionProvider>
  );
}
