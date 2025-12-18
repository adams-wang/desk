"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Regime = "RISK_ON" | "NORMAL" | "RISK_OFF" | "CRISIS";

interface RegimeHistoryItem {
  date: string;
  regime: Regime;
}

interface RegimeHistoryStripProps {
  history: RegimeHistoryItem[];
  currentDate: string;
}

const regimeColors: Record<Regime, string> = {
  RISK_ON: "bg-emerald-500",
  NORMAL: "bg-blue-500",
  RISK_OFF: "bg-amber-500",
  CRISIS: "bg-red-500",
};

const regimeLabels: Record<Regime, string> = {
  RISK_ON: "Risk On",
  NORMAL: "Normal",
  RISK_OFF: "Risk Off",
  CRISIS: "Crisis",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RegimeHistoryStrip({
  history,
  currentDate,
}: RegimeHistoryStripProps) {
  if (!history || history.length === 0) return null;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex items-center gap-0.5">
        {history.map((item, index) => {
          const isToday = item.date === currentDate;
          const isLast = index === history.length - 1;

          return (
            <Tooltip key={item.date}>
              <TooltipTrigger asChild>
                <div
                  className={`
                    w-1.5 h-1.5 rounded-full transition-all
                    ${regimeColors[item.regime]}
                    ${isToday || isLast ? "ring-1 ring-foreground/50 ring-offset-1 ring-offset-background" : ""}
                    ${isToday || isLast ? "w-2 h-2" : "opacity-70 hover:opacity-100"}
                  `}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <span className="font-medium">{formatDate(item.date)}</span>
                <span className="text-muted-foreground"> · </span>
                <span>{regimeLabels[item.regime]}</span>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
