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

const EVENT_CONFIG: Record<string, { emoji: string; dot: string; bg: string }> = {
  lease_created:         { emoji: "📄", dot: "bg-blue-500",   bg: "border-blue-200 dark:border-blue-800" },
  tenant_move_in:        { emoji: "🔑", dot: "bg-teal-500",   bg: "border-teal-200 dark:border-teal-800" },
  tenant_move_out:       { emoji: "🚪", dot: "bg-gray-400",   bg: "border-gray-200 dark:border-gray-700" },
  lease_renewal:         { emoji: "🔄", dot: "bg-indigo-500", bg: "border-indigo-200 dark:border-indigo-800" },
  rent_payment:          { emoji: "💳", dot: "bg-teal-500",   bg: "border-teal-100 dark:border-teal-900" },
  late_payment:          { emoji: "⚠️", dot: "bg-amber-500",  bg: "border-amber-200 dark:border-amber-800" },
  maintenance_opened:    { emoji: "🔧", dot: "bg-red-500",    bg: "border-red-200 dark:border-red-800" },
  maintenance_completed: { emoji: "✅", dot: "bg-teal-500",   bg: "border-teal-100 dark:border-teal-900" },
  inspection:            { emoji: "🔍", dot: "bg-purple-500", bg: "border-purple-200 dark:border-purple-800" },
};

function getEventConfig(type: string) {
  return EVENT_CONFIG[type] ?? { emoji: "📌", dot: "bg-gray-400", bg: "border-gray-100 dark:border-gray-800" };
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
          <div className="text-5xl mb-4">📋</div>
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
                              <span className="text-xl leading-none">{cfg.emoji}</span>
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
