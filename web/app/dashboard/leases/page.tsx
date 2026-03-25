"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate, formatCurrency, downloadCsv } from "@/lib/format";
import type { Lease, Property, Tenant, Unit, LeaseSignature } from "@/lib/types";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import EmptyState from "@/components/dashboard/EmptyState";
import FormField, { inputClass, selectClass } from "@/components/dashboard/FormField";
import StatusBadge from "@/components/dashboard/StatusBadge";
import SignaturePad from "@/components/dashboard/SignaturePad";

const T = {
  title:    { fr: "Baux",              en: "Leases" },
  sub:      { fr: "Gérez vos baux",    en: "Manage your leases" },
  add:      { fr: "Ajouter",          en: "Add" },
  edit:     { fr: "Modifier",         en: "Edit" },
  delete:   { fr: "Supprimer",        en: "Delete" },
  cancel:   { fr: "Annuler",          en: "Cancel" },
  save:     { fr: "Enregistrer",      en: "Save" },
  saving:   { fr: "Enregistrement…",  en: "Saving…" },
  empty:    { fr: "Aucun bail",       en: "No leases yet" },
  emptySub: { fr: "Ajoutez votre premier bail.", en: "Add your first lease." },
  export:   { fr: "Exporter CSV",     en: "Export CSV" },
  tenant:   { fr: "Locataire",        en: "Tenant" },
  property: { fr: "Propriété",        en: "Property" },
  unit:     { fr: "Unité",           en: "Unit" },
  start:    { fr: "Début",           en: "Start" },
  end:      { fr: "Fin",             en: "End" },
  rent:     { fr: "Loyer",           en: "Rent" },
  deposit:  { fr: "Dépôt",           en: "Deposit" },
  status:   { fr: "Statut",          en: "Status" },
  notes:    { fr: "Notes",           en: "Notes" },
  delTitle: { fr: "Supprimer le bail ?", en: "Delete lease?" },
  delMsg:   { fr: "Cette action est irréversible.", en: "This action cannot be undone." },
  type:     { fr: "Type",            en: "Type" },
  genBail:  { fr: "Bail PDF (QC)",    en: "Bail PDF (QC)" },
  generating: { fr: "Génération…",   en: "Generating…" },
  renew:    { fr: "Renouveler",      en: "Renew" },
  renewTitle: { fr: "Renouvellement du bail", en: "Lease renewal" },
  step1:    { fr: "Bail actuel",     en: "Current lease" },
  step2:    { fr: "Nouveaux termes", en: "New terms" },
  step3:    { fr: "Confirmation",    en: "Confirmation" },
  next:     { fr: "Suivant",         en: "Next" },
  back:     { fr: "Retour",          en: "Back" },
  confirm:  { fr: "Confirmer le renouvellement", en: "Confirm renewal" },
  newStart: { fr: "Nouvelle date de début", en: "New start date" },
  newEnd:   { fr: "Nouvelle date de fin",   en: "New end date" },
  newRent:  { fr: "Nouveau loyer mensuel ($)", en: "New monthly rent ($)" },
  renewOk:  { fr: "Bail renouvelé avec succès.", en: "Lease renewed successfully." },
};

const LEASE_TYPES = [
  { value: "fixed_term", fr: "Durée fixe", en: "Fixed term" },
  { value: "month_to_month", fr: "Mois par mois", en: "Month to month" },
  { value: "yearly", fr: "Annuel", en: "Yearly" },
];

const LEASE_STATUSES = [
  { value: "active",    fr: "Actif",    en: "Active" },
  { value: "pending",   fr: "En attente", en: "Pending" },
  { value: "expired",   fr: "Expiré",   en: "Expired" },
  { value: "cancelled", fr: "Annulé",   en: "Cancelled" },
];

const emptyForm = {
  tenant_id: "", property_id: "", unit_id: "", start_date: "", end_date: "",
  monthly_rent: "", deposit_amount: "", lease_type: "fixed_term", status: "active", notes: "",
};

