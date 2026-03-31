"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, currentMonthYear, downloadCsv } from "@/lib/format";
import type { RentPayment, Property, Lease } from "@/lib/types";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import EmptyState from "@/components/dashboard/EmptyState";
import FormField, { inputClass, selectClass } from "@/components/dashboard/FormField";
import StatusBadge from "@/components/dashboard/StatusBadge";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import { useSortable, SortIndicator } from "@/lib/useSortable";

const T = {
  title:      { fr: "Loyers",              en: "Rent" },
  sub:        { fr: "Suivi des paiements", en: "Payment tracking" },
  add:        { fr: "Ajouter",            en: "Add" },
  markPaid:   { fr: "Marquer payé",       en: "Mark paid" },
  export:     { fr: "Exporter CSV",       en: "Export CSV" },
  cancel:     { fr: "Annuler",            en: "Cancel" },
  save:       { fr: "Enregistrer",        en: "Save" },
  saving:     { fr: "Enregistrement…",    en: "Saving…" },
  empty:      { fr: "Aucun paiement enregistré", en: "No payments recorded" },
  emptySub:   { fr: "Enregistrez les loyers reçus, suivez les retards et exportez vos données en un clic.", en: "Record rent received, track late payments, and export data with one click." },
  tenant:     { fr: "Locataire",          en: "Tenant" },
  property:   { fr: "Propriété",          en: "Property" },
  amount:     { fr: "Montant",            en: "Amount" },
  due:        { fr: "Échéance",           en: "Due date" },
  paid:       { fr: "Payé le",           en: "Paid on" },
  status:     { fr: "Statut",            en: "Status" },
  method:     { fr: "Méthode",           en: "Method" },
  month:      { fr: "Mois",              en: "Month" },
  notes:      { fr: "Notes",             en: "Notes" },
  total:      { fr: "Total perçu",        en: "Total collected" },
  pending:    { fr: "En attente",         en: "Pending" },
  all:        { fr: "Tous",              en: "All" },
  lease:      { fr: "Bail",              en: "Lease" },
  confirmRecv: { fr: "Confirmer réception", en: "Confirm receipt" },
  tenantConf:  { fr: "✉ Locataire a confirmé paiement", en: "✉ Tenant confirmed payment" },
};

const METHODS = ["bank_transfer", "cheque", "cash", "e_transfer", "etransfer", "credit_card"];

const STATUS_OPTIONS = [
  { value: "paid",                 fr: "Payé",            en: "Paid" },
  { value: "pending",              fr: "En attente",      en: "Pending" },
  { value: "late",                 fr: "En retard",       en: "Late" },
  { value: "partial",              fr: "Partiel",         en: "Partial" },
  { value: "pending_confirmation", fr: "À confirmer",     en: "To confirm" },
];

const STATUS_FILTERS = ["all", "pending_confirmation", "pending", "paid", "late", "partial"];

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
  lease_id: "", tenant_id: "", unit_id: "",
  amount: "", payment_date: new Date().toISOString().slice(0, 10),
  status: "paid", payment_method: "bank_transfer",
  notes: "", month_year: currentMonthYear(),
};

