"use client";

import { useState, useEffect } from "react";
import Markdown from "react-markdown";
import { Globe } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const LANGUAGES = {
  en: { label: "EN", name: "English" },
  zh: { label: "中", name: "中文" },
} as const;

type Language = keyof typeof LANGUAGES;

interface L2ReportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tradingDate: string;
}

export function L2ReportSheet({
  open,
  onOpenChange,
  tradingDate,
}: L2ReportSheetProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLang, setCurrentLang] = useState<Language>("en");
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>(["en"]);

  useEffect(() => {
    if (!open) {
      setContent(null);
      return;
    }

    async function fetchReport() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/reports/l2?date=${tradingDate}&lang=${currentLang}`);

        if (!response.ok) {
          const data = await response.json();
          if (data.availableLanguages) {
            setAvailableLanguages(data.availableLanguages);
          }
          throw new Error("Failed to load report");
        }

        const data = await response.json();
        setContent(data.content);
        if (data.availableLanguages) {
          setAvailableLanguages(data.availableLanguages);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [open, tradingDate, currentLang]);

  // Reset language when sheet closes
  useEffect(() => {
    if (!open) {
      setCurrentLang("en");
      setAvailableLanguages(["en"]);
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col p-0"
        style={{ width: "61.8vw", maxWidth: "61.8vw" }}
      >
        <SheetHeader className="border-b shrink-0" style={{ height: 64 }}>
          <SheetTitle className="sr-only">L2 Sector Analysis</SheetTitle>
          <div className="flex items-center justify-between h-full px-6 pr-14">
            {/* Language Selector */}
            <div className="flex items-center gap-1">
              <Globe className="h-4 w-4 text-muted-foreground mr-1" />
              {(Object.keys(LANGUAGES) as Language[]).map((lang) => {
                const isAvailable = availableLanguages.includes(lang);
                const isActive = currentLang === lang;

                return (
                  <button
                    key={lang}
                    onClick={() => {
                      if (isAvailable) {
                        setCurrentLang(lang);
                      }
                    }}
                    disabled={!isAvailable}
                    className={cn(
                      "w-8 h-7 text-sm font-medium rounded transition-all flex items-center justify-center",
                      isAvailable
                        ? isActive
                          ? "bg-muted text-foreground border border-foreground/30"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        : "opacity-25 cursor-not-allowed text-muted-foreground"
                    )}
                  >
                    {LANGUAGES[lang].label}
                  </button>
                );
              })}
            </div>

            <SheetDescription className="text-sm text-muted-foreground">
              {tradingDate}
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

          {!loading && !error && !content && (
            <div className="text-center py-12 text-muted-foreground">
              No report available for this date.
            </div>
          )}

          {!loading && !error && content && (
            <article className="text-foreground pb-12 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-4 [&>h2:first-child]:mt-2 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:mb-4 [&_p]:leading-relaxed [&_p]:text-base [&_strong]:font-semibold [&_ul]:my-4 [&_ul]:space-y-2 [&_ul]:pl-6 [&_ul>li]:relative [&_ul>li]:pl-2 [&_ul>li]:leading-normal [&_ul>li:before]:content-['•'] [&_ul>li:before]:absolute [&_ul>li:before]:left-[-1.5rem] [&_ul>li:before]:text-foreground [&_ol]:my-4 [&_ol]:space-y-2 [&_ol]:pl-6 [&_ol]:list-decimal [&_ol>li]:relative [&_ol>li]:pl-2 [&_ol>li]:leading-normal">
              <Markdown>{content}</Markdown>
            </article>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
