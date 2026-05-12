"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { Eye, EyeOff, Plus, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { restaurantsApi } from "@/lib/api/endpoints";
import type { RestaurantListItem } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";

import { DataTable } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function RestaurantsPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [visibility, setVisibility] = useState<"all" | "visible" | "hidden">("all");
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<RowSelectionState>({});

  const filters = useMemo(
    () => ({
      q: q || undefined,
      is_hidden:
        visibility === "all" ? null : visibility === "hidden" ? true : false,
      page,
      page_size: 20,
    }),
    [q, visibility, page],
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["restaurants", filters],
    queryFn: () => restaurantsApi.list(filters),
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: (id: number) => restaurantsApi.toggleVisibility(id),
    onSuccess: () => {
      toast.success("Видимость изменена");
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Ошибка"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => restaurantsApi.remove(id),
    onSuccess: () => {
      toast.success("Удалено");
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Ошибка"),
  });

  const bulkMutation = useMutation({
    mutationFn: (action: "hide" | "show" | "delete" | "recalculate") =>
      restaurantsApi.bulk(
        Object.keys(selection).map((id) => Number(id)),
        action,
      ),
    onSuccess: (response) => {
      toast.success(response.message);
      setSelection({});
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Ошибка"),
  });

  const columns = useMemo<ColumnDef<RestaurantListItem, unknown>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
          />
        ),
        size: 40,
      },
      {
        accessorKey: "name",
        header: "Название",
        cell: ({ row }) => (
          <Link
            href={`/restaurants/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "type",
        header: "Тип",
      },
      {
        accessorKey: "category_label",
        header: "Категория",
        cell: ({ row }) => row.original.category_label ?? "—",
      },
      {
        accessorKey: "rating",
        header: "Рейтинг",
        cell: ({ row }) => (
          <Badge variant="secondary">
            ★ {row.original.rating.toFixed(1)} · {row.original.reviews}
          </Badge>
        ),
      },
      {
        id: "status",
        header: "Статус",
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Badge variant={row.original.open ? "success" : "warning"}>
              {row.original.open ? "Открыт" : "Закрыт"}
            </Badge>
            {row.original.is_hidden && <Badge variant="destructive">Скрыт</Badge>}
          </div>
        ),
      },
      {
        accessorKey: "updated_at",
        header: "Обновлён",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.updated_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="text-right block">Действия</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleVisibilityMutation.mutate(row.original.id)}
              title={row.original.is_hidden ? "Показать" : "Скрыть"}
            >
              {row.original.is_hidden ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm(`Удалить "${row.original.name}"?`)) {
                  deleteMutation.mutate(row.original.id);
                }
              }}
              title="Удалить"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [toggleVisibilityMutation, deleteMutation],
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / 20));
  const selectedIds = Object.keys(selection);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Заведения</h1>
          <p className="text-muted-foreground">Управление ресторанами GastroGuide</p>
        </div>
        <Button asChild>
          <Link href="/restaurants/new">
            <Plus className="h-4 w-4" />
            Добавить
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Поиск..."
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setPage(1);
              }}
              className="max-w-xs"
            />
            <Select
              value={visibility}
              onValueChange={(value) => {
                setVisibility(value as typeof visibility);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="visible">Только видимые</SelectItem>
                <SelectItem value="hidden">Только скрытые</SelectItem>
              </SelectContent>
            </Select>

            {selectedIds.length > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Выбрано: {selectedIds.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => bulkMutation.mutate("hide")}
                  disabled={bulkMutation.isPending}
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  Скрыть
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => bulkMutation.mutate("show")}
                  disabled={bulkMutation.isPending}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Показать
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => bulkMutation.mutate("recalculate")}
                  disabled={bulkMutation.isPending}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Пересчитать ★
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Удалить ${selectedIds.length} заведений?`)) {
                      bulkMutation.mutate("delete");
                    }
                  }}
                  disabled={bulkMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Удалить
                </Button>
              </div>
            )}
          </div>

          {isError && (
            <p className="text-destructive">Не удалось загрузить список заведений.</p>
          )}

          <DataTable
            data={items}
            columns={columns}
            emptyMessage={isLoading ? "Загрузка..." : "Заведений не найдено"}
            rowSelection={selection}
            onRowSelectionChange={setSelection}
            getRowId={(row) => String(row.id)}
          />

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Всего: {total}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
