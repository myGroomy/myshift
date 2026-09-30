"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { request } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

/**
 * Logout dipakai bersama oleh header admin, dock petugas, dan (dulu) sheet menu tiga tempat
 * yang harus berperilaku sama: POST dulu, tetap pindah ke /login walau request-nya gagal, dan
 * memberi umpan balik lewat toast.
 */
export function useLogout() {
  const router = useRouter();
  const { toast } = useToast();

  return useCallback(async () => {
    try {
      await request("/api/auth/logout", { method: "POST" });
      toast("Berhasil keluar", "success");
    } catch {
      // Sesi mungkin sudah hilang di server; yang penting pengguna tetap sampai di /login.
    }
    router.push("/login");
  }, [router, toast]);
}
