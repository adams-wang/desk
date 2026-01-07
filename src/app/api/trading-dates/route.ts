import { NextResponse } from "next/server";
import { getAllTradingDatesWithRegime } from "@/lib/queries/trading-days";
import { v4 as uuidv4 } from "uuid";
import { withRequestContext, getLogger } from "@/lib/logger";

export async function GET() {
  const requestId = uuidv4();

  return withRequestContext(requestId, async () => {
    const log = getLogger();

    try {
      const datesWithRegime = getAllTradingDatesWithRegime();
      log.info({ count: datesWithRegime.length }, "Trading dates with regime fetched");

      // Return both formats for backward compatibility
      return NextResponse.json(
        {
          dates: datesWithRegime.map(d => d.date),
          datesWithRegime,
        },
        {
          headers: {
            "X-Request-ID": requestId,
            "Cache-Control": "public, max-age=300", // Cache for 5 minutes
          },
        }
      );
    } catch (error) {
      log.error({ error }, "Failed to fetch trading dates");
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}
