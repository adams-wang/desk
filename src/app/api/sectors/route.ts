import { NextResponse } from "next/server";
import { getSectorMRS } from "@/lib/queries/sectors";

export async function GET() {
  try {
    const sectors = getSectorMRS();
    return NextResponse.json({ sectors });
  } catch (error) {
    console.error("Error fetching sectors:", error);
    return NextResponse.json(
      { error: "Failed to fetch sector data" },
      { status: 500 }
    );
  }
}
