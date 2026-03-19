"use client";
import { useEffect, useState, useRef } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Icon } from "@/lib/icons";

const SUGGESTIONS_FR = [
  "Analyse mes loyers impayés ce mois-ci",
  "Quelles propriétés ont le plus de demandes de maintenance ?",
  "Résume mes dépenses du trimestre",
  "Quand expire le prochain bail ?",
];

const SUGGESTIONS_EN = [
  "Analyze my unpaid rents this month",
  "Which properties have the most maintenance requests?",
  "Summarize my expenses for the quarter",
  "When does the next lease expire?",
];

export default function AIPage() {
  const { lang } = useLanguage();
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { requireAuth(); }, []);

  useEffect(() => {
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [messages]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content }]);
    setLoading(true);
    try {
      const response = await api.chatWithAI([...messages, { role: "user", content }]);
      setMessages(prev => [...prev, { role: "assistant", content: response.message ?? response.response ?? "" }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "assistant", content: lang === "fr" ? "Une erreur est survenue. Veuillez réessayer." : "An error occurred. Please try again." }]);
    } finally { setLoading(false); inputRef.current?.focus(); }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const suggestions = lang === "fr" ? SUGGESTIONS_FR : SUGGESTIONS_EN;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-3">
        <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center">
          <Icon name="sparkles" size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-[15px] font-bold text-gray-900 dark:text-white">Domely AI</h1>
          <p className="text-[12px] text-gray-400">{lang === "fr" ? "Votre assistant immobilier" : "Your real estate assistant"}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Icon name="sparkles" size={28} className="text-white" />
              </div>
              <h2 className="text-[20px] font-bold text-gray-900 dark:text-white mb-2">Domely AI</h2>
              <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">
                {lang === "fr"
                  ? "Posez vos questions sur vos propriétés, locataires, finances et plus encore."
                  : "Ask questions about your properties, tenants, finances and more."}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => send(s)}
                    className="text-left px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-[13px] text-gray-700 dark:text-gray-300 hover:border-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-900/20 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 bg-gradient-to-br from-teal-500 to-teal-700 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 mr-2">
                  <Icon name="sparkles" size={13} className="text-white" />
                </div>
              )}
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed ${
                msg.role === "user"
                  ? "bg-teal-600 text-white rounded-br-md"
                  : "bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-800 shadow-sm rounded-bl-md"
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 bg-gradient-to-br from-teal-500 to-teal-700 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 mr-2">
                <Icon name="sparkles" size={13} className="text-white" />
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1.5 items-center h-5">
                  <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* Input */}
      <div className="px-4 py-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-3xl mx-auto flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={lang === "fr" ? "Posez une question sur vos données immobilières…" : "Ask a question about your real estate data…"}
            rows={1}
            style={{ maxHeight: "120px" }}
            className="flex-1 resize-none px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="px-4 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl transition-colors flex items-center gap-2 flex-shrink-0"
          >
            <Icon name="send" size={18} />
          </button>
        </div>
        <p className="text-center text-[11px] text-gray-400 mt-2">
          {lang === "fr" ? "Alimenté par Claude · Entrée pour envoyer" : "Powered by Claude · Enter to send"}
        </p>
      </div>
    </div>
  );
}
