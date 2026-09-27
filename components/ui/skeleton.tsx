import { cn } from "@/lib/utils";
import { cardClass, tableClass, tableHeadClass, tableWrapClass, tdClass, thClass } from "@/lib/ui";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-border", className)} />;
}

export function SkeletonCard() {
  return (
    <div className={cardClass}>
      <Skeleton className="mb-3 h-5 w-2/3" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className={tableWrapClass}>
      <table className={tableClass}>
        <thead>
          <tr className={tableHeadClass}>
            <th scope="col" className={thClass}><Skeleton className="h-4 w-16" /></th>
            <th scope="col" className={thClass}><Skeleton className="h-4 w-20" /></th>
            <th scope="col" className={thClass}><Skeleton className="h-4 w-24" /></th>
            <th scope="col" className={thClass}><Skeleton className="h-4 w-16" /></th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="border-t border-border">
              <td className={tdClass}><Skeleton className="h-4 w-16" /></td>
              <td className={tdClass}><Skeleton className="h-4 w-20" /></td>
              <td className={tdClass}><Skeleton className="h-4 w-24" /></td>
              <td className={tdClass}><Skeleton className="h-4 w-16" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
