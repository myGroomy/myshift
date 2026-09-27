export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly data?: unknown;

  constructor(message: string, status: number, code?: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type") && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...init, headers });

  if (response.status === 401 && typeof window !== "undefined") {
    if (!window.location.pathname.startsWith("/login")) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?next=${next}`;
    }
  }

  const text = await response.text();
  let body: { success?: boolean; data?: T; error?: { code?: string; message?: string; data?: unknown } } | null = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON response (e.g. 500 HTML or 405 Method Not Allowed)
    throw new ApiError(
      response.ok ? "Format data server tidak valid" : `Server error (${response.status})`,
      response.status
    );
  }

  if (!response.ok || !body?.success) {
    const errObj = body?.error;
    const message = errObj?.message || `Request gagal (${response.status})`;
    throw new ApiError(message, response.status, errObj?.code, errObj?.data);
  }

  return body.data as T;
}
