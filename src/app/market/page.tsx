import { redirect } from "next/navigation";

interface MarketPageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function MarketPage({ searchParams }: MarketPageProps) {
  const { date } = await searchParams;

  // Redirect to home page (which now shows Market content)
  if (date) {
    redirect(`/?date=${date}`);
  }
  redirect("/");
}
