"use client";

import { useQuery } from "@tanstack/react-query";

import { authApi } from "@/lib/api/endpoints";
import type { ModeratorRestaurantInfo } from "@/lib/api/types";

export interface CurrentActor {
  isLoading: boolean;
  isError: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  /** id и имя — для виджетов, которые рендерят список заведений модератора. */
  moderatedRestaurants: ModeratorRestaurantInfo[];
  /** Только id — удобно для проверок в фильтрах. */
  moderatedRestaurantIds: number[];
  /** Имя пользователя, если /me удалось прочитать. */
  name: string | null;
  email: string | null;
}

/**
 * Единый хук, читающий GET /admin/auth/me и возвращающий компактный объект
 * для условного рендеринга по роли. Кэшируется React Query под ключом
 * ["admin","me"] — этот же ключ можно инвалидировать после смены роли.
 */
export function useCurrentActor(): CurrentActor {
  const query = useQuery({
    queryKey: ["admin", "me"],
    queryFn: () => authApi.me(),
    staleTime: 60_000,
    // не трогаем сетку каждые 30с — для роли это статично в рамках сессии
    refetchOnWindowFocus: false,
  });

  const me = query.data;

  const moderatedRestaurants = me?.moderated_restaurants ?? [];

  return {
    isLoading: query.isLoading,
    isError: query.isError,
    isAdmin: me?.is_admin === true,
    isModerator: me?.is_moderator === true,
    moderatedRestaurants,
    moderatedRestaurantIds: moderatedRestaurants.map((r) => r.id),
    name: me?.name ?? null,
    email: me?.email ?? null,
  };
}
