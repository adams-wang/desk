import { getSectorRotationData } from "@/lib/queries/sectors";
import { getLatestTradingDate } from "@/lib/queries/trading-days";
import { SectorsContent } from "./sectors-content";

interface SectorsPageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function SectorsPage({ searchParams }: SectorsPageProps) {
  const { date } = await searchParams;
  const latestDate = getLatestTradingDate();
  const currentDate = date || latestDate;

  const data = getSectorRotationData(currentDate);

  return <SectorsContent data={data} currentDate={currentDate} />;
}
