import { NextResponse } from "next/server";
import { isDomainError, statusForCode, type ErrorCode, type ErrorData } from "@/lib/error-codes";

export function ok<T>(data: T, init?: ResponseInit) {
  return new NextResponse(JSON.stringify({ success: true, data }), {
    ...init,
    status: init?.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

// Shape per PLAN/API-CONTRACT.md: { success: false, error: { code, message, data? } }.
// `data` nests inside `error` (contract §11: VALIDATION_ERROR carries per-field detail).
export function fail(code: ErrorCode, message: string, options?: { status?: number; data?: ErrorData }) {
  const error: { code: ErrorCode; message: string; data?: ErrorData } = { code, message };
  if (options?.data) error.data = options.data;
  return new NextResponse(JSON.stringify({ success: false, error }), {
    status: options?.status ?? statusForCode(code),
    headers: { "Content-Type": "application/json" },
  });
}

// One mapper for every route catch block: DomainError keeps its code/status/data, anything
// else becomes a generic INTERNAL_ERROR so Google API internals never reach the client.
export function handleRouteError(error: unknown, fallbackMessage: string) {
  if (isDomainError(error)) {
    return fail(error.code, error.message, { status: error.status, data: error.data });
  }
  console.error("[myshift] unhandled route error:", error);
  return fail("INTERNAL_ERROR", fallbackMessage);
}
