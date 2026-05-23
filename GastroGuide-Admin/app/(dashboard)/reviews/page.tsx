"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { reviewsApi } from "@/lib/api/endpoints";
import type { ReviewAdmin } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";

import { DataTable } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [ratingLte, setRatingLte] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["reviews", q, ratingLte, page],
    queryFn: () =>
      reviewsApi.list({
        q: q || undefined,
        rating_lte: ratingLte === "all" ? null : Number(ratingLte),
        page,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => reviewsApi.remove(id),
    onSuccess: () => {
      toast.success("Отзыв удалён, рейтинг ресторана пересчитан");
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Ошибка"),
  });

  const columns = useMemo<ColumnDef<ReviewAdmin, unknown>[]>(
    () => [
      {
        accessorKey: "rating",
        header: "Оценка",
        cell: ({ row }) => (
          <Badge variant={row.original.rating >= 4 ? "success" : "warning"}>
            ★ {row.original.rating}
          </Badge>
        ),
      },
      {
        accessorKey: "author_name",
        header: "Автор",
        cell: ({ row }) => row.original.author_name ?? "Аноним",
      },
      {
        accessorKey: "restaurant_name",
        header: "Заведение",
        cell: ({ row }) =>
          row.original.restaurant_name ? (
            <Link
              href={`/restaurants/${row.original.restaurant_id}`}
              className="hover:underline"
            >
              {row.original.restaurant_name}
            </Link>
          ) : (
            "Удалено"
          ),
      },
      {
        accessorKey: "text",
        header: "Текст",
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-md">{row.original.text}</span>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Дата",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm("Удалить отзыв?")) deleteMutation.mutate(row.original.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        ),
      },
    ],
    [deleteMutation],
  );

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Отзывы</h1>
        <p className="text-muted-foreground">Модерация пользовательских отзывов</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Поиск по тексту/автору"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="max-w-xs"
            />
            <Select
              value={ratingLte}
              onValueChange={(value) => {
                setRatingLte(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Все оценки" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все оценки</SelectItem>
                <SelectItem value="2">Низкие (≤ 2★)</SelectItem>
                <SelectItem value="3">Средние и ниже (≤ 3★)</SelectItem>
                <SelectItem value="4">Хорошие и ниже (≤ 4★)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DataTable
            data={data?.items ?? []}
            columns={columns}
            emptyMessage={isLoading ? "Загрузка..." : "Отзывов нет"}
            getRowId={(row) => String(row.id)}
          />

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Всего: {total}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Назад
              </Button>
              <span className="text-sm">
                {page} / {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => p + 1)}
              >
                Вперёд
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
