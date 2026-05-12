"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { systemApi } from "@/lib/api/endpoints";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState("");

  const { data, isFetching } = useQuery({
    queryKey: ["global-search", query],
    queryFn: () => systemApi.search(query),
    enabled: query.length >= 2,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Глобальный поиск</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Введите запрос (мин. 2 символа)"
            className="pl-9"
          />
        </div>

        {query.length < 2 && (
          <p className="text-sm text-muted-foreground">
            Поиск по ресторанам, пользователям, отзывам, меню и AI-сессиям.
          </p>
        )}

        {isFetching && <p className="text-sm text-muted-foreground">Поиск...</p>}

        {data && (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            <ResultGroup title={`Заведения (${data.restaurants.length})`}>
              {data.restaurants.map((r) => (
                <Link
                  key={r.id}
                  href={`/restaurants/${r.id}`}
                  onClick={() => onOpenChange(false)}
                  className="block rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.type}</div>
                </Link>
              ))}
            </ResultGroup>

            <ResultGroup title={`Пользователи (${data.users.length})`}>
              {data.users.map((u) => (
                <Link
                  key={u.id}
                  href={`/users`}
                  onClick={() => onOpenChange(false)}
                  className="block rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </Link>
              ))}
            </ResultGroup>

            <ResultGroup title={`Отзывы (${data.reviews.length})`}>
              {data.reviews.map((rv) => (
                <Link
                  key={rv.id}
                  href={`/reviews`}
                  onClick={() => onOpenChange(false)}
                  className="block rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <div className="text-xs text-muted-foreground">★ {rv.rating}</div>
                  <div className="line-clamp-1">{rv.text}</div>
                </Link>
              ))}
            </ResultGroup>

            <ResultGroup title={`Блюда (${data.menu_items.length})`}>
              {data.menu_items.map((m) => (
                <Link
                  key={m.id}
                  href={`/restaurants/${m.restaurant_id}`}
                  onClick={() => onOpenChange(false)}
                  className="block rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <div className="font-medium">{m.name}</div>
                </Link>
              ))}
            </ResultGroup>

            <ResultGroup title={`AI-сессии (${data.ai_sessions.length})`}>
              {data.ai_sessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/ai`}
                  onClick={() => onOpenChange(false)}
                  className="block rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <div className="font-medium">{s.title}</div>
                </Link>
              ))}
            </ResultGroup>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-1">
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}
