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
  PanelLeft,
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

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") {
      setCollapsed(true);
    }
  }, []);

  const handleSetCollapsed = (value: boolean) => {
    setCollapsed(value);
    localStorage.setItem("sidebar-collapsed", String(value));
  };

  // Use default state until mounted to avoid hydration mismatch
  const effectiveCollapsed = mounted ? collapsed : false;

  return (
    <SidebarContext.Provider value={{ collapsed: effectiveCollapsed, setCollapsed: handleSetCollapsed }}>
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
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <Link href="/" className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary flex-shrink-0" />
          {!collapsed && <span className="text-xl font-semibold">Desk</span>}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
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
              {!collapsed && item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4">
        {!collapsed && (
          <div className="text-xs text-muted-foreground">US Equity Trading</div>
        )}
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
