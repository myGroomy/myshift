import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({
  icon = "inbox",
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#e5e5e5] bg-white/50 py-16 text-center">
      <span className="material-symbols-outlined mb-4 text-5xl text-[#615d59]">{icon}</span>
      <h3 className="mb-1 text-lg font-semibold text-[#000000] dark:text-[#f5f5f5]">{title}</h3>
      {description && <p className="mb-6 text-sm text-[#615d59]">{description}</p>}
      {actionLabel && actionHref && (
        <Button asChild className="h-10 rounded-lg bg-[#0075de] text-white">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}
