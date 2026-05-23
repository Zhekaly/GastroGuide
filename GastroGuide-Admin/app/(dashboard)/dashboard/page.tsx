"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  ClipboardList,
  ListTree,
  MessageSquare,
  Star,
  Store,
  Tag,
  Users,
} from "lucide-react";
import Link from "next/link";

import { dashboardApi } from "@/lib/api/endpoints";
import { useCurrentActor } from "@/lib/hooks/use-current-actor";
import { formatDate, formatNumber } from "@/lib/utils";

import { ModeratorDashboard } from "@/app/(dashboard)/dashboard/moderator-dashboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const actor = useCurrentActor();

  // Модератор без прав админа видит свой урезанный лендинг.
  const showModeratorLanding = !actor.isLoading && actor.isModerator && !actor.isAdmin;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.overview,
    enabled: !showModeratorLanding && !actor.isLoading,
  });

  if (showModeratorLanding) {
    return <ModeratorDashboard />;
  }

  if (actor.isLoading || isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-destructive">
        Не удалось загрузить статистику. Проверь, что backend запущен и токен админа валиден.
      </div>
    );
  }

  const stats = data.stats;

  const cards = [
    {
      icon: Store,
      label: "Заведения",
      value: stats.total_restaurants,
      hint: `${stats.visible_restaurants} активных, ${stats.hidden_restaurants} скрытых`,
    },
    {
      icon: Users,
      label: "Пользователи",
      value: stats.total_users,
      hint: `${stats.active_users} активных · ${stats.admin_users} админов`,
    },
    {
      icon: MessageSquare,
      label: "Отзывы",
      value: stats.total_reviews,
      hint: `Средняя оценка: ${stats.average_rating ?? "—"}`,
    },
    {
      icon: Tag,
      label: "Активные акции",
      value: stats.active_offers,
      hint: `Всего акций: ${stats.total_offers}`,
    },
    {
      icon: Bot,
      label: "AI-запросы",
      value: stats.total_ai_messages,
      hint: `${stats.total_ai_sessions} сессий, ${stats.empty_ai_sessions} пустых`,
    },
    {
      icon: Star,
      label: "Сейчас открыто",
      value: stats.currently_open_restaurants,
      hint: "Динамический подсчёт",
    },
    {
      icon: ClipboardList,
      label: "Блюд в меню",
      value: stats.total_menu_items,
    },
    {
      icon: ListTree,
      label: "Категории",
      value: stats.total_categories,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Дашборд</h1>
        <p className="text-muted-foreground">Общая статистика GastroGuide</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(card.value)}</div>
                {card.hint && (
                  <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Топ заведений</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.top_restaurants.length === 0 && (
              <p className="text-sm text-muted-foreground">Нет данных</p>
            )}
            {data.top_restaurants.map((r) => (
              <Link
                key={r.id}
                href={`/restaurants/${r.id}`}
                className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent"
              >
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.type}</div>
                </div>
                <Badge variant="secondary">★ {r.rating.toFixed(1)} · {r.reviews}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Низкий рейтинг</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.low_rated_restaurants.length === 0 && (
              <p className="text-sm text-muted-foreground">Все рестораны имеют хороший рейтинг</p>
            )}
            {data.low_rated_restaurants.map((r) => (
              <Link
                key={r.id}
                href={`/restaurants/${r.id}`}
                className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent"
              >
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.type}</div>
                </div>
                <Badge variant="destructive">★ {r.rating.toFixed(1)} · {r.reviews}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Последние отзывы</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recent_reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">Отзывов пока нет</p>
          ) : (
            <div className="space-y-3">
              {data.recent_reviews.map((review) => (
                <div key={review.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {review.author_name ?? "Аноним"} →{" "}
                        <Link
                          href={`/restaurants/${review.restaurant_id}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {review.restaurant_name ?? "Удалённое заведение"}
                        </Link>
                      </div>
                      <p className="mt-1 text-sm">{review.text}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant={review.rating >= 4 ? "success" : "warning"}>
                        ★ {review.rating}
                      </Badge>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDate(review.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
