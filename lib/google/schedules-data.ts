import { timeOverlaps } from "@/lib/domain/schedule-validation";

export type RawScheduleRow = {
  scheduleId: string;
  employeeId: string;
  shiftId: string;
  date: string;
  status: string;
  startedAt: string;
  reportGeneratedAt: string;
};

export type RawShiftRow = {
  shiftId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
};

export type EnrichedSchedule = RawScheduleRow & {
  shiftName: string;
  startTime: string;
  endTime: string;
  conflictWarning: boolean;
};

export function projectSchedules(
  scheduleRows: RawScheduleRow[],
  shiftRows: RawShiftRow[]
): EnrichedSchedule[] {
  const shiftsMap = new Map(
    shiftRows.map((s) => [
      s.shiftId,
      { shiftName: s.shiftName, startTime: s.startTime, endTime: s.endTime },
    ])
  );

  return scheduleRows.map((entry) => {
    const shiftInfo = shiftsMap.get(entry.shiftId);
    const shiftName = shiftInfo?.shiftName ?? entry.shiftId;
    const startTime = shiftInfo?.startTime ?? "";
    const endTime = shiftInfo?.endTime ?? "";

    const conflictWarning = scheduleRows.some(
      (other) =>
        other.scheduleId !== entry.scheduleId &&
        other.employeeId === entry.employeeId &&
        other.date === entry.date &&
        shiftsMap.get(other.shiftId) &&
        shiftsMap.get(entry.shiftId) &&
        timeOverlaps(
          shiftsMap.get(other.shiftId)!.startTime,
          shiftsMap.get(other.shiftId)!.endTime,
          startTime,
          endTime
        )
    );

    return {
      ...entry,
      shiftName,
      startTime,
      endTime,
      conflictWarning,
    };
  });
}
