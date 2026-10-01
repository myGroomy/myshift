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
      className={cn("mb-4 rounded-lg border border-border bg-card px-3 py-2.5 sm:px-4", className)}
    >
      <div className={cn("grid min-w-0 grid-cols-1 items-end gap-2 sm:grid-cols-2", contentClassName)}>
        {children}
      </div>
    </section>
  );
}
