"use client";
import { useEffect, useState } from "react";
import { tenantApi, requireTenantAuth } from "@/lib/tenantApi";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";

interface TenantDoc {
  id: string;
  type: "lease" | "receipt";
  name: string;
  subtitle?: string;
  date?: string;
  download_url?: string | null;
}

export default function TenantDocumentsPage() {
  const { lang } = useLanguage();
  const [docs, setDocs] = useState<TenantDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!requireTenantAuth()) return;
    tenantApi.getDocuments()
      .then(setDocs)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadLease = async (docId: string) => {
    setDownloading(docId);
    try {
      const blob = await tenantApi.downloadLease();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bail-logement.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDownloading(null);
    }
  };

  const leaseDocs  = docs.filter(d => d.type === "lease");
  const receipts   = docs.filter(d => d.type === "receipt");

  const t = {
    title:      lang === "fr" ? "Documents" : "Documents",
    subtitle:   lang === "fr" ? "Vos documents et reçus de loyer" : "Your documents and rent receipts",
    lease:      lang === "fr" ? "Bail de logement" : "Lease Agreement",
    receipts:   lang === "fr" ? "Reçus de loyer" : "Rent Receipts",
    download:   lang === "fr" ? "Télécharger le PDF" : "Download PDF",
    downloading:lang === "fr" ? "Génération…" : "Generating…",
    viewAll:    lang === "fr" ? "Voir tous les paiements →" : "View all payments →",
    emptyDocs:  lang === "fr" ? "Aucun document disponible" : "No documents available",
    emptyReceipts: lang === "fr" ? "Aucun reçu disponible" : "No receipts yet",
    error:      lang === "fr" ? "Impossible de charger les documents" : "Could not load documents",
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-bold text-gray-900 dark:text-gray-100">{t.title}</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">{t.subtitle}</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-[13px] text-red-600 dark:text-red-400">
          {t.error}
        </div>
      )}

      {/* Lease section */}
      <div>
        <h2 className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          {t.lease}
        </h2>
        {leaseDocs.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-8 text-center text-[13px] text-gray-400">
            {t.emptyDocs}
          </div>
        ) : (
          <div className="space-y-2">
            {leaseDocs.map(doc => (
              <div
                key={doc.id}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Document icon */}
                  <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100 truncate">{doc.name}</p>
                    {doc.subtitle && <p className="text-[12px] text-gray-400 truncate">{doc.subtitle}</p>}
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadLease(doc.id)}
                  disabled={downloading === doc.id}
                  className="flex-shrink-0 flex items-center gap-1.5 text-[12px] font-medium text-teal-700 dark:text-teal-400 hover:underline disabled:opacity-50"
                >
                  {downloading === doc.id ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border border-teal-500 border-t-transparent animate-spin" />
                      {t.downloading}
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      {t.download}
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Receipts section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {t.receipts}
          </h2>
          <Link href="/portail/dashboard/payments" className="text-[12px] text-teal-600 hover:underline">
            {t.viewAll}
          </Link>
        </div>
        {receipts.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-8 text-center text-[13px] text-gray-400">
            {t.emptyReceipts}
          </div>
        ) : (
          <div className="space-y-2">
            {receipts.map(doc => (
              <div
                key={doc.id}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100 truncate">{doc.name}</p>
                  {doc.subtitle && <p className="text-[12px] text-gray-400 truncate">{doc.subtitle}</p>}
                </div>
                {doc.date && (
                  <span className="flex-shrink-0 text-[12px] text-gray-400">
                    {doc.date.slice(0, 7)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
