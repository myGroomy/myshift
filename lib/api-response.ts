import { NextResponse } from "next/server";

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

export function fail(code: string, message: string, status: number, extra?: Record<string, unknown>) {
  const body = { success: false, error: { code, message } };
  if (extra) Object.assign(body, extra);
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
