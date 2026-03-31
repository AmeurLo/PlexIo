"use client";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { MaintenanceRequest, Property } from "@/lib/types";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import EmptyState from "@/components/dashboard/EmptyState";
import FormField, { inputClass, selectClass } from "@/components/dashboard/FormField";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { useSortable, SortIndicator } from "@/lib/useSortable";

const T = {
  title:       { fr: "Maintenance",            en: "Maintenance" },
  sub:         { fr: "Gérez les demandes",      en: "Manage requests" },
  add:         { fr: "Ajouter",               en: "Add" },
  edit:        { fr: "Modifier",              en: "Edit" },
  delete:      { fr: "Supprimer",             en: "Delete" },
  cancel:      { fr: "Annuler",               en: "Cancel" },
  save:        { fr: "Enregistrer",           en: "Save" },
  saving:      { fr: "Enregistrement…",       en: "Saving…" },
  empty:       { fr: "Aucune demande de maintenance", en: "No maintenance requests" },
  emptySub:    { fr: "Centralisez toutes les réparations et travaux. Assignez un entrepreneur, suivez l'avancement et documentez les coûts.", en: "Centralize all repairs and work orders. Assign contractors, track progress and document costs." },
  delTitle:    { fr: "Supprimer la demande ?", en: "Delete request?" },
  delMsg:      { fr: "Cette action est irréversible.", en: "This action cannot be undone." },
  titleField:  { fr: "Titre",                 en: "Title" },
  description: { fr: "Description",           en: "Description" },
  property:    { fr: "Propriété",             en: "Property" },
  unit:        { fr: "Unité",                en: "Unit" },
  priority:    { fr: "Priorité",              en: "Priority" },
  status:      { fr: "Statut",               en: "Status" },
  date:        { fr: "Date",                 en: "Date" },
  all:         { fr: "Toutes",               en: "All" },
  cost:        { fr: "Coût ($)",             en: "Cost ($)" },
  contractor:  { fr: "Entrepreneur",          en: "Contractor" },
};

const PRIORITIES = [
  { value: "low",    fr: "Faible",  en: "Low" },
  { value: "medium", fr: "Moyen",   en: "Medium" },
  { value: "high",   fr: "Élevé",  en: "High" },
  { value: "urgent", fr: "Urgent", en: "Urgent" },
];

const STATUSES = ["open", "assigned", "in_progress", "completed", "cancelled"];

const emptyForm = {
  title: "", description: "", property_id: "", unit_number: "",
  priority: "medium", status: "open", estimated_cost: "", assigned_contractor: "",
};

