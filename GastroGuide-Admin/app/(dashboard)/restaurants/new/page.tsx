"use client";

import { useRouter } from "next/navigation";

import { RestaurantForm } from "@/components/forms/restaurant-form";

export default function NewRestaurantPage() {
  const router = useRouter();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Новое заведение</h1>
        <p className="text-muted-foreground">
          Заполни поля и кликни на карту, чтобы выбрать координаты.
        </p>
      </div>

      <RestaurantForm
        onSuccess={(restaurant) => {
          router.replace(`/restaurants/${restaurant.id}`);
        }}
      />
    </div>
  );
}