export default function RentPage() {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RentPayment | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmPay, setConfirmPay] = useState<RentPayment | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [waivingFeeId, setWaivingFeeId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const { sort: rentSort, toggle: toggleRentSort, sortItems: sortRentItems } = useSortable<"tenant" | "property" | "amount" | "date" | "status">("date", "desc");

  useEffect(() => { setPage(1); }, [statusFilter]);

  useEffect(() => {
    if (!requireAuth()) return;
    Promise.all([api.getRentPayments(), api.getProperties(), api.getTenants(), api.getLeases()])
      .then(([rp, ps, ts, ls]) => { setPayments(rp); setProperties(ps); setTenants(ts); setLeases(ls); })
      .catch(e => showToast(e instanceof Error ? e.message : String(e), "error"))
      .finally(() => setLoading(false));
  }, []);

  async function load() { setPayments(await api.getRentPayments()); }

  function openAdd() { setEditing(null); setForm({ ...emptyForm }); setFormError(""); setShowModal(true); }

  function openEdit(p: RentPayment) {
    setEditing(p);
    setForm({
      lease_id: p.lease_id ?? "",
      tenant_id: p.tenant_id ?? "",
      unit_id: p.unit_id ?? "",
      amount: String(p.amount ?? ""),
      payment_date: p.payment_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      status: p.status ?? "paid",
      payment_method: p.payment_method ?? "bank_transfer",
      notes: p.notes ?? "",
      month_year: p.month_year ?? currentMonthYear(),
    });
    setFormError(""); setShowModal(true);
  }

  function handleLeaseChange(leaseId: string) {
    const lease = leases.find(l => (l.id ?? l._id) === leaseId);
    if (lease) {
      setForm(prev => ({
        ...prev,
        lease_id: leaseId,
        tenant_id: lease.tenant_id ?? "",
        unit_id: lease.unit_id ?? "",
        // Pre-fill amount from lease rent if creating new
        amount: prev.amount || String(lease.rent_amount ?? (lease as any).monthly_rent ?? ""),
      }));
    } else {
      setForm(prev => ({ ...prev, lease_id: leaseId }));
    }
  }

  async function handleSave() {
    if (!form.amount || isNaN(Number(form.amount))) {
      setFormError(lang === "fr" ? "Montant invalide." : "Invalid amount.");
      return;
    }
    if (!editing && !form.lease_id) {
      setFormError(lang === "fr" ? "Sélectionnez un bail." : "Please select a lease.");
      return;
    }
    setSaving(true); setFormError("");
    try {
      if (editing) {
        // Update: only editable fields
        await api.updateRentPayment(editing.id ?? (editing as any)._id, {
          amount: Number(form.amount),
          payment_date: form.payment_date,
          payment_method: form.payment_method,
          month_year: form.month_year,
          status: form.status as any,
          notes: form.notes || undefined,
        });
      } else {
        await api.createRentPayment({
          lease_id: form.lease_id,
          tenant_id: form.tenant_id,
          unit_id: form.unit_id,
          amount: Number(form.amount),
          payment_date: form.payment_date,
          payment_method: form.payment_method,
          month_year: form.month_year,
          notes: form.notes || undefined,
        });
      }
      setShowModal(false); load();
    } catch (e: any) { setFormError(e.message ?? String(e)); }
    finally { setSaving(false); }
  }

  async function markPaid(p: RentPayment) {
    try {
      await api.updateRentPayment(p.id ?? (p as any)._id, {
        status: "paid",
        payment_date: new Date().toISOString().slice(0, 10),
      });
      load();
    } catch (e: any) { showToast(e instanceof Error ? e.message : String(e), "error"); }
  }

  const getId = (p: RentPayment) => String(p.id ?? (p as any)._id);

  function toggleRow(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(prev => {
      if (allSelected) { const next = new Set(prev); allVisibleIds.forEach(id => next.delete(id)); return next; }
      const next = new Set(prev); allVisibleIds.forEach(id => next.add(id)); return next;
    });
  }

  async function bulkMarkPaid() {
    const ids = Array.from(selected).filter(id => allVisibleIds.includes(id));
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      await Promise.all(ids.map(id => api.updateRentPayment(id, { status: "paid", payment_date: new Date().toISOString().slice(0, 10) })));
      setSelected(new Set()); load();
      showToast(lang === "fr" ? `${ids.length} paiements marqués comme payés.` : `${ids.length} payments marked as paid.`, "success");
      window.dispatchEvent(new CustomEvent("domely:badgeRefresh"));
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setBulkBusy(false); }
  }

  async function handleDownloadReceipt(id: string, monthYear: string) {
    setDownloadingId(id);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("domely_token") : null;
      const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
      const res = await fetch(`${BASE}/rent-payments/${id}/receipt`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) { showToast(lang === "fr" ? "Erreur lors du téléchargement du reçu." : "Failed to download receipt.", "error"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recu-${(monthYear || "loyer").replace(/\//g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast(lang === "fr" ? "Erreur lors du téléchargement du reçu." : "Failed to download receipt.", "error");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleWaiveLateFee(p: RentPayment) {
    const pid = getId(p);
    setWaivingFeeId(pid);
    try {
      await api.waiveLateFee(pid);
      load();
      showToast(lang === "fr" ? "Frais de retard annulé." : "Late fee waived.", "success");
    } catch (e: any) {
      showToast(e.message ?? String(e), "error");
    } finally {
      setWaivingFeeId(null);
    }
  }

  function handleExport() {
    const rows = filtered.map(p => ({
      [t(T.tenant)]: p.tenant_name ?? tenantName(p.tenant_id ?? ""),
      [t(T.property)]: p.property_name ?? propName(p.property_id ?? ""),
      [t(T.amount)]: p.amount,
      [t(T.paid)]: p.payment_date ?? "",
      [t(T.status)]: p.status,
      [t(T.method)]: p.payment_method ?? "",
      [t(T.month)]: p.month_year ?? "",
    }));
    if (rows.length) downloadCsv(rows, `loyers-${currentMonthYear()}.csv`);
  }

  const f = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const tenantName = (id: string) => { const ten = tenants.find(t => t.id === id || t._id === id); return ten ? `${ten.first_name} ${ten.last_name}` : id; };
  const propName   = (id: string) => properties.find(p => p.id === id || p._id === id)?.name ?? id;

  const baseFiltered = payments.filter(p => statusFilter === "all" || p.status === statusFilter);
  const filtered = sortRentItems(baseFiltered, (col, p) => {
    if (col === "tenant")   return p.tenant_name ?? tenantName(p.tenant_id ?? "");
    if (col === "property") return p.property_name ?? propName(p.property_id ?? "");
    if (col === "amount")   return p.amount ?? 0;
    if (col === "date")     return p.payment_date ?? "";
    if (col === "status")   return p.status ?? "";
    return "";
  });
  const totalCollected = filtered.filter(p => p.status === "paid").reduce((s, p) => s + (p.amount ?? 0), 0);
  const totalPending   = filtered.filter(p => p.status !== "paid").reduce((s, p) => s + (p.amount ?? 0), 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allVisibleIds = paginated.map(getId);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selected.has(id));
  const someSelected = allVisibleIds.some(id => selected.has(id)) && !allSelected;

  // Build a display label for each lease in the selector
  const leaseLabel = (l: Lease) => {
    const tName = (l as any).tenant_name ?? tenantName(l.tenant_id ?? "");
    const pName = (l as any).property_name ?? propName(l.property_id ?? "");
    const unitNo = l.unit_number ?? "";
    return [tName, pName, unitNo].filter(Boolean).join(" — ");
  };

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <PageHeader
        title={t(T.title)}
        subtitle={t(T.sub)}
        actions={[
          { label: t(T.export), onClick: handleExport },
          { label: `+ ${t(T.add)}`, onClick: openAdd, primary: true },
        ]}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total collected */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5 col-span-1">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
              </svg>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
              {payments.filter(p => p.status === "paid").length} ✓
            </span>
          </div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{t(T.total)}</p>
          <p className="text-[24px] font-bold text-gray-900 dark:text-white">{formatCurrency(totalCollected)}</p>
        </div>

        {/* Pending */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5 col-span-1">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            {totalPending > 0 && (
              <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full">
                {payments.filter(p => p.status !== "paid").length} {lang === "fr" ? "dossiers" : "open"}
              </span>
            )}
          </div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{t(T.pending)}</p>
          <p className="text-[24px] font-bold text-gray-900 dark:text-white">{formatCurrency(totalPending)}</p>
        </div>

        {/* Late payments */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5 col-span-1">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
          </div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{lang === "fr" ? "En retard" : "Late"}</p>
          <p className="text-[24px] font-bold text-gray-900 dark:text-white">
            {payments.filter(p => p.status === "late").length}
          </p>
        </div>

        {/* À confirmer */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5 col-span-1">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{lang === "fr" ? "À confirmer" : "To confirm"}</p>
          <p className="text-[24px] font-bold text-gray-900 dark:text-white">
            {payments.filter(p => p.status === "pending_confirmation").length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        {STATUS_FILTERS.map(s => {
          const count = s === "pending_confirmation" ? payments.filter(p => p.status === "pending_confirmation").length : 0;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                statusFilter === s ? "bg-teal-600 text-white" : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-teal-400"
              }`}
            >
              {s === "all"
                ? t(T.all)
                : <span className="flex items-center gap-1">
                    <StatusBadge status={s} lang={lang} />
                    {count > 0 && <span className="ml-1 bg-blue-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{count}</span>}
                  </span>
              }
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="credit-card" title={t(T.empty)} description={t(T.emptySub)} actionLabel={`+ ${t(T.add)}`} onAction={openAdd} />
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 px-5 py-2.5 bg-teal-50 dark:bg-teal-900/20 border-b border-teal-100 dark:border-teal-800">
              <span className="text-[13px] font-medium text-teal-700 dark:text-teal-300">
                {selected.size} {lang === "fr" ? "sélectionné(s)" : "selected"}
              </span>
              <button
                onClick={bulkMarkPaid}
                disabled={bulkBusy}
                className="px-3 py-1 text-[12px] font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-lg transition-colors"
              >
                {bulkBusy ? "…" : (lang === "fr" ? "Marquer payé" : "Mark paid")}
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="px-3 py-1 text-[12px] text-teal-600 dark:text-teal-400 hover:underline"
              >
                {lang === "fr" ? "Annuler" : "Cancel"}
              </button>
            </div>
          )}

          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  {/* Select-all checkbox */}
                  <th className="pl-5 pr-2 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleAll}
                      className="w-3.5 h-3.5 rounded accent-teal-600 cursor-pointer"
                    />
                  </th>
                  {([ ["tenant", t(T.tenant), "left"], ["property", t(T.property), "left"], ["amount", t(T.amount), "right"], ["date", t(T.paid), "left"], ["status", t(T.status), "left"] ] as [string, string, string][]).map(([col, label, align]) => (
                    <th
                      key={col}
                      className={`px-5 py-3 text-${align} cursor-pointer select-none group hover:text-gray-600 dark:hover:text-gray-300 transition-colors`}
                      onClick={() => toggleRentSort(col as any)}
                    >
                      {label}
                      <SortIndicator active={rentSort.col === col} dir={rentSort.dir} />
                    </th>
                  ))}
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {paginated.map(p => {
                  const pid = getId(p);
                  const isChecked = selected.has(pid);
                  return (
                  <tr key={pid} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${isChecked ? "bg-teal-50/40 dark:bg-teal-900/10" : ""}`}>
                    <td className="pl-5 pr-2 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRow(pid)}
                        className="w-3.5 h-3.5 rounded accent-teal-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-200">{p.tenant_name || tenantName(p.tenant_id ?? "")}</td>
                    <td className="px-5 py-3 text-gray-500">{p.property_name || propName(p.property_id ?? "")}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900 dark:text-white">
                      <span>{formatCurrency(p.amount ?? 0)}</span>
                      {(p as any).late_fee_amount > 0 && !(p as any).late_fee_waived && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 whitespace-nowrap">
                          {lang === "fr" ? "Frais" : "Fee"}: {formatCurrency((p as any).late_fee_amount)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{p.payment_date ? formatDate(p.payment_date) : "—"}</td>
                    <td className="px-5 py-3"><StatusBadge status={p.status ?? "pending"} lang={lang} /></td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2 justify-end items-center">
                        {p.status === "pending_confirmation" && (
                          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium italic mr-1">{t(T.tenantConf)}</span>
                        )}
                        {p.status !== "paid" && (
                          <button
                            onClick={() => setConfirmPay(p)}
                            className={`text-[12px] hover:underline whitespace-nowrap font-medium ${p.status === "pending_confirmation" ? "text-blue-600 dark:text-blue-400" : "text-teal-700"}`}
                          >
                            {p.status === "pending_confirmation" ? t(T.confirmRecv) : t(T.markPaid)}
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadReceipt(pid, p.month_year ?? "")}
                          disabled={downloadingId === pid}
                          className="inline-flex items-center gap-1 text-[12px] text-gray-500 hover:text-teal-600 hover:underline disabled:opacity-50"
                          title={lang === "fr" ? "Télécharger le reçu PDF" : "Download PDF receipt"}
                        >
                          {downloadingId === pid ? (
                            <span className="w-3 h-3 border border-teal-500 border-t-transparent rounded-full animate-spin inline-block" />
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          )}
                          {lang === "fr" ? "Reçu" : "Receipt"}
                        </button>
                        <button onClick={() => openEdit(p)} className="text-[12px] text-gray-500 hover:underline">{lang === "fr" ? "Modifier" : "Edit"}</button>
                        {(p as any).late_fee_amount > 0 && !(p as any).late_fee_waived && (
                          <button
                            onClick={() => handleWaiveLateFee(p)}
                            disabled={waivingFeeId === pid}
                            className="text-[12px] text-orange-600 dark:text-orange-400 hover:underline disabled:opacity-50 whitespace-nowrap"
                          >
                            {waivingFeeId === pid ? "…" : (lang === "fr" ? "Annuler frais" : "Waive fee")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile */}
          <div className="md:hidden divide-y divide-gray-50 dark:divide-gray-800">
            {paginated.map(p => (
              <div key={p.id ?? (p as any)._id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 dark:text-gray-200 text-[14px] truncate">{p.tenant_name || tenantName(p.tenant_id ?? "")}</p>
                  <p className="text-[12px] text-gray-400">{p.payment_date ? formatDate(p.payment_date) : "—"}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-semibold text-[14px] text-gray-900 dark:text-white">{formatCurrency(p.amount ?? 0)}</span>
                  <StatusBadge status={p.status ?? "pending"} lang={lang} />
                </div>
                {p.status !== "paid" && (
                  <button onClick={() => setConfirmPay(p)} className="ml-1 px-2 py-1 text-[11px] font-medium bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 rounded-lg">{t(T.markPaid)}</button>
                )}
                {p.status === "paid" && (
                  <button
                    onClick={() => handleDownloadReceipt(String(p.id ?? (p as any)._id), p.month_year ?? "")}
                    disabled={downloadingId === String(p.id ?? (p as any)._id)}
                    className="ml-1 inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-900/20 disabled:opacity-50"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {lang === "fr" ? "Reçu" : "Receipt"}
                  </button>
                )}
              </div>
            ))}
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800">
              <span className="text-[12px] text-gray-500 dark:text-gray-400">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} {lang === "fr" ? "sur" : "of"} {filtered.length}
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

      {/* Mark Paid confirm */}
      <ConfirmDialog
        isOpen={!!confirmPay}
        title={lang === "fr" ? "Confirmer le paiement" : "Confirm Payment"}
        message={lang === "fr"
          ? `Marquer le loyer de ${confirmPay?.tenant_name ?? ""} comme payé ?`
          : `Mark rent for ${confirmPay?.tenant_name ?? ""} as paid?`}
        onConfirm={() => { if (confirmPay) markPaid(confirmPay); setConfirmPay(null); }}
        onCancel={() => setConfirmPay(null)}
      />

      {/* Add / Edit modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? (lang === "fr" ? "Modifier paiement" : "Edit payment") : (lang === "fr" ? "Nouveau paiement" : "New payment")}
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{t(T.cancel)}</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-[13px] font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl transition-colors">
              {saving ? t(T.saving) : t(T.save)}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {formError && <p className="text-[13px] text-red-500">{formError}</p>}

          {/* Lease selector (only when creating) */}
          {!editing && (
            <FormField label={t(T.lease)} required>
              <select className={selectClass} value={form.lease_id} onChange={e => handleLeaseChange(e.target.value)}>
                <option value="">— {lang === "fr" ? "Sélectionner un bail" : "Select a lease"} —</option>
                {leases.filter(l => l.status === "active" || !l.status).map(l => (
                  <option key={l.id ?? (l as any)._id} value={l.id ?? (l as any)._id}>
                    {leaseLabel(l)}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          {/* If editing, show tenant/property as read-only context */}
          {editing && (
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-[13px] text-gray-500 dark:text-gray-400">
              {editing.tenant_name || tenantName(editing.tenant_id ?? "")}
              {(editing.property_name || propName(editing.property_id ?? "")) && (
                <> · {editing.property_name || propName(editing.property_id ?? "")}</>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField label={`${t(T.amount)} ($)`} required>
              <input className={inputClass} type="number" min={0} value={form.amount} onChange={e => f("amount", e.target.value)} placeholder="1200" />
            </FormField>
            <FormField label={t(T.month)}>
              <input className={inputClass} value={form.month_year} onChange={e => f("month_year", e.target.value)} placeholder="2024-01" />
            </FormField>
          </div>

          <FormField label={t(T.paid)}>
            <input className={inputClass} type="date" value={form.payment_date} onChange={e => f("payment_date", e.target.value)} />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label={t(T.status)}>
              <select className={selectClass} value={form.status} onChange={e => f("status", e.target.value)}>
                {STATUS_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{lang === "fr" ? s.fr : s.en}</option>
                ))}
              </select>
            </FormField>
            <FormField label={t(T.method)}>
              <select className={selectClass} value={form.payment_method} onChange={e => f("payment_method", e.target.value)}>
                {METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
              </select>
            </FormField>
          </div>

          <FormField label={t(T.notes)}>
            <textarea className={inputClass + " resize-none"} rows={2} value={form.notes} onChange={e => f("notes", e.target.value)} />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
