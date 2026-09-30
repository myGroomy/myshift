// Every business date in MYSHIFT is a WIB (Asia/Jakarta, UTC+7) calendar date.
// `new Date().toISOString().slice(0, 10)` is UTC and shifts the date back one day
// between 00:00 and 07:00 WIB never use it for "today".
export const WIB_TIME_ZONE = "Asia/Jakarta";

const wibDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: WIB_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function todayInWIB(now: Date = new Date()): string {
  return wibDateFormatter.format(now);
}

export function nowIso(now: Date = new Date()): string {
  return now.toISOString();
}
