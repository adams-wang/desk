"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, createContext, useContext } from "react";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Search,
  PieChart,
  Sparkles,
  TrendingUp,
  PanelLeftClose,
} from "lucide-react";

const navigation = [
  { name: "Market", href: "/", icon: TrendingUp, preserveDate: true },
  { name: "Sectors", href: "/sectors", icon: PieChart, preserveDate: true },
  { name: "Stocks", href: "/stocks", icon: Search, preserveDate: true },
  { name: "AI Advisor", href: "/chat", icon: Sparkles, preserveDate: false },
];

// Context for sidebar state
const SidebarContext = createContext<{
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}>({ collapsed: false, setCollapsed: () => {} });

export function useSidebar() {
  return useContext(SidebarContext);
}

export function SidebarProvider({
  children,
  initialCollapsed = false
}: {
  children: React.ReactNode;
  initialCollapsed?: boolean;
}) {
  // Initialize with server-provided value - same on server and client
  const [collapsed, setCollapsedState] = useState(initialCollapsed);

  const setCollapsed = (value: boolean) => {
    setCollapsedState(value);
    // Store in cookie (accessible by server on next request)
    document.cookie = `sidebar-collapsed=${value}; path=/; max-age=31536000; SameSite=Lax`;
  };

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentDate = searchParams.get("date");
  const { collapsed, setCollapsed } = useSidebar();

  const getHref = (item: (typeof navigation)[number]) => {
    if (item.preserveDate && currentDate) {
      return `${item.href}?date=${currentDate}`;
    }
    return item.href;
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-background transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex h-16 items-center border-b border-border",
        collapsed ? "justify-center px-2" : "justify-between px-4"
      )}>
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary flex-shrink-0" />
            <span className="text-xl font-semibold">Desk</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Toggle sidebar"
        >
          <PanelLeftClose className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Navigation */}
      <nav className={cn("flex flex-col gap-1", collapsed ? "p-2" : "p-4")}>
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={getHref(item)}
              title={collapsed ? item.name : undefined}
              className={cn(
                "flex items-center rounded-lg text-sm font-medium transition-colors",
                collapsed ? "justify-center p-3" : "gap-3 px-3 py-2",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className={cn("transition-opacity", collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100")}>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4">
        <div className={cn("text-xs text-muted-foreground transition-opacity", collapsed ? "opacity-0" : "opacity-100")}>US Equity Trading</div>
      </div>
    </aside>
  );
}

export function MainContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div
      className={cn(
        "flex-1 transition-all duration-300",
        collapsed ? "pl-16" : "pl-64"
      )}
    >
      {children}
    </div>
  );
}
