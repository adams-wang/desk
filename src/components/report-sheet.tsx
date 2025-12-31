"use client";

import { useState, useEffect, useCallback } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronLeft, ChevronRight, Globe, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Language configuration
const LANGUAGES = {
  en: { label: "EN", name: "English", translateHint: "" },
  zh: { label: "中", name: "中文", translateHint: "双击翻译" },
  ko: { label: "한", name: "한국어", translateHint: "더블클릭하여 번역" },
  ja: { label: "日", name: "日本語", translateHint: "ダブルクリックで翻訳" },
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
  const [currentLang, setCurrentLang] = useState<Language>("en");

  // Navigation state: only set when user explicitly navigates via prev/next
  // null = use date prop, string = user navigated to this date
  const [navigatedDate, setNavigatedDate] = useState<string | null>(null);

  // The effective date: navigation overrides prop
  const effectiveDate = navigatedDate ?? date;

  // Track available languages per variant
  const [availableLanguagesByVariant, setAvailableLanguagesByVariant] = useState<Record<"10" | "20", Language[]>>({
    "10": ["en"],
    "20": ["en"],
  });
  // Track which languages are currently translating
  const [translatingSet, setTranslatingSet] = useState<Set<string>>(new Set());

  // Get available languages for current variant
  const availableLanguages = availableLanguagesByVariant[activeVariant];

  // Get verdict color matching chart badges
  const getVerdictColor = (verdict: string | null) => {
    if (!verdict) return "#9ca3af";
    const upper = verdict.toUpperCase();
    if (upper.includes("BUY") || upper.startsWith("B")) return "#22c55e";
    if (upper.includes("AVOID") || upper.startsWith("A") || upper.includes("SELL")) return "#ef4444";
    return "#9ca3af";
  };

  // Translate report to a language
  const handleTranslate = useCallback(async (targetLang: Language) => {
    if (!ticker || !effectiveDate || targetLang === "en") return;

    const translationKey = `${activeVariant}-${targetLang}`;
    if (translatingSet.has(translationKey)) return;

    setTranslatingSet(prev => new Set(prev).add(translationKey));

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          variant: activeVariant,
          date: effectiveDate,
          lang: targetLang,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Translation failed");
      }

      setAvailableLanguagesByVariant(prev => ({
        ...prev,
        [activeVariant]: [...prev[activeVariant], targetLang],
      }));
      setCurrentLang(targetLang);
    } catch (err) {
      console.error("Translation error:", err);
      setError(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setTranslatingSet(prev => {
        const next = new Set(prev);
        next.delete(translationKey);
        return next;
      });
    }
  }, [ticker, effectiveDate, activeVariant, translatingSet]);

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

  // Navigation helpers
  const currentDateIndex = effectiveDate ? availableDates.indexOf(effectiveDate) : -1;
  const hasPrevious = currentDateIndex > 0;
  const hasNext = currentDateIndex >= 0 && currentDateIndex < availableDates.length - 1;

  const goToPrevious = () => {
    if (hasPrevious) {
      setNavigatedDate(availableDates[currentDateIndex - 1]);
    }
  };

  const goToNext = () => {
    if (hasNext) {
      setNavigatedDate(availableDates[currentDateIndex + 1]);
    }
  };

  // Fetch report when sheet opens or variant/date/language changes
  useEffect(() => {
    if (!open || !ticker || !effectiveDate) return;

    const fetchReport = async (lang: Language): Promise<boolean> => {
      const params = new URLSearchParams({ variant: activeVariant, lang });
      params.append("date", effectiveDate);

      const response = await fetch(`/api/reports/${ticker}?${params}`);

      if (!response.ok) {
        const data = await response.json();
        if (data.availableLanguages) {
          setAvailableLanguagesByVariant(prev => ({
            ...prev,
            [activeVariant]: data.availableLanguages,
          }));
        }
        return false;
      }

      const data = await response.json();
      setReport(data);
      if (data.availableLanguages) {
        setAvailableLanguagesByVariant(prev => ({
          ...prev,
          [activeVariant]: data.availableLanguages,
        }));
      }
      return true;
    };

    const loadReport = async () => {
      setLoading(true);
      setError(null);

      try {
        const success = await fetchReport(currentLang);

        if (!success && currentLang !== "en") {
          const fallbackSuccess = await fetchReport("en");
          if (fallbackSuccess) {
            setCurrentLang("en");
          } else {
            setError("Report not found");
            setReport(null);
          }
        } else if (!success) {
          setError("Report not found");
          setReport(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report");
        setReport(null);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [open, ticker, activeVariant, effectiveDate, currentLang]);

  // Reset all state when sheet closes
  useEffect(() => {
    if (!open) {
      setReport(null);
      setError(null);
      setAvailableDates([]);
      setNavigatedDate(null);
      setCurrentLang("en");
    }
  }, [open]);

  // Reset variant when initialVariant prop changes (new click)
  useEffect(() => {
    if (open) {
      setActiveVariant(initialVariant);
    }
  }, [open, initialVariant]);

  // Reset available languages when ticker changes
  useEffect(() => {
    setAvailableLanguagesByVariant({ "10": ["en"], "20": ["en"] });
    setTranslatingSet(new Set());
  }, [ticker]);

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
            <TooltipProvider delayDuration={300}>
              <div className="flex items-center gap-1">
                <Globe className="h-4 w-4 text-muted-foreground mr-1" />
                {(Object.keys(LANGUAGES) as Language[]).map((lang) => {
                  const isAvailable = availableLanguages.includes(lang);
                  const isActive = currentLang === lang;
                  const translationKey = `${activeVariant}-${lang}`;
                  const isTranslating = translatingSet.has(translationKey);
                  const canTranslate = lang !== "en" && !isAvailable && !isTranslating && effectiveDate;

                  const tooltipText = isTranslating
                    ? "Translating..."
                    : isAvailable
                      ? LANGUAGES[lang].name
                      : canTranslate
                        ? LANGUAGES[lang].translateHint
                        : LANGUAGES[lang].name;

                  return (
                    <Tooltip key={lang}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => {
                            if (isAvailable) {
                              setCurrentLang(lang);
                            }
                          }}
                          onDoubleClick={() => {
                            if (canTranslate) {
                              handleTranslate(lang);
                            }
                          }}
                          disabled={isTranslating}
                          className={cn(
                            "w-8 h-7 text-sm font-medium rounded transition-all flex items-center justify-center relative",
                            isAvailable
                              ? isActive
                                ? "bg-muted text-foreground border border-foreground/30"
                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                              : canTranslate
                                ? "hover:bg-muted text-muted-foreground hover:text-foreground border border-dashed border-muted-foreground/50 hover:border-foreground"
                                : "opacity-25 cursor-not-allowed text-muted-foreground"
                          )}
                        >
                          {isTranslating ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            LANGUAGES[lang].label
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        {tooltipText}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>

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
                {report?.date || effectiveDate || ""}
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
            <article className="text-foreground pb-12 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-4 [&>h2:first-child]:mt-2 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:mb-4 [&_p]:leading-relaxed [&_p]:text-base [&_strong]:font-semibold [&_ul]:my-4 [&_ul]:space-y-2 [&_ul]:pl-6 [&_ul>li]:relative [&_ul>li]:pl-2 [&_ul>li]:leading-normal [&_ul>li:before]:content-['•'] [&_ul>li:before]:absolute [&_ul>li:before]:left-[-1.5rem] [&_ul>li:before]:text-foreground [&_ol]:my-4 [&_ol]:space-y-2 [&_ol]:pl-6 [&_ol]:list-decimal [&_ol>li]:relative [&_ol>li]:pl-2 [&_ol>li]:leading-normal [&_table]:w-full [&_table]:my-4 [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_tr:hover]:bg-muted/50">
              <Markdown remarkPlugins={[remarkGfm]}>{report.content}</Markdown>
            </article>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
