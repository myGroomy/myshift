import { nextScheduleId, nextSequentialId } from "../lib/ids";

export const DUMMY_SEED_MARKER = "myshift-dummy-seed-v1";
export const DUMMY_TEXT_MARKER = "[DUMMY-SEED]";
export const DUMMY_SEED_DAYS = 90;

export type DummyEmployee = { employeeId: string; name: string };
export type DummyShift = { shiftId: string; name: string; startTime: string; endTime: string };
export type DummyChecklistPoint = {
  pointId: string;
  description: string;
  completionType: "centang" | "centang_foto" | "angka" | "teks" | "pilihan";
  unit: string;
  min: string;
  max: string;
  options: string[];
  appliesAllShifts: boolean;
  shiftIds: string[];
  active: boolean;
};
export type DummyHandoverField = { fieldId: string; label: string };
export type DummyCategory = { id: string; label: string; active: boolean };

export type DummySeedInput = {
  branchId: string;
  startDate: string;
  endDate: string;
  currentDate: string;
  currentTime: string;
  employees: DummyEmployee[];
  shifts: DummyShift[];
  checklistPoints: DummyChecklistPoint[];
  handoverFields: DummyHandoverField[];
  izinCategories: DummyCategory[];
  incidentCategories: DummyCategory[];
  adminEmployeeId: string;
  photoUrl: string;
  existingSchedules: string[][];
  existingChecklistLogs: string[][];
  existingHandoverLogs: string[][];
  existingSwaps: string[][];
  existingIzin: string[][];
  existingIncidents: string[][];
};

export type DummySeedPlan = {
  schedules: string[][];
  checklistLogs: string[][];
  handoverLogs: string[][];
  swaps: string[][];
  izin: string[][];
  incidents: string[][];
};

function dateRange(startDate: string, endDate: string): string[] {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    throw new Error("Rentang tanggal seed tidak valid");
  }
  const dates: string[] = [];
  for (let time = start; time <= end; time += 86_400_000) {
    dates.push(new Date(time).toISOString().slice(0, 10));
  }
  return dates;
}

function localTimestamp(date: string, time: string): string {
  return `${date}T${time}:00+07:00`;
}

function isSeedSchedule(row: string[]): boolean {
  return row[6] === DUMMY_SEED_MARKER;
}

function checklistValue(point: DummyChecklistPoint): string {
  switch (point.completionType) {
    case "centang":
    case "centang_foto":
      return "TRUE";
    case "angka": {
      const min = Number(point.min);
      const max = Number(point.max);
      if (Number.isFinite(min) && Number.isFinite(max)) return String((min + max) / 2);
      if (Number.isFinite(min)) return String(min);
      if (Number.isFinite(max)) return String(max);
      return "3";
    }
    case "teks":
      return `${DUMMY_TEXT_MARKER} Kondisi ${point.description.toLowerCase()} normal.`;
    case "pilihan":
      return point.options[0] ?? "Baik";
  }
}

function allocateId(ids: string[], prefix: string): string {
  const id = nextSequentialId(ids, prefix);
  ids.push(id);
  return id;
}

