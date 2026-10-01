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
      className={cn("mb-4 rounded-lg border border-border bg-card px-2 py-1.5 sm:px-3", className)}
    >
      <div className={cn("grid min-w-0 grid-cols-2 gap-2", contentClassName)}>
        {children}
      </div>
    </section>
  );
}
