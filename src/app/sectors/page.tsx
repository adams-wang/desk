import { getSectorMRSHistory, getSectorMRS } from "@/lib/queries/sectors";
import { getLatestTradingDate } from "@/lib/queries/trading-days";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectorRotationChart } from "@/components/charts";

interface SectorsPageProps {
  searchParams: Promise<{ date?: string; days?: string }>;
}

export default async function SectorsPage({ searchParams }: SectorsPageProps) {
  const { date, days: daysParam } = await searchParams;
  const days = daysParam ? parseInt(daysParam, 10) : 5;
  const latestDate = getLatestTradingDate();
  const currentDate = date || latestDate;

  const history = getSectorMRSHistory(days, currentDate);
  const latestSectors = getSectorMRS(currentDate);

  // Calculate sector summary stats (MRS values are already in percentage form, e.g., 4.0 = 4%)
  const strongSectors = latestSectors.filter((s) => (s.mrs_20 ?? 0) > 4);
  const weakSectors = latestSectors.filter((s) => (s.mrs_20 ?? 0) < -4);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sector Rotation</h2>
          <p className="text-muted-foreground">
            Track sector relative strength and momentum over time
          </p>
        </div>
        <div className="text-right text-sm">
          <div className="text-muted-foreground">Viewing {days} days ending</div>
          <div className="font-mono font-bold">{currentDate}</div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Strong Sectors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{strongSectors.length}</div>
            <p className="text-xs text-muted-foreground">MRS 20 &gt; 4%</p>
            {strongSectors.length > 0 && (
              <p className="text-xs text-green-500 mt-1">
                {strongSectors.map((s) => s.sector_name).join(", ")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Weak Sectors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{weakSectors.length}</div>
            <p className="text-xs text-muted-foreground">MRS 20 &lt; -4%</p>
            {weakSectors.length > 0 && (
              <p className="text-xs text-red-500 mt-1">
                {weakSectors.map((s) => s.sector_name).join(", ")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sectors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestSectors.length}</div>
            <p className="text-xs text-muted-foreground">Tracked sector ETFs</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sector Relative Strength Analysis</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ranked by MRS 20 | Orange line = MRS 5 momentum
          </p>
        </CardHeader>
        <CardContent>
          <SectorRotationChart history={history} height={500} autoPlay={false} intervalMs={1500} />
        </CardContent>
      </Card>

      {/* Sector Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Sector Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Rank</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Sector</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">ETF</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">MRS 20</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">MRS 5</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">Close</th>
                </tr>
              </thead>
              <tbody>
                {[...latestSectors]
                  .sort((a, b) => (b.mrs_20 ?? 0) - (a.mrs_20 ?? 0))
                  .map((sector, idx) => {
                    const mrs20 = sector.mrs_20 ?? 0;
                    const mrs5 = sector.mrs_5 ?? 0;
                    return (
                      <tr key={sector.etf_ticker} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-2 px-2 font-mono">{idx + 1}</td>
                        <td className="py-2 px-2 font-medium">{sector.sector_name}</td>
                        <td className="py-2 px-2 text-muted-foreground">{sector.etf_ticker}</td>
                        <td className={`py-2 px-2 text-right font-mono ${mrs20 > 4 ? "text-green-500" : mrs20 < -4 ? "text-red-500" : ""}`}>
                          {mrs20.toFixed(2)}%
                        </td>
                        <td className={`py-2 px-2 text-right font-mono ${mrs5 > 0 ? "text-green-500" : "text-red-500"}`}>
                          {mrs5.toFixed(2)}%
                        </td>
                        <td className="py-2 px-2 text-right font-mono">${sector.close?.toFixed(2) ?? "-"}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
