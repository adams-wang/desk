import { NextResponse } from "next/server";
import { getAllTradingDates } from "@/lib/queries/trading-days";
import { v4 as uuidv4 } from "uuid";
import { withRequestContext, getLogger } from "@/lib/logger";

export async function GET() {
  const requestId = uuidv4();

  return withRequestContext(requestId, async () => {
    const log = getLogger();

    try {
      const dates = getAllTradingDates();
      log.info({ count: dates.length }, "Trading dates fetched");

      return NextResponse.json(
        { dates },
        {
          headers: {
            "X-Request-ID": requestId,
            "Cache-Control": "public, max-age=3600", // Cache for 1 hour
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
