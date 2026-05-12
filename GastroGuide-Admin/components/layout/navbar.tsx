"use client";

import { LogOut, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AdminMe } from "@/lib/api/types";
import { clearAdminTokens } from "@/lib/auth/cookies";

import { GlobalSearch } from "@/components/layout/global-search";
import { Button } from "@/components/ui/button";

export function Navbar({ admin }: { admin: AdminMe }) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);

  function handleLogout() {
    clearAdminTokens();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/70 px-6 backdrop-blur">
      <div className="flex-1 max-w-md">
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-4 w-4" />
          <span>Глобальный поиск...</span>
          <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">⌘K</span>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-medium leading-tight">{admin.name}</div>
          <div className="text-xs text-muted-foreground">{admin.email}</div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
          {admin.name.charAt(0).toUpperCase()}
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Выйти">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
