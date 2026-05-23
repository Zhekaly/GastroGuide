"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { useCurrentActor } from "@/lib/hooks/use-current-actor";

/**
 * Список префиксов URL, доступных только администратору. Модератор будет
 * редиректнут на /dashboard, если попытается зайти прямой ссылкой.
 * Бэкенд тоже их защищает (403), но UX лучше с редиректом.
 */
const ADMIN_ONLY_PREFIXES = [
  "/users",
  "/categories",
  "/ai",
  "/system",
];

/**
 * Невидимый guard, который монтируется в admin-layout. Срабатывает на каждой
 * смене pathname: если текущий путь admin-only и пользователь не админ —
 * редирект на /dashboard и тост-объяснение.
 */
export function RoleGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const actor = useCurrentActor();

  useEffect(() => {
    if (actor.isLoading) return;
    if (actor.isAdmin) return;

    const blocked = ADMIN_ONLY_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

    if (blocked) {
      toast.error("Этот раздел доступен только администратору");
      router.replace("/dashboard");
    }
  }, [pathname, actor.isLoading, actor.isAdmin, router]);

  return null;
}
