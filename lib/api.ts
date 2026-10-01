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

const inFlightGetRequests = new Map<string, Promise<unknown>>();
let sessionCache: { data: unknown; timestamp: number } | null = null;
const SESSION_CACHE_TTL_MS = 10000;

export function clearSessionCache() {
  sessionCache = null;
}

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const isGet = method === "GET";
  const isSessionGet = isGet && url === "/api/auth/session";

  if (typeof window !== "undefined" && !isGet && url.startsWith("/api/auth/")) {
    clearSessionCache();
  }

  if (typeof window !== "undefined" && isSessionGet) {
    if (sessionCache && Date.now() - sessionCache.timestamp < SESSION_CACHE_TTL_MS) {
      return sessionCache.data as T;
    }
  }

  if (typeof window !== "undefined" && isGet) {
    const existing = inFlightGetRequests.get(url);
    if (existing) {
      return existing as Promise<T>;
    }
  }

  const executeRequest = async (): Promise<T> => {
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

    if (typeof window !== "undefined" && isSessionGet) {
      sessionCache = { data: body.data, timestamp: Date.now() };
    }

    return body.data as T;
  };

  if (typeof window !== "undefined" && isGet) {
    const promise = executeRequest().finally(() => {
      inFlightGetRequests.delete(url);
    });
    inFlightGetRequests.set(url, promise);
    return promise;
  }

  return executeRequest();
}

