"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, XCircle, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BlockersCardProps {
  hardBlocks: string[];
  fomcDaysAway: number | null;
  sahmTriggered: boolean;
  vixValue: number;
}

type BlockerStatus = "active" | "warning" | "clear";

interface BlockerItem {
  id: string;
  label: string;
  detail: string;
  status: BlockerStatus;
}

const statusConfig: Record<
  BlockerStatus,
  { icon: typeof CheckCircle2; color: string; bgColor: string }
> = {
  active: {
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  clear: {
    icon: CheckCircle2,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
};

export function BlockersCard({
  hardBlocks,
  fomcDaysAway,
  sahmTriggered,
  vixValue,
}: BlockersCardProps) {
  // Build blocker items
  const blockers: BlockerItem[] = [];

  // VIX Crisis check
  const vixCrisis = vixValue > 35;
  blockers.push({
    id: "vix",
    label: "VIX Crisis",
    detail: vixCrisis
      ? `VIX at ${vixValue.toFixed(2)} - above 35 threshold`
      : `VIX at ${vixValue.toFixed(2)} - below crisis threshold`,
    status: vixCrisis ? "active" : "clear",
  });

  // Sahm Rule check
  blockers.push({
    id: "sahm",
    label: "Sahm Rule",
    detail: sahmTriggered
      ? "Recession indicator triggered"
      : "Not triggered",
    status: sahmTriggered ? "active" : "clear",
  });

  // FOMC proximity check
  if (fomcDaysAway !== null) {
    const fomcStatus: BlockerStatus =
      fomcDaysAway < 3 ? "warning" : "clear";
    blockers.push({
      id: "fomc",
      label: "FOMC Meeting",
      detail:
        fomcDaysAway < 3
          ? `In ${fomcDaysAway} days - position size capped at 50%`
          : `In ${fomcDaysAway} days - no constraint`,
      status: fomcStatus,
    });
  }

  // Add any other hard blocks from the array
  for (const block of hardBlocks) {
    if (!["vix_crisis", "sahm_triggered", "fomc_proximity"].includes(block)) {
      blockers.push({
        id: block,
        label: block.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        detail: "Active blocker",
        status: "active",
      });
    }
  }

  const hasActiveBlocks = blockers.some((b) => b.status === "active");
  const hasWarnings = blockers.some((b) => b.status === "warning");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4" />
          Blockers & Alerts
          {hasActiveBlocks && (
            <span className="ml-auto rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
              Active
            </span>
          )}
          {!hasActiveBlocks && hasWarnings && (
            <span className="ml-auto rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500">
              Warning
            </span>
          )}
          {!hasActiveBlocks && !hasWarnings && (
            <span className="ml-auto rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">
              Clear
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {blockers.map((blocker) => {
          const config = statusConfig[blocker.status];
          const Icon = config.icon;

          return (
            <div
              key={blocker.id}
              className={cn(
                "flex items-start gap-3 rounded-md p-2",
                config.bgColor
              )}
            >
              <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.color)} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{blocker.label}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {blocker.detail}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
