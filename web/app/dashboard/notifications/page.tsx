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

const TYPE_STYLES: Record<string, { dot: string; badge: string; iconKey: string }> = {
  rent:        { dot: "bg-teal-500",   badge: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",    iconKey: "creditCard" },
  payment:     { dot: "bg-teal-500",   badge: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",    iconKey: "creditCard" },
  maintenance: { dot: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", iconKey: "wrench" },
  lease:       { dot: "bg-blue-500",   badge: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",    iconKey: "document" },
  vacancy:     { dot: "bg-red-500",    badge: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",        iconKey: "home" },
  general:     { dot: "bg-gray-400",   badge: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",      iconKey: "bell" },
};

const NOTIF_ICON_PATHS: Record<string, string> = {
  creditCard: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z",
  wrench:     "M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z",
  document:   "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  home:       "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
  bell:       "M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0",
};

function NotifIcon({ iconKey }: { iconKey: string }) {
  const d = NOTIF_ICON_PATHS[iconKey] ?? NOTIF_ICON_PATHS.bell;
  return (
    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

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
    } catch (e) { showToast(e instanceof Error ? e.message : String(e), "error"); }
  }

  async function markAll() {
    try {
      const unreadIds = notifs.filter(n => !n.is_read).map(n => n.id);
      await api.markAllNotificationsRead(unreadIds);
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
      showToast(lang === "fr" ? "Toutes les notifications lues." : "All notifications marked as read.", "success");
    } catch (e) { showToast(e instanceof Error ? e.message : String(e), "error"); }
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
          <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
          </div>
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
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                    <NotifIcon iconKey={style.iconKey} />
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