export default function MaintenancePage() {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRequest | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceRequest | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [maintenancePhotos, setMaintenancePhotos] = useState<string[]>([]);
  const [completingRequest, setCompletingRequest] = useState<any>(null);
  const [completionNote, setCompletionNote] = useState("");
  const [completionPhotos, setCompletionPhotos] = useState<string[]>([]);
  const completionFileRef = useRef<HTMLInputElement>(null);
  const [assigningRequest, setAssigningRequest] = useState<any | null>(null);
  const [contractorsLoaded, setContractorsLoaded] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const { sort: maintSort, toggle: toggleMaintSort, sortItems: sortMaintItems } = useSortable<"title" | "property" | "priority" | "status" | "date">("date", "desc");

  useEffect(() => {
    if (!requireAuth()) return;
    Promise.all([api.getMaintenanceRequests(), api.getProperties(), api.getContractors()])
      .then(([rs, ps, cs]) => { setRequests(rs); setProperties(ps); setContractors(cs as any[]); })
      .catch(e => showToast(e instanceof Error ? e.message : String(e), "error"))
      .finally(() => setLoading(false));
  }, []);

  async function load() { setRequests(await api.getMaintenanceRequests()); }

  function openAdd() { setEditing(null); setForm({ ...emptyForm }); setFormError(""); setMaintenancePhotos([]); setShowModal(true); }

  function openEdit(r: MaintenanceRequest) {
    setEditing(r);
    setForm({
      title: r.title ?? "", description: r.description ?? "", property_id: r.property_id ?? "",
      unit_number: r.unit_number ?? "", priority: r.priority ?? "medium", status: r.status ?? "open",
      estimated_cost: r.estimated_cost ? String(r.estimated_cost) : "", assigned_contractor: r.assigned_contractor ?? "",
    });
    setMaintenancePhotos((r as any).photos ?? []);
    setFormError(""); setShowModal(true);
  }

  async function handleSave() {
    if (!form.title.trim()) { setFormError(lang === "fr" ? "Titre requis." : "Title required."); return; }
    setSaving(true); setFormError("");
    try {
      const payload = { ...form, estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : undefined, photos: maintenancePhotos };
      if (editing) { await api.updateMaintenanceRequest(editing.id, payload); }
      else { await api.createMaintenanceRequest(payload); }
      setShowModal(false); load();
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await api.deleteMaintenanceRequest(deleteTarget.id); setDeleteTarget(null); load(); }
    catch (e: any) { showToast(e.message, "error"); }
    finally { setDeleting(false); }
  }

  const openAssign = async (req: any) => {
    setAssigningRequest(req);
    if (!contractorsLoaded) {
      try {
        const list = await api.getContractors();
        setContractors(list as any[]);
      } catch {}
      setContractorsLoaded(true);
    }
  };

  const handleAssign = async (contractorId: string | null) => {
    if (!assigningRequest) return;
    const rid = assigningRequest.id ?? assigningRequest._id;
    setAssigningId(rid);
    try {
      const updated = await api.assignContractor(rid, contractorId);
      setRequests(prev => prev.map(r => (r.id ?? r._id) === rid ? { ...r, ...updated } : r));
      setAssigningRequest(null);
      window.dispatchEvent(new CustomEvent("domely:badgeRefresh"));
    } catch { /* silent */ }
    finally { setAssigningId(null); }
  };

  const handleCompletionPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.slice(0, 4 - completionPhotos.length).forEach(file => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const MAX = 800;
        const [w, h] = img.width > MAX ? [MAX, img.height * MAX / img.width] : [img.width, img.height];
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        setCompletionPhotos(prev => [...prev, canvas.toDataURL("image/jpeg", 0.7)]);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });
    e.target.value = "";
  };

  const handleConfirmComplete = async () => {
    if (!completingRequest) return;
    try {
      await api.updateMaintenanceRequest(completingRequest.id, {
        status: "completed",
        completion_note: completionNote || undefined,
        completion_photos: completionPhotos.length > 0 ? completionPhotos : undefined,
      } as any);
      setRequests(prev => prev.map(r => r.id === completingRequest.id ? { ...r, status: "completed" } : r));
      setCompletingRequest(null);
      setCompletionNote("");
      setCompletionPhotos([]);
      window.dispatchEvent(new Event("domely:badgeRefresh"));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const f = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));
  const propName = (id: string) => properties.find(p => p.id === id || p._id === id)?.name ?? id;

  const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  const baseFiltered = requests.filter(r => statusFilter === "all" || r.status === statusFilter);
  const filtered = sortMaintItems(baseFiltered, (col, r) => {
    if (col === "title")    return r.title ?? "";
    if (col === "property") return r.property_id ? propName(r.property_id) : "";
    if (col === "priority") return PRIORITY_ORDER[r.priority ?? "medium"] ?? 2;
    if (col === "status")   return r.status ?? "";
    if (col === "date")     return r.created_at ?? "";
    return "";
  });

  const priorityColor: Record<string, string> = {
    low: "bg-gray-100 text-gray-600",
    medium: "bg-blue-50 text-blue-700",
    high: "bg-orange-50 text-orange-700",
    urgent: "bg-red-50 text-red-700",
  };
  const priorityLabel = (p: string) => PRIORITIES.find(x => x.value === p)?.[lang === "fr" ? "fr" : "en"] ?? p;

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <PageHeader title={t(T.title)} subtitle={t(T.sub)} actions={[{ label: `+ ${t(T.add)}`, onClick: openAdd, primary: true }]} />

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        {["all", ...STATUSES].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all ${
              statusFilter === s ? "bg-teal-600 text-white" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-teal-400"
            }`}
          >
            {s === "all" ? t(T.all) : <StatusBadge status={s} lang={lang} />}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="wrench" title={t(T.empty)} description={t(T.emptySub)} actionLabel={`+ ${t(T.add)}`} onAction={openAdd} />
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">

          {/* ── Desktop table ─────────────────────────────────────────────── */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  {([
                    ["title",    t(T.titleField)],
                    ["property", t(T.property)],
                    ["priority", t(T.priority)],
                    ["status",   t(T.status)],
                    ["date",     t(T.date)],
                  ] as [string, string][]).map(([col, label]) => (
                    <th
                      key={col}
                      className="px-5 py-3 text-left cursor-pointer select-none group hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      onClick={() => toggleMaintSort(col as any)}
                    >
                      {label}
                      <SortIndicator active={maintSort.col === col} dir={maintSort.dir} />
                    </th>
                  ))}
                  <th className="px-5 py-3 text-right">{t(T.cost)}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {filtered.map(r => (
                  <tr key={r.id ?? r._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800 dark:text-gray-200">{r.title}</p>
                      {r.description && (
                        <p className="text-[12px] text-gray-400 truncate max-w-[220px]">{r.description}</p>
                      )}
                      {r.assigned_contractor_name && (
                        <p className="text-[11px] text-violet-600 mt-0.5">
                          👷 {r.assigned_contractor_name}{r.assigned_contractor_trade ? ` · ${r.assigned_contractor_trade}` : ""}{r.assigned_contractor_phone ? ` · ${r.assigned_contractor_phone}` : ""}
                        </p>
                      )}
                      {(r as any).photos?.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {(r as any).photos.slice(0, 3).map((src: string, i: number) => (
                            <img key={i} src={src} alt="" className="w-8 h-8 object-cover rounded border border-gray-200" />
                          ))}
                          {(r as any).photos.length > 3 && (
                            <span className="text-[11px] text-gray-400 self-center">+{(r as any).photos.length - 3}</span>
                          )}
                        </div>
                      )}
                      {(r as any).completion_photos?.length > 0 && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className="text-[10px] text-teal-600 font-medium">✓ Travaux:</span>
                          {(r as any).completion_photos.slice(0, 3).map((p: string, i: number) => (
                            <img key={i} src={p} className="w-8 h-8 object-cover rounded border border-teal-200" />
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {r.property_id ? propName(r.property_id) : "—"}
                      {r.unit_number && <span className="text-gray-400"> · {r.unit_number}</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${priorityColor[r.priority ?? "medium"]}`}>
                        {priorityLabel(r.priority ?? "medium")}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={r.status ?? "open"} lang={lang} />
                      {r.assigned_contractor_name && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                            👷 {r.assigned_contractor_name}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                      {r.created_at ? formatDate(r.created_at) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500">
                      {r.estimated_cost ? `$${r.estimated_cost}` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        {r.status !== "completed" && r.status !== "cancelled" && (
                          <button
                            onClick={() => openAssign(r)}
                            className="inline-flex items-center gap-1 text-[12px] text-violet-700 hover:underline font-medium"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {r.assigned_contractor_name ? (lang === "fr" ? "Réassigner" : "Reassign") : (lang === "fr" ? "Assigner" : "Assign")}
                          </button>
                        )}
                        {r.status !== "completed" && r.status !== "cancelled" && (
                          <button onClick={() => setCompletingRequest(r)} className="text-[12px] text-green-600 hover:underline">
                            {lang === "fr" ? "Compléter" : "Complete"}
                          </button>
                        )}
                        <button onClick={() => openEdit(r)} className="text-[12px] text-teal-700 hover:underline">{t(T.edit)}</button>
                        <button onClick={() => setDeleteTarget(r)} className="text-[12px] text-red-500 hover:underline">{t(T.delete)}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ──────────────────────────────────────────────── */}
          <div className="md:hidden divide-y divide-gray-50 dark:divide-gray-800">
            {filtered.map(r => (
              <div key={r.id ?? r._id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-[14px]">{r.title}</p>
                    {r.description && <p className="text-[12px] text-gray-400 line-clamp-1 mt-0.5">{r.description}</p>}
                    {r.assigned_contractor_name && (
                      <p className="text-[11px] text-violet-600 mt-0.5">
                        👷 {r.assigned_contractor_name}{r.assigned_contractor_trade ? ` · ${r.assigned_contractor_trade}` : ""}
                      </p>
                    )}
                    {(r as any).photos?.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {(r as any).photos.slice(0, 3).map((src: string, i: number) => (
                          <img key={i} src={src} alt="" className="w-8 h-8 object-cover rounded border border-gray-200" />
                        ))}
                        {(r as any).photos.length > 3 && (
                          <span className="text-[11px] text-gray-400 self-center">+{(r as any).photos.length - 3}</span>
                        )}
                      </div>
                    )}
                    {(r as any).completion_photos?.length > 0 && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[10px] text-teal-600 font-medium">✓ Travaux:</span>
                        {(r as any).completion_photos.slice(0, 3).map((p: string, i: number) => (
                          <img key={i} src={p} className="w-8 h-8 object-cover rounded border border-teal-200" />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {r.status !== "completed" && r.status !== "cancelled" && (
                      <button
                        onClick={() => openAssign(r)}
                        className="text-[12px] text-violet-700 hover:underline font-medium"
                      >
                        {r.assigned_contractor_name ? (lang === "fr" ? "Réassigner" : "Reassign") : (lang === "fr" ? "Assigner" : "Assign")}
                      </button>
                    )}
                    {r.status !== "completed" && r.status !== "cancelled" && (
                      <button onClick={() => setCompletingRequest(r)} className="text-[12px] text-green-600 hover:underline">
                        {lang === "fr" ? "Compléter" : "Complete"}
                      </button>
                    )}
                    <button onClick={() => openEdit(r)} className="text-[12px] text-teal-700 hover:underline">{t(T.edit)}</button>
                    <button onClick={() => setDeleteTarget(r)} className="text-[12px] text-red-500 hover:underline">{t(T.delete)}</button>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${priorityColor[r.priority ?? "medium"]}`}>
                    {priorityLabel(r.priority ?? "medium")}
                  </span>
                  <StatusBadge status={r.status ?? "open"} lang={lang} />
                  {r.assigned_contractor_name && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                      👷 {r.assigned_contractor_name}
                    </span>
                  )}
                  {r.property_id && <span className="text-[12px] text-gray-400">{propName(r.property_id)}</span>}
                  {r.created_at && <span className="text-[12px] text-gray-400">{formatDate(r.created_at)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Completion modal ──────────────────────────────────────────── */}
      {completingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-[16px] font-bold text-gray-900 dark:text-gray-100 mb-4">
              {lang === "fr" ? "Confirmer la complétion" : "Confirm completion"}
            </h3>

            {/* Completion note */}
            <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1">
              {lang === "fr" ? "Note de complétion (optionnel)" : "Completion note (optional)"}
            </label>
            <textarea
              value={completionNote}
              onChange={e => setCompletionNote(e.target.value)}
              placeholder={lang === "fr" ? "Décrivez les travaux effectués…" : "Describe the work done…"}
              rows={3}
              className="w-full px-3 py-2.5 text-[13px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl resize-none mb-4"
            />

            {/* Photo/invoice upload */}
            <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
              {lang === "fr" ? "Photos de travaux / Facture (optionnel)" : "Work photos / Invoice (optional)"}
            </label>
            <input
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleCompletionPhotoUpload}
              className="hidden"
              ref={completionFileRef}
            />
            <button
              type="button"
              onClick={() => completionFileRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl py-3 text-[13px] text-gray-400 hover:border-teal-400 hover:text-teal-600 transition-colors mb-3"
            >
              {lang === "fr" ? "+ Ajouter des photos ou une facture" : "+ Add photos or an invoice"}
            </button>

            {/* Thumbnail preview */}
            {completionPhotos.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {completionPhotos.map((p, i) => (
                  <div key={i} className="relative">
                    <img src={p} className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                    <button
                      type="button"
                      onClick={() => setCompletionPhotos(prev => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center"
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setCompletingRequest(null); setCompletionNote(""); setCompletionPhotos([]); }}
                className="flex-1 px-4 py-2.5 text-[13px] font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                {lang === "fr" ? "Annuler" : "Cancel"}
              </button>
              <button
                onClick={handleConfirmComplete}
                className="flex-1 px-4 py-2.5 text-[13px] font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl"
              >
                {lang === "fr" ? "Confirmer" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? t(T.edit) : `${t(T.add)} — ${t(T.title)}`}
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">{t(T.cancel)}</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-[13px] font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl transition-colors">
              {saving ? t(T.saving) : t(T.save)}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {formError && <p className="text-[13px] text-red-500">{formError}</p>}
          <FormField label={t(T.titleField)} required>
            <input className={inputClass} value={form.title} onChange={e => f("title", e.target.value)} placeholder={lang === "fr" ? "Ex: Fuite sous l'évier" : "Ex: Leaking faucet"} />
          </FormField>
          <FormField label={t(T.description)}>
            <textarea className={inputClass + " resize-none"} rows={3} value={form.description} onChange={e => f("description", e.target.value)} />
          </FormField>
          {/* Photo attachments */}
          <div>
            <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {lang === "fr" ? "Photos (optionnel)" : "Photos (optional)"}
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {maintenancePhotos.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => setMaintenancePhotos(p => p.filter((_, j) => j !== i))}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center"
                  >×</button>
                </div>
              ))}
              {maintenancePhotos.length < 4 && (
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
                      setMaintenancePhotos(p => [...p, base64]);
                      URL.revokeObjectURL(img.src);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            <p className="text-[11px] text-gray-400">{lang === "fr" ? "Max 4 photos · Compressées automatiquement" : "Max 4 photos · Auto-compressed"}</p>
          </div>
          <FormField label={t(T.property)}>
            <select className={selectClass} value={form.property_id} onChange={e => f("property_id", e.target.value)}>
              <option value="">—</option>
              {properties.map(p => <option key={p.id ?? p._id} value={p.id ?? p._id}>{p.name}</option>)}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t(T.unit)}>
              <input className={inputClass} value={form.unit_number} onChange={e => f("unit_number", e.target.value)} placeholder="101" />
            </FormField>
            <FormField label={t(T.priority)}>
              <select className={selectClass} value={form.priority} onChange={e => f("priority", e.target.value)}>
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{lang === "fr" ? p.fr : p.en}</option>)}
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t(T.status)}>
              <select className={selectClass} value={form.status} onChange={e => f("status", e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </FormField>
            <FormField label={t(T.cost)}>
              <input className={inputClass} type="number" min={0} value={form.estimated_cost} onChange={e => f("estimated_cost", e.target.value)} />
            </FormField>
          </div>
          <FormField label={t(T.contractor)}>
            {contractors.length > 0 ? (
              <select
                className={selectClass}
                value={form.assigned_contractor}
                onChange={e => f("assigned_contractor", e.target.value)}
              >
                <option value="">—</option>
                {contractors.map(c => {
                  const cid = c.id ?? c._id;
                  const label = [c.name, c.specialty ? `(${c.specialty})` : ""].filter(Boolean).join(" ");
                  return <option key={cid} value={c.name ?? cid}>{label}</option>;
                })}
              </select>
            ) : (
              <input className={inputClass} value={form.assigned_contractor} onChange={e => f("assigned_contractor", e.target.value)} placeholder={lang === "fr" ? "Nom ou entreprise…" : "Name or company…"} />
            )}
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={t(T.delTitle)}
        message={`${deleteTarget?.title} — ${t(T.delMsg)}`}
        confirmLabel={t(T.delete)}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        danger
      />

      {/* ── Assign contractor modal ───────────────────────────────────── */}
      {assigningRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {lang === "fr" ? "Assigner un entrepreneur" : "Assign Contractor"}
            </h3>
            <p className="text-[13px] text-gray-500 mb-4">{assigningRequest.title}</p>

            {/* Currently assigned */}
            {assigningRequest.assigned_contractor_name && (
              <div className="mb-4 p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-violet-800 dark:text-violet-300">{assigningRequest.assigned_contractor_name}</p>
                  {assigningRequest.assigned_contractor_trade && (
                    <p className="text-[11px] text-violet-600">{assigningRequest.assigned_contractor_trade}</p>
                  )}
                </div>
                <button
                  onClick={() => handleAssign(null)}
                  disabled={assigningId !== null}
                  className="text-[12px] text-red-500 hover:underline disabled:opacity-50"
                >
                  {lang === "fr" ? "Retirer" : "Remove"}
                </button>
              </div>
            )}

            {/* Contractor list */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-64 overflow-y-auto rounded-xl border border-gray-100 dark:border-gray-800">
              {contractors.length === 0 ? (
                <p className="p-4 text-[13px] text-gray-400 text-center">
                  {lang === "fr" ? "Aucun entrepreneur enregistré" : "No contractors registered"}
                </p>
              ) : contractors.map((c: any) => (
                <button
                  key={c.id ?? c._id}
                  onClick={() => handleAssign(c.id ?? c._id)}
                  disabled={assigningId !== null}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200">{c.name}</p>
                  <p className="text-[11px] text-gray-400">
                    {c.trade ?? c.specialty}{c.phone ? ` · ${c.phone}` : ""}
                  </p>
                </button>
              ))}
            </div>

            <button
              onClick={() => setAssigningRequest(null)}
              className="mt-4 w-full py-2 text-[13px] text-gray-500 hover:text-gray-700"
            >
              {lang === "fr" ? "Annuler" : "Cancel"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
