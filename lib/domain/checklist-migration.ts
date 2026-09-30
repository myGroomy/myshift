import { ID_PREFIX, nextSequentialId } from "@/lib/ids";

export type LegacyChecklistRow = { itemId: string; type: string; description: string; requiresPhoto: boolean; order: number; active: boolean };
export type LegacyChecklistLog = { logId: string; scheduleId: string; itemId: string; checkedBy: string; checkedAt: string; photoUrl: string };
export type LegacyShift = { shiftId: string; name: string };

function shiftForType(type: string, shifts: LegacyShift[]) {
  const normalized = type.trim().toLowerCase();
  return shifts.find((shift) => shift.name.trim().toLowerCase() === normalized)?.shiftId ?? "";
}

export function migrateLegacyChecklistRows(input: {
  items: LegacyChecklistRow[];
  shifts: LegacyShift[];
  categoryId: string;
}) {
  return input.items.map((item) => {
    const shiftId = shiftForType(item.type, input.shifts);
    const appliesAllShifts = !shiftId;
    return [
      item.itemId,
      input.categoryId,
      item.description,
      item.requiresPhoto ? "centang_foto" : "centang",
      "",
      "",
      "",
      "",
      appliesAllShifts ? "TRUE" : "FALSE",
      appliesAllShifts ? "" : shiftId,
      String(item.order),
      item.active ? "TRUE" : "FALSE",
    ];
  });
}

export function migrateLegacyChecklistLogs(input: { logs: LegacyChecklistLog[] }) {
  const latest = new Map<string, LegacyChecklistLog>();
  for (const log of input.logs) latest.set(`${log.scheduleId}\u0000${log.itemId}`, log);
  return [...latest.values()].map((log) => [
    log.logId,
    log.scheduleId,
    log.itemId,
    "TRUE",
    log.photoUrl,
    log.checkedBy,
    log.checkedAt,
  ]);
}

export function nextSopCategoryId(existingIds: string[]) {
  return nextSequentialId(existingIds, ID_PREFIX.sopCategory);
}
