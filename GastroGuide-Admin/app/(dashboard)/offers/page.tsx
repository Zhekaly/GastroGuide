"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { offersApi, restaurantsApi } from "@/lib/api/endpoints";
import type { OfferAdmin, OfferInput } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";

import { DataTable } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const DEFAULT: OfferInput = {
  restaurant_id: 0,
  title: "",
  description: "",
  discount: "",
  expires: "",
  emoji: "🎁",
  color: "#E8420A",
  active: true,
};

export default function OffersPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<OfferInput>(DEFAULT);

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["offers", filter],
    queryFn: () =>
      offersApi.list(filter === "all" ? null : filter === "active"),
  });

  const { data: restaurants } = useQuery({
    queryKey: ["restaurants-all"],
    queryFn: () => restaurantsApi.list({ page_size: 200 }),
  });

  const createMutation = useMutation({
    mutationFn: () => offersApi.create(form),
    onSuccess: () => {
      toast.success("Акция создана");
      setOpen(false);
      setForm(DEFAULT);
      queryClient.invalidateQueries({ queryKey: ["offers"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Ошибка"),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      offersApi.update(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["offers"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => offersApi.remove(id),
    onSuccess: () => {
      toast.success("Удалено");
      queryClient.invalidateQueries({ queryKey: ["offers"] });
    },
  });

  const columns = useMemo<ColumnDef<OfferAdmin, unknown>[]>(
    () => [
      { accessorKey: "emoji", header: "", size: 60 },
      { accessorKey: "title", header: "Название" },
      { accessorKey: "discount", header: "Скидка" },
      { accessorKey: "expires", header: "До" },
      {
        accessorKey: "restaurant_name",
        header: "Заведение",
        cell: ({ row }) => row.original.restaurant_name ?? `#${row.original.restaurant_id}`,
      },
      {
        accessorKey: "active",
        header: "Статус",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Switch
              checked={row.original.active}
              onCheckedChange={(value) =>
                toggleActive.mutate({ id: row.original.id, active: value })
              }
            />
            <Badge variant={row.original.active ? "success" : "secondary"}>
              {row.original.active ? "Активна" : "Выключена"}
            </Badge>
          </div>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Создана",
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
              if (confirm(`Удалить "${row.original.title}"?`)) {
                deleteMutation.mutate(row.original.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        ),
      },
    ],
    [toggleActive, deleteMutation],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Акции</h1>
          <p className="text-muted-foreground">Управление акциями заведений</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Новая акция
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новая акция</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Заведение</Label>
                <Select
                  value={form.restaurant_id ? String(form.restaurant_id) : ""}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, restaurant_id: Number(value) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выбери заведение" />
                  </SelectTrigger>
                  <SelectContent>
                    {restaurants?.items.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Название</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Описание</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Скидка</Label>
                  <Input
                    placeholder="-30%"
                    value={form.discount}
                    onChange={(e) => setForm((prev) => ({ ...prev, discount: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Истекает</Label>
                  <Input
                    placeholder="до 1 июня"
                    value={form.expires}
                    onChange={(e) => setForm((prev) => ({ ...prev, expires: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!form.restaurant_id || !form.title || createMutation.isPending}
              >
                Создать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="active">Только активные</SelectItem>
              <SelectItem value="inactive">Только выключенные</SelectItem>
            </SelectContent>
          </Select>

          <DataTable
            data={offers}
            columns={columns}
            emptyMessage={isLoading ? "Загрузка..." : "Акций нет"}
            getRowId={(row) => String(row.id)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
