"use client";

import { useState, useEffect } from "react";
import Markdown from "react-markdown";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ReportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticker: string;
  date?: string;
  initialVariant?: "10" | "20";
  hasL3_10?: boolean;
  hasL3_20?: boolean;
  verdict10?: string | null;
  verdict20?: string | null;
}

interface ReportData {
  ticker: string;
  variant: string;
  date: string;
  content: string;
}

export function ReportSheet({
  open,
  onOpenChange,
  ticker,
  date,
  initialVariant = "10",
  hasL3_10 = true,
  hasL3_20 = true,
  verdict10,
  verdict20,
}: ReportSheetProps) {
  const [activeVariant, setActiveVariant] = useState<"10" | "20">(initialVariant);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get verdict color matching chart badges
  const getVerdictColor = (verdict: string | null) => {
    if (!verdict) return "#9ca3af";
    const upper = verdict.toUpperCase();
    if (upper.includes("BUY") || upper.startsWith("B")) return "#22c55e"; // green
    if (upper.includes("AVOID") || upper.startsWith("A") || upper.includes("SELL")) return "#ef4444"; // red
    return "#9ca3af"; // gray for HOLD and others
  };

  // Fetch report when sheet opens or variant changes
  useEffect(() => {
    if (!open || !ticker) return;

    const fetchReport = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ variant: activeVariant });
        if (date) params.append("date", date);

        const response = await fetch(`/api/reports/${ticker}?${params}`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch report");
        }

        const data = await response.json();
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report");
        setReport(null);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [open, ticker, activeVariant, date]);

  // Reset state when sheet closes or opens
  useEffect(() => {
    if (!open) {
      setReport(null);
      setError(null);
    } else {
      // Always reset to initialVariant when opening
      setActiveVariant(initialVariant);
    }
  }, [open, initialVariant]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col p-0"
      >
        <SheetHeader className="border-b shrink-0" style={{ height: 64 }}>
          <SheetTitle className="sr-only">{ticker} Analysis</SheetTitle>
          <div className="flex items-center justify-between h-full px-6 pr-14">
            {/* Verdict Toggle */}
            <div className="flex items-center gap-2">
              {verdict10 && (
                <button
                  onClick={() => setActiveVariant("10")}
                  disabled={!hasL3_10}
                  className={cn(
                    "px-4 py-1.5 text-lg font-bold rounded-md transition-all border-2",
                    !hasL3_10 && "opacity-30 cursor-not-allowed"
                  )}
                  style={{
                    borderColor: getVerdictColor(verdict10),
                    color: getVerdictColor(verdict10),
                    backgroundColor: activeVariant === "10" ? `${getVerdictColor(verdict10)}20` : "transparent",
                    opacity: !hasL3_10 ? 0.3 : (activeVariant === "10" ? 1 : 0.5)
                  }}
                >
                  {verdict10}
                </button>
              )}
              {verdict20 && (
                <button
                  onClick={() => setActiveVariant("20")}
                  disabled={!hasL3_20}
                  className={cn(
                    "px-4 py-1.5 text-lg font-bold rounded-md transition-all border-2",
                    !hasL3_20 && "opacity-30 cursor-not-allowed"
                  )}
                  style={{
                    borderColor: getVerdictColor(verdict20),
                    color: getVerdictColor(verdict20),
                    backgroundColor: activeVariant === "20" ? `${getVerdictColor(verdict20)}20` : "transparent",
                    opacity: !hasL3_20 ? 0.3 : (activeVariant === "20" ? 1 : 0.5)
                  }}
                >
                  {verdict20}
                </button>
              )}
            </div>

            <SheetDescription className="text-sm text-muted-foreground">
              MRS {activeVariant} | {report?.date || date || ""}
            </SheetDescription>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 overflow-auto px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-500 mb-2">{error}</p>
              <p className="text-sm text-muted-foreground">
                Report may not be available for this date
              </p>
            </div>
          )}

          {!loading && !error && report && (
            <article className="text-foreground pb-12 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:mb-4 [&_p]:leading-relaxed [&_p]:text-base [&_strong]:font-semibold [&_ul]:my-4 [&_ul]:space-y-2 [&_ul]:pl-6 [&_ul>li]:relative [&_ul>li]:pl-2 [&_ul>li]:leading-normal [&_ul>li:before]:content-['•'] [&_ul>li:before]:absolute [&_ul>li:before]:left-[-1.5rem] [&_ul>li:before]:text-foreground [&_ol]:my-4 [&_ol]:space-y-2 [&_ol]:pl-6 [&_ol]:list-decimal [&_ol>li]:relative [&_ol>li]:pl-2 [&_ol>li]:leading-normal">
              <Markdown>{report.content}</Markdown>
            </article>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
