"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface IndexCardProps {
  code: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  onClick?: () => void;
}

export function IndexCard({
  name,
  price,
  change,
  changePct,
  onClick,
}: IndexCardProps) {
  const isPositive = change >= 0;
  const changeColor = isPositive ? "text-emerald-500" : "text-red-500";

  // Format price - no decimals for large indices
  const formattedPrice = price.toLocaleString("en-US", {
    minimumFractionDigits: price < 1000 ? 2 : 0,
    maximumFractionDigits: price < 1000 ? 2 : 0,
  });

  // Format change
  const formattedChange = isPositive
    ? `+${change.toFixed(2)}`
    : change.toFixed(2);

  // Format percentage with parentheses for negative
  const formattedPct = isPositive
    ? `+${changePct.toFixed(2)}%`
    : `(${Math.abs(changePct).toFixed(2)}%)`;

  return (
    <Card
      className={cn(
        "transition-colors",
        onClick && "cursor-pointer hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted-foreground">
            {name}
          </span>
          <span className="text-2xl font-bold tabular-nums">{formattedPrice}</span>
          <div className={cn("flex items-center gap-2 text-sm", changeColor)}>
            <span className="tabular-nums">{formattedChange}</span>
            <span className="tabular-nums">{formattedPct}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface IndicesGridProps {
  indices: Array<{
    code: string;
    name: string;
    close: number;
    change: number;
    changePct: number;
  }>;
  onIndexClick?: (code: string) => void;
}

export function IndicesGrid({ indices, onIndexClick }: IndicesGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {indices.map((index) => (
        <IndexCard
          key={index.code}
          code={index.code}
          name={index.name}
          price={index.close}
          change={index.change}
          changePct={index.changePct}
          onClick={onIndexClick ? () => onIndexClick(index.code) : undefined}
        />
      ))}
    </div>
  );
}
