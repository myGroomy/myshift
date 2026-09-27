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

  const overlaps = (startX: number, endX: number, startY: number, endY: number) =>
    startX < endY && startY < endX;

  // A shift that wraps past midnight (22:00-06:00) overlaps the next morning's shift
  // (05:00-09:00); comparing the raw minutes alone misses that, so the second interval is
  // also compared shifted by one day.
  return (
    overlaps(aStart, aEnd, bStart, bEnd) ||
    overlaps(aStart, aEnd, bStart + 1440, bEnd + 1440)
  );
}
