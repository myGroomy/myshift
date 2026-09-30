import { tableClass, tableHeadClass, tableWrapClass, tdClass, thClass } from "@/lib/ui";

interface DataTableProps {
  columns: string[];
  children: React.ReactNode;
}

// Replaces the wrap/table/thead block that was copy-pasted across 6 files.
export function DataTable({ columns, children }: DataTableProps) {
  return (
    <div className={tableWrapClass}>
      <p className="border-b border-border px-3 py-2 text-xs text-muted-foreground lg:hidden">
        Geser tabel ke samping untuk melihat semua kolom.
      </p>
      <div className="overflow-x-auto overscroll-x-contain">
        <table className={`${tableClass} min-w-[640px] md:min-w-full`}>
          <thead>
            <tr className={tableHeadClass}>
              {columns.map((column) => (
                <th key={column} scope="col" className={thClass}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export { tdClass };
