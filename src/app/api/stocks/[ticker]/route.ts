import { NextRequest, NextResponse } from "next/server";
import { getStockDetail, getStockOHLCV } from "@/lib/queries/stocks";
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

      // Calculate change from previous close
      const prevClose = ohlcv.length > 1 ? ohlcv[ohlcv.length - 2].close : detail.close;
      const change = detail.close - prevClose;
      const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

      const response = {
        ...detail,
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        ohlcv,
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
