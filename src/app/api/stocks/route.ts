import { NextRequest, NextResponse } from "next/server";
import { getStockList, searchStocks } from "@/lib/queries/stocks";
import { v4 as uuidv4 } from "uuid";
import { withRequestContext, getLogger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const requestId = uuidv4();
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const limit = parseInt(searchParams.get("limit") || "500", 10);

  return withRequestContext(requestId, async () => {
    const log = getLogger();
    const startTime = Date.now();

    try {
      // If search query provided, use search
      if (query) {
        const stocks = searchStocks(query, Math.min(limit, 50));
        log.info(
          { query, count: stocks.length, latencyMs: Date.now() - startTime },
          "Stock search completed"
        );
        return NextResponse.json(
          { stocks, count: stocks.length },
          { headers: { "X-Request-ID": requestId } }
        );
      }

      // Otherwise return full list
      const stocks = getStockList(limit);
      log.info(
        { count: stocks.length, latencyMs: Date.now() - startTime },
        "Stock list fetched"
      );

      return NextResponse.json(
        { stocks, count: stocks.length },
        {
          headers: {
            "X-Request-ID": requestId,
            "X-Response-Time": `${Date.now() - startTime}ms`,
          },
        }
      );
    } catch (error) {
      log.error({ error }, "Failed to fetch stocks");
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}
