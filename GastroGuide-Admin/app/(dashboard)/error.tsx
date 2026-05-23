"use client";

import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Что-то пошло не так</h2>
            <p className="text-sm text-muted-foreground">
              {error.message || "Произошла непредвиденная ошибка. Попробуйте обновить страницу."}
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground">Код ошибки: {error.digest}</p>
            )}
          </div>
          <div className="flex justify-center gap-2">
            <Button onClick={reset} variant="default">
              <RotateCcw className="h-4 w-4" />
              Попробовать снова
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <Home className="h-4 w-4" />
                На главную
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
