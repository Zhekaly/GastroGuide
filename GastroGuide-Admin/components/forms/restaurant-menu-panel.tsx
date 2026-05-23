"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { menuApi } from "@/lib/api/endpoints";
import type { MenuItemAdmin } from "@/lib/api/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type InitialMenuItem = Pick<MenuItemAdmin, "id" | "name" | "price" | "emoji" | "popular" | "sort_order">;

interface RestaurantMenuPanelProps {
  restaurantId: number;
  initialMenu?: InitialMenuItem[];
}

export function RestaurantMenuPanel({
  restaurantId,
  initialMenu,
}: RestaurantMenuPanelProps) {
  const queryClient = useQueryClient();

  const initialAsAdmin: MenuItemAdmin[] | undefined = initialMenu?.map((m) => ({
    ...m,
    restaurant_id: restaurantId,
  }));

  const { data: menu = [] } = useQuery({
    queryKey: ["menu", restaurantId],
    queryFn: () => menuApi.list(restaurantId),
    initialData: initialAsAdmin,
  });

  const [draft, setDraft] = useState({
    name: "",
    price: "",
    emoji: "🍽️",
  });

  const createMutation = useMutation({
    mutationFn: () =>
      menuApi.create({
        restaurant_id: restaurantId,
        name: draft.name,
        price: draft.price,
        emoji: draft.emoji,
        popular: false,
        sort_order: menu.length,
      }),
    onSuccess: () => {
      toast.success("Блюдо добавлено");
      setDraft({ name: "", price: "", emoji: "🍽️" });
      queryClient.invalidateQueries({ queryKey: ["menu", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["restaurant", restaurantId] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Ошибка"),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<{ name: string; price: string; popular: boolean; sort_order: number }>;
    }) => menuApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["restaurant", restaurantId] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Ошибка"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => menuApi.remove(id),
    onSuccess: () => {
      toast.success("Удалено");
      queryClient.invalidateQueries({ queryKey: ["menu", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["restaurant", restaurantId] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Ошибка"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Меню</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {menu.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-md border p-3"
            >
              <Input
                defaultValue={item.emoji}
                readOnly
                className="w-16 text-center"
              />
              <Input
                defaultValue={item.name}
                onBlur={(event) =>
                  event.target.value !== item.name &&
                  updateMutation.mutate({
                    id: item.id,
                    data: { name: event.target.value },
                  })
                }
                className="flex-1"
              />
              <Input
                defaultValue={item.price}
                onBlur={(event) =>
                  event.target.value !== item.price &&
                  updateMutation.mutate({
                    id: item.id,
                    data: { price: event.target.value },
                  })
                }
                className="w-28"
              />
              <div className="flex items-center gap-2">
                <Star
                  className={`h-4 w-4 ${
                    item.popular ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
                  }`}
                />
                <Switch
                  checked={item.popular}
                  onCheckedChange={(value) =>
                    updateMutation.mutate({
                      id: item.id,
                      data: { popular: value },
                    })
                  }
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm(`Удалить "${item.name}"?`)) {
                    deleteMutation.mutate(item.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <div className="rounded-md border border-dashed p-3">
          <div className="flex items-center gap-3">
            <Input
              value={draft.emoji}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, emoji: event.target.value }))
              }
              maxLength={4}
              className="w-16 text-center"
            />
            <Input
              placeholder="Название блюда"
              value={draft.name}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, name: event.target.value }))
              }
              className="flex-1"
            />
            <Input
              placeholder="Цена"
              value={draft.price}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, price: event.target.value }))
              }
              className="w-28"
            />
            <Button
              type="button"
              disabled={!draft.name || !draft.price || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              <Plus className="h-4 w-4" />
              Добавить
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
