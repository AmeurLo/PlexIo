"use client";
import { useEffect, useState, useRef } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { requireTenantAuth, tenantApi } from "@/lib/tenantApi";
import { formatDateTime } from "@/lib/format";
import { Icon } from "@/lib/icons";

const T = {
  title:       { fr: "Messages",              en: "Messages" },
  sub:         { fr: "Votre fil avec votre propriétaire", en: "Your thread with your landlord" },
  placeholder: { fr: "Écrire un message…",   en: "Write a message…" },
  send:        { fr: "Envoyer",              en: "Send" },
  noMsg:       { fr: "Aucun message",        en: "No messages yet" },
  noMsgSub:    { fr: "Envoyez votre premier message à votre propriétaire.", en: "Send your first message to your landlord." },
  loading:     { fr: "Chargement…",          en: "Loading…" },
  landlord:    { fr: "Propriétaire",         en: "Landlord" },
  you:         { fr: "Vous",                 en: "You" },
  enter:       { fr: "Entrée pour envoyer",  en: "Press Enter to send" },
};

export default function TenantMessagesPage() {
  const { lang, t } = useLanguage();
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function load() {
    return tenantApi.getMessages()
      .then(msgs => { setMessages(Array.isArray(msgs) ? msgs : []); scrollToBottom(); })
      .catch(e => console.error(e));
  }

  useEffect(() => {
    if (!requireTenantAuth()) return;
    load().finally(() => setLoading(false));
  }, []);

  async function sendMessage() {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      await tenantApi.sendMessage(draft.trim());
      setDraft("");
      await load();
    } catch (e: any) { console.error(e); }
    finally { setSending(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 dark:text-white">{t(T.title)}</h1>
        <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-0.5">{t(T.sub)}</p>
      </div>

      {/* Thread panel */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden" style={{ minHeight: "420px", maxHeight: "calc(100vh - 260px)" }}>
        {/* Thread header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <Icon name="home" size={16} className="text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-gray-900 dark:text-white">{t(T.landlord)}</p>
            <p className="text-[11px] text-gray-400">Domely</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
              <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <Icon name="chat" size={22} className="text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-[14px] text-gray-500 dark:text-gray-400">{t(T.noMsg)}</p>
              <p className="text-[13px] text-gray-400">{t(T.noMsgSub)}</p>
            </div>
          ) : (
            messages.map((msg: any, i: number) => {
              const isOwn = msg.sender_type === "tenant" || msg.is_from_me;
              return (
                <div key={i} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-[13px] ${
                    isOwn
                      ? "bg-teal-600 text-white rounded-br-md"
                      : "bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-bl-md"
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content ?? msg.message}</p>
                    <p className={`text-[10px] mt-1 ${isOwn ? "text-teal-200" : "text-gray-400"}`}>
                      {msg.created_at ? formatDateTime(msg.created_at, lang === "fr" ? "fr-CA" : "en-CA") : ""}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex gap-2">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t(T.placeholder)}
              rows={1}
              className="flex-1 resize-none px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              style={{ maxHeight: "100px" }}
            />
            <button
              onClick={sendMessage}
              disabled={!draft.trim() || sending}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl transition-colors flex-shrink-0"
            >
              {sending
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin block" />
                : <Icon name="send" size={17} />}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">{t(T.enter)}</p>
        </div>
      </div>
    </div>
  );
}
