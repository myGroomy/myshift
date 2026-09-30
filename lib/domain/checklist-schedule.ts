export type ChecklistScheduleCandidate = {
  scheduleId: string;
  branchId?: string;
  date: string;
  status: string;
  startTime?: string;
};

export function selectDefaultChecklistSchedule(
  schedules: ChecklistScheduleCandidate[],
  today: string,
  currentTime: string
) {
  const todaysSchedules = schedules.filter((schedule) => schedule.date === today);
  if (todaysSchedules.length === 0) return null;

  return [...todaysSchedules].sort((a, b) => {
    const priority = (status: string) =>
      status === "started" ? 0 : status === "scheduled" ? 1 : status === "completed" ? 2 : 3;
    const priorityDifference = priority(a.status) - priority(b.status);
    if (priorityDifference !== 0) return priorityDifference;

    const aTime = a.startTime ?? "";
    const bTime = b.startTime ?? "";
    if (a.status === "scheduled") {
      const aFuture = aTime >= currentTime;
      const bFuture = bTime >= currentTime;
      if (aFuture !== bFuture) return aFuture ? -1 : 1;
      return aFuture ? aTime.localeCompare(bTime) : bTime.localeCompare(aTime);
    }
    return bTime.localeCompare(aTime);
  })[0];
}
