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
  title:    { fr: "Documents",                   en: "Documents" },
  sub:      { fr: "Baux et reçus du locataire",  en: "Tenant leases & receipts" },
  back:     { fr: "← Locataires",               en: "← Tenants" },
  loading:  { fr: "Chargement…",                en: "Loading…" },
  empty:    { fr: "Aucun document disponible.",  en: "No documents available yet." },
  emptySub: { fr: "Les baux et reçus de paiement apparaîtront ici automatiquement.", en: "Leases and payment receipts will appear here automatically." },
  type: {
    lease:   { fr: "Bail",        en: "Lease" },
    receipt: { fr: "Reçu",        en: "Receipt" },
  },
  date:     { fr: "Date",         en: "Date" },
  download: { fr: "Voir",         en: "View" },
  leases:   { fr: "Baux",         en: "Leases" },
  receipts: { fr: "Reçus de paiement", en: "Payment receipts" },
};

type TenantDoc = {
  id: string;
  name: string;
  type: "lease" | "receipt";
  date: string;
  icon?: string;
  color?: string;
};

const TYPE_STYLES: Record<string, { bg: string; text: string; dot: string; emoji: string }> = {
  lease:   { bg: "bg-blue-50 dark:bg-blue-900/20",  text: "text-blue-700 dark:text-blue-400",  dot: "bg-blue-500",  emoji: "📄" },
  receipt: { bg: "bg-teal-50 dark:bg-teal-900/20",  text: "text-teal-700 dark:text-teal-400",  dot: "bg-teal-500",  emoji: "💳" },
};

export default function TenantDocumentsPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const router = useRouter();
  const { lang, t } = useLanguage();
  const { showToast } = useToast();

  const [docs, setDocs]       = useState<TenantDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantName, setTenantName] = useState("");

  useEffect(() => {
    if (!requireAuth()) return;
    // Load tenant name + documents in parallel
    Promise.all([
      api.getTenant(tenantId),
      api.getTenantDocuments(tenantId),
    ])
      .then(([tenant, documents]) => {
        const t = tenant as any;
        setTenantName(`${t.first_name ?? ""} ${t.last_name ?? ""}`.trim());
        setDocs(documents as TenantDoc[]);
      })
      .catch(e => showToast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const leases   = docs.filter(d => d.type === "lease");
  const receipts = docs.filter(d => d.type === "receipt");

  const cardClass = "bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)]";

  function Section({ title, items }: { title: string; items: TenantDoc[] }) {
    if (!items.length) return null;
    return (
      <div>
        <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3">{title}</p>
        <div className={`${cardClass} overflow-hidden`}>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {items.map(doc => {
              const style = TYPE_STYLES[doc.type] ?? TYPE_STYLES.receipt;
              return (
                <div key={doc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl ${style.bg} flex items-center justify-center flex-shrink-0 text-xl`}>
                    {style.emoji}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-gray-800 dark:text-gray-200 truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                        {doc.type === "lease" ? t(T.type.lease) : t(T.type.receipt)}
                      </span>
                      {doc.date && (
                        <span className="text-[11px] text-gray-400">
                          {doc.date.slice(0, 10)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dot indicator */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <button onClick={() => router.push("/dashboard/tenants")}
        className="text-[13px] text-gray-500 hover:text-teal-600 transition-colors font-medium">
        {t(T.back)}
      </button>

      <PageHeader
        title={tenantName ? `${tenantName} — ${t(T.title)}` : t(T.title)}
        subtitle={t(T.sub)}
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <div className={`${cardClass} p-12 text-center`}>
          <div className="text-5xl mb-4">📁</div>
          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">{t(T.empty)}</p>
          <p className="text-[13px] text-gray-400">{t(T.emptySub)}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary counts */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`${cardClass} p-5 text-center`}>
              <p className="text-[32px] font-bold text-blue-600 dark:text-blue-400">{leases.length}</p>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">{t(T.leases)}</p>
            </div>
            <div className={`${cardClass} p-5 text-center`}>
              <p className="text-[32px] font-bold text-teal-600 dark:text-teal-400">{receipts.length}</p>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">{t(T.receipts)}</p>
            </div>
          </div>

          <Section title={t(T.leases)} items={leases} />
          <Section title={t(T.receipts)} items={receipts} />
        </div>
      )}
    </div>
  );
}
