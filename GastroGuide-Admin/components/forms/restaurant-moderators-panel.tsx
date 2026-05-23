"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Shield, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { usersApi } from "@/lib/api/endpoints";
import type { UserAdmin, UserUpdate } from "@/lib/api/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface RestaurantModeratorsPanelProps {
  restaurantId: number;
  restaurantName: string;
}

export function RestaurantModeratorsPanel({
  restaurantId,
  restaurantName,
}: RestaurantModeratorsPanelProps) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  // Все модераторы (на бэке роль moderator), затем фильтруем по
  // moderated_restaurants на фронте.
  const moderatorsQuery = useQuery({
    queryKey: ["users", "moderators-all"],
    queryFn: () =>
      usersApi.list({ role: "moderator", page: 1, page_size: 200 }),
  });

  const allModerators = moderatorsQuery.data?.items ?? [];

  const assigned = useMemo(
    () =>
      allModerators.filter((u) =>
        (u.moderated_restaurants ?? []).some((r) => r.id === restaurantId),
      ),
    [allModerators, restaurantId],
  );

  const available = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return allModerators
      .filter(
        (u) =>
          !(u.moderated_restaurants ?? []).some((r) => r.id === restaurantId),
      )
      .filter((u) => {
        if (!q) return true;
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
        );
      });
  }, [allModerators, restaurantId, searchQ]);

  const patchMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserUpdate }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      toast.success("Список модераторов обновлён");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Ошибка"),
  });

  const addModerator = (user: UserAdmin) => {
    const currentIds = (user.moderated_restaurants ?? []).map((r) => r.id);
    const nextIds = Array.from(new Set([...currentIds, restaurantId]));
    patchMutation.mutate({
      id: user.id,
      data: { moderated_restaurant_ids: nextIds },
    });
    setAddOpen(false);
    setSearchQ("");
  };

  const removeModerator = (user: UserAdmin) => {
    if (
      !confirm(
        `Снять ${user.email} с модерации "${restaurantName}"?`,
      )
    ) {
      return;
    }
    const nextIds = (user.moderated_restaurants ?? [])
      .map((r) => r.id)
      .filter((id) => id !== restaurantId);
    patchMutation.mutate({
      id: user.id,
      data: { moderated_restaurant_ids: nextIds },
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" /> Модераторы заведения
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Эти пользователи могут редактировать данные, меню и акции этого
              заведения.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            disabled={patchMutation.isPending}
          >
            <Plus className="h-4 w-4" /> Добавить
          </Button>
        </CardHeader>
        <CardContent>
          {moderatorsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          ) : assigned.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              У этого заведения пока нет модераторов.
            </p>
          ) : (
            <ul className="divide-y rounded border">
              {assigned.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{u.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {u.email}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {(u.moderated_restaurants ?? []).length} зав.
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Снять с модерации этого заведения"
                      onClick={() => removeModerator(u)}
                      disabled={patchMutation.isPending}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить модератора</DialogTitle>
            <DialogDescription>
              Выберите существующего модератора, который ещё не привязан к
              «{restaurantName}». Чтобы создать нового — сделайте пользователя
              модератором на странице «Пользователи».
            </DialogDescription>
          </DialogHeader>

          <Input
            placeholder="Поиск по имени или email"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />

          <div className="max-h-64 overflow-y-auto rounded border bg-card">
            {available.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                Свободных модераторов нет.
              </p>
            ) : (
              <ul className="divide-y">
                {available.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{u.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {u.email}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addModerator(u)}
                      disabled={patchMutation.isPending}
                    >
                      Назначить
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
