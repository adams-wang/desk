import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          US Equity Quant Trading Overview
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">$125,432.00</div>
            <p className="text-xs text-emerald-500">+2.5% from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Day P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-emerald-500">+$1,234.56</div>
            <p className="text-xs text-muted-foreground">+0.99%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">12</div>
            <p className="text-xs text-muted-foreground">Across 8 sectors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">L3 Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">24</div>
            <p className="text-xs text-muted-foreground">15 bullish, 9 bearish</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/stocks"
              className="block rounded-lg border p-4 transition-colors hover:bg-muted"
            >
              <div className="font-medium">Stock Screener</div>
              <div className="text-sm text-muted-foreground">
                Browse and filter stocks with L3 signals
              </div>
            </Link>
            <Link
              href="/positions"
              className="block rounded-lg border p-4 transition-colors hover:bg-muted"
            >
              <div className="font-medium">Positions</div>
              <div className="text-sm text-muted-foreground">
                View portfolio holdings and P&L
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Market Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">VIX Regime</span>
                <span className="font-medium text-emerald-500">Low Volatility</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Market Trend</span>
                <span className="font-medium">Bullish</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Blockers</span>
                <span className="font-medium text-muted-foreground">None</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
