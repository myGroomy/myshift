import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface ShiftStatusBannerProps {
  startedAt: string;
  branchName: string;
  scheduleId: string;
  onClose?: () => void;
}

export function ShiftStatusBanner({ startedAt, branchName, scheduleId, onClose }: ShiftStatusBannerProps) {
  const router = useRouter();
  const time = new Date(startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 p-3 mb-4">
      <div className="text-sm text-primary">
        Shift dimulai pada {time} di {branchName}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => router.push(`/shift/${scheduleId}`)}>
          Lihat Shift
        </Button>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Tutup banner">
            ✕
          </Button>
        )}
      </div>
    </div>
  );
}
