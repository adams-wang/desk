import { NextRequest, NextResponse } from "next/server";
import { getStockDetail, getStockOHLCV, getStockOHLCVExtended, getMRSHistory } from "@/lib/queries/stocks";
import { getSectorMRS, getStockSector } from "@/lib/queries/sectors";
import { v4 as uuidv4 } from "uuid";
import { withRequestContext, getLogger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const requestId = uuidv4();
  const { ticker } = await params;
  const searchParams = request.nextUrl.searchParams;
  const days = parseInt(searchParams.get("days") || "252", 10);

  return withRequestContext(requestId, async () => {
    const log = getLogger();
    const startTime = Date.now();

    log.info({ ticker, days }, "Fetching stock detail");

    try {
      const detail = getStockDetail(ticker);

      if (!detail) {
        log.warn({ ticker }, "Stock not found");
        return NextResponse.json(
          { error: "Stock not found" },
          {
            status: 404,
            headers: { "X-Request-ID": requestId },
          }
        );
      }

      // Get OHLCV history for charts
      const ohlcv = getStockOHLCV(ticker, days);

      // Get extended OHLCV for P1 chart (20-day with patterns)
      const ohlcvExtended = getStockOHLCVExtended(ticker, 20);

      // Get MRS history for P3 chart
      const mrsHistory = getMRSHistory(ticker, 20);

      // Get sector data for P2 chart
      const stockSector = getStockSector(ticker);
      const sectors = getSectorMRS();

      // Calculate change from previous close
      const prevClose = ohlcv.length > 1 ? ohlcv[ohlcv.length - 2].close : detail.close;
      const change = detail.close - prevClose;
      const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

      const response = {
        ...detail,
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        ohlcv,
        // Chart data for Phase 2
        charts: {
          priceVolume: ohlcvExtended,  // P1: 20-day OHLCV with patterns
          sectorMRS: { sectors, currentSector: stockSector },  // P2: Sector comparison
          mrsTrajectory: mrsHistory,  // P3: MRS history
        },
      };

      log.info(
        { ticker, latencyMs: Date.now() - startTime },
        "Stock detail fetched"
      );

      return NextResponse.json(response, {
        headers: {
          "X-Request-ID": requestId,
          "X-Response-Time": `${Date.now() - startTime}ms`,
        },
      });
    } catch (error) {
      log.error({ error, ticker }, "Failed to fetch stock detail");
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}
