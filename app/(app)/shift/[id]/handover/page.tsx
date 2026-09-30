"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";

export default function HandoverRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branchId?: string }>;
}) {
  const resolvedParams = use(params);
  const resolvedSearchParams = use(searchParams);
  const router = useRouter();

  useEffect(() => {
    const query = new URLSearchParams({ tab: "handover" });
    if (resolvedSearchParams.branchId) query.set("branchId", resolvedSearchParams.branchId);
    router.replace(`/shift/${resolvedParams.id}?${query.toString()}`);
  }, [resolvedParams.id, resolvedSearchParams.branchId, router]);

  return (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      Mengalihkan ke Layar Shift Terpadu...
    </div>
  );
}
