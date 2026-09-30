import Link from "next/link";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 py-16 text-center">
      <div className="mb-4 text-muted-foreground">
        {icon || <Inbox size={40} />}
      </div>
      <h3 className="mb-1 text-lg font-semibold">{title}</h3>
      {description && <p className="mb-6 text-sm text-muted-foreground">{description}</p>}
      {actionLabel && actionHref && (
        <Button asChild size="lg" className="h-10">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}
