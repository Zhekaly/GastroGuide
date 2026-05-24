"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Star, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { menuApi, restaurantsApi } from "@/lib/api/endpoints";
import type { MenuItemAdmin } from "@/lib/api/types";

import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MenuPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const initialRestaurantId = useMemo(() => {
    const raw = searchParams.get("restaurant_id");
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }, [searchParams]);
  const [restaurantId, setRestaurantId] = useState<number | null>(initialRestaurantId);

  const { data: restaurants } = useQuery({
    queryKey: ["restaurants-all"],
    queryFn: () => restaurantsApi.list({ page_size: 200 }),
  });

  const { data: menu = [], isLoading } = useQuery({
    queryKey: ["menu", restaurantId],
    queryFn: () => menuApi.list(restaurantId),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => menuApi.remove(id),
    onSuccess: () => {
      toast.success("Блюдо удалено");
      queryClient.invalidateQueries({ queryKey: ["menu"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Ошибка"),
  });

  const togglePopular = useMutation({
    mutationFn: ({ id, popular }: { id: number; popular: boolean }) =>
      menuApi.update(id, { popular }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Ошибка"),
  });

  const columns = useMemo<ColumnDef<MenuItemAdmin, unknown>[]>(
    () => [
      {
        id: "image",
        header: "Фото",
        size: 80,
        cell: ({ row }) =>
          row.original.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.original.image_url}
              alt={row.original.name}
              className="h-10 w-10 rounded-md object-cover border"
            />
          ) : (
            <div className="h-10 w-10 rounded-md border bg-muted flex items-center justify-center">
              <span>{row.original.emoji}</span>
            </div>
          ),
      },
      { accessorKey: "emoji", header: "🍽", size: 60 },
      { accessorKey: "name", header: "Название" },
      { accessorKey: "price", header: "Цена" },
      {
        accessorKey: "restaurant_id",
        header: "Заведение",
        cell: ({ row }) => {
          const r = restaurants?.items.find((r) => r.id === row.original.restaurant_id);
          return r?.name ?? `#${row.original.restaurant_id}`;
        },
      },
      {
        accessorKey: "popular",
        header: "Популярное",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              togglePopular.mutate({
                id: row.original.id,
                popular: !row.original.popular,
              })
            }
          >
            <Star
              className={`h-4 w-4 ${
                row.original.popular ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
              }`}
            />
          </Button>
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
              if (confirm(`Удалить "${row.original.name}"?`)) {
                deleteMutation.mutate(row.original.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        ),
      },
    ],
    [restaurants, togglePopular, deleteMutation],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Меню</h1>
        <p className="text-muted-foreground">Управление пунктами меню</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <Select
              value={restaurantId ? String(restaurantId) : "all"}
              onValueChange={(value) =>
                setRestaurantId(value === "all" ? null : Number(value))
              }
            >
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Все заведения" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все заведения</SelectItem>
                {restaurants?.items.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DataTable
            data={menu}
            columns={columns}
            emptyMessage={isLoading ? "Загрузка..." : "Нет блюд"}
            getRowId={(row) => String(row.id)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
