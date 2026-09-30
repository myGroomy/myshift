import { DomainError } from "@/lib/error-codes";
import { canStartShift } from "@/lib/domain/shift-lifecycle";
import type { EmployeeRole } from "@/lib/domain/employee-role";

export type ScheduleLite = {
  scheduleId: string;
  employeeId: string;
  date: string;
  status: string;
};

export function eligiblePartnerIds(input: {
  requesterEmployeeId: string;
  requesterScheduleId: string;
  requesterDate: string;
  schedules: ScheduleLite[];
  pendingSwapScheduleIds: string[];
}) {
  const pending = new Set(input.pendingSwapScheduleIds);
  return [...new Set(input.schedules
    .filter((schedule) =>
      schedule.scheduleId !== input.requesterScheduleId
      && schedule.employeeId !== input.requesterEmployeeId
      && schedule.date === input.requesterDate
      && schedule.status === "scheduled"
      && !pending.has(schedule.scheduleId)
    )
    .map((schedule) => schedule.employeeId))];
}

export function assertScheduleOwner(scheduleEmployeeId: string, actorId: string) {
  if (scheduleEmployeeId !== actorId) {
    throw new DomainError("FORBIDDEN", "Hanya pemilik jadwal yang boleh melakukan aksi ini");
  }
}

export function assertScheduleAccess(input: {
  role: EmployeeRole;
  scheduleEmployeeId: string;
  actorId: string;
}) {
  if (input.role === "petugas") assertScheduleOwner(input.scheduleEmployeeId, input.actorId);
}

export function assertCanStartShift(status: string) {
  if (!canStartShift(status)) {
    throw new DomainError("VALIDATION_ERROR", "Shift sudah dimulai atau selesai");
  }
}

export function assertShiftNotClosed(status: string) {
  if (status === "completed") {
    throw new DomainError("VALIDATION_ERROR", "Shift sudah ditutup");
  }
}

export function partnerScheduleOnDate<T extends ScheduleLite>(
  schedules: T[],
  employeeId: string,
  date: string,
  excludeScheduleId: string
): T | undefined {
  return schedules.find((schedule) =>
    schedule.employeeId === employeeId
    && schedule.date === date
    && schedule.scheduleId !== excludeScheduleId
    && schedule.status === "scheduled"
  );
}
