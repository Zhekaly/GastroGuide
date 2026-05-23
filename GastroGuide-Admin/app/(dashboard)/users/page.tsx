"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Shield, ShieldCheck, ShieldOff, Trash2, User as UserIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { usersApi } from "@/lib/api/endpoints";
import type { UserAdmin } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";

import { DataTable } from "@/components/tables/data-table";
import { UserEditDialog } from "@/components/forms/user-edit-dialog";
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

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | "user" | "admin" | "moderator">("all");
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState<UserAdmin | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["users", q, role, page],
    queryFn: () =>
      usersApi.list({
        q: q || undefined,
        role: role === "all" ? null : role,
        page,
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { role?: "user" | "admin" | "moderator"; is_active?: boolean };
    }) => usersApi.update(id, data),
    onSuccess: () => {
      toast.success("Пользователь обновлён");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Ошибка"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersApi.remove(id),
    onSuccess: () => {
      toast.success("Пользователь удалён");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Ошибка"),
  });

  const columns = useMemo<ColumnDef<UserAdmin, unknown>[]>(
    () => [
      { accessorKey: "name", header: "Имя" },
      { accessorKey: "email", header: "Email" },
      { accessorKey: "city", header: "Город" },
      {
        accessorKey: "role",
        header: "Роль",
        cell: ({ row }) => {
          const u = row.original;
          if (u.role === "admin") {
            return (
              <Badge variant="success" className="gap-1">
                <ShieldCheck className="h-3 w-3" /> Админ
              </Badge>
            );
          }
          if (u.role === "moderator") {
            const rests = u.moderated_restaurants ?? [];
            const names = rests.map((r) => r.name).join(", ");
            const summary =
              rests.length === 0
                ? "Без заведений"
                : rests.length === 1
                  ? rests[0]!.name
                  : `${rests.length} заведения`;
            return (
              <div className="space-y-0.5" title={names || undefined}>
                <Badge variant="warning" className="gap-1">
                  <Shield className="h-3 w-3" /> Модератор
                </Badge>
                <div
                  className="text-xs text-muted-foreground truncate max-w-[180px]"
                  title={names || undefined}
                >
                  {summary}
                </div>
              </div>
            );
          }
          return (
            <Badge variant="secondary" className="gap-1">
              <UserIcon className="h-3 w-3" /> Пользователь
            </Badge>
          );
        },
      },
      {
        accessorKey: "is_active",
        header: "Активен",
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "success" : "destructive"}>
            {row.original.is_active ? "да" : "нет"}
          </Badge>
        ),
      },
      {
        id: "activity",
        header: "Активность",
        cell: ({ row }) => (
          <div className="text-xs text-muted-foreground">
            ❤ {row.original.favorites_count} · ✍ {row.original.reviews_count} · 🤖{" "}
            {row.original.ai_sessions_count}
          </div>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Регистрация",
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
          <div className="flex gap-1 justify-end">
            <Button
              variant="ghost"
              size="icon"
              title="Редактировать (роль, заведения модератора)"
              onClick={() => setEditingUser(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title={row.original.is_active ? "Заблокировать" : "Разблокировать"}
              onClick={() => {
                const message = row.original.is_active
                  ? `Заблокировать пользователя ${row.original.email}? Он не сможет войти в приложение.`
                  : `Разблокировать пользователя ${row.original.email}?`;
                if (confirm(message)) {
                  updateMutation.mutate({
                    id: row.original.id,
                    data: { is_active: !row.original.is_active },
                  });
                }
              }}
            >
              {row.original.is_active ? (
                <ShieldOff className="h-4 w-4 text-amber-500" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Удалить"
              onClick={() => {
                if (confirm(`Удалить пользователя "${row.original.email}"?`)) {
                  deleteMutation.mutate(row.original.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [updateMutation, deleteMutation],
  );

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Пользователи</h1>
        <p className="text-muted-foreground">
          Управление аккаунтами, ролями и блокировкой
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Поиск по имени/email"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="max-w-xs"
            />
            <Select
              value={role}
              onValueChange={(value) => {
                setRole(value as typeof role);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все роли</SelectItem>
                <SelectItem value="admin">Админы</SelectItem>
                <SelectItem value="moderator">Модераторы</SelectItem>
                <SelectItem value="user">Пользователи</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isError ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-destructive">Не удалось загрузить пользователей.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Повторить
              </Button>
            </div>
          ) : (
            <DataTable
              data={data?.items ?? []}
              columns={columns}
              emptyMessage={isLoading ? "Загрузка..." : "Пользователей нет"}
              getRowId={(row) => String(row.id)}
            />
          )}

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

      <UserEditDialog
        user={editingUser}
        open={editingUser !== null}
        onOpenChange={(open) => {
          if (!open) setEditingUser(null);
        }}
      />
    </div>
  );
}
