"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { categoriesApi, restaurantsApi } from "@/lib/api/endpoints";
import { useCurrentActor } from "@/lib/hooks/use-current-actor";
import type { Restaurant, RestaurantInput } from "@/lib/api/types";

import { MapPicker } from "@/components/maps/map-picker-dynamic";
import { PhotoUploader } from "@/components/forms/photo-uploader";
import { TagInput } from "@/components/forms/tag-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface RestaurantFormProps {
  restaurant?: Restaurant;
  onSuccess?: (restaurant: Restaurant) => void;
}

const DEFAULT_FORM: RestaurantInput = {
  name: "",
  type: "",
  category_id: null,
  emoji: "🍽️",
  color: "#E8420A",
  tag: "Ресторан",
  address: "",
  phone: "",
  description: "",
  hours: "10:00 – 22:00",
  opens_at: "10:00",
  closes_at: "22:00",
  is_24_7: false,
  lat: 51.169392,
  lng: 71.449074,
  price: "₸₸",
  priceRange: 2,
  features: [],
  photos: [],
  is_hidden: false,
};

export function RestaurantForm({ restaurant, onSuccess }: RestaurantFormProps) {
  const queryClient = useQueryClient();
  const actor = useCurrentActor();
  const restrictAdminFields = actor.isModerator && !actor.isAdmin;
  const [form, setForm] = useState<RestaurantInput>(DEFAULT_FORM);

  useEffect(() => {
    if (restaurant) {
      setForm({
        name: restaurant.name,
        type: restaurant.type,
        category_id: restaurant.category_id,
        emoji: restaurant.emoji,
        color: restaurant.color,
        tag: restaurant.tag,
        address: restaurant.address,
        phone: restaurant.phone,
        description: restaurant.description,
        hours: restaurant.hours,
        opens_at: restaurant.opens_at,
        closes_at: restaurant.closes_at,
        is_24_7: restaurant.is_24_7,
        lat: restaurant.lat,
        lng: restaurant.lng,
        price: restaurant.price,
        priceRange: restaurant.priceRange,
        features: restaurant.features,
        photos: restaurant.photos,
        is_hidden: restaurant.is_hidden,
      });
    }
  }, [restaurant]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
  });

  const createMutation = useMutation({
    mutationFn: (payload: RestaurantInput) => restaurantsApi.create(payload),
    onSuccess: (created) => {
      toast.success("Заведение создано");
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      onSuccess?.(created);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Ошибка"),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: RestaurantInput) =>
      restaurantsApi.update(restaurant!.id, payload),
    onSuccess: (updated) => {
      toast.success("Изменения сохранены");
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant", restaurant?.id] });
      onSuccess?.(updated);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Ошибка"),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function update<K extends keyof RestaurantInput>(key: K, value: RestaurantInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!Number.isFinite(form.lat) || !Number.isFinite(form.lng)) {
      toast.error("Укажите координаты заведения (lat и lng).");
      return;
    }
    if (form.lat < -90 || form.lat > 90) {
      toast.error("Широта (lat) должна быть в диапазоне от -90 до 90.");
      return;
    }
    if (form.lng < -180 || form.lng > 180) {
      toast.error("Долгота (lng) должна быть в диапазоне от -180 до 180.");
      return;
    }

    const fullPayload: RestaurantInput = {
      ...form,
      opens_at: form.is_24_7 ? null : form.opens_at,
      closes_at: form.is_24_7 ? null : form.closes_at,
      category_id: form.category_id && form.category_id > 0 ? form.category_id : null,
    };

    // Модератору запрещены is_hidden и category_id даже если он попытается
    // их подменить через DevTools — бэкенд тоже их отбьёт, но не дадим UI
    // случайно отправить значение.
    const payload: RestaurantInput = restrictAdminFields
      ? (() => {
          const { is_hidden: _is_hidden, category_id: _category_id, ...rest } =
            fullPayload;
          void _is_hidden;
          void _category_id;
          return rest as RestaurantInput;
        })()
      : fullPayload;

    if (restaurant) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  }

  const latOutsideKZ = form.lat < 40 || form.lat > 56;
  const lngOutsideKZ = form.lng < 46 || form.lng > 88;
  const coordsOutsideKZ =
    Number.isFinite(form.lat) &&
    Number.isFinite(form.lng) &&
    (latOutsideKZ || lngOutsideKZ);

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="grid gap-4 md:grid-cols-2">
        <Field label="Название">
          <Input value={form.name} onChange={(e) => update("name", e.target.value)} required />
        </Field>
        <Field label="Тип кухни">
          <Input value={form.type} onChange={(e) => update("type", e.target.value)} required />
        </Field>

        <Field
          label="Категория"
          hint={
            restrictAdminFields
              ? "Только администратор может менять категорию"
              : undefined
          }
        >
          <Select
            value={form.category_id ? String(form.category_id) : "none"}
            onValueChange={(value) =>
              update("category_id", value === "none" ? null : Number(value))
            }
            disabled={restrictAdminFields}
          >
            <SelectTrigger>
              <SelectValue placeholder="Без категории" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Без категории —</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Тег">
          <Input value={form.tag ?? ""} onChange={(e) => update("tag", e.target.value)} />
        </Field>

        <Field label="Эмодзи">
          <Input value={form.emoji ?? ""} onChange={(e) => update("emoji", e.target.value)} maxLength={4} />
        </Field>
        <Field label="Цвет (hex)">
          <Input value={form.color ?? ""} onChange={(e) => update("color", e.target.value)} />
        </Field>

        <Field label="Адрес">
          <Input value={form.address} onChange={(e) => update("address", e.target.value)} required />
        </Field>
        <Field label="Телефон">
          <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} required />
        </Field>

        <Field label="Часы работы (текст)">
          <Input value={form.hours} onChange={(e) => update("hours", e.target.value)} placeholder="10:00 – 22:00" />
        </Field>
        <Field label="Уровень цен">
          <Select
            value={String(form.priceRange ?? 2)}
            onValueChange={(value) => update("priceRange", Number(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">₸ — недорого</SelectItem>
              <SelectItem value="2">₸₸ — средне</SelectItem>
              <SelectItem value="3">₸₸₸ — выше среднего</SelectItem>
              <SelectItem value="4">₸₸₸₸ — дорого</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Открытие">
          <Input
            type="time"
            value={form.opens_at ?? ""}
            onChange={(e) => update("opens_at", e.target.value)}
            disabled={form.is_24_7}
          />
        </Field>
        <Field label="Закрытие">
          <Input
            type="time"
            value={form.closes_at ?? ""}
            onChange={(e) => update("closes_at", e.target.value)}
            disabled={form.is_24_7}
          />
        </Field>

        <Field label="Работает 24/7">
          <Switch checked={form.is_24_7 ?? false} onCheckedChange={(v) => update("is_24_7", v)} />
        </Field>
        <Field
          label="Скрыть заведение"
          hint={
            restrictAdminFields
              ? "Только администратор может управлять видимостью"
              : undefined
          }
        >
          <Switch
            checked={form.is_hidden ?? false}
            onCheckedChange={(v) => update("is_hidden", v)}
            disabled={restrictAdminFields}
          />
        </Field>
      </section>

      <Field label="Описание">
        <Textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={4}
          required
        />
      </Field>

      <section className="space-y-2">
        <Label>Координаты (lat, lng)</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            step="any"
            min={-90}
            max={90}
            required
            value={Number.isFinite(form.lat) ? form.lat : ""}
            onChange={(e) => {
              const v = e.target.value;
              update("lat", v === "" ? Number.NaN : Number(v));
            }}
          />
          <Input
            type="number"
            step="any"
            min={-180}
            max={180}
            required
            value={Number.isFinite(form.lng) ? form.lng : ""}
            onChange={(e) => {
              const v = e.target.value;
              update("lng", v === "" ? Number.NaN : Number(v));
            }}
          />
        </div>
        {coordsOutsideKZ && (
          <p className="text-xs text-amber-600">
            Внимание: координаты выглядят не казахстанскими (ожидается lat 40..56, lng 46..88).
            Проверьте правильность.
          </p>
        )}
        <MapPicker
          value={{ lat: form.lat, lng: form.lng }}
          onChange={({ lat, lng }) => {
            update("lat", lat);
            update("lng", lng);
          }}
        />
      </section>

      <section className="space-y-2">
        <Label>Особенности (features)</Label>
        <TagInput
          value={form.features ?? []}
          onChange={(features) => update("features", features)}
          placeholder="Wi-Fi, парковка, веганское меню..."
        />
      </section>

      <section className="space-y-2">
        <Label>Фотографии</Label>
        <PhotoUploader
          value={form.photos ?? []}
          onChange={(photos) => update("photos", photos)}
        />
      </section>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isPending}>
          <Save className="h-4 w-4" />
          {isPending ? "Сохранение..." : restaurant ? "Сохранить" : "Создать заведение"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
