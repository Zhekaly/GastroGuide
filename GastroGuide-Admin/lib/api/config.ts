export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

export const ADMIN_API_BASE = `${API_URL}/api/v1/admin`;

export const ADMIN_ACCESS_TOKEN_COOKIE = "gg_admin_access";
export const ADMIN_REFRESH_TOKEN_COOKIE = "gg_admin_refresh";
