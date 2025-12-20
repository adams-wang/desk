"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Search,
  PieChart,
  Sparkles,
  TrendingUp,
} from "lucide-react";

const navigation = [
  { name: "Market", href: "/", icon: TrendingUp, preserveDate: true },
  { name: "Sectors", href: "/sectors", icon: PieChart, preserveDate: true },
  { name: "Stocks", href: "/stocks", icon: Search, preserveDate: true },
  { name: "AI Advisor", href: "/chat", icon: Sparkles, preserveDate: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentDate = searchParams.get("date");

  const getHref = (item: typeof navigation[number]) => {
    if (item.preserveDate && currentDate) {
      return `${item.href}?date=${currentDate}`;
    }
    return item.href;
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/" className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <span className="text-xl font-semibold">Desk</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={getHref(item)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4">
        <div className="text-xs text-muted-foreground">
          US Equity Trading
        </div>
      </div>
    </aside>
  );
}
