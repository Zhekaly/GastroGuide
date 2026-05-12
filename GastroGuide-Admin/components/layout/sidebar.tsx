"use client";

import {
  Bot,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  ListTree,
  MessageSquare,
  ShieldAlert,
  Store,
  Tag,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { href: "/restaurants", label: "Заведения", icon: Store },
  { href: "/menu", label: "Меню", icon: ClipboardList },
  { href: "/offers", label: "Акции", icon: Tag },
  { href: "/reviews", label: "Отзывы", icon: MessageSquare },
  { href: "/users", label: "Пользователи", icon: Users },
  { href: "/categories", label: "Категории", icon: ListTree },
  { href: "/ai", label: "AI-аналитика", icon: Bot },
  { href: "/system", label: "Система", icon: ShieldAlert },
];

export function Sidebar() {
  const pathname = usePathname();

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
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
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
