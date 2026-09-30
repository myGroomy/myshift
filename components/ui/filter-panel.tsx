import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FilterPanel({
  children,
  className,
  contentClassName,
  label = "Filter data",
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  label?: string;
}) {
  return (
    <section
      aria-label={label}
      className={cn("mb-5 rounded-lg border border-border bg-card p-3 sm:p-4", className)}
    >
      <div className={cn("grid min-w-0 grid-cols-1 items-end gap-3 sm:grid-cols-2", contentClassName)}>
        {children}
      </div>
    </section>
  );
}
