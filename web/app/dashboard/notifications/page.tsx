"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Notification } from "@/lib/types";
import PageHeader from "@/components/dashboard/PageHeader";

// ─── i18n ─────────────────────────────────────────────────────────────────────
const T = {
  title:      { fr: "Notifications",               en: "Notifications" },
  sub:        { fr: "Alertes et rappels du portefeuille", en: "Portfolio alerts and reminders" },
  markAll:    { fr: "Tout marquer comme lu",        en: "Mark all as read" },
  empty:      { fr: "Aucune notification",          en: "No notifications" },
  emptySub:   { fr: "Tout est en ordre. Revenez plus tard.", en: "Everything is in order. Check back later." },
  loading:    { fr: "Chargement…",                  en: "Loading…" },
  unread:     { fr: "non lue",                      en: "unread" },
  unreadPl:   { fr: "non lues",                     en: "unread" },
  types: {
    rent:        { fr: "Loyer",        en: "Rent" },
    maintenance: { fr: "Maintenance",  en: "Maintenance" },
    lease:       { fr: "Bail",         en: "Lease" },
    payment:     { fr: "Paiement",     en: "Payment" },
    vacancy:     { fr: "Vacance",      en: "Vacancy" },
    general:     { fr: "Général",      en: "General" },
  },
};

const TYPE_STYLES: Record<string, { dot: string; badge: string; icon: string }> = {
  rent:        { dot: "bg-teal-500",   badge: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",    icon: "💳" },
  payment:     { dot: "bg-teal-500",   badge: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",    icon: "💳" },
  maintenance: { dot: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: "🔧" },
  lease:       { dot: "bg-blue-500",   badge: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",    icon: "📄" },
  vacancy:     { dot: "bg-red-500",    badge: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",        icon: "🏠" },
  general:     { dot: "bg-gray-400",   badge: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",      icon: "🔔" },
};

function getStyle(type: string) {
  return TYPE_STYLES[type] ?? TYPE_STYLES.general;
}

function timeAgo(ts: string, lang: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (lang === "fr") {
    if (mins < 2)   return "À l'instant";
    if (mins < 60)  return `il y a ${mins} min`;
    if (hours < 24) return `il y a ${hours}h`;
    if (days < 7)   return `il y a ${days}j`;
    return new Date(ts).toLocaleDateString("fr-CA", { day: "numeric", month: "short" });
  } else {
    if (mins < 2)   return "Just now";
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7)   return `${days}d ago`;
    return new Date(ts).toLocaleDateString("en-CA", { day: "numeric", month: "short" });
  }
}

export default function NotificationsPage() {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [notifs, setNotifs]   = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requireAuth()) return;
    api.getNotifications()
      .then(setNotifs)
      .catch(e => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  const unreadCount = notifs.filter(n => !n.is_read).length;

  async function markOne(id: string) {
    try {
      await api.markNotificationRead(id);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {/* silent */}
  }

  async function markAll() {
    try {
      const unreadIds = notifs.filter(n => !n.is_read).map(n => n.id);
      await api.markAllNotificationsRead(unreadIds);
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {/* silent */}
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <PageHeader
        title={t(T.title)}
        subtitle={t(T.sub)}
        actions={unreadCount > 0 ? (
          <button
            onClick={markAll}
            className="px-4 py-2 text-[13px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/50 rounded-xl transition-colors"
          >
            {t(T.markAll)}
          </button>
        ) : undefined}
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifs.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-12 text-center">
          <div className="text-5xl mb-4">🔔</div>
          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">{t(T.empty)}</p>
          <p className="text-[13px] text-gray-400">{t(T.emptySub)}</p>
        </div>
      ) : (
        <>
          {unreadCount > 0 && (
            <p className="text-[13px] text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-teal-600">{unreadCount}</span>{" "}
              {unreadCount === 1 ? t(T.unread) : t(T.unreadPl)}
            </p>
          )}

          <div className="space-y-2">
            {notifs.map(n => {
              const style = getStyle(n.type ?? "general");
              const typeLbl = (T.types as any)[n.type ?? "general"];
              return (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markOne(n.id)}
                  className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5 flex gap-4 cursor-pointer transition-all hover:shadow-md ${
                    n.is_read
                      ? "border-gray-100 dark:border-gray-800"
                      : "border-teal-100 dark:border-teal-800 bg-teal-50/30 dark:bg-teal-900/10"
                  }`}
                >
                  {/* Icon bubble */}
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-xl">
                    {style.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-[14px] font-semibold ${n.is_read ? "text-gray-700 dark:text-gray-300" : "text-gray-900 dark:text-white"}`}>
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">
                        {n.created_at ? timeAgo(n.created_at, lang) : ""}
                      </span>
                    </div>
                    {n.body && (
                      <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{n.body}</p>
                    )}
                    {typeLbl && (
                      <span className={`mt-2 inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${style.badge}`}>
                        {t(typeLbl)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
