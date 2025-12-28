import Link from "next/link";

export function DisclaimerBanner() {
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2">
      <p className="text-xs text-amber-700 dark:text-amber-400">
        <span className="font-medium">Educational purposes only.</span> Not investment advice.
        Past performance does not guarantee future results.{" "}
        <Link href="/terms" className="underline hover:no-underline">
          View full terms
        </Link>
      </p>
    </div>
  );
}