export function buildDummySeedPlan(input: DummySeedInput): DummySeedPlan {
  if (input.employees.length < Math.min(3, input.shifts.length)) {
    throw new Error("Seed memerlukan minimal satu karyawan untuk setiap shift");
  }
  if (input.shifts.length === 0) throw new Error("Cabang belum memiliki shift template");

  const dates = dateRange(input.startDate, input.endDate);
  const shifts = [...input.shifts]
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .slice(0, 3);
  const activeIzinCategories = input.izinCategories.filter((item) => item.active);
  const usedScheduleIds = input.existingSchedules.map((row) => row[0] ?? "").filter(Boolean);
  const usedChecklistLogIds = input.existingChecklistLogs.map((row) => row[0] ?? "").filter(Boolean);
  const usedHandoverLogIds = input.existingHandoverLogs.map((row) => row[0] ?? "").filter(Boolean);
  const usedSwapIds = input.existingSwaps.map((row) => row[0] ?? "").filter(Boolean);
  const usedIzinIds = input.existingIzin.map((row) => row[0] ?? "").filter(Boolean);
  const usedIncidentIds = input.existingIncidents.map((row) => row[0] ?? "").filter(Boolean);

  const seedScheduleByKey = new Map<string, string[]>();
  for (const row of input.existingSchedules.filter(isSeedSchedule)) {
    seedScheduleByKey.set(`${row[3]}|${row[1]}|${row[2]}`, row);
  }

  const schedules: string[][] = [];
  const allSeedSchedules: string[][] = [];
  const swaps: string[][] = [];
  const izin: string[][] = [];
  for (const [dayIndex, date] of dates.entries()) {
    const shiftsForDay: string[][] = [];
    const dateScheduleIds = usedScheduleIds.filter((id) => id.startsWith(`SCH-${date.replace(/-/g, "")}-`));
    for (const [shiftIndex, shift] of shifts.entries()) {
      const employee = input.employees[(dayIndex + shiftIndex) % input.employees.length];
      const naturalKey = `${date}|${employee.employeeId}|${shift.shiftId}`;
      let row = seedScheduleByKey.get(naturalKey);
      if (!row) {
        const scheduleId = nextScheduleId(dateScheduleIds, date);
        dateScheduleIds.push(scheduleId);
        usedScheduleIds.push(scheduleId);
        const status =
          date < input.currentDate
            ? "completed"
            : date === input.currentDate && shift.startTime <= input.currentTime
              ? "started"
              : "scheduled";
        const startedAt = status === "scheduled" ? "" : localTimestamp(date, shift.startTime);
        row = [scheduleId, employee.employeeId, shift.shiftId, date, status, startedAt, DUMMY_SEED_MARKER, "", ""];
        schedules.push(row);
        seedScheduleByKey.set(naturalKey, row);
      }
      allSeedSchedules.push(row);
      shiftsForDay.push(row);
    }

    const dateIsHistorical = date < input.currentDate;
    const dayIsToday = date === input.currentDate;
    const requestDue = dayIndex % 14 === 5;
    if (requestDue && shiftsForDay.length > 1 && activeIzinCategories.length > 0) {
      const schedule = shiftsForDay[0];
      const partner = shiftsForDay.find((row) => row[1] !== schedule[1]);
      const status = dateIsHistorical ? "rejected" : dayIsToday ? "pending" : "rejected";
      const reason = `${DUMMY_TEXT_MARKER} Permohonan tukar jadwal untuk keperluan keluarga.`;
      const exists = input.existingSwaps.some((row) => row[1] === schedule[0] && row[4] === reason);
      if (partner && !exists) {
        const swapId = allocateId(usedSwapIds, "SWP-");
        swaps.push([swapId, schedule[0], schedule[1], partner[1], reason, status, "", ""]);
      }
    }

    if (dayIndex % 18 === 8 && activeIzinCategories.length > 0) {
      const schedule = shiftsForDay[1 % shiftsForDay.length];
      const category = activeIzinCategories[dayIndex % activeIzinCategories.length];
      const note = `${DUMMY_TEXT_MARKER} Pengajuan izin simulasi untuk keperluan keluarga.`;
      const status = dateIsHistorical ? "rejected" : dayIsToday ? "pending" : "rejected";
      const exists = input.existingIzin.some((row) => row[2] === schedule[0] && row[4] === note);
      if (!exists) {
        const izinId = allocateId(usedIzinIds, "IZN-");
        izin.push([izinId, schedule[1], schedule[0], category.id, note, status, "", ""]);
      }
    }
  }

  const checklistLogs: string[][] = [];
  const seenChecklist = new Set(input.existingChecklistLogs.map((row) => `${row[1]}|${row[2]}`));
  for (const schedule of allSeedSchedules) {
    const shift = shifts.find((item) => item.shiftId === schedule[2]);
    if (!shift || schedule[4] === "scheduled") continue;
    const applicable = input.checklistPoints.filter(
      (point) => point.active && (point.appliesAllShifts || point.shiftIds.includes(shift.shiftId)),
    );
    const pointCount = schedule[4] === "completed" ? applicable.length : Math.ceil(applicable.length / 2);
    for (const point of applicable.slice(0, pointCount)) {
      if (seenChecklist.has(`${schedule[0]}|${point.pointId}`)) continue;
      const logId = allocateId(usedChecklistLogIds, "CLG-");
      const value = checklistValue(point);
      const photoUrl = point.completionType === "centang_foto" && value === "TRUE" ? input.photoUrl : "";
      checklistLogs.push([
        logId,
        schedule[0],
        point.pointId,
        value,
        photoUrl,
        schedule[1],
        localTimestamp(schedule[3], shift.startTime),
      ]);
      seenChecklist.add(`${schedule[0]}|${point.pointId}`);
    }
  }

  const handoverLogs: string[][] = [];
  const seenHandover = new Set(input.existingHandoverLogs.map((row) => `${row[1]}|${row[2]}`));
  for (const schedule of allSeedSchedules.filter((row) => row[4] === "completed")) {
    for (const field of input.handoverFields) {
      if (seenHandover.has(`${schedule[0]}|${field.fieldId}`)) continue;
      const logId = allocateId(usedHandoverLogIds, "HLG-");
      handoverLogs.push([
        logId,
        schedule[0],
        field.fieldId,
        `${DUMMY_TEXT_MARKER} ${field.label}: kondisi normal, stok tercatat, dan area sudah dirapikan.`,
        schedule[1],
        localTimestamp(schedule[3], "21:45"),
      ]);
      seenHandover.add(`${schedule[0]}|${field.fieldId}`);
    }
  }

  const incidents: string[][] = [];
  const activeIncidentCategories = input.incidentCategories.filter((category) => category.active);
  if (activeIncidentCategories.length > 0) {
    const existingDummyIncidentKeys = new Set(
      input.existingIncidents
        .filter((row) => row[2]?.startsWith(DUMMY_TEXT_MARKER))
        .map((row) => `${row[1]}|${row[9]?.slice(0, 10)}`),
    );
    for (const [dayIndex, date] of dates.entries()) {
      if (dayIndex % 8 !== 3) continue;
      const category = activeIncidentCategories[dayIndex % activeIncidentCategories.length];
      if (existingDummyIncidentKeys.has(`${category.id}|${date}`)) continue;
      const schedule = allSeedSchedules.find((row) => row[3] === date);
      if (!schedule) continue;
      const resolved = Boolean(input.adminEmployeeId) && dayIndex % 4 !== 0;
      const incidentId = allocateId(usedIncidentIds, "INC-");
      incidents.push([
        incidentId,
        category.id,
        `${DUMMY_TEXT_MARKER} ${category.label}: pengecekan simulasi, masalah sudah ditangani.`,
        dayIndex % 11 === 0 ? "high" : dayIndex % 5 === 0 ? "medium" : "low",
        "",
        resolved ? "resolved" : "open",
        resolved ? input.adminEmployeeId : "",
        resolved ? localTimestamp(date, "20:00") : "",
        schedule[1],
        localTimestamp(date, "18:30"),
      ]);
    }
  }

  return { schedules, checklistLogs, handoverLogs, swaps, izin, incidents };
}

export function defaultSeedRange(asOf: string): { startDate: string; endDate: string } {
  const end = Date.parse(`${asOf}T00:00:00.000Z`);
  if (!Number.isFinite(end)) throw new Error("Tanggal akhir seed tidak valid");
  return {
    startDate: new Date(end - (DUMMY_SEED_DAYS - 1) * 86_400_000).toISOString().slice(0, 10),
    endDate: asOf,
  };
}
