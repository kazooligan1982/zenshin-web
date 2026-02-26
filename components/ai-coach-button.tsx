"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Bot, X, Send, Loader2, Sparkles, ArrowLeft, Target, Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChartDataForAI } from "@/lib/ai/collect-chart-data";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface StructurizeResult {
  visions: { title: string }[];
  realities: { title: string }[];
  tensions: { title: string; category?: string }[];
  actions: { title: string; tensionIndex?: number }[];
}

export type StructuredItems = StructurizeResult;

interface AICoachButtonProps {
  chartData: ChartDataForAI;
  chartId?: string;
  onAddItems?: (items: StructurizeResult) => Promise<void>;
}

type ViewMode = "select" | "analyze" | "chat" | "add";

export function AICoachButton({ chartData, chartId, onAddItems }: AICoachButtonProps) {
  const t = useTranslations("aiCoach");
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("select");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [addText, setAddText] = useState("");
  const [addResult, setAddResult] = useState<StructurizeResult | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current && (viewMode === "analyze" || viewMode === "chat")) {
      inputRef.current.focus();
    }
  }, [isOpen, viewMode]);

  const handleOpen = () => {
    setIsOpen(true);
    setViewMode("select");
    setMessages([]);
    setInput("");
    setAddText("");
    setAddResult(null);
  };

  const handleBack = () => {
    setViewMode("select");
    setMessages([]);
    setInput("");
    setAddText("");
    setAddResult(null);
  };

  const sendAnalyzeMessage = async (userMessage?: string) => {
    const messageToSend = userMessage ?? input.trim();
    if (!messageToSend && messages.length === 0) return;

    const newMessages: Message[] =
      messages.length > 0
        ? [...messages, { role: "user" as const, content: messageToSend }]
        : [{ role: "user" as const, content: messageToSend }];

    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chartData,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          language: locale,
          mode: "analyze",
        }),
      });

      if (!res.ok) {
        throw new Error("API request failed");
      }

      const data = await res.json();
      setMessages([
        ...newMessages,
        { role: "assistant", content: data.response },
      ]);
    } catch (error) {
      console.error("AI Coach error:", error);
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: locale === "en"
            ? "Sorry, an error occurred. Please try again."
            : "申し訳ありません、エラーが発生しました。もう一度お試しください。",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendChatMessage = async (userMessage?: string) => {
    const messageToSend = userMessage ?? input.trim();
    if (!messageToSend) return;

    const newMessages: Message[] = [...messages, { role: "user" as const, content: messageToSend }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chartData,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          language: locale,
          mode: "chat",
        }),
      });

      if (!res.ok) {
        throw new Error("API request failed");
      }

      const data = await res.json();
      setMessages([
        ...newMessages,
        { role: "assistant", content: data.response },
      ]);
    } catch (error) {
      console.error("AI Coach error:", error);
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: locale === "en"
            ? "Sorry, an error occurred. Please try again."
            : "申し訳ありません、エラーが発生しました。もう一度お試しください。",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategorize = async () => {
    if (!addText.trim()) return;
    setIsLoading(true);
    setAddResult(null);

    try {
      const res = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: addText.trim(),
          language: locale,
          mode: "structurize",
        }),
      });

      if (!res.ok) {
        throw new Error("API request failed");
      }

      const data = await res.json();
      setAddResult(data);
    } catch (error) {
      console.error("Structurize error:", error);
      setAddResult({
        visions: [],
        realities: [],
        tensions: [],
        actions: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAdd = async () => {
    if (!addResult || !onAddItems) return;
    setIsAdding(true);
    try {
      await onAddItems(addResult);
      setAddResult(null);
      setAddText("");
      setViewMode("select");
    } catch (error) {
      console.error("Add items error:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (viewMode === "analyze") sendAnalyzeMessage();
      else if (viewMode === "chat") sendChatMessage();
    }
  };

  const renderContent = () => {
    if (viewMode === "select") {
      return (
        <div className="p-4 space-y-3">
          <p className="text-sm font-medium text-zenshin-navy">{t("modeSelect.title")}</p>
          <div className="space-y-2">
            <button
              onClick={() => {
                setViewMode("analyze");
                setMessages([]);
                sendAnalyzeMessage(
                  locale === "en"
                    ? "Please analyze this chart and provide coaching."
                    : "このチャートを分析してコーチングしてください。"
                );
              }}
              className="w-full text-left p-3 rounded-xl border border-gray-200 hover:bg-violet-50 hover:border-violet-200 transition-colors flex gap-3"
            >
              <Target className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-zenshin-navy">{t("modeSelect.analyze")}</p>
                <p className="text-xs text-zenshin-navy/60">{t("modeSelect.analyzeDesc")}</p>
              </div>
            </button>
            <button
              onClick={() => {
                setViewMode("chat");
                setMessages([]);
              }}
              className="w-full text-left p-3 rounded-xl border border-gray-200 hover:bg-violet-50 hover:border-violet-200 transition-colors flex gap-3"
            >
              <Search className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-zenshin-navy">{t("modeSelect.chat")}</p>
                <p className="text-xs text-zenshin-navy/60">{t("modeSelect.chatDesc")}</p>
              </div>
            </button>
            <button
              onClick={() => setViewMode("add")}
              className="w-full text-left p-3 rounded-xl border border-gray-200 hover:bg-violet-50 hover:border-violet-200 transition-colors flex gap-3"
            >
              <Plus className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-zenshin-navy">{t("modeSelect.add")}</p>
                <p className="text-xs text-zenshin-navy/60">{t("modeSelect.addDesc")}</p>
              </div>
            </button>
          </div>
        </div>
      );
    }

    if (viewMode === "add") {
      return (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 overflow-y-auto flex-1">
            {!addResult ? (
              <>
                <p className="text-sm text-zenshin-navy/80 mb-3">{t("add.description")}</p>
                <Textarea
                  value={addText}
                  onChange={(e) => setAddText(e.target.value)}
                  placeholder={t("add.placeholder")}
                  className="min-h-[120px] resize-none text-sm"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleCategorize}
                  disabled={isLoading || !addText.trim()}
                  className="mt-3 w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {t("add.categorizing")}
                    </>
                  ) : (
                    t("add.submit")
                  )}
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-medium text-zenshin-navy">{t("add.preview")}</p>
                {addResult.visions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-violet-600 mb-1">Vision</p>
                    <ul className="text-sm space-y-1">
                      {addResult.visions.map((v, i) => (
                        <li key={i} className="pl-2 border-l-2 border-violet-200">• {v.title}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {addResult.realities.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-teal-600 mb-1">Reality</p>
                    <ul className="text-sm space-y-1">
                      {addResult.realities.map((r, i) => (
                        <li key={i} className="pl-2 border-l-2 border-teal-200">• {r.title}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {addResult.tensions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-amber-600 mb-1">Tension</p>
                    <ul className="text-sm space-y-1">
                      {addResult.tensions.map((t, i) => (
                        <li key={i} className="pl-2 border-l-2 border-amber-200">• {t.title}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {addResult.actions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-blue-600 mb-1">Action</p>
                    <ul className="text-sm space-y-1">
                      {addResult.actions.map((a, i) => (
                        <li key={i} className="pl-2 border-l-2 border-blue-200">• {a.title}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setAddResult(null)}
                    disabled={isAdding}
                    className="flex-1"
                  >
                    {t("add.discard")}
                  </Button>
                  <Button
                    onClick={handleConfirmAdd}
                    disabled={isAdding || !onAddItems}
                    className="flex-1"
                  >
                    {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : t("add.confirm")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // analyze or chat
    const isAnalyze = viewMode === "analyze";
    const sendMessage = isAnalyze ? sendAnalyzeMessage : sendChatMessage;
    const greeting = isAnalyze ? t("greeting") : t("chat.greeting");
    const placeholder = isAnalyze ? t("inputPlaceholder") : t("chat.inputPlaceholder");

    return (
      <>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="text-center text-gray-400 text-sm mt-8">
              <Sparkles className="w-8 h-8 mx-auto mb-3 text-violet-300" />
              <p>{greeting}</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-violet-50 text-violet-900 rounded-2xl rounded-br-md px-4 py-2.5 ml-8"
                  : "text-gray-700"
              )}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t("analyzing")}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t p-3 shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 max-h-24"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="p-2 rounded-xl bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-violet-500 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center group"
          title={t("title")}
        >
          <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[560px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-500 to-indigo-600 text-white shrink-0">
            <div className="flex items-center gap-2">
              {viewMode !== "select" && (
                <button
                  onClick={handleBack}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <Bot className="w-5 h-5" />
              <span className="font-bold text-sm">{t("title")}</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {renderContent()}
        </div>
      )}
    </>
  );
}
