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
  emptySub: { fr: "Créez des baux conformes au TAL, générez le PDF officiel et gérez les renouvellements automatiquement.", en: "Create TAL-compliant leases, generate the official PDF, and manage renewals automatically." },
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
  // Wizard steps
  wStep1:   { fr: "Locataire",       en: "Tenant" },
  wStep2:   { fr: "Logement",        en: "Property" },
  wStep3:   { fr: "Conditions",      en: "Terms" },
  wStep4:   { fr: "Résumé",          en: "Summary" },
  saveAndGen: { fr: "Enregistrer et générer le bail", en: "Save & generate lease" },
  savedOk:  { fr: "Bail enregistré !", en: "Lease saved!" },
  downloadBail: { fr: "Bail de logement (TAL)", en: "Lease agreement (TAL)" },
  downloadRL31: { fr: "Relevé 31 — Revenu Québec", en: "RL-31 — Revenu Québec" },
  docSubBail:   { fr: "Formulaire officiel + page de couverture Domely", en: "Official form + Domely cover page" },
  docSubRL31:   { fr: "Relevé fiscal pour déclaration de revenus", en: "Tax slip for income reporting" },
  allDocsTitle: { fr: "Documents générés", en: "Generated documents" },
  emailedTenant: { fr: "Envoyé au locataire par courriel", en: "Emailed to tenant" },
  closeWizard:  { fr: "Fermer", en: "Close" },
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

const PAGE_SIZE = 20;

