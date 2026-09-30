// ID generators formats are fixed by PLAN/SHEETS-SCHEMA.md §3 and must never drift to
// UUID-shaped values: IDs are primary keys also mapped manually during SSO integration.
export const ID_PREFIX = {
  branch: "CBG",
  employee: "EMP-",
  shift: "SFT-",
  swap: "SWP-",
  izin: "IZN-",
  category: "KTG-",
  sopCategory: "SOP-",
  checklistItem: "CHK-",
  checklistLog: "CLG-",
  shiftReportAudit: "AUD-",
  handoverField: "HOF-",
  handoverLog: "HLG-",
  incident: "INC-",
  incidentCategory: "KIC-",
} as const;

export function nextSequentialId(ids: readonly string[], prefix: string, width = 3): string {
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d+)$`);
  const max = ids.reduce((highest, id) => {
    const match = id.match(pattern);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${prefix}${String(max + 1).padStart(width, "0")}`;
}

export function nextScheduleId(ids: readonly string[], date: string): string {
  const prefix = `SCH-${date.replace(/-/g, "")}-`;
  return nextSequentialId(ids, prefix, 3);
}
