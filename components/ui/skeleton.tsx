import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-[#e5e5e5] dark:bg-[#3a3a3e]", className)} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-[#e5e5e5] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
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
    <div className="overflow-x-auto rounded-lg border border-[#e5e5e5]">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-[#f0f1f5]">
            <th className="p-3"><Skeleton className="h-4 w-16" /></th>
            <th className="p-3"><Skeleton className="h-4 w-20" /></th>
            <th className="p-3"><Skeleton className="h-4 w-24" /></th>
            <th className="p-3"><Skeleton className="h-4 w-16" /></th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="border-t border-[#e5e5e5]">
              <td className="p-3"><Skeleton className="h-4 w-16" /></td>
              <td className="p-3"><Skeleton className="h-4 w-20" /></td>
              <td className="p-3"><Skeleton className="h-4 w-24" /></td>
              <td className="p-3"><Skeleton className="h-4 w-16" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
