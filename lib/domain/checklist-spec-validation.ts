import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { DomainError } from "@/lib/error-codes";
import { getEnv } from "@/lib/env";
import type { ChecklistPointRecord } from "@/lib/google/ops-data";

export { checklistNumericWarning } from "@/lib/domain/checklist-values";

export const CHECKLIST_COMPLETION_TYPES = ["centang", "centang_foto", "angka", "teks", "pilihan"] as const;
export type ChecklistCompletionType = (typeof CHECKLIST_COMPLETION_TYPES)[number];

export type ChecklistPointInput = Omit<ChecklistPointRecord, "rowNumber" | "pointId" | "active" | "createdAt" | "updatedAt">;
export type SopCategoryInput = { name: string; order: number; active: boolean };

function fieldError(message: string, fields: string[]): never {
  throw new DomainError("VALIDATION_ERROR", message, { data: { fields } });
}

function text(value: unknown, field: string, required: boolean): string {
  if (typeof value !== "string") fieldError(`${field} harus berupa teks`, [field]);
  const normalized = value.trim();
  if (required && !normalized) fieldError(`${field} wajib diisi`, [field]);
  if (normalized.length > 1000) fieldError(`${field} terlalu panjang`, [field]);
  return normalized;
}

function optionalNumber(value: unknown, field: string): string {
  if (value === undefined || value === null || value === "") return "";
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) fieldError(`${field} harus berupa angka`, [field]);
  return String(numeric);
}

export function normalizeSopCategory(input: unknown): SopCategoryInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fieldError("Data kategori SOP tidak valid", ["category"]);
  }
  const value = input as Record<string, unknown>;
  const name = text(value.name, "name", true);
  const order = value.order === undefined ? 0 : Number(value.order);
  if (!Number.isInteger(order) || order < 0) fieldError("Urutan harus bilangan bulat >= 0", ["order"]);
  const active = value.active === undefined ? true : value.active;
  if (typeof active !== "boolean") fieldError("active harus boolean", ["active"]);
  return { name, order, active };
}

export function normalizeChecklistPoint(input: unknown): ChecklistPointInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fieldError("Data checklist tidak valid", ["point"]);
  }
  const value = input as Record<string, unknown>;
  const completionType = value.completionType;
  if (!CHECKLIST_COMPLETION_TYPES.includes(completionType as ChecklistCompletionType)) {
    fieldError("Tipe penyelesaian tidak valid", ["completionType"]);
  }
  const categoryId = text(value.categoryId, "categoryId", true);
  const description = text(value.description, "description", true);
  const unit = text(value.unit ?? "", "unit", false);
  const min = optionalNumber(value.min, "min");
  const max = optionalNumber(value.max, "max");
  const options = Array.isArray(value.options)
    ? value.options.map((entry) => text(entry, "options", true))
    : typeof value.options === "string"
      ? value.options.split(",").map((entry) => entry.trim()).filter(Boolean)
      : [];
  const appliesAllShifts = value.appliesAllShifts;
  if (typeof appliesAllShifts !== "boolean") fieldError("Cakupan shift harus dipilih", ["appliesAllShifts"]);
  const shiftIds = Array.isArray(value.shiftIds)
    ? value.shiftIds.map((entry) => text(entry, "shiftIds", true))
    : [];
  const order = value.order === undefined ? 0 : Number(value.order);
  if (!Number.isInteger(order) || order < 0) fieldError("Urutan harus bilangan bulat >= 0", ["order"]);
  if (!appliesAllShifts && shiftIds.length === 0) {
    fieldError("Pilih minimal satu shift", ["shiftIds"]);
  }
  if (new Set(shiftIds).size !== shiftIds.length) fieldError("Shift duplikat", ["shiftIds"]);
  if (completionType === "angka") {
    if (min && max && Number(min) > Number(max)) fieldError("Batas minimum tidak boleh melebihi maksimum", ["min", "max"]);
  } else if (min || max || unit) {
    fieldError("Satuan dan batas hanya berlaku untuk tipe angka", ["unit", "min", "max"]);
  }
  if (completionType === "pilihan") {
    if (options.length < 2 || new Set(options).size !== options.length) {
      fieldError("Tipe pilihan memerlukan minimal dua opsi yang unik", ["options"]);
    }
  } else if (options.length) {
    fieldError("Opsi hanya berlaku untuk tipe pilihan", ["options"]);
  }
  return {
    categoryId,
    description,
    completionType: completionType as ChecklistCompletionType,
    unit,
    min,
    max,
    options,
    appliesAllShifts,
    shiftIds: appliesAllShifts ? [] : shiftIds,
    order,
  };
}

