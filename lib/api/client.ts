import { env } from "@/lib/env";

// Thin fetch wrapper.
// On 401 we transparently attempt a refresh via POST /auth/refresh and
// retry the original request once. If refresh fails the user is sent to
// /login. Concurrent 401s share a single in-flight refresh promise.

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type JsonInit = Omit<RequestInit, "body"> & {
  json?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  /** Internal — prevents recursive refresh loops. */
  _skipRefresh?: boolean;
};

function buildUrl(
  path: string,
  query?: JsonInit["query"],
): string {
  const base = env.apiUrl.replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  if (!query) return `${base}${suffix}`;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    params.append(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${base}${suffix}?${qs}` : `${base}${suffix}`;
}

// Shared in-flight refresh promise so 10 simultaneous 401s share one
// refresh call instead of stampeding.
let refreshInFlight: Promise<boolean> | null = null;

function isAuthEndpoint(path: string): boolean {
  return path.startsWith("/auth/") || path === "/auth";
}

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${env.apiUrl}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      // Clear after a microtask so concurrent callers all see the resolved
      // promise; subsequent 401s after this resolves will start a new one.
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();
  return refreshInFlight;
}

function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/login")) return;
  if (window.location.pathname.startsWith("/signup")) return;
  window.location.href = "/login";
}

export async function api<T = unknown>(
  path: string,
  init: JsonInit = {},
): Promise<T> {
  const { json, query, headers, _skipRefresh, ...rest } = init;
  const url = buildUrl(path, query);

  const finalHeaders = new Headers(headers);
  let body: BodyInit | undefined;
  if (json !== undefined) {
    finalHeaders.set("Content-Type", "application/json");
    body = JSON.stringify(json);
  }

  const res = await fetch(url, {
    ...rest,
    headers: finalHeaders,
    body,
    credentials: "include",
  });

  // 401: try refresh once, then retry original. Skip for auth endpoints
  // (refresh, login, signup) and for retried requests to avoid loops.
  if (res.status === 401 && !_skipRefresh && !isAuthEndpoint(path)) {
    const ok = await tryRefresh();
    if (ok) {
      return api<T>(path, { ...init, _skipRefresh: true });
    }
    // Refresh failed — silent logout. Purge session storage so the gate
    // redirects, navigate to /login, and return a never-resolving promise
    // so the caller (and any React component bound to it) never sees an
    // error banner during the navigation window.
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("vps-mgr.connection");
      } catch {}
    }
    redirectToLogin();
    return new Promise<T>(() => {
      /* never resolves — page is navigating */
    });
  }

  const text = await res.text();
  let parsed: unknown = text;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      // leave as text
    }
  }

  if (!res.ok) {
    const message =
      (parsed && typeof parsed === "object" && "detail" in parsed
        ? String((parsed as { detail: unknown }).detail)
        : null) ?? `HTTP ${res.status}`;
    throw new ApiError(message, res.status, parsed);
  }

  return parsed as T;
}
