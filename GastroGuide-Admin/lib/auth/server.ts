// Серверные helpers для проверки авторизации админа.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { authApi } from "@/lib/api/endpoints";
import { ADMIN_ACCESS_TOKEN_COOKIE } from "@/lib/api/config";
import type { AdminMe } from "@/lib/api/types";

export async function getCurrentAdmin(): Promise<AdminMe | null> {
  const store = await cookies();
  const token = store.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;

  try {
    return await authApi.me();
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<AdminMe> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/login");
  }
  return admin;
}
