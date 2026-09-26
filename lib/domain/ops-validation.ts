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
  return [...new Set(input.schedules
    .filter((schedule) =>
      schedule.scheduleId !== input.requesterScheduleId
      && schedule.employeeId !== input.requesterEmployeeId
      && schedule.date === input.requesterDate
      && schedule.status === "scheduled"
      && !input.pendingSwapScheduleIds.includes(schedule.scheduleId)
    )
    .map((schedule) => schedule.employeeId))];
}

export function assertScheduleOwner(scheduleEmployeeId: string, actorId: string) {
  if (scheduleEmployeeId !== actorId) throw new Error("Hanya pemilik jadwal yang boleh melakukan aksi ini");
}

export function assertCanStartShift(status: string) {
  if (status !== "scheduled") throw new Error("Shift sudah dimulai atau selesai");
}

export function partnerScheduleOnDate(schedules: ScheduleLite[], employeeId: string, date: string, excludeScheduleId: string) {
  return schedules.find((schedule) =>
    schedule.employeeId === employeeId
    && schedule.date === date
    && schedule.scheduleId !== excludeScheduleId
    && schedule.status === "scheduled"
  );
}