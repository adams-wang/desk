"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VixGauge } from "./vix-gauge";
import { BreadthBar } from "./breadth-bar";
import { Activity } from "lucide-react";

interface MarketHealthCardProps {
  vix: {
    value: number;
    bucket: string;
  };
  breadth: {
    pct: number;
    above: number;
    total: number;
  };
  sentiment: {
    putCallRatio: number;
    nyseAdRatio: number;
  };
}

function getSentimentLabel(putCallRatio: number): { label: string; color: string } {
  if (putCallRatio > 1.2) return { label: "Fearful", color: "text-red-500" };
  if (putCallRatio > 1.0) return { label: "Cautious", color: "text-amber-500" };
  if (putCallRatio > 0.7) return { label: "Neutral", color: "text-blue-500" };
  return { label: "Greedy", color: "text-emerald-500" };
}

function getADLabel(adRatio: number): { label: string; color: string } {
  if (adRatio > 1.5) return { label: "Bullish", color: "text-emerald-500" };
  if (adRatio > 1.0) return { label: "Positive", color: "text-blue-500" };
  if (adRatio > 0.7) return { label: "Negative", color: "text-amber-500" };
  return { label: "Bearish", color: "text-red-500" };
}

export function MarketHealthCard({ vix, breadth, sentiment }: MarketHealthCardProps) {
  const pcLabel = getSentimentLabel(sentiment.putCallRatio);
  const adLabel = getADLabel(sentiment.nyseAdRatio);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Market Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* VIX Gauge */}
        <VixGauge value={vix.value} bucket={vix.bucket} />

        {/* Breadth Bar */}
        <BreadthBar
          percentage={breadth.pct}
          above={breadth.above}
          total={breadth.total}
        />

        {/* Sentiment Indicators */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          {/* Put/Call Ratio */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Put/Call</span>
              <span className={`text-sm font-bold tabular-nums ${sentiment.putCallRatio > 0 ? "" : "text-muted-foreground"}`}>
                {sentiment.putCallRatio > 0 ? sentiment.putCallRatio.toFixed(2) : "N/A"}
              </span>
            </div>
            {sentiment.putCallRatio > 0 && (
              <span className={`text-xs font-medium ${pcLabel.color}`}>
                {pcLabel.label}
              </span>
            )}
          </div>

          {/* NYSE A/D Ratio */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">NYSE A/D</span>
              <span className={`text-sm font-bold tabular-nums ${sentiment.nyseAdRatio > 0 ? "" : "text-muted-foreground"}`}>
                {sentiment.nyseAdRatio > 0 ? sentiment.nyseAdRatio.toFixed(2) : "N/A"}
              </span>
            </div>
            {sentiment.nyseAdRatio > 0 && (
              <span className={`text-xs font-medium ${adLabel.color}`}>
                {adLabel.label}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
