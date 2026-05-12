// Универсальный fetch-клиент админ-API.
// Работает и на сервере (читает токен из cookies()), и на клиенте (читает из document.cookie).

import { ADMIN_ACCESS_TOKEN_COOKIE, ADMIN_API_BASE } from "@/lib/api/config";

type FetcherInit = Omit<RequestInit, "body"> & {
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public payload?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

function getAccessTokenClient(): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${ADMIN_ACCESS_TOKEN_COOKIE}=`));

  if (!match) return null;
  return decodeURIComponent(match.split("=")[1] ?? "");
}

async function getAccessTokenServer(): Promise<string | null> {
  try {
    const { cookies } = await import("next/headers");
    const store = await cookies();
    return store.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

async function resolveAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") {
    return getAccessTokenServer();
  }
  return getAccessTokenClient();
}

function buildQueryString(query?: FetcherInit["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function apiFetch<T = unknown>(
  path: string,
  init: FetcherInit = {},
): Promise<T> {
  const { body, query, headers, method, ...rest } = init;

  const token = await resolveAccessToken();

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers as Record<string, string> | undefined),
  };

  const url = `${ADMIN_API_BASE}${path}${buildQueryString(query)}`;

  const response = await fetch(url, {
    ...rest,
    method: method ?? (body !== undefined ? "POST" : "GET"),
    headers: finalHeaders,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? (body as FormData)
          : JSON.stringify(body),
    cache: "no-store",
  });

  let payload: unknown = null;
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    payload = await response.json().catch(() => null);
  } else if (response.status !== 204) {
    payload = await response.text().catch(() => null);
  }

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && "detail" in payload
        ? String((payload as { detail: unknown }).detail)
        : null) ?? `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, payload);
  }

  return payload as T;
}
