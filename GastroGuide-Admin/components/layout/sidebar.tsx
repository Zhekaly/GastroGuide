"use client";

import {
  Bot,
  ClipboardList,
  LayoutDashboard,
  ListTree,
  MessageSquare,
  Shield,
  ShieldAlert,
  Store,
  Tag,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";

import { useCurrentActor } from "@/lib/hooks/use-current-actor";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { href: "/restaurants", label: "Заведения", icon: Store },
  { href: "/menu", label: "Меню", icon: ClipboardList },
  { href: "/offers", label: "Акции", icon: Tag },
  { href: "/reviews", label: "Отзывы", icon: MessageSquare },
  { href: "/users", label: "Пользователи", icon: Users, adminOnly: true },
  { href: "/categories", label: "Категории", icon: ListTree, adminOnly: true },
  { href: "/ai", label: "AI-аналитика", icon: Bot, adminOnly: true },
  { href: "/system", label: "Система", icon: ShieldAlert, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const actor = useCurrentActor();

  const items = NAV.filter((item) => {
    if (!item.adminOnly) return true;
    return actor.isAdmin;
  });

  const moderatorSummary =
    actor.isModerator && !actor.isAdmin
      ? actor.moderatedRestaurants.length === 0
        ? "Без заведений"
        : actor.moderatedRestaurants.length <= 2
          ? actor.moderatedRestaurants.map((r) => r.name).join(", ")
          : `${actor.moderatedRestaurants.length} заведения`
      : null;

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r bg-card/40">
      <div className="flex h-16 items-center gap-3 px-6 border-b">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
          GG
        </div>
        <div>
          <div className="font-semibold leading-tight">GastroGuide</div>
          <div className="text-xs text-muted-foreground">Admin Panel</div>
        </div>
      </div>

      {moderatorSummary !== null && (
        <div
          className="border-b px-4 py-3 space-y-1"
          title={actor.moderatedRestaurants.map((r) => r.name).join(", ")}
        >
          <Badge variant="warning" className="gap-1">
            <Shield className="h-3 w-3" /> Модератор
          </Badge>
          <div className="text-xs text-muted-foreground truncate">
            Управляет: {moderatorSummary}
          </div>
        </div>
      )}

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4 text-xs text-muted-foreground">
        v0.1.0 · API only
      </div>
    </aside>
  );
}
