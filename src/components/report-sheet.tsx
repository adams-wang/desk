"use client";

import { useState, useEffect } from "react";
import Markdown from "react-markdown";
import { ChevronLeft, ChevronRight, Globe } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Language configuration
const LANGUAGES = {
  en: { label: "EN", name: "English" },
  zh: { label: "中", name: "中文" },
  ko: { label: "한", name: "한국어" },
  ja: { label: "日", name: "日本語" },
} as const;

type Language = keyof typeof LANGUAGES;

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
  lang: Language;
  content: string;
  verdict10: string | null;
  verdict20: string | null;
  availableLanguages: Language[];
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
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState<string | undefined>(date);
  const [currentLang, setCurrentLang] = useState<Language>("en");
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>(["en"]);

  // Get verdict color matching chart badges
  const getVerdictColor = (verdict: string | null) => {
    if (!verdict) return "#9ca3af";
    const upper = verdict.toUpperCase();
    if (upper.includes("BUY") || upper.startsWith("B")) return "#22c55e"; // green
    if (upper.includes("AVOID") || upper.startsWith("A") || upper.includes("SELL")) return "#ef4444"; // red
    return "#9ca3af"; // gray for HOLD and others
  };

  // Fetch available dates when sheet opens or variant changes
  useEffect(() => {
    if (!open || !ticker) return;

    const fetchDates = async () => {
      try {
        const response = await fetch(`/api/reports/${ticker}/dates?variant=${activeVariant}`);
        if (response.ok) {
          const data = await response.json();
          setAvailableDates(data.dates || []);
        }
      } catch {
        setAvailableDates([]);
      }
    };

    fetchDates();
  }, [open, ticker, activeVariant]);

  // Get current date index and navigation state
  const currentDateIndex = currentDate ? availableDates.indexOf(currentDate) : -1;
  const hasPrevious = currentDateIndex > 0;
  const hasNext = currentDateIndex >= 0 && currentDateIndex < availableDates.length - 1;

  const goToPrevious = () => {
    if (hasPrevious) {
      setCurrentDate(availableDates[currentDateIndex - 1]);
    }
  };

  const goToNext = () => {
    if (hasNext) {
      setCurrentDate(availableDates[currentDateIndex + 1]);
    }
  };

  // Fetch report when sheet opens or variant/date/language changes
  useEffect(() => {
    if (!open || !ticker) return;

    const fetchReport = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ variant: activeVariant, lang: currentLang });
        if (currentDate) params.append("date", currentDate);

        const response = await fetch(`/api/reports/${ticker}?${params}`);

        if (!response.ok) {
          const data = await response.json();
          // If language not available, show what's available
          if (data.availableLanguages) {
            setAvailableLanguages(data.availableLanguages);
          }
          throw new Error(data.error || "Failed to fetch report");
        }

        const data = await response.json();
        setReport(data);
        // Update available languages from response
        if (data.availableLanguages) {
          setAvailableLanguages(data.availableLanguages);
        }
        // Update currentDate from response if not set
        if (!currentDate && data.date) {
          setCurrentDate(data.date);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report");
        setReport(null);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [open, ticker, activeVariant, currentDate, currentLang]);

  // Reset state when sheet closes or opens
  useEffect(() => {
    if (!open) {
      setReport(null);
      setError(null);
      setAvailableDates([]);
    } else {
      // Always reset to initialVariant, date, and English when opening
      setActiveVariant(initialVariant);
      setCurrentDate(date);
      setCurrentLang("en");
      setAvailableLanguages(["en"]);
    }
  }, [open, initialVariant, date]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col p-0"
      >
        <SheetHeader className="border-b shrink-0" style={{ height: 64 }}>
          <SheetTitle className="sr-only">{ticker} Analysis</SheetTitle>
          <div className="flex items-center justify-between h-full px-6 pr-14">
            {/* Verdict Toggle - use dynamic verdicts from report when available */}
            <div className="flex items-center gap-2">
              {(() => {
                const displayVerdict10 = report?.verdict10 ?? verdict10;
                const displayVerdict20 = report?.verdict20 ?? verdict20;
                const has10 = !!displayVerdict10;
                const has20 = !!displayVerdict20;

                return (
                  <>
                    {displayVerdict10 && (
                      <button
                        onClick={() => setActiveVariant("10")}
                        disabled={!has10}
                        className={cn(
                          "w-20 h-9 text-lg font-bold rounded-md transition-all border-2 flex items-center justify-center",
                          !has10 && "opacity-30 cursor-not-allowed"
                        )}
                        style={{
                          borderColor: getVerdictColor(displayVerdict10),
                          color: getVerdictColor(displayVerdict10),
                          backgroundColor: activeVariant === "10" ? `${getVerdictColor(displayVerdict10)}20` : "transparent",
                          opacity: !has10 ? 0.3 : (activeVariant === "10" ? 1 : 0.5)
                        }}
                      >
                        {displayVerdict10}
                      </button>
                    )}
                    {displayVerdict20 && (
                      <button
                        onClick={() => setActiveVariant("20")}
                        disabled={!has20}
                        className={cn(
                          "w-20 h-9 text-lg font-bold rounded-md transition-all border-2 flex items-center justify-center",
                          !has20 && "opacity-30 cursor-not-allowed"
                        )}
                        style={{
                          borderColor: getVerdictColor(displayVerdict20),
                          color: getVerdictColor(displayVerdict20),
                          backgroundColor: activeVariant === "20" ? `${getVerdictColor(displayVerdict20)}20` : "transparent",
                          opacity: !has20 ? 0.3 : (activeVariant === "20" ? 1 : 0.5)
                        }}
                      >
                        {displayVerdict20}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-1">
              <Globe className="h-4 w-4 text-muted-foreground mr-1" />
              {(Object.keys(LANGUAGES) as Language[]).map((lang) => {
                const isAvailable = availableLanguages.includes(lang);
                const isActive = currentLang === lang;
                return (
                  <button
                    key={lang}
                    onClick={() => isAvailable && setCurrentLang(lang)}
                    disabled={!isAvailable}
                    className={cn(
                      "w-8 h-7 text-sm font-medium rounded transition-all flex items-center justify-center",
                      isAvailable
                        ? isActive
                          ? "bg-foreground text-background"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        : "opacity-25 cursor-not-allowed text-muted-foreground"
                    )}
                    title={LANGUAGES[lang].name}
                  >
                    {LANGUAGES[lang].label}
                  </button>
                );
              })}
            </div>

            <SheetDescription className="text-sm text-muted-foreground flex items-center gap-2">
              <button
                onClick={goToPrevious}
                disabled={!hasPrevious}
                className={cn(
                  "p-1.5 rounded-md border border-transparent transition-all",
                  hasPrevious
                    ? "hover:bg-muted hover:border-border active:scale-95"
                    : "opacity-25 cursor-not-allowed"
                )}
                aria-label="Previous report"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="min-w-[120px] text-center font-medium">
                {report?.date || currentDate || ""}
              </span>
              <button
                onClick={goToNext}
                disabled={!hasNext}
                className={cn(
                  "p-1.5 rounded-md border border-transparent transition-all",
                  hasNext
                    ? "hover:bg-muted hover:border-border active:scale-95"
                    : "opacity-25 cursor-not-allowed"
                )}
                aria-label="Next report"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
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
            <article className="text-foreground pb-12 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-4 [&>h2:first-child]:mt-2 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:mb-4 [&_p]:leading-relaxed [&_p]:text-base [&_strong]:font-semibold [&_ul]:my-4 [&_ul]:space-y-2 [&_ul]:pl-6 [&_ul>li]:relative [&_ul>li]:pl-2 [&_ul>li]:leading-normal [&_ul>li:before]:content-['•'] [&_ul>li:before]:absolute [&_ul>li:before]:left-[-1.5rem] [&_ul>li:before]:text-foreground [&_ol]:my-4 [&_ol]:space-y-2 [&_ol]:pl-6 [&_ol]:list-decimal [&_ol>li]:relative [&_ol>li]:pl-2 [&_ol>li]:leading-normal">
              <Markdown>{report.content}</Markdown>
            </article>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
