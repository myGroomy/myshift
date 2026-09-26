export function nextSequentialId(ids: string[], prefix: string, width: number) {
  const max = ids.reduce((highest, id) => {
    const match = id.match(new RegExp(`^${prefix}(\\d+)$`));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${prefix}${String(max + 1).padStart(width, "0")}`;
}

export function nextScheduleId(ids: string[], date: string) {
  const prefix = `SCH-${date}-`;
  const max = ids.reduce((highest, id) => {
    const match = id.match(new RegExp(`^${prefix}(\\d+)$`));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export function nanoid(): string {
  return crypto.randomUUID().slice(0, 8).toUpperCase();
}
