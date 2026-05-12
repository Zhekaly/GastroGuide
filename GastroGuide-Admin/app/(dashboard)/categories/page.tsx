"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { categoriesApi } from "@/lib/api/endpoints";
import type { CategoryAdmin } from "@/lib/api/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [newLabel, setNewLabel] = useState("");

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      categoriesApi.create({ label: newLabel, sort_order: categories.length }),
    onSuccess: () => {
      toast.success("Категория создана");
      setNewLabel("");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Ошибка"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoriesApi.remove(id),
    onSuccess: () => {
      toast.success("Удалено");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (ordered_ids: number[]) => categoriesApi.reorder(ordered_ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  function move(category: CategoryAdmin, direction: -1 | 1) {
    const ids = categories.map((c) => c.id);
    const index = ids.indexOf(category.id);
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= ids.length) return;
    const next = [...ids];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    reorderMutation.mutate(next);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Категории</h1>
        <p className="text-muted-foreground">
          Категории, по которым фильтруются заведения в мобильном приложении
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Название новой категории"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newLabel.trim()) createMutation.mutate();
              }}
            />
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newLabel.trim() || createMutation.isPending}
            >
              <Plus className="h-4 w-4" />
              Создать
            </Button>
          </div>

          {isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

          <div className="space-y-2">
            {categories.map((c, index) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-md border p-3"
              >
                <span className="text-xs font-mono text-muted-foreground w-8">
                  #{c.sort_order}
                </span>
                <span className="flex-1 font-medium">{c.label}</span>
                <Badge variant="secondary">{c.restaurants_count} заведений</Badge>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => move(c, -1)}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => move(c, 1)}
                    disabled={index === categories.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Удалить категорию "${c.label}"?`)) {
                        deleteMutation.mutate(c.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
