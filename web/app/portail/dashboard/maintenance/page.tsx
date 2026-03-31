"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { requireTenantAuth, tenantApi } from "@/lib/tenantApi";
import { useToast } from "@/lib/ToastContext";
import { formatDate } from "@/lib/format";
import { Icon } from "@/lib/icons";

const T = {
  title:    { fr: "Maintenance",               en: "Maintenance" },
  sub:      { fr: "Vos demandes de réparation", en: "Your repair requests" },
  new:      { fr: "Nouvelle demande",          en: "New request" },
  reqTitle: { fr: "Titre",                    en: "Title" },
  desc:     { fr: "Description",              en: "Description" },
  priority: { fr: "Priorité",                en: "Priority" },
  submit:   { fr: "Soumettre",               en: "Submit" },
  submitting: { fr: "Envoi…",               en: "Submitting…" },
  cancel:   { fr: "Annuler",                en: "Cancel" },
  empty:    { fr: "Aucune demande",          en: "No requests yet" },
  emptySub: { fr: "Soumettez votre première demande.", en: "Submit your first maintenance request." },
  loading:  { fr: "Chargement…",            en: "Loading…" },
  status:   { fr: "Statut",                 en: "Status" },
  date:     { fr: "Date",                   en: "Date" },
};

const PRIORITIES = [
  { value: "low",       fr: "Bas",     en: "Low" },
  { value: "normal",    fr: "Normal",  en: "Normal" },
  { value: "high",      fr: "Élevé",   en: "High" },
  { value: "emergency", fr: "Urgence", en: "Emergency" },
];

const STATUS_CFG: Record<string, { fr: string; en: string; classes: string }> = {
  open:        { fr: "Ouvert",     en: "Open",        classes: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  in_progress: { fr: "En cours",   en: "In Progress", classes: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  completed:   { fr: "Complété",   en: "Completed",   classes: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  cancelled:   { fr: "Annulé",     en: "Cancelled",   classes: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
};

const PRIORITY_CFG: Record<string, { fr: string; en: string; classes: string }> = {
  low:       { fr: "Bas",     en: "Low",       classes: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  normal:    { fr: "Normal",  en: "Normal",    classes: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  high:      { fr: "Élevé",   en: "High",      classes: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  emergency: { fr: "Urgence", en: "Emergency", classes: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const inputClass = "w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors";

export default function TenantMaintenancePage() {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", urgency: "normal" });
  const [tenantPhotos, setTenantPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    tenantApi.getMaintenance()
      .then(r => setRequests(Array.isArray(r) ? r : []))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!requireTenantAuth()) return;
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      await (tenantApi.createMaintenance as any)({ ...form, photos: tenantPhotos });
      showToast(lang === "fr" ? "Demande soumise !" : "Request submitted!", "success");
      setForm({ title: "", description: "", urgency: "normal" });
      setTenantPhotos([]);
      setShowForm(false);
      load();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 dark:text-white">{t(T.title)}</h1>
          <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-0.5">{t(T.sub)}</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setTenantPhotos([]); }}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-[13px] font-semibold transition-colors"
          >
            <Icon name="plus" size={15} />
            {t(T.new)}
          </button>
        )}
      </div>

      {/* New request form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-4">{t(T.new)}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t(T.reqTitle)}</label>
              <input
                className={inputClass} required value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder={lang === "fr" ? "Ex : Fuite sous l'évier" : "E.g. Leak under the sink"}
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t(T.desc)}</label>
              <textarea
                className={inputClass} rows={3} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder={lang === "fr" ? "Décrivez le problème en détail…" : "Describe the issue in detail…"}
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t(T.priority)}</label>
              <select
                className={inputClass} value={form.urgency}
                onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}
              >
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>{lang === "fr" ? p.fr : p.en}</option>
                ))}
              </select>
            </div>
            {/* Photo attachments */}
            <div>
              <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {lang === "fr" ? "Photos (optionnel)" : "Photos (optional)"}
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tenantPhotos.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                    <button
                      type="button"
                      onClick={() => setTenantPhotos(p => p.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center"
                    >×</button>
                  </div>
                ))}
                {tenantPhotos.length < 4 && (
                  <label className="w-16 h-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-teal-400 transition-colors">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const canvas = document.createElement("canvas");
                        const img = new Image();
                        img.src = URL.createObjectURL(file);
                        await new Promise(res => { img.onload = res; });
                        const max = 800;
                        let w = img.width, h = img.height;
                        if (w > max || h > max) {
                          if (w > h) { h = Math.round(h * max / w); w = max; }
                          else { w = Math.round(w * max / h); h = max; }
                        }
                        canvas.width = w; canvas.height = h;
                        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
                        const base64 = canvas.toDataURL("image/jpeg", 0.7);
                        setTenantPhotos(p => [...p, base64]);
                        URL.revokeObjectURL(img.src);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
              <p className="text-[11px] text-gray-400">{lang === "fr" ? "Max 4 photos · Compressées automatiquement" : "Max 4 photos · Auto-compressed"}</p>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="submit" disabled={submitting}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl font-semibold text-[14px] transition-colors flex items-center justify-center gap-2"
              >
                {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {submitting ? t(T.submitting) : t(T.submit)}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setTenantPhotos([]); }}
                className="px-5 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl font-medium text-[14px] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                {t(T.cancel)}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Requests list */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : requests.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center py-16 gap-2">
            <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Icon name="wrench" size={22} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-[14px] text-gray-500 dark:text-gray-400">{t(T.empty)}</p>
            <p className="text-[13px] text-gray-400">{t(T.emptySub)}</p>
          </div>
        ) : (
          requests.map((req: any, i: number) => {
            const sc = STATUS_CFG[req.status] ?? STATUS_CFG.open;
            const pc = PRIORITY_CFG[req.urgency] ?? PRIORITY_CFG.normal;
            return (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-[14px]">{req.title}</p>
                    {req.description && <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{req.description}</p>}
                    {req.photos?.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {req.photos.slice(0, 3).map((src: string, pi: number) => (
                          <img key={pi} src={src} alt="" className="w-10 h-10 object-cover rounded-lg border border-gray-200" />
                        ))}
                        {req.photos.length > 3 && (
                          <span className="text-[11px] text-gray-400 self-center">+{req.photos.length - 3}</span>
                        )}
                      </div>
                    )}
                    <p className="text-[12px] text-gray-400 mt-2">{formatDate(req.created_at ?? req.date)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${sc.classes}`}>
                      {lang === "fr" ? sc.fr : sc.en}
                    </span>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${pc.classes}`}>
                      {lang === "fr" ? pc.fr : pc.en}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
