"use client";
import { useEffect, useState, useRef } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { Icon } from "@/lib/icons";
import Modal from "@/components/dashboard/Modal";

const T = {
  title:       { fr: "Messages",            en: "Messages" },
  sub:         { fr: "Communiquez",          en: "Communicate" },
  placeholder: { fr: "Écrire un message…",  en: "Write a message…" },
  send:        { fr: "Envoyer",             en: "Send" },
  noConv:      { fr: "Aucune conversation", en: "No conversations" },
  noMsg:       { fr: "Aucun message",       en: "No messages" },
  select:      { fr: "Sélectionnez une conversation", en: "Select a conversation" },
  search:      { fr: "Rechercher…",         en: "Search…" },
  newConv:     { fr: "Nouvelle conversation", en: "New conversation" },
  selectTen:   { fr: "Choisir un locataire", en: "Choose a tenant" },
  noTenants:   { fr: "Aucun locataire trouvé", en: "No tenants found" },
};

export default function MessagesPage() {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  // New conversation modal
  const [showNewConv, setShowNewConv] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!requireAuth()) return;
    api.getConversations()
      .then((convs: any[]) => { setConversations(convs); if (convs.length > 0) openConversation(convs[0].id ?? convs[0]._id, convs); })
      .catch(e => showToast(e instanceof Error ? e.message : String(e), "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeConvId) return;
    api.getMessages(activeConvId)
      .then(msgs => { setMessages(msgs); setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50); })
      .catch(e => showToast(e instanceof Error ? e.message : String(e), "error"));
  }, [activeConvId]);

  function openConversation(id: string, convList?: any[]) {
    setActiveConvId(id);
    // Mark as read in local state
    setConversations(prev => (convList ?? prev).map(c => (c.id ?? c._id) === id ? { ...c, unread_count: 0 } : c));
    // Notify backend
    api.markMessagesRead(id).catch(() => {});
  }

  function openNewConvModal() {
    setShowNewConv(true);
    if (tenants.length === 0) {
      setTenantsLoading(true);
      api.getTenants()
        .then((ts: any[]) => setTenants(ts))
        .catch(e => showToast(e instanceof Error ? e.message : String(e), "error"))
        .finally(() => setTenantsLoading(false));
    }
  }

  function startConversation(tenant: any) {
    const id = tenant.id ?? tenant._id;
    setShowNewConv(false);
    // Add to list if not already there
    setConversations(prev => {
      if (prev.some(c => (c.id ?? c._id) === id)) return prev;
      return [{ id, participant_id: id, participant_name: `${tenant.first_name} ${tenant.last_name}`, unread_count: 0 }, ...prev];
    });
    openConversation(id);
  }

  async function sendMessage() {
    if (!draft.trim() || !activeConvId) return;
    setSending(true);
    try {
      await api.sendMessage(activeConvId, draft.trim());
      setDraft("");
      const msgs = await api.getMessages(activeConvId);
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e: any) { showToast(e instanceof Error ? e.message : String(e), "error"); }
    finally { setSending(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const activeConv = conversations.find(c => c.id === activeConvId || c._id === activeConvId);
  const filtered = conversations.filter(c => {
    const q = search.toLowerCase();
    return !q || (c.participant_name ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Conversation list */}
      <div className={`${activeConvId ? "hidden md:flex" : "flex"} flex-col w-full md:w-72 lg:w-80 border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0`}>
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-gray-900 dark:text-white">{t(T.title)}</h2>
            <button
              onClick={openNewConvModal}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors"
              title={t(T.newConv)}
            >
              <Icon name="plus" size={14} />
            </button>
          </div>
          <div className="relative">
            <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t(T.search)}
              className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center text-center px-6 py-10 gap-3">
              <div className="w-12 h-12 bg-teal-50 dark:bg-teal-900/20 rounded-2xl flex items-center justify-center">
                <Icon name="chat" size={20} className="text-teal-500" />
              </div>
              <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">{t(T.noConv)}</p>
              <p className="text-[12px] text-gray-400 leading-relaxed">
                {lang === "fr"
                  ? "Vos locataires peuvent vous écrire depuis leur portail. Vous pouvez aussi initier une conversation ci-dessus."
                  : "Your tenants can message you from their portal. You can also start a conversation using the + button above."}
              </p>
            </div>
          ) : (
            filtered.map(conv => {
              const id = conv.id ?? conv._id;
              const isActive = activeConvId === id;
              const hasUnread = (conv.unread_count ?? 0) > 0;
              return (
                <button
                  key={id}
                  onClick={() => openConversation(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left ${
                    isActive ? "bg-teal-50 dark:bg-teal-900/20 border-l-2 border-l-teal-500" : ""
                  }${hasUnread && !isActive ? " bg-blue-50/40 dark:bg-blue-900/10" : ""}`}
                >
                  <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-[13px] font-bold text-teal-700 dark:text-teal-400">
                      {(conv.participant_name ?? "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] truncate ${hasUnread && !isActive ? "font-semibold text-gray-900 dark:text-white" : "font-medium text-gray-800 dark:text-gray-200"}`}>
                      {conv.participant_name ?? conv.participant_id}
                    </p>
                    {conv.last_message && (
                      <p className={`text-[12px] truncate ${hasUnread && !isActive ? "text-gray-600 dark:text-gray-300" : "text-gray-400"}`}>{conv.last_message}</p>
                    )}
                  </div>
                  {hasUnread && (
                    <span className="w-5 h-5 bg-teal-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {conv.unread_count}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Message thread */}
      <div className={`${activeConvId ? "flex" : "hidden md:flex"} flex-col flex-1 min-w-0 bg-[#F8FAFB] dark:bg-gray-950`}>
        {!activeConvId ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[14px] text-gray-400">{t(T.select)}</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3.5 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
              <button className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setActiveConvId(null)}>
                <Icon name="arrow-left" size={18} className="text-gray-500" />
              </button>
              <div className="w-9 h-9 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-[12px] font-bold text-teal-700 dark:text-teal-400">
                  {(activeConv?.participant_name ?? "?").charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-[14px]">{activeConv?.participant_name ?? activeConv?.participant_id}</p>
                <p className="text-[11px] text-gray-400">{lang === "fr" ? "Locataire" : "Tenant"}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-[13px] text-gray-400 text-center py-10">{t(T.noMsg)}</p>
              ) : (
                messages.map((msg, i) => {
                  const isOwn = msg.sender_role === "landlord" || msg.is_from_me;
                  return (
                    <div key={i} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-[13px] ${
                        isOwn
                          ? "bg-teal-600 text-white rounded-br-md"
                          : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-bl-md shadow-sm"
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
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
              <div className="flex gap-2">
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t(T.placeholder)}
                  rows={1}
                  className="flex-1 resize-none px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                  style={{ maxHeight: "120px" }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!draft.trim() || sending}
                  className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl transition-colors flex-shrink-0"
                >
                  <Icon name="send" size={18} />
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">{lang === "fr" ? "Entrée pour envoyer" : "Press Enter to send"}</p>
            </div>
          </>
        )}
      </div>

      {/* New conversation modal */}
      <Modal isOpen={showNewConv} onClose={() => setShowNewConv(false)} title={t(T.newConv)} maxWidth="max-w-sm">
        {tenantsLoading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : tenants.length === 0 ? (
          <p className="text-[13px] text-gray-400 text-center py-8">{t(T.noTenants)}</p>
        ) : (
          <div className="space-y-1">
            {tenants.map(ten => (
              <button
                key={ten.id ?? ten._id}
                onClick={() => startConversation(ten)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400">
                    {(ten.first_name?.[0] ?? "") + (ten.last_name?.[0] ?? "")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200">{ten.first_name} {ten.last_name}</p>
                  <p className="text-[11px] text-gray-400 truncate">{ten.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
