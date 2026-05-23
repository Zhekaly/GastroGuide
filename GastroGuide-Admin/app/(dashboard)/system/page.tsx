"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, RefreshCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { systemApi } from "@/lib/api/endpoints";
import type { BrokenRestaurant } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ISSUE_LABELS: Record<string, string> = {
  missing_coordinates: "Нет координат",
  missing_photos: "Нет фото",
  missing_menu: "Нет меню",
  invalid_working_hours: "Часы работы невалидны",
  empty_description: "Пустое описание",
};

export default function SystemPage() {
  const queryClient = useQueryClient();

  const {
    data: broken,
    isError: brokenError,
    refetch: refetchBroken,
  } = useQuery({
    queryKey: ["broken-restaurants"],
    queryFn: systemApi.broken,
  });

  const {
    data: logs,
    isError: logsError,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: ["activity-log"],
    queryFn: () => systemApi.activityLog({ page_size: 50 }),
  });

  const recalcMutation = useMutation({
    mutationFn: () => systemApi.recalcAll(),
    onSuccess: (response) => {
      toast.success(response.message);
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Не удалось пересчитать рейтинги"),
  });

  const resetSequencesMutation = useMutation({
    mutationFn: () => systemApi.resetSequences(),
    onSuccess: (response) => {
      const parts = Object.entries(response.result)
        .filter(([, value]) => value >= 0)
        .map(([table, value]) => `${table}: ${value}`)
        .join(", ");
      toast.success(`Счётчики БД синхронизированы. ${parts}`);
      queryClient.invalidateQueries({ queryKey: ["activity-log"] });
    },
    onError: () => {
      toast.error("Не удалось сбросить sequences");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Система</h1>
          <p className="text-muted-foreground">
            Состояние данных, журнал действий и сервисные операции
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (
                confirm(
                  "Сбросить счётчики БД? Это сбросит автоинкременты после массовых удалений. Действие безопасное, но необратимое.",
                )
              ) {
                resetSequencesMutation.mutate();
              }
            }}
            disabled={resetSequencesMutation.isPending}
          >
            <Database className="h-4 w-4" />
            Сбросить счётчики БД
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (
                confirm(
                  "Пересчитать рейтинги всех заведений? Это может занять время на больших данных.",
                )
              ) {
                recalcMutation.mutate();
              }
            }}
            disabled={recalcMutation.isPending}
          >
            <RefreshCw className="h-4 w-4" />
            Пересчитать все рейтинги
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Проблемные заведения{" "}
            {broken && <Badge variant="secondary">{broken.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {brokenError && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-destructive">Не удалось загрузить список.</p>
              <Button variant="outline" size="sm" onClick={() => refetchBroken()}>
                Повторить
              </Button>
            </div>
          )}
          {!brokenError && broken?.length === 0 && (
            <p className="text-sm text-muted-foreground">Все заведения в порядке.</p>
          )}
          {!brokenError && broken?.map((item: BrokenRestaurant) => (
            <div
              key={item.restaurant_id}
              className="flex items-center justify-between rounded-md border p-3 flex-wrap gap-2"
            >
              <Link
                href={`/restaurants/${item.restaurant_id}`}
                className="font-medium hover:underline"
              >
                {item.restaurant_name}
              </Link>
              <div className="flex flex-wrap gap-1">
                {item.issues.map((issue) => (
                  <Badge key={issue} variant="warning">
                    {ISSUE_LABELS[issue] ?? issue}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Журнал действий администраторов</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {logsError && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-destructive">Не удалось загрузить журнал.</p>
              <Button variant="outline" size="sm" onClick={() => refetchLogs()}>
                Повторить
              </Button>
            </div>
          )}
          {!logsError && logs?.items.length === 0 && (
            <p className="text-sm text-muted-foreground">Журнал пуст.</p>
          )}
          {!logsError && logs?.items.map((log) => (
            <div
              key={log.id}
              className="flex items-start justify-between gap-3 rounded-md border p-3"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">
                  <Badge variant="secondary" className="mr-2">
                    {log.action}
                  </Badge>
                  {log.description ?? "—"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {log.admin_name ?? "system"} · {log.entity_type}
                  {log.entity_id ? ` · #${log.entity_id}` : ""}
                </div>
              </div>
              <div className="text-xs text-muted-foreground shrink-0">
                {formatDate(log.created_at)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