export default function LeasesPage() {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Lease | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Lease | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [generatingBail, setGeneratingBail] = useState<string | null>(null);

  // ── E-Signature state ────────────────────────────────────────────────
  const [sigTarget,  setSigTarget]  = useState<Lease | null>(null);           // lease being signed
  const [sigRole,    setSigRole]    = useState<"landlord" | "tenant">("landlord");
  const [sigName,    setSigName]    = useState("");
  const [sigSaving,  setSigSaving]  = useState(false);
  const [sigError,   setSigError]   = useState("");
  // map of leaseId → signatures[]  (lazy-loaded when modal opens)
  const [sigsMap,    setSigsMap]    = useState<Record<string, LeaseSignature[]>>({});

  async function openSignModal(l: Lease) {
    const id = l.id ?? l._id ?? "";
    setSigTarget(l);
    setSigRole("landlord");
    setSigName("");
    setSigError("");
    // Pre-load existing signatures
    try {
      const existing = await api.getSignatures(id);
      setSigsMap(prev => ({ ...prev, [id]: existing }));
    } catch { /* ignore */ }
  }

  async function handleSaveSignature(dataUrl: string) {
    if (!sigTarget) return;
    const leaseId = sigTarget.id ?? sigTarget._id ?? "";
    if (!sigName.trim()) { setSigError("Le nom est requis."); return; }
    setSigSaving(true);
    setSigError("");
    try {
      const saved = await api.saveSignature(leaseId, sigRole, dataUrl, sigName.trim());
      setSigsMap(prev => {
        const existing = (prev[leaseId] ?? []).filter(s => s.signer_type !== sigRole);
        return { ...prev, [leaseId]: [...existing, saved] };
      });
      showToast(
        sigRole === "landlord" ? "Signature du locateur enregistrée ✓" : "Signature du locataire enregistrée ✓",
        "success",
      );
    } catch (e: any) {
      setSigError(e.message ?? "Erreur lors de l'enregistrement.");
    } finally {
      setSigSaving(false);
    }
  }

  async function handleDeleteSig(leaseId: string, sigId: string) {
    try {
      await api.deleteSignature(sigId);
      setSigsMap(prev => ({
        ...prev,
        [leaseId]: (prev[leaseId] ?? []).filter(s => s.id !== sigId),
      }));
      showToast("Signature supprimée.", "success");
    } catch { showToast("Erreur suppression signature.", "error"); }
  }

  // Renewal wizard
  const [renewTarget, setRenewTarget] = useState<Lease | null>(null);
  const [renewStep, setRenewStep] = useState(1);
  const [renewForm, setRenewForm] = useState({ start_date: "", end_date: "", monthly_rent: "" });
  const [renewSaving, setRenewSaving] = useState(false);
  const [renewError, setRenewError] = useState("");

  function openRenew(l: Lease) {
    // Pre-fill: new start = old end + 1 day, new end = old end + 1 year, same rent
    const oldEnd = l.end_date ? new Date(l.end_date) : new Date();
    const newStart = new Date(oldEnd);
    newStart.setDate(newStart.getDate() + 1);
    const newEnd = new Date(newStart);
    newEnd.setFullYear(newEnd.getFullYear() + 1);
    setRenewTarget(l);
    setRenewStep(1);
    setRenewError("");
    setRenewForm({
      start_date: newStart.toISOString().slice(0, 10),
      end_date: newEnd.toISOString().slice(0, 10),
      monthly_rent: String(l.rent_amount ?? (l as any).monthly_rent ?? ""),
    });
  }

  async function handleRenew() {
    if (!renewTarget) return;
    setRenewSaving(true);
    setRenewError("");
    try {
      await api.updateLease(renewTarget.id ?? renewTarget._id ?? "", {
        start_date: renewForm.start_date || undefined,
        end_date: renewForm.end_date || undefined,
        rent_amount: Number(renewForm.monthly_rent),
        status: "active",
      } as any);
      setRenewTarget(null);
      showToast(t(T.renewOk), "success");
      load();
    } catch (e: any) {
      setRenewError(e.message ?? "Error");
    } finally {
      setRenewSaving(false);
    }
  }

  useEffect(() => {
    if (!requireAuth()) return;
    Promise.all([api.getLeases(), api.getProperties(), api.getTenants(), api.getUnits()])
      .then(([ls, ps, ts, us]) => { setLeases(ls); setProperties(ps); setTenants(ts); setUnits(us); })
      .catch(e => showToast(e instanceof Error ? e.message : String(e), "error"))
      .finally(() => setLoading(false));
  }, []);

  async function load() { setLeases(await api.getLeases()); }

  function openAdd() { setEditing(null); setForm({ ...emptyForm }); setFormError(""); setShowModal(true); }

  function openEdit(l: Lease) {
    setEditing(l);
    setForm({
      tenant_id: l.tenant_id ?? "",
      property_id: l.property_id ?? "",
      unit_id: l.unit_id ?? "",
      start_date: l.start_date?.slice(0, 10) ?? "",
      end_date: l.end_date?.slice(0, 10) ?? "",
      monthly_rent: String(l.rent_amount ?? (l as any).monthly_rent ?? ""),
      deposit_amount: String(l.security_deposit ?? (l as any).deposit_amount ?? ""),
      lease_type: l.lease_type ?? "fixed_term",
      status: l.status ?? "active",
      notes: l.notes ?? "",
    });
    setFormError(""); setShowModal(true);
  }

  async function handleSave() {
    if (!form.monthly_rent || isNaN(Number(form.monthly_rent))) { setFormError(lang === "fr" ? "Loyer invalide." : "Invalid rent."); return; }
    if (!form.tenant_id) {
      setFormError(lang === "fr" ? "Sélectionnez un locataire." : "Please select a tenant.");
      return;
    }
    if (!form.property_id) {
      setFormError(lang === "fr" ? "Sélectionnez une propriété." : "Please select a property.");
      return;
    }
    setSaving(true); setFormError("");
    try {
      const payload = {
        tenant_id: form.tenant_id,
        property_id: form.property_id,
        unit_id: form.unit_id || undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        rent_amount: Number(form.monthly_rent),
        security_deposit: Number(form.deposit_amount) || 0,
        lease_type: form.lease_type,
        status: form.status,
        notes: form.notes || undefined,
      };
      if (editing) { await api.updateLease(editing.id, payload as any); }
      else { await api.createLease(payload as any); }
      setShowModal(false); load();
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await api.deleteLease(deleteTarget.id); setDeleteTarget(null); load(); }
    catch (e: any) { showToast(e.message, "error"); }
    finally { setDeleting(false); }
  }

  async function handleGenerateBail(leaseId: string) {
    setGeneratingBail(leaseId);
    try {
      const blob = await api.generateBail(leaseId);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: `bail-${leaseId.slice(0, 8)}.pdf` });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e: any) {
      showToast(e.message ?? (lang === "fr" ? "Erreur de génération" : "Generation failed"), "error");
    } finally {
      setGeneratingBail(null);
    }
  }

  function handleExport() {
    const rows = leases.map(l => ({
      [t(T.tenant)]: displayTenantName(l),
      [t(T.property)]: displayPropertyName(l),
      [t(T.unit)]: l.unit_number ?? "",
      [t(T.start)]: l.start_date ?? "",
      [t(T.end)]: l.end_date ?? "",
      [t(T.rent)]: l.rent_amount ?? (l as any).monthly_rent ?? "",
      [t(T.deposit)]: l.security_deposit ?? (l as any).deposit_amount ?? "",
      [t(T.status)]: l.status ?? "",
    }));
    if (rows.length) downloadCsv(rows, "baux.csv");
  }

  const f = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));
  const tenantName = (id: string) => { const ten = tenants.find(t => t.id === id || t._id === id); return ten ? `${ten.first_name} ${ten.last_name}` : id; };
  const propName = (id: string) => properties.find(p => p.id === id || p._id === id)?.name ?? id;

  // Use denormalized names from API when available, fall back to local lookups
  const displayTenantName = (l: Lease) => (l as any).tenant_name ?? tenantName(l.tenant_id ?? "");
  const displayPropertyName = (l: Lease) => (l as any).property_name ?? propName(l.property_id ?? "");

  // Units filtered by selected property in the form
  const filteredUnits = form.property_id
    ? units.filter(u => (u.property_id === form.property_id) || ((u as any).property === form.property_id))
    : units;

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <PageHeader
        title={t(T.title)} subtitle={t(T.sub)}
        actions={[
          { label: t(T.export), onClick: handleExport },
          { label: `+ ${t(T.add)}`, onClick: openAdd, primary: true },
        ]}
      />

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : leases.length === 0 ? (
        <EmptyState icon="document" title={t(T.empty)} description={t(T.emptySub)} actionLabel={`+ ${t(T.add)}`} onAction={openAdd} />
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  {[T.tenant, T.property, T.unit, T.start, T.end, T.rent, T.status].map(h => (
                    <th key={h.en} className="px-5 py-3 text-left">{t(h)}</th>
                  ))}
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {leases.map(l => (
                  <tr key={l.id ?? l._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-200">{displayTenantName(l)}</td>
                    <td className="px-5 py-3 text-gray-500">{displayPropertyName(l)}</td>
                    <td className="px-5 py-3 text-gray-500">{l.unit_number || "—"}</td>
                    <td className="px-5 py-3 text-gray-500">{l.start_date ? formatDate(l.start_date) : "—"}</td>
                    <td className="px-5 py-3 text-gray-500">{l.end_date ? formatDate(l.end_date) : "—"}</td>
                    <td className="px-5 py-3 font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(l.rent_amount ?? (l as any).monthly_rent ?? 0)}/mo
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={l.status ?? "active"} lang={lang} /></td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2 justify-end items-center flex-wrap">
                        {/* Signature status badges */}
                        {(() => {
                          const lId = l.id ?? l._id ?? "";
                          const sigs = sigsMap[lId] ?? [];
                          const hasLL = sigs.some(s => s.signer_type === "landlord");
                          const hasTN = sigs.some(s => s.signer_type === "tenant");
                          if (hasLL || hasTN) return (
                            <span className="inline-flex items-center gap-1">
                              <span title="Locateur signé" className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${hasLL ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>L</span>
                              <span title="Locataire signé" className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${hasTN ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>T</span>
                            </span>
                          );
                          return null;
                        })()}
                        <button
                          onClick={() => openSignModal(l)}
                          className="inline-flex items-center gap-1 text-[12px] text-[#1A3D9E] hover:underline font-medium"
                        >
                          ✍️ Signer
                        </button>
                        <button
                          onClick={() => handleGenerateBail(l.id ?? l._id ?? "")}
                          disabled={generatingBail === (l.id ?? l._id)}
                          className="inline-flex items-center gap-1 text-[12px] text-violet-600 hover:underline disabled:opacity-50"
                        >
                          {generatingBail === (l.id ?? l._id) ? (
                            <span className="w-3 h-3 border border-violet-500 border-t-transparent rounded-full animate-spin inline-block" />
                          ) : "📄"} {t(T.genBail)}
                        </button>
                        {(l.status === "active" || l.status === "expired") && (
                          <button onClick={() => openRenew(l)} className="text-[12px] text-amber-600 hover:underline">
                            ↻ {t(T.renew)}
                          </button>
                        )}
                        <button onClick={() => openEdit(l)} className="text-[12px] text-teal-700 hover:underline">{t(T.edit)}</button>
                        <button onClick={() => setDeleteTarget(l)} className="text-[12px] text-red-500 hover:underline">{t(T.delete)}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-50 dark:divide-gray-800">
            {leases.map(l => (
              <div key={l.id ?? l._id} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-800 dark:text-gray-200">{displayTenantName(l)}</p>
                  <StatusBadge status={l.status ?? "active"} lang={lang} />
                </div>
                <p className="text-[12px] text-gray-400">{displayPropertyName(l)} · {l.unit_number || "—"}</p>
                <p className="text-[12px] text-gray-400">{formatDate(l.start_date ?? "")} → {l.end_date ? formatDate(l.end_date) : "∞"}</p>
                <p className="text-[12px] font-semibold text-gray-700 dark:text-gray-300 mt-1">
                  {formatCurrency(l.rent_amount ?? (l as any).monthly_rent ?? 0)}/mo
                </p>
                <div className="flex gap-3 mt-2 items-center flex-wrap">
                  <button
                    onClick={() => openSignModal(l)}
                    className="inline-flex items-center gap-1 text-[12px] text-[#1A3D9E] hover:underline font-medium"
                  >
                    ✍️ Signer
                  </button>
                  <button
                    onClick={() => handleGenerateBail(l.id ?? l._id ?? "")}
                    disabled={generatingBail === (l.id ?? l._id)}
                    className="inline-flex items-center gap-1 text-[12px] text-violet-600 hover:underline disabled:opacity-50"
                  >
                    {generatingBail === (l.id ?? l._id) ? (
                      <span className="w-3 h-3 border border-violet-500 border-t-transparent rounded-full animate-spin inline-block" />
                    ) : "📄"} {t(T.genBail)}
                  </button>
                  {(l.status === "active" || l.status === "expired") && (
                    <button onClick={() => openRenew(l)} className="text-[12px] text-amber-600 hover:underline">
                      ↻ {t(T.renew)}
                    </button>
                  )}
                  <button onClick={() => openEdit(l)} className="text-[12px] text-teal-700 hover:underline">{t(T.edit)}</button>
                  <button onClick={() => setDeleteTarget(l)} className="text-[12px] text-red-500 hover:underline">{t(T.delete)}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? t(T.edit) : `${t(T.add)} — Bail`}
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
          <FormField label={t(T.tenant)}>
            <select className={selectClass} value={form.tenant_id} onChange={e => f("tenant_id", e.target.value)}>
              <option value="">—</option>
              {tenants.map(ten => <option key={ten.id ?? ten._id} value={ten.id ?? ten._id}>{ten.first_name} {ten.last_name}</option>)}
            </select>
          </FormField>
          <FormField label={t(T.property)}>
            <select className={selectClass} value={form.property_id} onChange={e => { f("property_id", e.target.value); f("unit_id", ""); }}>
              <option value="">—</option>
              {properties.map(p => <option key={p.id ?? p._id} value={p.id ?? p._id}>{p.name}</option>)}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t(T.unit)}>
              <select className={selectClass} value={form.unit_id} onChange={e => f("unit_id", e.target.value)}>
                <option value="">—</option>
                {filteredUnits.map(u => (
                  <option key={u.id ?? u._id} value={u.id ?? u._id}>
                    {u.unit_number || `Unit ${u.id?.slice(0, 6)}`}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t(T.type)}>
              <select className={selectClass} value={form.lease_type} onChange={e => f("lease_type", e.target.value)}>
                {LEASE_TYPES.map(lt => <option key={lt.value} value={lt.value}>{lang === "fr" ? lt.fr : lt.en}</option>)}
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t(T.start)}>
              <input className={inputClass} type="date" value={form.start_date} onChange={e => f("start_date", e.target.value)} />
            </FormField>
            <FormField label={t(T.end)}>
              <input className={inputClass} type="date" value={form.end_date} onChange={e => f("end_date", e.target.value)} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={`${t(T.rent)}/mois ($)`} required>
              <input className={inputClass} type="number" min={0} value={form.monthly_rent} onChange={e => f("monthly_rent", e.target.value)} />
            </FormField>
            <FormField label={`${t(T.deposit)} ($)`}>
              <input className={inputClass} type="number" min={0} value={form.deposit_amount} onChange={e => f("deposit_amount", e.target.value)} />
            </FormField>
          </div>
          <FormField label={t(T.status)}>
            <select className={selectClass} value={form.status} onChange={e => f("status", e.target.value)}>
              {LEASE_STATUSES.map(s => <option key={s.value} value={s.value}>{lang === "fr" ? s.fr : s.en}</option>)}
            </select>
          </FormField>
          <FormField label={t(T.notes)}>
            <textarea className={inputClass} rows={3} value={form.notes} onChange={e => f("notes", e.target.value)} />
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={t(T.delTitle)}
        message={`${displayTenantName(deleteTarget ?? {} as Lease)} — ${t(T.delMsg)}`}
        confirmLabel={t(T.delete)}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        danger
      />

      {/* Renewal Wizard */}
      <Modal
        isOpen={!!renewTarget}
        onClose={() => setRenewTarget(null)}
        title={t(T.renewTitle)}
        footer={
          <div className="flex items-center justify-between w-full">
            {/* Step indicators */}
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1.5 rounded-full transition-all ${s === renewStep ? "w-6 bg-teal-600" : s < renewStep ? "w-4 bg-teal-300" : "w-4 bg-gray-200 dark:bg-gray-700"}`} />
              ))}
            </div>
            <div className="flex gap-2">
              {renewStep > 1 && (
                <button
                  onClick={() => setRenewStep(s => s - 1)}
                  className="px-4 py-2 text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {t(T.back)}
                </button>
              )}
              <button
                onClick={() => setRenewTarget(null)}
                className="px-4 py-2 text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {t(T.cancel)}
              </button>
              {renewStep < 3 ? (
                <button
                  onClick={() => {
                    if (renewStep === 2 && !renewForm.monthly_rent) { setRenewError(lang === "fr" ? "Loyer requis." : "Rent required."); return; }
                    setRenewError("");
                    setRenewStep(s => s + 1);
                  }}
                  className="px-5 py-2 text-[13px] font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors"
                >
                  {t(T.next)}
                </button>
              ) : (
                <button
                  onClick={handleRenew}
                  disabled={renewSaving}
                  className="px-5 py-2 text-[13px] font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl transition-colors"
                >
                  {renewSaving ? t(T.saving) : t(T.confirm)}
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {renewError && <p className="text-[13px] text-red-500">{renewError}</p>}

          {/* Step labels */}
          <div className="flex gap-0 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden text-[11px] font-semibold">
            {[T.step1, T.step2, T.step3].map((label, i) => (
              <div key={i} className={`flex-1 py-2 text-center transition-colors ${renewStep === i + 1 ? "bg-teal-600 text-white" : renewStep > i + 1 ? "bg-teal-50 dark:bg-teal-900/20 text-teal-600" : "text-gray-400"}`}>
                {i + 1}. {t(label)}
              </div>
            ))}
          </div>

          {/* Step 1: Current lease summary */}
          {renewStep === 1 && renewTarget && (
            <div className="space-y-3">
              <p className="text-[12px] text-gray-500 dark:text-gray-400">
                {lang === "fr" ? "Bail actuel à renouveler :" : "Lease to be renewed:"}
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t(T.tenant)}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{displayTenantName(renewTarget)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t(T.property)}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{displayPropertyName(renewTarget)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t(T.end)}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{renewTarget.end_date ? formatDate(renewTarget.end_date) : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t(T.rent)}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {formatCurrency(renewTarget.rent_amount ?? (renewTarget as any).monthly_rent ?? 0)}/mo
                  </span>
                </div>
              </div>
              <p className="text-[12px] text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 rounded-xl px-3 py-2">
                {lang === "fr"
                  ? "Le statut sera remis à Actif et les nouvelles dates seront appliquées."
                  : "Status will be reset to Active and new dates applied."}
              </p>
            </div>
          )}

          {/* Step 2: New terms */}
          {renewStep === 2 && (
            <div className="space-y-4">
              <p className="text-[12px] text-gray-500 dark:text-gray-400">
                {lang === "fr" ? "Définissez les nouvelles conditions du bail." : "Set the new lease terms."}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <FormField label={t(T.newStart)}>
                  <input
                    className={inputClass}
                    type="date"
                    value={renewForm.start_date}
                    onChange={e => setRenewForm(f => ({ ...f, start_date: e.target.value }))}
                  />
                </FormField>
                <FormField label={t(T.newEnd)}>
                  <input
                    className={inputClass}
                    type="date"
                    value={renewForm.end_date}
                    onChange={e => setRenewForm(f => ({ ...f, end_date: e.target.value }))}
                  />
                </FormField>
              </div>
              <FormField label={t(T.newRent)} required>
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  value={renewForm.monthly_rent}
                  onChange={e => setRenewForm(f => ({ ...f, monthly_rent: e.target.value }))}
                />
              </FormField>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {renewStep === 3 && renewTarget && (
            <div className="space-y-3">
              <p className="text-[12px] text-gray-500 dark:text-gray-400">
                {lang === "fr" ? "Vérifiez avant de confirmer :" : "Review before confirming:"}
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t(T.tenant)}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{displayTenantName(renewTarget)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t(T.newStart)}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{renewForm.start_date ? formatDate(renewForm.start_date) : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t(T.newEnd)}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{renewForm.end_date ? formatDate(renewForm.end_date) : "—"}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                  <span className="text-gray-500">{t(T.newRent)}</span>
                  <span className="font-bold text-teal-600">{formatCurrency(Number(renewForm.monthly_rent))}/mo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t(T.status)}</span>
                  <span className="font-semibold text-teal-600">Active</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ── E-Signature Modal ─────────────────────────────────────────── */}
      {sigTarget && (
        <Modal
          title={`✍️ Signature électronique — ${displayTenantName(sigTarget)}`}
          onClose={() => { setSigTarget(null); setSigError(""); }}
          wide
        >
          <div className="space-y-5">
            {/* Existing signatures */}
            {(() => {
              const lId = sigTarget.id ?? sigTarget._id ?? "";
              const sigs = sigsMap[lId] ?? [];
              if (sigs.length === 0) return null;
              return (
                <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 p-4 space-y-2">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-2">
                    Signatures enregistrées
                  </p>
                  {sigs.map(s => (
                    <div key={s.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Signature preview thumbnail */}
                        <img
                          src={s.signature_data}
                          alt="signature"
                          className="h-10 w-24 object-contain bg-white border border-green-200 rounded"
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{s.signer_name}</p>
                          <p className="text-xs text-gray-500">
                            {s.signer_type === "landlord" ? "Locateur" : "Locataire"} ·{" "}
                            {new Date(s.signed_at).toLocaleDateString("fr-CA", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSig(lId, s.id)}
                        className="text-[11px] text-red-500 hover:underline"
                      >
                        Supprimer
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Role selector */}
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Qui signe ?</p>
              <div className="flex gap-3">
                {(["landlord", "tenant"] as const).map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSigRole(role)}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                      sigRole === role
                        ? "bg-[#1A3D9E] text-white border-[#1A3D9E]"
                        : "border-gray-200 text-gray-600 hover:border-[#1A3D9E] dark:border-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {role === "landlord" ? "🏠 Locateur" : "🔑 Locataire"}
                  </button>
                ))}
              </div>
            </div>

            {/* Signer name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Nom complet du signataire
              </label>
              <input
                type="text"
                value={sigName}
                onChange={e => setSigName(e.target.value)}
                placeholder={sigRole === "landlord" ? "Ex. Jean-Pierre Gagnon" : "Ex. Marie Tremblay"}
                className={inputClass}
              />
            </div>

            {/* Signature pad */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Signature</p>
              {sigSaving ? (
                <div className="flex items-center justify-center h-32 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                  <div className="flex items-center gap-2 text-[#1A3D9E]">
                    <span className="w-4 h-4 border-2 border-[#1A3D9E] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium">Enregistrement…</span>
                  </div>
                </div>
              ) : (
                <SignaturePad onSave={handleSaveSignature} />
              )}
            </div>

            {sigError && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-4 py-2.5">{sigError}</p>
            )}

            {/* Info note */}
            <p className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-3">
              Les signatures électroniques sont juridiquement valides au Québec conformément à la Loi concernant le cadre juridique des technologies de l&apos;information (L.R.Q., c. C-1.1). Une page de certification sera ajoutée au PDF du bail.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