function getPageNumbers(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const delta = 2;
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);
  const items: (number | null)[] = [1];
  if (left > 2) items.push(null);
  for (let i = left; i <= right; i++) items.push(i);
  if (right < total - 1) items.push(null);
  items.push(total);
  return items;
}

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
  const [generatingBail, setGeneratingBail]   = useState<string | null>(null);
  const [generatingRL31, setGeneratingRL31]   = useState<string | null>(null);
  const [rl31Year,       setRl31Year]         = useState<number>(new Date().getFullYear() - 1);
  const [rl31ModalLease, setRl31ModalLease]   = useState<Lease | null>(null);

  // ── E-Signature state ────────────────────────────────────────────────
  const [sigTarget,  setSigTarget]  = useState<Lease | null>(null);           // lease being signed
  const [sigRole,    setSigRole]    = useState<"landlord" | "tenant">("landlord");
  const [sigName,    setSigName]    = useState("");
  const [sigSaving,  setSigSaving]  = useState(false);
  const [sigError,   setSigError]   = useState("");
  const [sendingSig, setSendingSig] = useState<string | null>(null);  // leaseId being sent
  const [sentSig,    setSentSig]    = useState<string | null>(null);  // leaseId successfully sent
  // map of leaseId → signatures[]  (lazy-loaded when modal opens)
  const [sigsMap,    setSigsMap]    = useState<Record<string, LeaseSignature[]>>({});
  const [page, setPage] = useState(1);

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

  async function handleSendForSigning(leaseId: string) {
    setSendingSig(leaseId);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("domely_token") : null;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/leases/${leaseId}/send-for-signing`,
        { method: "POST", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as any).detail || "Erreur"); }
      setSentSig(leaseId);
      showToast("Invitation de signature envoyée au locataire ✓", "success");
      setTimeout(() => setSentSig(null), 6000);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Erreur envoi", "error");
    } finally {
      setSendingSig(null);
    }
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

  // Add/Edit wizard step
  const [wizardStep, setWizardStep] = useState(1);
  const [savedLeaseId, setSavedLeaseId] = useState<string | null>(null);

  // Renewal wizard
  const [renewTarget, setRenewTarget] = useState<Lease | null>(null);
  const [renewStep, setRenewStep] = useState(1);
  const [renewForm, setRenewForm] = useState({ start_date: "", end_date: "", monthly_rent: "" });
  const [renewSaving, setRenewSaving] = useState(false);
  const [renewError, setRenewError] = useState("");

  function isExpiringSoon(dateStr: string): boolean {
    if (!dateStr) return false;
    const end = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 60; // within 60 days OR already past (negative)
  }

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
    if (!renewForm.monthly_rent || isNaN(Number(renewForm.monthly_rent))) {
      setRenewError(lang === "fr" ? "Loyer invalide." : "Invalid rent.");
      return;
    }
    setRenewSaving(true);
    setRenewError("");
    try {
      await api.createLease({
        tenant_id: renewTarget.tenant_id ?? "",
        property_id: renewTarget.property_id ?? "",
        unit_id: renewTarget.unit_id || undefined,
        start_date: renewForm.start_date || undefined,
        end_date: renewForm.end_date || undefined,
        rent_amount: Number(renewForm.monthly_rent),
        security_deposit: 0,
        lease_type: renewTarget.lease_type ?? "fixed_term",
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

  // ── TAL Rent Increase Calculator ─────────────────────────────────────────
  // Official TAL (Tribunal administratif du logement) annual guidelines
  // Published each December for leases renewing the following year.
  // Source: https://www.tal.gouv.qc.ca
  const TAL_RATES: Record<string, { heated: number; unheated: number; electric: number; label: string }> = {
    "2022-2023": { heated: 2.3,  unheated: 1.9,  electric: 1.9,  label: "2022-2023" },
    "2023-2024": { heated: 4.7,  unheated: 4.0,  electric: 6.3,  label: "2023-2024" },
    "2024-2025": { heated: 2.9,  unheated: 2.3,  electric: 4.2,  label: "2024-2025" },
    "2025-2026": { heated: 3.0,  unheated: 2.4,  electric: 3.5,  label: "2025-2026" },
  };
  const TAL_CURRENT_YEAR = "2025-2026";

  const [talOpen,      setTalOpen]      = useState(false);
  const [talLease,     setTalLease]     = useState<Lease | null>(null);
  const [talStep,      setTalStep]      = useState(1);
  const [talHeating,   setTalHeating]   = useState<"heated" | "unheated" | "electric">("heated");
  const [talYear,      setTalYear]      = useState(TAL_CURRENT_YEAR);
  const [talCustom,    setTalCustom]    = useState(false);
  const [talCustomPct, setTalCustomPct] = useState("");
  const [talEffDate,   setTalEffDate]   = useState("");
  const [talSending,   setTalSending]   = useState(false);
  const [talSent,      setTalSent]      = useState(false);

  function openTal(l: Lease) {
    setTalLease(l);
    setTalStep(1);
    setTalHeating("heated");
    setTalYear(TAL_CURRENT_YEAR);
    setTalCustom(false);
    setTalCustomPct("");
    setTalSent(false);
    // Default effective date = end of lease + 1 day (or 3 months from now if no end date)
    const base = l.end_date ? new Date(l.end_date) : (() => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d; })();
    const eff  = new Date(base);
    eff.setDate(eff.getDate() + 1);
    setTalEffDate(eff.toISOString().slice(0, 10));
    setTalOpen(true);
  }

  function talPct(): number {
    if (talCustom) return Number(talCustomPct) || 0;
    return TAL_RATES[talYear]?.[talHeating] ?? 0;
  }
  function talCurrentRent(): number {
    return Number(talLease?.rent_amount ?? (talLease as any)?.monthly_rent ?? 0);
  }
  function talNewRent(): number {
    return Math.round(talCurrentRent() * (1 + talPct() / 100) * 100) / 100;
  }
  function talIncrease(): number {
    return Math.round((talNewRent() - talCurrentRent()) * 100) / 100;
  }

  async function sendTalNotice() {
    if (!talLease) return;
    const leaseId = talLease.id ?? (talLease as any)._id ?? "";
    setTalSending(true);
    try {
      const token  = typeof window !== "undefined" ? localStorage.getItem("domely_token") : null;
      const res    = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/leases/${leaseId}/send-rent-increase-notice`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body:    JSON.stringify({ new_rent: talNewRent(), increase_pct: talPct(), effective_date: talEffDate, notice_html: "" }),
        },
      );
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as any).detail || "Erreur"); }
      setTalSent(true);
      showToast(lang === "fr" ? "Avis envoyé au locataire ✓" : "Notice sent to tenant ✓", "success");
    } catch (e: any) {
      showToast(e.message ?? "Erreur", "error");
    } finally {
      setTalSending(false);
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

  function openAdd() { setEditing(null); setForm({ ...emptyForm }); setFormError(""); setWizardStep(1); setSavedLeaseId(null); setShowModal(true); }

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
    setFormError(""); setWizardStep(1); setSavedLeaseId(null); setShowModal(true);
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
      if (editing) {
        await api.updateLease(editing.id, payload as any);
        setSavedLeaseId(editing.id ?? editing._id ?? null);
      } else {
        const created = await api.createLease(payload as any);
        setSavedLeaseId((created as any).id ?? (created as any)._id ?? null);
      }
      setWizardStep(4);
      load();
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

  async function handleGenerateRL31(leaseId: string, year: number) {
    setGeneratingRL31(leaseId);
    try {
      const blob = await api.generateRL31(leaseId, year);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: `RL-31_${year}_${leaseId.slice(0, 8)}.pdf` });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setRl31ModalLease(null);
    } catch (e: any) {
      showToast(e.message ?? (lang === "fr" ? "Erreur de génération RL-31" : "RL-31 generation failed"), "error");
    } finally {
      setGeneratingRL31(null);
    }
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

  const totalPages = Math.max(1, Math.ceil(leases.length / PAGE_SIZE));
  const paginated = leases.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
                {paginated.map(l => (
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
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg> Signer
                        </button>
                        {sentSig === (l.id ?? l._id) ? (
                          <span className="inline-flex items-center gap-1 text-[12px] text-teal-600 font-medium">✓ Envoyé</span>
                        ) : (
                          <button
                            onClick={() => handleSendForSigning(l.id ?? l._id ?? "")}
                            disabled={sendingSig === (l.id ?? l._id)}
                            className="inline-flex items-center gap-1 text-[12px] text-teal-600 hover:underline font-medium disabled:opacity-50"
                            title="Envoyer un lien de signature au locataire par email"
                          >
                            {sendingSig === (l.id ?? l._id) ? (
                              <span className="w-3 h-3 border border-teal-500 border-t-transparent rounded-full animate-spin inline-block" />
                            ) : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>} {lang === "fr" ? "Envoyer sign." : "Send sign."}
                          </button>
                        )}
                        <button
                          onClick={() => handleGenerateBail(l.id ?? l._id ?? "")}
                          disabled={generatingBail === (l.id ?? l._id)}
                          className="inline-flex items-center gap-1 text-[12px] text-violet-600 hover:underline disabled:opacity-50"
                        >
                          {generatingBail === (l.id ?? l._id) ? (
                            <span className="w-3 h-3 border border-violet-500 border-t-transparent rounded-full animate-spin inline-block" />
                          ) : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>} {t(T.genBail)}
                        </button>
                        <button
                          onClick={() => { setRl31ModalLease(l); setRl31Year(new Date().getFullYear() - 1); }}
                          disabled={generatingRL31 === (l.id ?? l._id)}
                          className="inline-flex items-center gap-1 text-[12px] text-orange-600 hover:underline disabled:opacity-50 font-medium"
                        >
                          {generatingRL31 === (l.id ?? l._id) ? (
                            <span className="w-3 h-3 border border-orange-500 border-t-transparent rounded-full animate-spin inline-block" />
                          ) : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 9h7.5M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>} RL-31
                        </button>
                        {(l.status === "expired" || (l.status === "active" && isExpiringSoon(l.end_date ?? ""))) && (
                          <button onClick={() => openRenew(l)} className="text-[12px] text-amber-600 hover:underline font-medium">
                            ↻ {t(T.renew)}
                          </button>
                        )}
                        {(l.status === "active") && (
                          <button
                            onClick={() => openTal(l)}
                            title={lang === "fr" ? "Calculer la hausse de loyer selon les lignes directrices du TAL" : "Calculate rent increase per TAL guidelines"}
                            className="inline-flex items-center gap-1 text-[12px] text-emerald-700 hover:underline font-medium"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>
                            {lang === "fr" ? "Hausse TAL" : "TAL Increase"}
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
            {paginated.map(l => (
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
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg> Signer
                  </button>
                  {sentSig === (l.id ?? l._id) ? (
                    <span className="inline-flex items-center gap-1 text-[12px] text-teal-600 font-medium">✓ Envoyé</span>
                  ) : (
                    <button
                      onClick={() => handleSendForSigning(l.id ?? l._id ?? "")}
                      disabled={sendingSig === (l.id ?? l._id)}
                      className="inline-flex items-center gap-1 text-[12px] text-teal-600 hover:underline font-medium disabled:opacity-50"
                    >
                      {sendingSig === (l.id ?? l._id) ? <span className="w-3 h-3 border border-teal-500 border-t-transparent rounded-full animate-spin inline-block" /> : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>} {lang === "fr" ? "Envoyer sign." : "Send sign."}
                    </button>
                  )}
                  <button
                    onClick={() => handleGenerateBail(l.id ?? l._id ?? "")}
                    disabled={generatingBail === (l.id ?? l._id)}
                    className="inline-flex items-center gap-1 text-[12px] text-violet-600 hover:underline disabled:opacity-50"
                  >
                    {generatingBail === (l.id ?? l._id) ? (
                      <span className="w-3 h-3 border border-violet-500 border-t-transparent rounded-full animate-spin inline-block" />
                    ) : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>} {t(T.genBail)}
                  </button>
                  <button
                    onClick={() => { setRl31ModalLease(l); setRl31Year(new Date().getFullYear() - 1); }}
                    className="inline-flex items-center gap-1 text-[12px] text-orange-600 hover:underline font-medium"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 9h7.5M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg> RL-31
                  </button>
                  {(l.status === "expired" || (l.status === "active" && isExpiringSoon(l.end_date ?? ""))) && (
                    <button onClick={() => openRenew(l)} className="text-[12px] text-amber-600 hover:underline font-medium">
                      ↻ {t(T.renew)}
                    </button>
                  )}
                  {l.status === "active" && (
                    <button onClick={() => openTal(l)} className="inline-flex items-center gap-1 text-[12px] text-emerald-700 hover:underline font-medium">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>
                      TAL
                    </button>
                  )}
                  <button onClick={() => openEdit(l)} className="text-[12px] text-teal-700 hover:underline">{t(T.edit)}</button>
                  <button onClick={() => setDeleteTarget(l)} className="text-[12px] text-red-500 hover:underline">{t(T.delete)}</button>
                </div>
              </div>
            ))}
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800">
              <span className="text-[12px] text-gray-500 dark:text-gray-400">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, leases.length)} {lang === "fr" ? "sur" : "of"} {leases.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1 text-[12px] rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >&#8249;</button>
                {getPageNumbers(page, totalPages).map((n, i) =>
                  n === null ? (
                    <span key={`ell-${i}`} className="px-1.5 text-[12px] text-gray-400">…</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`min-w-[28px] px-2 py-1 text-[12px] rounded-lg border transition-colors ${
                        page === n
                          ? "bg-teal-600 text-white border-teal-600 font-semibold"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >{n}</button>
                  )
                )}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2.5 py-1 text-[12px] rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >&#8250;</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Wizard Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setSavedLeaseId(null); }}
        title={editing ? t(T.edit) : `${t(T.add)} — Bail`}
        wide
        footer={
          <div className="flex items-center justify-between w-full">
            {/* Step dots */}
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className={`h-1.5 rounded-full transition-all ${s === wizardStep ? "w-6 bg-teal-600" : s < wizardStep ? "w-4 bg-teal-300" : "w-4 bg-gray-200 dark:bg-gray-700"}`} />
              ))}
            </div>
            <div className="flex gap-2">
              {wizardStep > 1 && wizardStep < 4 && (
                <button onClick={() => setWizardStep(s => s - 1)} className="px-4 py-2 text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                  {t(T.back)}
                </button>
              )}
              {wizardStep < 4 && (
                <button onClick={() => { setShowModal(false); setSavedLeaseId(null); }} className="px-4 py-2 text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                  {t(T.cancel)}
                </button>
              )}
              {wizardStep === 4 ? (
                <button
                  onClick={() => { setShowModal(false); setSavedLeaseId(null); load(); }}
                  className="px-5 py-2 text-[13px] font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors"
                >
                  {t(T.closeWizard)}
                </button>
              ) : wizardStep === 3 ? (
                <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-[13px] font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl transition-colors">
                  {saving ? t(T.saving) : t(T.saveAndGen)}
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (wizardStep === 1 && !form.tenant_id) { setFormError(lang === "fr" ? "Sélectionnez un locataire." : "Select a tenant."); return; }
                    if (wizardStep === 2 && !form.property_id) { setFormError(lang === "fr" ? "Sélectionnez une propriété." : "Select a property."); return; }
                    setFormError(""); setWizardStep(s => s + 1);
                  }}
                  className="px-5 py-2 text-[13px] font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors"
                >
                  {t(T.next)} →
                </button>
              )}
            </div>
          </div>
        }
      >
        {/* Step labels */}
        <div className="flex gap-0 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden text-[11px] font-semibold mb-5">
          {[T.wStep1, T.wStep2, T.wStep3, T.wStep4].map((label, i) => (
            <div key={i} className={`flex-1 py-2 text-center transition-colors ${wizardStep === i + 1 ? "bg-teal-600 text-white" : wizardStep > i + 1 ? "bg-teal-50 dark:bg-teal-900/20 text-teal-600" : "text-gray-400"}`}>
              {i + 1}. {t(label)}
            </div>
          ))}
        </div>

        {formError && <p className="text-[13px] text-red-500 mb-3">{formError}</p>}

        {/* Step 1 — Tenant */}
        {wizardStep === 1 && (
          <div className="space-y-4">
            <p className="text-[12px] text-gray-500 dark:text-gray-400">{lang === "fr" ? "Sélectionnez le locataire qui occupera le logement." : "Select the tenant who will occupy the unit."}</p>
            <FormField label={t(T.tenant)} required>
              <select className={selectClass} value={form.tenant_id} onChange={e => f("tenant_id", e.target.value)}>
                <option value="">—</option>
                {tenants.map(ten => <option key={ten.id ?? ten._id} value={ten.id ?? ten._id}>{ten.first_name} {ten.last_name}</option>)}
              </select>
            </FormField>
            {form.tenant_id && (() => {
              const ten = tenants.find(t => (t.id ?? t._id) === form.tenant_id);
              return ten ? (
                <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-3 text-[12px] space-y-0.5">
                  <p className="font-semibold text-teal-700 dark:text-teal-300">{ten.first_name} {ten.last_name}</p>
                  {ten.email && <p className="text-gray-500">{ten.email}</p>}
                  {ten.phone && <p className="text-gray-500">{ten.phone}</p>}
                </div>
              ) : null;
            })()}
            <FormField label={t(T.status)}>
              <select className={selectClass} value={form.status} onChange={e => f("status", e.target.value)}>
                {LEASE_STATUSES.map(s => <option key={s.value} value={s.value}>{lang === "fr" ? s.fr : s.en}</option>)}
              </select>
            </FormField>
          </div>
        )}

        {/* Step 2 — Property + Unit */}
        {wizardStep === 2 && (
          <div className="space-y-4">
            <p className="text-[12px] text-gray-500 dark:text-gray-400">{lang === "fr" ? "Choisissez la propriété et l'unité concernées." : "Choose the property and unit for this lease."}</p>
            <FormField label={t(T.property)} required>
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
                      {u.unit_number || `Unit ${(u.id ?? u._id)?.slice(0, 6)}`}
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
          </div>
        )}

        {/* Step 3 — Terms */}
        {wizardStep === 3 && (
          <div className="space-y-4">
            <p className="text-[12px] text-gray-500 dark:text-gray-400">{lang === "fr" ? "Définissez les conditions financières et temporelles du bail." : "Define the financial and date terms of the lease."}</p>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={t(T.start)}>
                <input className={inputClass} type="date" value={form.start_date} onChange={e => f("start_date", e.target.value)} />
              </FormField>
              <FormField label={`${t(T.end)} (${lang === "fr" ? "vide = indéterminé" : "blank = indefinite"})`}>
                <input className={inputClass} type="date" value={form.end_date} onChange={e => f("end_date", e.target.value)} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={`${t(T.rent)}/mois ($)`} required>
                <input className={inputClass} type="number" min={0} value={form.monthly_rent} onChange={e => f("monthly_rent", e.target.value)} placeholder="1 200" />
              </FormField>
              <FormField label={`${t(T.deposit)} ($)`}>
                <input className={inputClass} type="number" min={0} value={form.deposit_amount} onChange={e => f("deposit_amount", e.target.value)} placeholder="0" />
              </FormField>
            </div>
            <FormField label={t(T.notes)}>
              <textarea className={inputClass} rows={2} value={form.notes} onChange={e => f("notes", e.target.value)} />
            </FormField>
          </div>
        )}

        {/* Step 4 — Summary + generate */}
        {wizardStep === 4 && (
          <div className="space-y-5">
            {/* Success banner */}
            <div className="flex items-center gap-3 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-xl px-4 py-3">
              <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-teal-700 dark:text-teal-300">{t(T.savedOk)}</p>
                <p className="text-[12px] text-teal-600 dark:text-teal-400">
                  {lang === "fr" ? "Tous vos documents sont prêts à télécharger." : "All your documents are ready to download."}
                </p>
              </div>
            </div>

            {/* Lease summary */}
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 space-y-1.5 text-[13px]">
              {[
                [t(T.tenant), tenantName(form.tenant_id)],
                [t(T.property), propName(form.property_id)],
                [t(T.start), form.start_date || "—"],
                [t(T.end), form.end_date || (lang === "fr" ? "Indéterminé" : "Indefinite")],
                [t(T.rent), form.monthly_rent ? `${Number(form.monthly_rent).toFixed(2).replace(".", ",")} $/mois` : "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{value}</span>
                </div>
              ))}
            </div>

            {/* Document download hub */}
            <div>
              <p className="text-[12px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{t(T.allDocsTitle)}</p>
              <div className="space-y-2">

                {/* Bail PDF */}
                <div className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">{t(T.downloadBail)}</p>
                    <p className="text-[11px] text-gray-400">{t(T.docSubBail)}</p>
                  </div>
                  <button
                    onClick={() => savedLeaseId && handleGenerateBail(savedLeaseId)}
                    disabled={!savedLeaseId || !!generatingBail}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg transition-colors flex-shrink-0"
                  >
                    {generatingBail ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                    PDF
                  </button>
                </div>

                {/* RL-31 */}
                <div className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">{t(T.downloadRL31)}</p>
                    <p className="text-[11px] text-gray-400">{t(T.docSubRL31)} — {new Date().getFullYear() - 1}</p>
                  </div>
                  <button
                    onClick={() => savedLeaseId && handleGenerateRL31(savedLeaseId, new Date().getFullYear() - 1)}
                    disabled={!savedLeaseId || !!generatingRL31}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors flex-shrink-0"
                  >
                    {generatingRL31 ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                    RL-31
                  </button>
                </div>

                {/* Auto-email note */}
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-xl">
                  <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    {lang === "fr"
                      ? "Le bail PDF a été automatiquement envoyé par courriel au locataire et au propriétaire."
                      : "The lease PDF was automatically emailed to the tenant and landlord."}
                  </p>
                </div>

              </div>
            </div>
          </div>
        )}
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

      {/* ── Renewal Modal (simple) ──────────────────────────────────── */}
      <Modal
        isOpen={!!renewTarget}
        onClose={() => setRenewTarget(null)}
        title={t(T.renewTitle)}
        footer={
          <div className="flex gap-2 justify-end w-full">
            <button
              onClick={() => setRenewTarget(null)}
              className="px-4 py-2 text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {t(T.cancel)}
            </button>
            <button
              onClick={handleRenew}
              disabled={renewSaving}
              className="px-5 py-2 text-[13px] font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl transition-colors"
            >
              {renewSaving ? t(T.saving) : t(T.confirm)}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {renewError && <p className="text-[13px] text-red-500">{renewError}</p>}

          {renewTarget && (
            <>
              {/* Read-only current lease info */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t(T.tenant)}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{displayTenantName(renewTarget)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t(T.property)}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{displayPropertyName(renewTarget)}</span>
                </div>
                {renewTarget.unit_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t(T.unit)}</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{renewTarget.unit_number}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 mt-1">
                  <span className="text-gray-500">{lang === "fr" ? "Fin actuelle" : "Current end"}</span>
                  <span className="font-medium text-amber-600">{renewTarget.end_date ? formatDate(renewTarget.end_date) : "—"}</span>
                </div>
              </div>

              {/* Editable new terms */}
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

              <p className="text-[12px] text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 rounded-xl px-3 py-2">
                {lang === "fr"
                  ? "Un nouveau bail sera créé avec les conditions ci-dessus."
                  : "A new lease will be created with the terms above."}
              </p>
            </>
          )}
        </div>
      </Modal>

      {/* ── RL-31 Year-Picker Modal ───────────────────────────────────── */}
      {rl31ModalLease && (
        <Modal
          isOpen={!!rl31ModalLease}
          onClose={() => setRl31ModalLease(null)}
          title={lang === "fr" ? "Générer le RL-31" : "Generate RL-31"}
          footer={
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRl31ModalLease(null)} className="px-4 py-2 text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                {t(T.cancel)}
              </button>
              <button
                onClick={() => handleGenerateRL31(rl31ModalLease.id ?? rl31ModalLease._id ?? "", rl31Year)}
                disabled={!!generatingRL31}
                className="px-5 py-2 text-[13px] font-semibold bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white rounded-xl transition-colors"
              >
                {generatingRL31 ? (lang === "fr" ? "Génération…" : "Generating…") : (lang === "fr" ? "Télécharger le RL-31" : "Download RL-31")}
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
              <p className="text-[13px] font-semibold text-orange-700 dark:text-orange-300 mb-1">
                {lang === "fr" ? "Relevé 31 — Renseignements sur l'occupation d'un logement" : "RL-31 — Housing occupancy information"}
              </p>
              <p className="text-[12px] text-orange-600 dark:text-orange-400">
                {lang === "fr"
                  ? "Ce relevé est remis au locataire chaque année. Il certifie le loyer brut payé pour fins de crédit d'impôt (crédit pour solidarité)."
                  : "This slip is given to the tenant yearly. It certifies gross rent paid for tax credit purposes (solidarity tax credit)."}
              </p>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
                {lang === "fr" ? "Année d'imposition" : "Tax year"}
              </label>
              <select
                value={rl31Year}
                onChange={e => setRl31Year(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors"
              >
                {[0, 1, 2, 3].map(offset => {
                  const y = new Date().getFullYear() - offset;
                  return <option key={y} value={y}>{y}{offset === 1 ? (lang === "fr" ? " (an dernier)" : " (last year)") : offset === 0 ? (lang === "fr" ? " (en cours)" : " (current)") : ""}</option>;
                })}
              </select>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-[12px] text-gray-500 dark:text-gray-400">
              <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">{lang === "fr" ? "Locataire :" : "Tenant:"} {displayTenantName(rl31ModalLease)}</p>
              <p>{lang === "fr" ? "Loyer brut annuel (Case A) :" : "Gross annual rent (Box A):"} <strong>{((rl31ModalLease.rent_amount ?? (rl31ModalLease as any).monthly_rent ?? 0) * 12).toFixed(2).replace(".", ",")} $</strong></p>
            </div>
          </div>
        </Modal>
      )}

      {/* ── TAL Rent Increase Calculator Modal ────────────────────────── */}
      {talOpen && talLease && (
        <Modal
          isOpen={talOpen}
          onClose={() => { setTalOpen(false); setTalLease(null); }}
          title={lang === "fr" ? "Calculateur de hausse — TAL Québec" : "Rent Increase Calculator — TAL Quebec"}
          wide
          footer={
            <div className="flex items-center justify-between w-full">
              {/* Step dots */}
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map(s => (
                  <div key={s} className={`h-1.5 rounded-full transition-all ${s === talStep ? "w-6 bg-emerald-600" : s < talStep ? "w-4 bg-emerald-300" : "w-4 bg-gray-200 dark:bg-gray-700"}`} />
                ))}
              </div>
              <div className="flex gap-2">
                {talStep > 1 && !talSent && (
                  <button onClick={() => setTalStep(s => s - 1)} className="px-4 py-2 text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                    {t(T.back)}
                  </button>
                )}
                <button onClick={() => { setTalOpen(false); setTalLease(null); }} className="px-4 py-2 text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                  {talSent ? t(T.closeWizard) : t(T.cancel)}
                </button>
                {talStep < 3 && (
                  <button
                    onClick={() => setTalStep(s => s + 1)}
                    className="px-5 py-2 text-[13px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors"
                  >
                    {t(T.next)} →
                  </button>
                )}
                {talStep === 3 && !talSent && (
                  <button
                    onClick={sendTalNotice}
                    disabled={talSending}
                    className="px-5 py-2 text-[13px] font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl transition-colors flex items-center gap-2"
                  >
                    {talSending && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {lang === "fr" ? "Envoyer l'avis au locataire" : "Send notice to tenant"}
                  </button>
                )}
              </div>
            </div>
          }
        >
          {/* Step label bar */}
          <div className="flex gap-0 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden text-[11px] font-semibold mb-5">
            {[
              { fr: "Paramètres", en: "Parameters" },
              { fr: "Calcul", en: "Calculation" },
              { fr: "Avis", en: "Notice" },
            ].map((lbl, i) => (
              <div key={i} className={`flex-1 py-2 text-center transition-colors ${talStep === i + 1 ? "bg-emerald-600 text-white" : talStep > i + 1 ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600" : "text-gray-400"}`}>
                {i + 1}. {lang === "fr" ? lbl.fr : lbl.en}
              </div>
            ))}
          </div>

          {/* ── Step 1: Parameters ── */}
          {talStep === 1 && (
            <div className="space-y-5">
              {/* Context info */}
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                <p className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-300 mb-1">
                  {lang === "fr" ? "Lignes directrices TAL" : "TAL Guidelines"}
                </p>
                <p className="text-[12px] text-emerald-600 dark:text-emerald-400">
                  {lang === "fr"
                    ? "Le Tribunal administratif du logement publie chaque année les facteurs d'ajustement autorisés. Cet outil calcule la hausse maximale recommandée selon le type de chauffage."
                    : "The Tribunal administratif du logement publishes annual adjustment factors. This tool calculates the maximum recommended increase based on heating type."}
                </p>
              </div>

              {/* Lease summary */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-[13px] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-400">{t(T.tenant)}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{displayTenantName(talLease)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t(T.property)}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{displayPropertyName(talLease)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-1.5 mt-1.5">
                  <span className="text-gray-400">{lang === "fr" ? "Loyer actuel" : "Current rent"}</span>
                  <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(talCurrentRent())}/mois</span>
                </div>
              </div>

              {/* Heating type selector */}
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {lang === "fr" ? "Type de chauffage inclus dans le loyer" : "Heating type included in rent"}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "heated",   fr: "Chauffé",       en: "Heated",     icon: "🔥" },
                    { value: "unheated", fr: "Non chauffé",   en: "Unheated",   icon: "❄️" },
                    { value: "electric", fr: "Électrique",    en: "Electric",   icon: "⚡" },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTalHeating(opt.value)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-[12px] font-semibold transition-colors ${
                        talHeating === opt.value
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-emerald-400"
                      }`}
                    >
                      <span className="text-lg">{opt.icon}</span>
                      {lang === "fr" ? opt.fr : opt.en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Year selector */}
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {lang === "fr" ? "Année de référence TAL" : "TAL reference year"}
                </label>
                <select
                  value={talYear}
                  onChange={e => setTalYear(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {Object.keys(TAL_RATES).reverse().map(y => (
                    <option key={y} value={y}>
                      {y}{y === TAL_CURRENT_YEAR ? (lang === "fr" ? " (année courante)" : " (current year)") : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom % toggle */}
              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div>
                  <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">
                    {lang === "fr" ? "Utiliser un pourcentage personnalisé" : "Use custom percentage"}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {lang === "fr" ? "Remplace les taux officiels du TAL" : "Overrides official TAL rates"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTalCustom(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${talCustom ? "bg-emerald-600" : "bg-gray-300 dark:bg-gray-600"}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${talCustom ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              {talCustom && (
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    {lang === "fr" ? "Pourcentage d'augmentation (%)" : "Increase percentage (%)"}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={talCustomPct}
                    onChange={e => setTalCustomPct(e.target.value)}
                    placeholder="ex. 3.5"
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                  />
                </div>
              )}

              {/* Preview of selected rate */}
              <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3">
                <span className="text-[13px] text-emerald-700 dark:text-emerald-300 font-medium">
                  {lang === "fr" ? "Taux sélectionné" : "Selected rate"}
                </span>
                <span className="text-[18px] font-bold text-emerald-700 dark:text-emerald-300">
                  {talPct().toFixed(1)}%
                </span>
              </div>
            </div>
          )}

          {/* ── Step 2: Calculation ── */}
          {talStep === 2 && (
            <div className="space-y-5">
              <p className="text-[12px] text-gray-500 dark:text-gray-400">
                {lang === "fr"
                  ? "Voici le détail de la hausse calculée selon les lignes directrices du TAL."
                  : "Here is the breakdown of the calculated increase per TAL guidelines."}
              </p>

              {/* Big calculation display */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-5 space-y-4">
                {/* Current → New */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold mb-1">
                      {lang === "fr" ? "Loyer actuel" : "Current rent"}
                    </p>
                    <p className="text-[22px] font-bold text-gray-800 dark:text-white">{formatCurrency(talCurrentRent())}</p>
                    <p className="text-[11px] text-gray-400">/mois</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    <span className="text-[11px] font-bold text-emerald-600">+{talPct().toFixed(1)}%</span>
                  </div>
                  <div className="flex-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 rounded-xl p-4 text-center">
                    <p className="text-[11px] text-emerald-600 uppercase tracking-wide font-semibold mb-1">
                      {lang === "fr" ? "Nouveau loyer" : "New rent"}
                    </p>
                    <p className="text-[22px] font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(talNewRent())}</p>
                    <p className="text-[11px] text-emerald-500">/mois</p>
                  </div>
                </div>

                {/* Detail rows */}
                <div className="space-y-2 text-[13px]">
                  {[
                    [lang === "fr" ? "Hausse mensuelle" : "Monthly increase", `+${formatCurrency(talIncrease())}/mois`],
                    [lang === "fr" ? "Hausse annuelle" : "Annual increase", `+${formatCurrency(Math.round(talIncrease() * 12 * 100) / 100)}/année`],
                    [lang === "fr" ? "Taux appliqué" : "Applied rate", `${talPct().toFixed(1)}% ${talCustom ? (lang === "fr" ? "(personnalisé)" : "(custom)") : `(TAL ${talYear})`}`],
                    [lang === "fr" ? "Type de chauffage" : "Heating type", talHeating === "heated" ? (lang === "fr" ? "Chauffé inclus" : "Heat included") : talHeating === "unheated" ? (lang === "fr" ? "Non chauffé" : "Unheated") : (lang === "fr" ? "Électricité incluse" : "Electricity included")],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Effective date */}
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {lang === "fr" ? "Date d'entrée en vigueur" : "Effective date"}
                </label>
                <input
                  type="date"
                  value={talEffDate}
                  onChange={e => setTalEffDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  {lang === "fr"
                    ? "Au Québec, l'avis doit être remis au moins 3 mois avant la fin du bail."
                    : "In Quebec, notice must be given at least 3 months before lease end."}
                </p>
              </div>

              {/* Legal note */}
              <div className="flex gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
                <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  {lang === "fr"
                    ? "Ce calcul est basé sur les lignes directrices du TAL et est fourni à titre indicatif. Consultez un professionnel ou le TAL pour les cas complexes."
                    : "This calculation is based on TAL guidelines and is for informational purposes. Consult a professional or the TAL for complex cases."}
                </p>
              </div>
            </div>
          )}

          {/* ── Step 3: Notice preview & send ── */}
          {talStep === 3 && (
            <div className="space-y-5">
              {talSent ? (
                /* Success state */
                <div className="text-center py-8 space-y-3">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-[16px] font-bold text-emerald-700 dark:text-emerald-300">
                    {lang === "fr" ? "Avis envoyé !" : "Notice sent!"}
                  </p>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400">
                    {lang === "fr"
                      ? `L'avis de hausse de loyer a été transmis par courriel à ${displayTenantName(talLease)}.`
                      : `The rent increase notice has been emailed to ${displayTenantName(talLease)}.`}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400">
                    {lang === "fr"
                      ? "Prévisualisez l'avis qui sera envoyé au locataire, puis confirmez l'envoi."
                      : "Preview the notice that will be sent to the tenant, then confirm sending."}
                  </p>

                  {/* Notice preview card */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-emerald-600 px-5 py-4">
                      <p className="text-white font-bold text-[14px]">
                        {lang === "fr" ? "Avis de modification de loyer" : "Notice of Rent Modification"}
                      </p>
                      <p className="text-emerald-100 text-[11px] mt-0.5">
                        {lang === "fr" ? "Tribunal administratif du logement — Québec" : "Tribunal administratif du logement — Quebec"}
                      </p>
                    </div>

                    {/* Body */}
                    <div className="bg-white dark:bg-gray-900 p-5 space-y-4 text-[13px]">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">{lang === "fr" ? "Locataire" : "Tenant"}</p>
                          <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">{displayTenantName(talLease)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">{lang === "fr" ? "Propriété" : "Property"}</p>
                          <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">{displayPropertyName(talLease)}</p>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-500">{lang === "fr" ? "Loyer actuel" : "Current rent"}</span>
                          <span className="font-medium">{formatCurrency(talCurrentRent())}/mois</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">{lang === "fr" ? "Augmentation" : "Increase"}</span>
                          <span className="font-medium text-emerald-600">+{talPct().toFixed(1)}% (+{formatCurrency(talIncrease())})</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">{lang === "fr" ? "Nouveau loyer mensuel" : "New monthly rent"}</span>
                          <span className="font-bold text-[15px] text-emerald-700 dark:text-emerald-300">{formatCurrency(talNewRent())}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">{lang === "fr" ? "En vigueur le" : "Effective"}</span>
                          <span className="font-medium">{talEffDate ? new Date(talEffDate).toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { day: "numeric", month: "long", year: "numeric" }) : "—"}</span>
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-[11px] text-gray-500 dark:text-gray-400 italic">
                        {lang === "fr"
                          ? "Cet avis est transmis conformément à l'article 1942 du Code civil du Québec et aux lignes directrices du TAL."
                          : "This notice is sent in accordance with article 1942 of the Civil Code of Quebec and TAL guidelines."}
                      </div>
                    </div>
                  </div>

                  <p className="text-[12px] text-gray-400">
                    {lang === "fr"
                      ? `L'avis sera envoyé par courriel à l'adresse du locataire enregistrée dans le système.`
                      : `The notice will be sent by email to the tenant's address on file.`}
                  </p>
                </>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* ── E-Signature Modal ─────────────────────────────────────────── */}
      {sigTarget && (
        <Modal
          title={`Signature électronique — ${displayTenantName(sigTarget)}`}
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
                    {role === "landlord" ? (
                      <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg> Locateur</>
                    ) : (
                      <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg> Locataire</>
                    )}
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
