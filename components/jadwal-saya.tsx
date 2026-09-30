"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { KaryawanShell } from "@/components/karyawan-shell";
import { ScheduleContent } from "@/components/phase1";
import { SwapAjukanContent, IzinAjukanContent, RiwayatContent } from "@/components/phase2";
import { Calendar, RefreshCw, FileText, History } from "lucide-react";

type TabKey = "jadwal" | "swap" | "izin" | "riwayat";

const TABS: { key: TabKey; label: string; icon: typeof Calendar }[] = [
  { key: "jadwal", label: "Jadwal Saya", icon: Calendar },
  { key: "swap", label: "Tukar Shift", icon: RefreshCw },
  { key: "izin", label: "Ajukan Izin", icon: FileText },
  { key: "riwayat", label: "Riwayat", icon: History },
];

function JadwalSayaInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawTab = searchParams.get("tab") as TabKey | null;
  const activeTab: TabKey = TABS.some((t) => t.key === rawTab) ? (rawTab as TabKey) : "jadwal";

  function setTab(tab: TabKey) {
    router.replace(`/jadwal-saya?tab=${tab}`, { scroll: false });
  }

  return (
    <KaryawanShell
      title="Jadwal & Permohonan Saya"
      lead="Lihat jadwal shift, ajukan tukar shift atau izin, dan cek riwayat permohonan."
    >
      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      <div>
        {activeTab === "jadwal" && <ScheduleContent mine />}
        {activeTab === "swap" && <SwapAjukanContent />}
        {activeTab === "izin" && <IzinAjukanContent />}
        {activeTab === "riwayat" && <RiwayatContent />}
      </div>
    </KaryawanShell>
  );
}

export function JadwalSayaPage() {
  return (
    <Suspense fallback={<div className="p-4 text-slate-500">Loading...</div>}>
      <JadwalSayaInner />
    </Suspense>
  );
}
