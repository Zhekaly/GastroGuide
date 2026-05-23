"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  EyeOff,
  MessageSquare,
  Star,
  Store,
  Tag,
} from "lucide-react";
import Link from "next/link";

import { restaurantsApi } from "@/lib/api/endpoints";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Главная страница модератора. Бэкенд `restaurantsApi.list` уже scoped —
 * вернёт ему только его заведения.
 */
export function ModeratorDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["restaurants", "moderator-landing"],
    queryFn: () => restaurantsApi.list({ page: 1, page_size: 50 }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-destructive">
        Не удалось загрузить заведения. Попробуйте обновить страницу.
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Мои заведения</h1>
        <p className="text-muted-foreground">
          Управляйте данными, меню и акциями назначенных вам заведений.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center space-y-2">
            <Store className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="font-medium">Заведения ещё не назначены</p>
            <p className="text-sm text-muted-foreground">
              Обратитесь к администратору, чтобы он привязал ваш аккаунт к
              заведениям.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((r) => (
            <Card key={r.id} className="flex flex-col">
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">
                    <Link
                      href={`/restaurants/${r.id}`}
                      className="hover:underline"
                    >
                      {r.name}
                    </Link>
                  </CardTitle>
                  {r.is_hidden ? (
                    <Badge variant="secondary" className="gap-1">
                      <EyeOff className="h-3 w-3" /> скрыто
                    </Badge>
                  ) : (
                    <Badge variant="success">видно</Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{r.type}</span>
                  {r.category_label && <span>· {r.category_label}</span>}
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-500" />
                    {r.rating?.toFixed?.(1) ?? "—"} ({r.reviews})
                  </span>
                </div>
              </CardHeader>
              <CardContent className="mt-auto space-y-1.5">
                <Link
                  href={`/restaurants/${r.id}`}
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Store className="h-4 w-4" /> Открыть карточку
                </Link>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                  <Link
                    href={`/menu?restaurant_id=${r.id}`}
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <ClipboardList className="h-3.5 w-3.5" /> Меню
                  </Link>
                  <Link
                    href={`/offers?restaurant_id=${r.id}`}
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Tag className="h-3.5 w-3.5" /> Акции
                  </Link>
                  <Link
                    href={`/reviews?restaurant_id=${r.id}`}
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Отзывы
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
