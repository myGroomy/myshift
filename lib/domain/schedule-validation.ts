import { validDate } from "@/lib/domain/master-validation";

export function scheduleDate(value: unknown) {
  return validDate(value, "date");
}

export function timeOverlaps(startA: string, endA: string, startB: string, endB: string) {
  const toMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  const normalizeEnd = (start: number, end: number) => (end <= start ? end + 1440 : end);
  const aStart = toMinutes(startA);
  const bStart = toMinutes(startB);
  const aEnd = normalizeEnd(aStart, toMinutes(endA));
  const bEnd = normalizeEnd(bStart, toMinutes(endB));
  return aStart < bEnd && bStart < aEnd;
}