export function serializeChecklistPoint(point: ChecklistPointInput, pointId: string, active: boolean) {
  return [
    pointId,
    point.categoryId,
    point.description,
    point.completionType,
    point.unit,
    point.min,
    point.max,
    point.options.join(","),
    point.appliesAllShifts ? "TRUE" : "FALSE",
    point.shiftIds.join(","),
    String(point.order),
    active ? "TRUE" : "FALSE",
    "",
    "",
  ];
}

function signature(body: string) {
  return createHmac("sha256", getEnv().MYSHIFT_API_KEY).update(`myshift:report:${body}`).digest("base64url");
}

export function createReportToken(branchId: string, scheduleId: string): string {
  const body = `${Buffer.from(`${branchId}:${scheduleId}`).toString("base64url")}.${randomBytes(32).toString("base64url")}`;
  return `${body}.${signature(body)}`;
}

export function verifyReportToken(token: string): { branchId: string; scheduleId: string } | null {
  const [encodedScheduleId, nonce, providedSignature, extra] = token.split(".");
  if (!encodedScheduleId || !nonce || !providedSignature || extra !== undefined) return null;
  const body = `${encodedScheduleId}.${nonce}`;
  const expected = Buffer.from(signature(body));
  const supplied = Buffer.from(providedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const payload = Buffer.from(encodedScheduleId, "base64url").toString("utf8");
    const separator = payload.indexOf(":");
    if (separator <= 0 || separator === payload.length - 1) return null;
    if (Buffer.from(payload).toString("base64url") !== encodedScheduleId) return null;
    return { branchId: payload.slice(0, separator), scheduleId: payload.slice(separator + 1) };
  } catch {
    return null;
  }
}

export function reportTokenMatches(token: string, storedToken: string): boolean {
  const provided = Buffer.from(token);
  const stored = Buffer.from(storedToken);
  return provided.length === stored.length && timingSafeEqual(provided, stored);
}

export function checklistValueComplete(value: string): boolean {
  return value.trim().length > 0;
}

export function checklistPointComplete(
  point: Pick<ChecklistPointRecord, "completionType" | "options">,
  value: string,
  photoUrl: string
): boolean {
  switch (point.completionType) {
    case "centang":
      return value === "TRUE";
    case "centang_foto":
      return value === "TRUE" && photoUrl.trim().length > 0;
    case "angka":
      return value.trim() !== "" && Number.isFinite(Number(value));
    case "teks":
    case "pilihan":
      return checklistValueComplete(value);
  }
}

export function validateChecklistValue(point: ChecklistPointRecord, rawValue: unknown, photoUrl: unknown) {
  const value = typeof rawValue === "string" ? rawValue.trim() : "";
  const photo = typeof photoUrl === "string" ? photoUrl.trim() : "";
  if (point.completionType === "centang" && value && !["TRUE", "FALSE"].includes(value)) {
    fieldError("Nilai checklist tidak valid", ["value"]);
  }
  if (point.completionType === "centang_foto" && !["", "TRUE", "FALSE"].includes(value)) {
    fieldError("Nilai checklist tidak valid", ["value"]);
  }
  if (point.completionType === "centang_foto" && value === "TRUE" && !photo) {
    fieldError("Checklist yang dicentang wajib menyertakan foto", ["photoUrl"]);
  }
  if (point.completionType === "angka" && value && !Number.isFinite(Number(value))) {
    fieldError("Masukkan angka yang valid", ["value"]);
  }
  if (point.completionType === "pilihan" && value && !point.options.includes(value)) {
    fieldError("Pilih nilai dari opsi yang tersedia", ["value"]);
  }
  return { value, photoUrl: photo };
}
