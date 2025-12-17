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
}: ReportSheetProps) {
  const [activeVariant, setActiveVariant] = useState<"10" | "20">(initialVariant);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Reset state when sheet closes
  useEffect(() => {
    if (!open) {
      setReport(null);
      setError(null);
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col p-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between pr-8">
            <div>
              <SheetTitle className="text-xl">{ticker} Analysis</SheetTitle>
              <SheetDescription>
                MRS {activeVariant}-day report{report?.date ? ` • ${report.date}` : ""}
              </SheetDescription>
            </div>
          </div>

          {/* Variant Toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit mt-2">
            <button
              onClick={() => setActiveVariant("10")}
              disabled={!hasL3_10}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeVariant === "10"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
                !hasL3_10 && "opacity-50 cursor-not-allowed"
              )}
            >
              MRS 10
            </button>
            <button
              onClick={() => setActiveVariant("20")}
              disabled={!hasL3_20}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeVariant === "20"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
                !hasL3_20 && "opacity-50 cursor-not-allowed"
              )}
            >
              MRS 20
            </button>
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
            <article className="text-foreground pb-12 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-6 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-5 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mt-8 [&_h3]:mb-4 [&_p]:mb-6 [&_p]:leading-loose [&_p]:text-base [&_strong]:font-semibold [&_ul]:my-6 [&_ul]:space-y-3 [&_ul]:pl-6 [&_ul>li]:relative [&_ul>li]:pl-2 [&_ul>li]:leading-loose [&_ul>li:before]:content-['•'] [&_ul>li:before]:absolute [&_ul>li:before]:left-[-1.5rem] [&_ul>li:before]:text-foreground [&_ol]:my-6 [&_ol]:space-y-3 [&_ol]:pl-6 [&_ol]:list-decimal [&_ol>li]:relative [&_ol>li]:pl-2 [&_ol>li]:leading-loose">
              <Markdown>{report.content}</Markdown>
            </article>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
