export function requiredText(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} wajib diisi`);
  return value.trim();
}

export function validTime(value: unknown, field: string) {
  const text = requiredText(value, field);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(text)) throw new Error(`${field} harus berformat HH:mm`);
  return text;
}

export function validDate(value: unknown, field = "date") {
  const text = requiredText(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    throw new Error(`${field} harus berformat YYYY-MM-DD`);
  }
  return text;
}
