"use client";

import { useLanguage } from "@/lib/LanguageContext";
import { translations as T } from "@/lib/translations";

const CHECK = () => (
  <div className="flex items-center justify-center">
    <div className="w-6 h-6 rounded-full bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center">
      <svg className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  </div>
);

const CROSS = () => (
  <div className="flex items-center justify-center">
    <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </div>
);

const PARTIAL = () => (
  <div className="flex items-center justify-center" title="Partiel">
    <div className="w-4 h-1.5 rounded-full bg-amber-300" />
  </div>
);

type CellValue = boolean | "partial";

function Cell({ val }: { val: CellValue }) {
  if (val === true) return <CHECK />;
  if (val === "partial") return <PARTIAL />;
  return <CROSS />;
}

export default function ComparisonTable() {
  const { t } = useLanguage();
  const C = T.compare;

  return (
    <section className="py-24 lg:py-32 dark:bg-gray-950 overflow-hidden" style={{ background: "var(--bg-section)" }}>
      <div className="max-w-5xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-[13px] font-semibold px-4 py-2 rounded-full border border-teal-100 mb-5 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800">
            ✦ {t(C.badge)}
          </span>
          <h2 className="text-[38px] lg:text-[52px] font-bold text-gray-900 dark:text-white mb-4 whitespace-pre-line leading-[1.15]">
            {t(C.h2)}
          </h2>
          <p className="text-[17px] max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>{t(C.sub)}</p>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card overflow-hidden" style={{ border: "1px solid var(--border-subtle)" }}>

          {/* Header row */}
          <div className="grid grid-cols-6 border-b border-gray-100 dark:border-gray-800">
            {/* Feature label col */}
            <div className="col-span-1 px-5 py-5 flex items-end">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{t(C.cols.feature)}</p>
            </div>

            {/* Domely — highlighted */}
            <div className="col-span-1 px-4 py-5 text-center relative"
                 style={{ background: "linear-gradient(160deg, #144F54 0%, #1E7A6E 100%)" }}>
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-400 to-emerald-400" />
              <div className="flex flex-col items-center gap-1.5">
                <div className="inline-flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-[4px] flex items-center justify-center text-[9px] font-bold text-teal-700"
                       style={{ background: "linear-gradient(135deg, #E3F5F2, #3FAF86)" }}>D</div>
                  <p className="text-[13px] font-bold text-white">{t(C.cols.domely)}</p>
                </div>
                <span className="text-[11px] text-teal-300">{t(C.colsSub.domely)}</span>
              </div>
            </div>

            {/* PlexFlow */}
            <div className="px-4 py-5 text-center border-l border-gray-100 dark:border-gray-800">
              <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1">{t(C.cols.plexflow)}</p>
              <p className="text-[11px] text-gray-400">{t(C.colsSub.plexflow)}</p>
            </div>

            {/* Buildium */}
            <div className="px-4 py-5 text-center border-l border-gray-100 dark:border-gray-800">
              <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1">{t(C.cols.buildium)}</p>
              <p className="text-[11px] text-gray-400">{t(C.colsSub.buildium)}</p>
            </div>

            {/* Building Stack */}
            <div className="px-4 py-5 text-center border-l border-gray-100 dark:border-gray-800">
              <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1">{t(C.cols.building)}</p>
              <p className="text-[11px] text-gray-400">{t(C.colsSub.building)}</p>
            </div>

            {/* TurboTenant */}
            <div className="px-4 py-5 text-center border-l border-gray-100 dark:border-gray-800">
              <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1">{t(C.cols.turbotenant)}</p>
              <p className="text-[11px] text-gray-400">{t(C.colsSub.turbotenant)}</p>
            </div>
          </div>

          {/* Data rows */}
          {C.rows.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-6 border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors"
            >
              <div className="col-span-1 px-5 py-4 flex items-center">
                <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300">{t(row.feature)}</p>
              </div>

              {/* Domely — tinted green background */}
              <div className="col-span-1 px-4 py-4 flex items-center justify-center bg-teal-50/50 dark:bg-teal-900/10">
                <Cell val={row.domely} />
              </div>

              <div className="px-4 py-4 flex items-center justify-center border-l border-gray-100 dark:border-gray-800">
                <Cell val={row.plexflow} />
              </div>

              <div className="px-4 py-4 flex items-center justify-center border-l border-gray-100 dark:border-gray-800">
                <Cell val={row.buildium} />
              </div>

              <div className="px-4 py-4 flex items-center justify-center border-l border-gray-100 dark:border-gray-800">
                <Cell val={row.building} />
              </div>

              <div className="px-4 py-4 flex items-center justify-center border-l border-gray-100 dark:border-gray-800">
                <Cell val={row.turbotenant} />
              </div>
            </div>
          ))}

          {/* CTA row */}
          <div className="grid grid-cols-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30">
            <div className="col-span-1 px-5 py-5" />

            {/* Domely CTA */}
            <div className="col-span-1 px-4 py-5 flex items-center justify-center">
              <a
                href="/early-access"
                className="text-[13px] font-semibold text-white px-4 py-2 rounded-xl transition-all hover:scale-[1.03] whitespace-nowrap shadow-teal-sm"
                style={{ background: "linear-gradient(135deg, #1E7A6E, #3FAF86)" }}
              >
                {t({ fr: "Accès anticipé", en: "Early access" })}
              </a>
            </div>

            {/* Competitor notes */}
            {(["plexflow", "buildium", "building", "turbotenant"] as const).map((key) => (
              <div key={key} className="px-4 py-5 flex items-center justify-center border-l border-gray-100 dark:border-gray-800">
                <p className="text-[12px] text-gray-400 text-center">{t(C.ctaNotes[key])}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Legend + Sources */}
        <div className="flex flex-wrap justify-center gap-6 mt-6">
          {[
            { el: <CHECK />,   label: { fr: "Inclus",         en: "Included" } },
            { el: <PARTIAL />, label: { fr: "Partiel",         en: "Partial" } },
            { el: <CROSS />,   label: { fr: "Non disponible",  en: "Not available" } },
          ].map((l) => (
            <div key={l.label.fr} className="flex items-center gap-2 text-[13px] text-gray-400">
              {l.el}
              {t(l.label)}
            </div>
          ))}
        </div>
        <p className="text-center text-[11px] text-gray-300 mt-3">
          {t({
            fr: "Sources : plexflow.ca · buildium.com · buildingstack.com · turbotenant.com, tarifs vérifiés mars 2026",
            en: "Sources: plexflow.ca · buildium.com · buildingstack.com · turbotenant.com, pricing verified March 2026",
          })}
        </p>
      </div>
    </section>
  );
}
