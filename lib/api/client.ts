import { env } from "@/lib/env";

// Thin fetch wrapper. Phase 3 will add auth headers + refresh-token retry.
// Phase 2 keeps it minimal: build URLs, parse JSON, surface errors uniformly.

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

export async function api<T = unknown>(
  path: string,
  init: JsonInit = {},
): Promise<T> {
  const { json, query, headers, ...rest } = init;
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
    // Send + accept httpOnly auth cookies across origins.
    credentials: "include",
  });
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
