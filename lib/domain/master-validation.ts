import { isValidPin } from "@/lib/domain/pin";
import { DomainError } from "@/lib/error-codes";

// Dedicated validation layer per domain (AGENTS.md §5). Every failure is a typed
// DomainError -> VALIDATION_ERROR 400 with `error.data.fields` for per-field detail.
function invalid(message: string, fields?: string[]): never {
  throw new DomainError("VALIDATION_ERROR", message, { data: fields ? { fields } : undefined });
}

export function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) invalid(`${field} wajib diisi`, [field]);
  return value.trim();
}

export function optionalText(value: unknown, field: string, fallback: string, maxLength = 500): string {
  if (value === undefined || value === null) return fallback;
  const text = requiredText(value, field);
  if (text.length > maxLength) invalid(`${field} maksimal ${maxLength} karakter`, [field]);
  return text;
}

export function validTime(value: unknown, field: string): string {
  const text = requiredText(value, field);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(text)) invalid(`${field} harus berformat HH:mm`, [field]);
  return text;
}

export function validDate(value: unknown, field = "date"): string {
  const text = requiredText(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    invalid(`${field} harus berformat YYYY-MM-DD`, [field]);
  }
  return text;
}

export function validPin(value: unknown, field = "pin"): string {
  if (!isValidPin(value)) invalid(`${field} harus 4-8 digit`, [field]);
  return value;
}

export function validRole(value: unknown, roles: readonly string[], field = "role"): string {
  const text = requiredText(value, field);
  if (!roles.includes(text)) invalid(`${field} tidak valid`, [field]);
  return text;
}

export function optionalBoolean(value: unknown, field: string, fallback: boolean): boolean {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "boolean") invalid(`${field} harus boolean`, [field]);
  return value;
}

// Optional URL (checklist photo). Empty is allowed; anything else must be a sane http(s) URL.
export function optionalUrl(value: unknown, field: string): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") invalid(`${field} harus berupa URL`, [field]);
  const text = value.trim();
  if (!text) return "";
  if (text.length > 2048) invalid(`${field} terlalu panjang`, [field]);
  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    invalid(`${field} bukan URL yang valid`, [field]);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") invalid(`${field} harus http/https`, [field]);
  return text;
}

export function optionalBranchIdList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function mergeBranchAffiliation(existing: string[], branchId: string): string[] {
  return [...new Set([...existing.map((entry) => entry.trim()).filter(Boolean), branchId])];
}
