import { tableClass, tableHeadClass, tableWrapClass, tdClass, thClass } from "@/lib/ui";

interface DataTableProps {
  columns: string[];
  children: React.ReactNode;
}

// Replaces the wrap/table/thead block that was copy-pasted across 6 files.
export function DataTable({ columns, children }: DataTableProps) {
  return (
    <div className={tableWrapClass}>
      <table className={tableClass}>
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
  );
}

export { tdClass };
