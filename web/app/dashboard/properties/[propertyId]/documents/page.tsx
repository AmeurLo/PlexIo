"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import Link from "next/link";

interface PropertyDoc {
  id: string;
  name: string;
  file_type: string;
  size_kb?: number;
  uploaded_at: string;
  unit_id?: string;
}

export default function PropertyDocumentsPage() {
  const params = useParams();
  const propertyId = params?.propertyId as string;
  const { lang } = useLanguage();
  const [docs, setDocs] = useState<PropertyDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!requireAuth()) return;
    fetchDocs();
  }, [propertyId]);

  const fetchDocs = () => {
    api.getPropertyDocuments(propertyId)
      .then(setDocs)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = async () => {
        setUploading(true);
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
        try {
          await api.uploadPropertyDocument(propertyId, {
            name: file.name,
            file_type: ext,
            base64_data: base64,
            size_kb: Math.round(file.size / 1024 * 10) / 10,
          });
          fetchDocs();
        } catch (e: any) {
          setError(e.message);
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleDelete = async (docId: string) => {
    if (!confirm(lang === "fr" ? "Supprimer ce document ?" : "Delete this document?")) return;
    setDeleting(docId);
    try {
      await api.deletePropertyDocument(propertyId, docId);
      setDocs(prev => prev.filter(d => d.id !== docId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(null);
    }
  };

  const getIcon = (type: string) => {
    if (type === "pdf") return "📄";
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(type)) return "🖼️";
    return "📋";
  };

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* Back + Header */}
      <div>
        <Link href="/dashboard/properties" className="text-[13px] text-teal-600 hover:underline mb-2 inline-block">
          &larr; {lang === "fr" ? "Propriétés" : "Properties"}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-gray-900 dark:text-gray-100">
              {lang === "fr" ? "Documents" : "Documents"}
            </h1>
            <p className="text-[13px] text-gray-500 mt-0.5">
              {lang === "fr" ? "Actes, permis, assurances, plans" : "Deeds, permits, insurance, floor plans"}
            </p>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-[13px] font-semibold px-4 py-2 rounded-xl disabled:opacity-60"
          >
            {uploading ? (
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            )}
            {lang === "fr" ? "Ajouter un document" : "Add document"}
          </button>
          <input ref={fileRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 animate-pulse">
              <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-16 text-center">
          <div className="text-4xl mb-3">📂</div>
          <p className="text-[15px] font-medium text-gray-700 dark:text-gray-300">
            {lang === "fr" ? "Aucun document" : "No documents"}
          </p>
          <p className="text-[13px] text-gray-400 mt-1">
            {lang === "fr" ? "Ajoutez des actes, permis, plans ou assurances." : "Add deeds, permits, floor plans or insurance policies."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
              <span className="text-xl flex-shrink-0">{getIcon(doc.file_type)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100 truncate">{doc.name}</p>
                <p className="text-[12px] text-gray-400">
                  {doc.size_kb ? `${doc.size_kb} KB · ` : ""}
                  {doc.uploaded_at?.slice(0, 10)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => api.downloadPropertyDocument(propertyId, doc.id, doc.name)}
                  className="text-[12px] text-teal-600 hover:underline font-medium"
                >
                  {lang === "fr" ? "Télécharger" : "Download"}
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deleting === doc.id}
                  className="text-[12px] text-red-500 hover:underline"
                >
                  {deleting === doc.id ? "…" : (lang === "fr" ? "Supprimer" : "Delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
