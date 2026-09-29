"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";

export default function HandoverRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/shift/${resolvedParams.id}?tab=handover`);
  }, [resolvedParams.id, router]);

  return (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      Mengalihkan ke Layar Shift Terpadu...
    </div>
  );
}
