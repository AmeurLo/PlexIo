"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { api } from "@/lib/api";
import { Icon } from "@/lib/icons";

const SUGGESTIONS = {
  fr: [
    "Analyse mes loyers impayés ce mois-ci",
    "Quelles propriétés ont le plus de maintenance ?",
    "Résume mes dépenses du trimestre",
    "Quand expire le prochain bail ?",
  ],
  en: [
    "Analyze my unpaid rents this month",
    "Which properties need the most maintenance?",
    "Summarize my expenses this quarter",
    "When does the next lease expire?",
  ],
};

type Msg = { role: "user" | "assistant"; content: string };

export default function AIChatWidget() {
  const { lang } = useLanguage();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 120);
    }
  }, [open, messages.length]);

  // Allow sidebar "Domely AI" click to open widget from any page
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("domely:openAI", handler);
    return () => window.removeEventListener("domely:openAI", handler);
  }, []);

  // Persist history to localStorage
  useEffect(() => {
    if (messages.length === 0) return;
    try { localStorage.setItem("domely_ai_history", JSON.stringify(messages.slice(-40))); } catch {}
  }, [messages]);

  // Restore history on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("domely_ai_history");
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
  }, []);

  // On the dedicated AI page, hide entirely (it's the full page)
  // On messages page, keep the panel but hide only the floating trigger button
  const isAiPage = pathname === "/dashboard/ai";
  const hideTrigger = isAiPage || pathname === "/dashboard/messages";
  if (isAiPage) return null;

  // Listen for sidebar "Domely AI" click to open widget from any page
  // (registered once in the outer component — see useEffect below)

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await api.chatWithAI(next);
      const reply = res.message ?? res.response ?? "";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      if (!open) setUnread(u => u + 1);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: lang === "fr" ? "Une erreur est survenue." : "An error occurred." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const suggestions = SUGGESTIONS[lang];

  return (
    <>
      {/* Chat panel */}
      <div
        className={`fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[380px] transition-all duration-300 origin-bottom-right ${
          open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
          style={{ height: "520px" }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
              <Icon name="sparkles" size={16} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-bold text-white">Domely AI</p>
              <p className="text-[11px] text-white/70">
                {lang === "fr" ? "Votre assistant immobilier" : "Your real estate assistant"}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center pt-4 pb-2 gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #1E7A6E22, #3FAF8633)", border: "1px solid #3FAF8640" }}>
                  <Icon name="sparkles" size={22} className="text-teal-600 dark:text-teal-400" />
                </div>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 text-center max-w-[260px]">
                  {lang === "fr"
                    ? "Posez une question sur vos propriétés, locataires ou finances."
                    : "Ask anything about your properties, tenants or finances."}
                </p>
                <div className="w-full space-y-2 mt-1">
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => send(s)}
                      className="w-full text-left px-3 py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-teal-50 dark:hover:bg-teal-900/20 border border-gray-100 dark:border-gray-700 hover:border-teal-300 rounded-xl text-[12px] text-gray-600 dark:text-gray-300 transition-all">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
                    <Icon name="sparkles" size={11} className="text-white" />
                  </div>
                )}
                <div className={`max-w-[82%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-teal-600 text-white rounded-br-sm"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-bl-sm"
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
                  <Icon name="sparkles" size={11} className="text-white" />
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-sm px-3 py-2.5">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 150, 300].map(d => (
                      <div key={d} className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce"
                        style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={lang === "fr" ? "Posez une question…" : "Ask a question…"}
                rows={1}
                style={{ maxHeight: "80px" }}
                className="flex-1 resize-none px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[13px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
            <p className="text-center text-[10px] text-gray-400 mt-1.5">
              {lang === "fr" ? "Alimenté par Claude · Entrée pour envoyer" : "Powered by Claude · Enter to send"}
            </p>
          </div>
        </div>
      </div>

      {/* Floating button — hidden on /messages (use sidebar to open) */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`fixed bottom-6 right-4 sm:right-6 z-50 w-14 h-14 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center ${hideTrigger ? "hidden" : ""}`}
        style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}
        aria-label="Domely AI">
        <div className={`transition-all duration-200 ${open ? "opacity-0 scale-50 absolute" : "opacity-100 scale-100"}`}>
          <Icon name="sparkles" size={24} className="text-white" />
        </div>
        <div className={`transition-all duration-200 ${open ? "opacity-100 scale-100" : "opacity-0 scale-50 absolute"}`}>
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {unread > 0 && !open && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
    </>
  );
}
