import type { ChecklistPointRecord } from "@/lib/google/ops-data";

export function checklistNumericWarning(
  point: Pick<ChecklistPointRecord, "completionType" | "min" | "max">,
  value: string
): boolean {
  if (point.completionType !== "angka" || !value.trim()) return false;
  const numeric = Number(value);
  return !Number.isFinite(numeric)
    || (point.min !== "" && numeric < Number(point.min))
    || (point.max !== "" && numeric > Number(point.max));
}
