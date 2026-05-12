"use client";

import {
  ADMIN_ACCESS_TOKEN_COOKIE,
  ADMIN_REFRESH_TOKEN_COOKIE,
} from "@/lib/api/config";

const ACCESS_MAX_AGE = 60 * 60 * 8; // 8 часов
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30 дней

function buildCookie(name: string, value: string, maxAge: number): string {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  return [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "SameSite=Lax",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function setAdminTokens(access: string, refresh: string): void {
  if (typeof document === "undefined") return;
  document.cookie = buildCookie(ADMIN_ACCESS_TOKEN_COOKIE, access, ACCESS_MAX_AGE);
  document.cookie = buildCookie(ADMIN_REFRESH_TOKEN_COOKIE, refresh, REFRESH_MAX_AGE);
}

export function clearAdminTokens(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ADMIN_ACCESS_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  document.cookie = `${ADMIN_REFRESH_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
