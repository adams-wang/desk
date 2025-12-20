import { NextResponse, NextRequest } from "next/server";
import { getLatestTradingDate, getTradingDateNavigation } from "@/lib/queries/trading-days";
import { getL1ContractFull } from "@/lib/queries/market";
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
      // Use L1 JSON file as source of truth (not database table)
      const l1 = getL1ContractFull(date);
      const nav = getTradingDateNavigation(date);

      log.info({ date, regime: l1?.regime }, "Trading date fetched");

      return NextResponse.json(
        {
          date,
          vix: l1?.signals?.vixValue ?? null,
          regime: l1?.regime?.toLowerCase() ?? null,
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
