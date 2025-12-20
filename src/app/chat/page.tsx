"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  User,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  TrendingUp,
  Activity,
  ChevronRight,
  Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  status: "sending" | "sent" | "error";
  suggestions?: string[];
}

interface MarketContext {
  tradingDate: string;
  regime: string;
  regimeTransition: string | null;
  vix: number;
  vixBucket: string;
  positionPct: number;
  confidence: string;
}

// Typing indicator with elapsed time
function TypingIndicator({ startTime }: { startTime: Date }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <div className="bg-muted/80 backdrop-blur-sm rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-xs text-muted-foreground ml-2">
            Analyzing{elapsed > 0 ? ` · ${elapsed}s` : "..."}
          </span>
        </div>
      </div>
    </div>
  );
}

// Copy button component
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md hover:bg-background/80 transition-colors text-muted-foreground hover:text-foreground"
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// Format timestamp
function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// Regime badge color
function getRegimeColor(regime: string): string {
  switch (regime?.toUpperCase()) {
    case "RISK_ON":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "NORMAL":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "RISK_OFF":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "CRISIS":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

// VIX color
function getVixColor(vix: number): string {
  if (vix < 15) return "text-green-500";
  if (vix < 20) return "text-blue-500";
  if (vix < 25) return "text-amber-500";
  return "text-red-500";
}

// Generate suggestions based on context
function generateSuggestions(content: string): string[] {
  const suggestions: string[] = [];

  if (content.toLowerCase().includes("regime") || content.toLowerCase().includes("market")) {
    suggestions.push("Show strongest momentum stocks");
    suggestions.push("Any stocks to avoid today?");
  } else if (content.toLowerCase().includes("buy") || content.toLowerCase().includes("bullish")) {
    suggestions.push("Get trading plans for top picks");
    suggestions.push("What sectors are leading?");
  } else if (content.toLowerCase().includes("aapl") || content.toLowerCase().includes("nvda") || content.toLowerCase().includes("stock")) {
    suggestions.push("Compare with sector peers");
    suggestions.push("Show analyst sentiment");
  } else {
    suggestions.push("What's the market regime?");
    suggestions.push("Top momentum stocks");
  }

  return suggestions.slice(0, 2);
}

const STORAGE_KEY = "desk-chat-history";

// Load messages from localStorage
function loadMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    // Convert timestamp strings back to Date objects
    return parsed.map((m: Message & { timestamp: string }) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
  } catch {
    return [];
  }
}

// Save messages to localStorage
function saveMessages(messages: Message[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // Ignore storage errors
  }
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState<Date | null>(null);
  const [context, setContext] = useState<MarketContext | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load messages from localStorage on mount
  useEffect(() => {
    const stored = loadMessages();
    if (stored.length > 0) {
      setMessages(stored);
    }
  }, []);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages]);

  // Fetch market context
  useEffect(() => {
    fetch("/api/chat/context")
      .then((res) => res.json())
      .then((data) => setContext(data))
      .catch(console.error);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const generateId = () => Math.random().toString(36).substring(7);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const userMsgId = generateId();
    setInput("");

    const newUserMessage: Message = {
      id: userMsgId,
      role: "user",
      content: userMessage,
      timestamp: new Date(),
      status: "sent",
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);
    setLoadingStartTime(new Date());

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();
      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
        status: "sent",
        suggestions: generateSuggestions(data.content),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
        status: "error",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setLoadingStartTime(null);
    }
  };

  const handleRetry = (messageIndex: number) => {
    // Find the user message before this error
    const userMessage = messages[messageIndex - 1];
    if (userMessage?.role === "user") {
      // Remove error message and retry
      setMessages((prev) => prev.slice(0, messageIndex));
      setInput(userMessage.content);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const exampleQueries = [
    { icon: TrendingUp, text: "Top bullish signals", query: "What are the top bullish signals today?" },
    { icon: Activity, text: "Market regime", query: "What's the current market regime?" },
    { icon: Sparkles, text: "Analyze NVDA", query: "Analyze NVDA for me" },
    { icon: ChevronRight, text: "Buy signals", query: "Show me stocks with buy signals" },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">AI Advisor</h2>
            <p className="text-xs text-muted-foreground">AI-powered market analysis</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
            title="Clear chat history"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 flex items-center justify-center mb-6">
              <Sparkles className="h-8 w-8 text-violet-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">How can I help you today?</h3>
            <p className="text-muted-foreground text-center max-w-md mb-8">
              Ask me about stocks, signals, market conditions, or get detailed trading plans.
            </p>
            <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
              {exampleQueries.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setInput(item.query);
                    inputRef.current?.focus();
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 hover:bg-muted border border-border/50 hover:border-border transition-all text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                    <item.icon className="h-4 w-4 text-violet-500" />
                  </div>
                  <span className="text-sm font-medium">{item.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div key={message.id} className="space-y-1">
                <div
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1 max-w-[80%]">
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3 shadow-sm",
                        message.role === "user"
                          ? "bg-slate-600 text-white rounded-tr-md"
                          : "bg-muted/80 backdrop-blur-sm rounded-tl-md",
                        message.status === "error" && "border border-red-500/50 bg-red-500/10"
                      )}
                    >
                      {message.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                              h3: ({ children }) => <h3 className="font-semibold text-base mt-4 mb-2">{children}</h3>,
                              h4: ({ children }) => <h4 className="font-medium text-sm mt-3 mb-1">{children}</h4>,
                              table: ({ children }) => (
                                <div className="overflow-x-auto my-3">
                                  <table className="min-w-full text-sm border-collapse">{children}</table>
                                </div>
                              ),
                              thead: ({ children }) => <thead className="border-b border-border">{children}</thead>,
                              tbody: ({ children }) => <tbody className="divide-y divide-border/50">{children}</tbody>,
                              tr: ({ children }) => <tr className="hover:bg-muted/30">{children}</tr>,
                              th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-foreground">{children}</th>,
                              td: ({ children }) => <td className="px-3 py-2 text-muted-foreground">{children}</td>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      )}
                    </div>

                    {/* Message footer with timestamp and actions */}
                    <div className={cn(
                      "flex items-center gap-2 px-1",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}>
                      <span className="text-[10px] text-muted-foreground">
                        {formatTime(message.timestamp)}
                      </span>
                      {message.role === "assistant" && message.status !== "error" && (
                        <CopyButton text={message.content} />
                      )}
                      {message.status === "error" && (
                        <button
                          onClick={() => handleRetry(index)}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-400"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Retry
                        </button>
                      )}
                    </div>

                    {/* Suggested follow-ups */}
                    {message.role === "assistant" && message.suggestions && index === messages.length - 1 && !isLoading && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {message.suggestions.map((suggestion, i) => (
                          <button
                            key={i}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="text-xs px-3 py-1.5 rounded-full bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 transition-colors border border-violet-500/20"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center shadow-sm">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && loadingStartTime && (
              <TypingIndicator startTime={loadingStartTime} />
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="flex gap-3 p-2 rounded-xl border border-border/50 bg-muted/30 backdrop-blur-sm focus-within:border-violet-500/50 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about stocks, signals, or market conditions..."
            className="flex-1 resize-none bg-transparent px-3 py-2 focus:outline-none text-sm placeholder:text-muted-foreground"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-medium hover:from-violet-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/25 disabled:shadow-none"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Press Enter to send · Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
