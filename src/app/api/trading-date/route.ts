import { NextResponse, NextRequest } from "next/server";
import { getLatestTradingDate, getMarketRegime, getTradingDateNavigation } from "@/lib/queries/trading-days";
import { v4 as uuidv4 } from "uuid";
import { withRequestContext, getLogger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const requestId = uuidv4();

  return withRequestContext(requestId, async () => {
    const log = getLogger();

    try {
      const searchParams = request.nextUrl.searchParams;
      const requestedDate = searchParams.get("date");

      const latestDate = getLatestTradingDate();
      const date = requestedDate || latestDate;
      const marketRegime = getMarketRegime(date);
      const nav = getTradingDateNavigation(date);

      log.info({ date, marketRegime }, "Trading date fetched");

      return NextResponse.json(
        {
          date,
          vix: marketRegime?.vix_close ?? null,
          regime: marketRegime?.regime ?? null,
          latestDate,
          prevDate: nav?.prevDate ?? null,
          nextDate: nav?.nextDate ?? null,
        },
        {
          headers: {
            "X-Request-ID": requestId,
          },
        }
      );
    } catch (error) {
      log.error({ error }, "Failed to fetch trading date");
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}
