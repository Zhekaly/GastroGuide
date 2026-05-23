"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { restaurantsApi } from "@/lib/api/endpoints";
import { useCurrentActor } from "@/lib/hooks/use-current-actor";

import { RestaurantForm } from "@/components/forms/restaurant-form";
import { RestaurantMenuPanel } from "@/components/forms/restaurant-menu-panel";
import { RestaurantModeratorsPanel } from "@/components/forms/restaurant-moderators-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function RestaurantDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const actor = useCurrentActor();
  const canManage = actor.isAdmin;
  const id = Number(params.id);

  const { data: restaurant, isLoading, isError } = useQuery({
    queryKey: ["restaurant", id],
    queryFn: () => restaurantsApi.get(id),
    enabled: Number.isFinite(id),
  });

  const recalculate = useMutation({
    mutationFn: () => restaurantsApi.recalculateRating(id),
    onSuccess: () => {
      toast.success("Рейтинг пересчитан");
      queryClient.invalidateQueries({ queryKey: ["restaurant", id] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Ошибка"),
  });

  const removeMutation = useMutation({
    mutationFn: () => restaurantsApi.remove(id),
    onSuccess: () => {
      toast.success("Заведение удалено");
      router.replace("/restaurants");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Ошибка"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError || !restaurant) {
    return <p className="text-destructive">Заведение не найдено.</p>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/restaurants">
              <ArrowLeft className="h-4 w-4" />
              К списку
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight mt-2">
            {restaurant.name}
          </h1>
          <p className="text-muted-foreground">{restaurant.type}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => recalculate.mutate()}
            disabled={recalculate.isPending}
          >
            <RefreshCw className="h-4 w-4" />
            Пересчитать рейтинг
          </Button>
          {canManage && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm(`Удалить "${restaurant.name}"? Это действие необратимо.`)) {
                  removeMutation.mutate();
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              Удалить
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Основная информация</CardTitle>
        </CardHeader>
        <CardContent>
          <RestaurantForm restaurant={restaurant} />
        </CardContent>
      </Card>

      <RestaurantMenuPanel restaurantId={restaurant.id} initialMenu={restaurant.menu} />

      {canManage && (
        <RestaurantModeratorsPanel
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
        />
      )}
    </div>
  );
}
