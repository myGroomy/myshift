import type { ReactNode } from "react";
import { MotionProvider } from "@/components/motion-provider";
import { ToastProvider } from "@/components/ui/toast";

// Nav dipakai per-shell: AdminShell merender Nav + Footer, KaryawanShell merender
// BottomNav. Kalau Nav diletakkan di sini, karyawan mendapat dua nav sekaligus.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <MotionProvider>
      <ToastProvider>{children}</ToastProvider>
    </MotionProvider>
  );
}
