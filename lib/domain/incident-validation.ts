import { DomainError } from "@/lib/error-codes";

// Incident domain validation (AGENTS.md §5 dedicated validation layer per domain).
// Every failure is a typed DomainError → VALIDATION_ERROR 400 with per-field detail.

const SEVERITIES = ["low", "medium", "high"] as const;
export type Severity = (typeof SEVERITIES)[number];

function invalid(message: string, fields?: string[]): never {
  throw new DomainError("VALIDATION_ERROR", message, { data: fields ? { fields } : undefined });
}

export function requiredText(value: unknown, field: string, minLength = 1, maxLength = 500): string {
  if (typeof value !== "string" || !value.trim()) invalid(`${field} wajib diisi`, [field]);
  const text = value.trim();
  if (text.length < minLength) invalid(`${field} minimal ${minLength} karakter`, [field]);
  if (text.length > maxLength) invalid(`${field} maksimal ${maxLength} karakter`, [field]);
  return text;
}

export function validSeverity(value: unknown): Severity {
  if (typeof value !== "string" || !SEVERITIES.includes(value as Severity)) {
    invalid("severity harus low, medium, atau high", ["severity"]);
  }
  return value as Severity;
}

export function validIncidentStatus(value: unknown): "open" | "resolved" {
  if (value !== "open" && value !== "resolved") {
    invalid("status harus open atau resolved", ["status"]);
  }
  return value;
}

export function validCategoryId(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    invalid("categoryId wajib diisi", ["categoryId"]);
  }
  return value.trim();
}

export function optionalUrl(value: unknown, field = "fotoUrl"): string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") invalid(`${field} harus berupa URL string`, [field]);
  const text = value.trim();
  if (text && !/^https?:\/\/\S+$/i.test(text)) invalid(`${field} harus URL valid`, [field]);
  return text;
}
