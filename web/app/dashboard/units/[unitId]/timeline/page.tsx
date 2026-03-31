"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import PageHeader from "@/components/dashboard/PageHeader";

// ─── i18n ─────────────────────────────────────────────────────────────────────
const T = {
  title:    { fr: "Historique du logement",     en: "Unit Timeline" },
  sub:      { fr: "Chronologie complète des événements", en: "Complete event history" },
  back:     { fr: "← Retour",                   en: "← Back" },
  loading:  { fr: "Chargement…",                en: "Loading…" },
  empty:    { fr: "Aucun événement enregistré.", en: "No events recorded yet." },
  today:    { fr: "Aujourd'hui",                en: "Today" },
};

type TimelineEvent = {
  id: string;
  event_type: string;
  date: string;
  title: string;
  description?: string;
  icon?: string;
  color?: string;
};

type TimelineData = {
  unit_id: string;
  unit_number?: string;
  property_name?: string;
  events: TimelineEvent[];
};

const EVENT_CONFIG: Record<string, { iconKey: string; dot: string; bg: string }> = {
  lease_created:         { iconKey: "document",   dot: "bg-blue-500",   bg: "border-blue-200 dark:border-blue-800" },
  tenant_move_in:        { iconKey: "key",        dot: "bg-teal-500",   bg: "border-teal-200 dark:border-teal-800" },
  tenant_move_out:       { iconKey: "door",       dot: "bg-gray-400",   bg: "border-gray-200 dark:border-gray-700" },
  lease_renewal:         { iconKey: "refresh",    dot: "bg-indigo-500", bg: "border-indigo-200 dark:border-indigo-800" },
  rent_payment:          { iconKey: "creditCard", dot: "bg-teal-500",   bg: "border-teal-100 dark:border-teal-900" },
  late_payment:          { iconKey: "warning",    dot: "bg-amber-500",  bg: "border-amber-200 dark:border-amber-800" },
  maintenance_opened:    { iconKey: "wrench",     dot: "bg-red-500",    bg: "border-red-200 dark:border-red-800" },
  maintenance_completed: { iconKey: "checkCircle",dot: "bg-teal-500",   bg: "border-teal-100 dark:border-teal-900" },
  inspection:            { iconKey: "search",     dot: "bg-purple-500", bg: "border-purple-200 dark:border-purple-800" },
};

const TIMELINE_ICON_PATHS: Record<string, string> = {
  document:    "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  key:         "M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z",
  door:        "M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75",
  refresh:     "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99",
  creditCard:  "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z",
  warning:     "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z",
  wrench:      "M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z",
  checkCircle: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  search:      "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z",
  pin:         "M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z",
};

function TimelineIcon({ iconKey }: { iconKey: string }) {
  const d = TIMELINE_ICON_PATHS[iconKey] ?? TIMELINE_ICON_PATHS.pin;
  return (
    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function getEventConfig(type: string) {
  return EVENT_CONFIG[type] ?? { iconKey: "pin", dot: "bg-gray-400", bg: "border-gray-100 dark:border-gray-800" };
}

function formatDate(dateStr: string, lang: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch {
    return dateStr.slice(0, 10);
  }
}

function groupByYear(events: TimelineEvent[]): Record<string, TimelineEvent[]> {
  const groups: Record<string, TimelineEvent[]> = {};
  for (const e of events) {
    const year = e.date ? e.date.slice(0, 4) : "—";
    if (!groups[year]) groups[year] = [];
    groups[year].push(e);
  }
  return groups;
}

export default function UnitTimelinePage() {
  const { unitId } = useParams<{ unitId: string }>();
  const router = useRouter();
  const { lang, t } = useLanguage();
  const { showToast } = useToast();

  const [data, setData]       = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requireAuth()) return;
    api.getUnitTimeline(unitId)
      .then(d => setData(d as TimelineData))
      .catch(e => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [unitId]);

  const grouped = data ? groupByYear(data.events ?? []) : {};
  const years = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const subtitle = data?.property_name
    ? `${data.property_name}${data.unit_number ? ` — ${lang === "fr" ? "Unité" : "Unit"} ${data.unit_number}` : ""}`
    : t(T.sub);

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <button onClick={() => router.back()}
        className="text-[13px] text-gray-500 hover:text-teal-600 transition-colors font-medium">
        {t(T.back)}
      </button>

      <PageHeader title={t(T.title)} subtitle={subtitle} />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data?.events?.length ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-12 text-center">
          <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>
          </div>
          <p className="text-[14px] text-gray-400">{t(T.empty)}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {years.map(year => (
            <div key={year}>
              {/* Year separator */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[13px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{year}</span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
              </div>

              {/* Events for this year */}
              <div className="relative pl-6">
                {/* Vertical line */}
                <div className="absolute left-2 top-2 bottom-2 w-px bg-gray-100 dark:bg-gray-800" />

                <div className="space-y-4">
                  {grouped[year].map((event, idx) => {
                    const cfg = getEventConfig(event.event_type);
                    return (
                      <div key={event.id ?? idx} className="relative flex gap-4">
                        {/* Dot on the line */}
                        <div className={`absolute -left-4 top-3 w-3 h-3 rounded-full border-2 border-white dark:border-gray-950 ${cfg.dot} flex-shrink-0 z-10`} />

                        {/* Card */}
                        <div className={`flex-1 bg-white dark:bg-gray-900 rounded-xl border shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 ${cfg.bg}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <TimelineIcon iconKey={cfg.iconKey} />
                              <p className="text-[14px] font-semibold text-gray-900 dark:text-white">{event.title}</p>
                            </div>
                            <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">
                              {formatDate(event.date, lang)}
                            </span>
                          </div>
                          {event.description && (
                            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5 ml-8 leading-relaxed">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
