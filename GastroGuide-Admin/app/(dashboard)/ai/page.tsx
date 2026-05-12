"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eraser, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { aiApi } from "@/lib/api/endpoints";
import { formatDate, formatNumber } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AIPage() {
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const { data: analytics } = useQuery({
    queryKey: ["ai-analytics"],
    queryFn: aiApi.analytics,
  });

  const { data: sessions } = useQuery({
    queryKey: ["ai-sessions"],
    queryFn: () => aiApi.listSessions({ page_size: 30 }),
  });

  const { data: messages } = useQuery({
    queryKey: ["ai-messages", selectedSession],
    queryFn: () => aiApi.sessionMessages(selectedSession!),
    enabled: !!selectedSession,
  });

  const cleanupMutation = useMutation({
    mutationFn: () => aiApi.cleanupEmpty(),
    onSuccess: (response) => {
      toast.success(response.message);
      queryClient.invalidateQueries({ queryKey: ["ai-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["ai-analytics"] });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (id: string) => aiApi.deleteSession(id),
    onSuccess: () => {
      toast.success("Сессия удалена");
      queryClient.invalidateQueries({ queryKey: ["ai-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["ai-analytics"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI-аналитика</h1>
          <p className="text-muted-foreground">
            Статистика по AI-чату GastroGuide
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => cleanupMutation.mutate()}
          disabled={cleanupMutation.isPending}
        >
          <Eraser className="h-4 w-4" />
          Удалить пустые сессии
        </Button>
      </div>

      {analytics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Сессий" value={analytics.total_sessions} />
          <StatCard label="Пустых сессий" value={analytics.empty_sessions} />
          <StatCard label="Сообщений" value={analytics.total_messages} />
          <StatCard
            label="user / ai"
            value={`${analytics.user_messages} / ${analytics.ai_messages}`}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Топ запросов</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.top_prompts.length === 0 && (
              <p className="text-sm text-muted-foreground">Нет данных</p>
            )}
            <div className="space-y-2">
              {analytics?.top_prompts.map((prompt, index) => (
                <div
                  key={`${prompt.text}-${index}`}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <span className="line-clamp-1 text-sm">{prompt.text}</span>
                  <Badge variant="secondary">×{prompt.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Последние AI-сессии</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {sessions?.items.map((session) => (
              <div
                key={session.id}
                className="rounded-md border p-3 hover:bg-accent/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <button
                      className="text-sm font-medium truncate text-left hover:underline"
                      onClick={() => setSelectedSession(session.id)}
                    >
                      {session.title}
                    </button>
                    <div className="text-xs text-muted-foreground">
                      {session.user_name ?? "—"} · {session.user_email ?? "—"}
                    </div>
                    {session.preview && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {session.preview}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="secondary">{session.message_count} сообщ.</Badge>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatDate(session.updated_at)}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mt-1"
                      onClick={() => {
                        if (confirm("Удалить сессию?")) {
                          deleteSessionMutation.mutate(session.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {sessions?.items.length === 0 && (
              <p className="text-sm text-muted-foreground">Нет сессий</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!selectedSession}
        onOpenChange={(open) => !open && setSelectedSession(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Сообщения сессии</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {messages?.map((m) => (
              <div
                key={m.id}
                className={`rounded-md border p-2 text-sm ${
                  m.role === "user" ? "bg-muted" : "bg-accent/40"
                }`}
              >
                <div className="text-xs font-semibold uppercase text-muted-foreground">
                  {m.role}
                </div>
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {typeof value === "number" ? formatNumber(value) : value}
        </div>
      </CardContent>
    </Card>
  );
}
