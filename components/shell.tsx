"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Nav } from "@/components/nav";
import { pageLeadClass, pageTitleClass } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  lead,
  actions,
}: {
  title: string;
  lead?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex min-w-0 flex-wrap items-start justify-between gap-3 sm:mb-6 sm:items-end">
      <div className="min-w-0 flex-1">
        <h1 className={pageTitleClass}>{title}</h1>
        {lead ? <p className={pageLeadClass}>{lead}</p> : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div> : null}
    </div>
  );
}

export function AdminShell({
  title,
  lead,
  actions,
  children,
}: {
  title: string;
  lead?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <Nav />
      {/* pb-28 memberi ruang untuk dock di layar kecil; dock disembunyikan di lg+ (nav horizontal). */}
      <main
        id="main"
        className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:py-8"
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0, 1] }}
        >
          <PageHeader title={title} lead={lead} actions={actions} />
          {children}
        </motion.div>
      </main>
    </div>
  );
}

// ponytail: inline confirm beats a dialog library for a two-field reject.
// Swap for a Dialog when rejections ever need more context.
export function RejectButton({
  onReject,
  label = "Tolak",
}: {
  onReject: (reason: string) => Promise<void>;
  label?: string;
}) {
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (!asking) {
    return (
      <Button variant="outline" onClick={() => setAsking(true)}>
        {label}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Alasan penolakan"
        aria-label="Alasan penolakan"
        autoFocus
      />
      <div className="flex gap-2">
        <Button
          variant="destructive"
          disabled={!reason.trim() || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onReject(reason.trim());
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Menyimpan..." : "Konfirmasi"}
        </Button>
        <Button variant="ghost" onClick={() => { setAsking(false); setReason(""); }}>
          Batal
        </Button>
      </div>
    </div>
  );
}

const statusTone: Record<string, string> = {
  approved: "bg-success-wash text-success",
  active: "bg-success-wash text-success",
  completed: "bg-success-wash text-success",
  ready: "bg-success-wash text-success",
  started: "bg-info-wash text-info-foreground",
  pending: "bg-warning-wash text-warning",
  failed: "bg-destructive-wash text-destructive-foreground",
  rejected: "bg-destructive-wash text-destructive-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium capitalize",
        statusTone[status] ?? "bg-muted text-muted-foreground"
      )}
    >
      {status}
    </span>
  );
}
