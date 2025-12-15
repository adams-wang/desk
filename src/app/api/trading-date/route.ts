import { NextResponse } from "next/server";
import { getLatestTradingDate, getMarketRegime } from "@/lib/queries/trading-days";
import { v4 as uuidv4 } from "uuid";
import { withRequestContext, getLogger } from "@/lib/logger";

export async function GET() {
  const requestId = uuidv4();

  return withRequestContext(requestId, async () => {
    const log = getLogger();

    try {
      const date = getLatestTradingDate();
      const marketRegime = getMarketRegime(date);
      log.info({ date, marketRegime }, "Trading date fetched");

      return NextResponse.json(
        {
          date,
          vix: marketRegime?.vix_close ?? null,
          regime: marketRegime?.regime ?? null,
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
