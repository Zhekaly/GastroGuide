"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, ShieldCheck, User as UserIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { restaurantsApi, usersApi } from "@/lib/api/endpoints";
import type { AdminRole, UserAdmin, UserUpdate } from "@/lib/api/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserEditDialogProps {
  user: UserAdmin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserEditDialog({ user, open, onOpenChange }: UserEditDialogProps) {
  const queryClient = useQueryClient();

  const [role, setRole] = useState<AdminRole>("user");
  const [isActive, setIsActive] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [restaurantQuery, setRestaurantQuery] = useState("");

  // Загружаем все заведения только когда диалог открыт (и нужны для модератора).
  const restaurantsQuery = useQuery({
    queryKey: ["restaurants", "all-for-moderator-assignment"],
    queryFn: () => restaurantsApi.list({ page: 1, page_size: 200 }),
    enabled: open,
  });

  // Сброс формы при открытии/смене пользователя.
  useEffect(() => {
    if (open && user) {
      setRole(user.role);
      setIsActive(user.is_active);
      setSelectedIds((user.moderated_restaurants ?? []).map((r) => r.id));
      setRestaurantQuery("");
    }
  }, [open, user]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserUpdate }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      toast.success("Пользователь обновлён");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Ошибка"),
  });

  const filteredRestaurants = useMemo(() => {
    const items = restaurantsQuery.data?.items ?? [];
    const q = restaurantQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.type ?? "").toLowerCase().includes(q),
    );
  }, [restaurantQuery, restaurantsQuery.data]);

  if (!user) return null;

  const isModerator = role === "moderator";
  const canSave =
    !updateMutation.isPending &&
    (!isModerator || selectedIds.length > 0);

  const roleChanged = role !== user.role;
  const activeChanged = isActive !== user.is_active;
  const assignmentsChanged =
    JSON.stringify([...selectedIds].sort((a, b) => a - b)) !==
    JSON.stringify(
      (user.moderated_restaurants ?? []).map((r) => r.id).sort((a, b) => a - b),
    );

  const hasChanges = roleChanged || activeChanged || (isModerator && assignmentsChanged);

  const handleSave = () => {
    // Confirm для критичных смен (admin ⇄ другая роль).
    if (roleChanged) {
      const wasAdmin = user.role === "admin";
      const becomesAdmin = role === "admin";
      if (wasAdmin || becomesAdmin) {
        const message = becomesAdmin
          ? `Назначить ${user.email} админом?`
          : `Снять с ${user.email} права администратора?`;
        if (!confirm(message)) return;
      }
    }

    const payload: UserUpdate = {};
    if (roleChanged) payload.role = role;
    if (activeChanged) payload.is_active = isActive;

    // Если стал/остаётся moderator — отправляем выбранные id.
    // Если уходит из moderator — отправляем [] чтобы явно почистить.
    if (isModerator) {
      payload.moderated_restaurant_ids = selectedIds;
    } else if (user.role === "moderator") {
      // role здесь уже не "moderator" (мы в else после if (isModerator)).
      payload.moderated_restaurant_ids = [];
    }

    updateMutation.mutate({ id: user.id, data: payload });
  };

  const toggleRestaurant = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Редактировать пользователя</DialogTitle>
          <DialogDescription>
            {user.name} · {user.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Роль</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AdminRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">
                  <span className="inline-flex items-center gap-2">
                    <UserIcon className="h-3.5 w-3.5" /> Пользователь
                  </span>
                </SelectItem>
                <SelectItem value="moderator">
                  <span className="inline-flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5" /> Модератор
                  </span>
                </SelectItem>
                <SelectItem value="admin">
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5" /> Админ
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded border p-3">
            <div>
              <Label className="m-0">Активен</Label>
              <p className="text-xs text-muted-foreground">
                {isActive ? "Может входить в приложение" : "Заблокирован"}
              </p>
            </div>
            <Checkbox
              checked={isActive}
              onCheckedChange={(v) => setIsActive(v === true)}
            />
          </div>

          {isModerator && (
            <div className="space-y-2 rounded border p-3">
              <div className="flex items-center justify-between">
                <Label className="m-0">Заведения модератора</Label>
                <Badge variant="secondary">{selectedIds.length} выбрано</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Модератор сможет редактировать только эти заведения.
              </p>

              <Input
                placeholder="Поиск по названию/типу"
                value={restaurantQuery}
                onChange={(e) => setRestaurantQuery(e.target.value)}
              />

              <div className="max-h-56 overflow-y-auto rounded border bg-card">
                {restaurantsQuery.isLoading ? (
                  <p className="p-3 text-sm text-muted-foreground">Загрузка...</p>
                ) : filteredRestaurants.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    Ничего не найдено
                  </p>
                ) : (
                  <ul className="divide-y">
                    {filteredRestaurants.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={selectedIds.includes(r.id)}
                          onCheckedChange={() => toggleRestaurant(r.id)}
                          id={`rest-${r.id}`}
                        />
                        <label
                          htmlFor={`rest-${r.id}`}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          <div className="font-medium">{r.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.type}
                            {r.category_label ? ` · ${r.category_label}` : ""}
                          </div>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {selectedIds.length === 0 && (
                <p className="text-xs text-destructive">
                  Выберите минимум одно заведение
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || !hasChanges}
          >
            {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
