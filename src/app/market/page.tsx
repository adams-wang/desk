import { Suspense } from "react";
import {
  getMarketOverview,
  getRegimeHistory,
  getIndicesWithSparklines,
  getSectorPerformance,
} from "@/lib/queries/market";
import { getLatestTradingDate } from "@/lib/queries/trading-days";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketContent } from "./market-content";

interface MarketPageProps {
  searchParams: Promise<{ date?: string }>;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-32 rounded-lg bg-muted" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-64 rounded-lg bg-muted" />
        <div className="h-64 rounded-lg bg-muted" />
      </div>
    </div>
  );
}

export default async function MarketPage({ searchParams }: MarketPageProps) {
  const { date } = await searchParams;
  const latestDate = getLatestTradingDate();
  const currentDate = date || latestDate;

  const overview = getMarketOverview(currentDate);
  const regimeHistory = getRegimeHistory(20, currentDate);
  const indicesWithSparklines = getIndicesWithSparklines(currentDate);
  const sectorPerformance = getSectorPerformance(currentDate);

  if (!overview) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Market Overview</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Analysis Unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              L1 market analysis is not available for {currentDate}.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <MarketContent
        overview={overview}
        currentDate={currentDate}
        regimeHistory={regimeHistory}
        indicesWithSparklines={indicesWithSparklines}
        sectorPerformance={sectorPerformance}
      />
    </Suspense>
  );
}
