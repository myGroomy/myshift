"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ApprovalSwapRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/approval?tab=swap");
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      Mengalihkan ke Unified Approval Hub...
    </div>
  );
}