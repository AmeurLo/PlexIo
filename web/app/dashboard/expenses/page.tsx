"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, downloadCsv, daysUntil, formatPhone } from "@/lib/format";
import { EXPENSE_CATEGORIES } from "@/lib/types";
import type { Expense, Mortgage, Insurance, Property } from "@/lib/types";
import PageHeader from "@/components/dashboard/PageHeader";
import Modal from "@/components/dashboard/Modal";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import EmptyState from "@/components/dashboard/EmptyState";
import FormField, { inputClass, selectClass } from "@/components/dashboard/FormField";

type Tab = "expenses" | "mortgage" | "insurance";

const MORT_TYPES = [
  { value: "fixed",    fr: "Taux fixe",     en: "Fixed rate" },
  { value: "variable", fr: "Taux variable",  en: "Variable rate" },
  { value: "hybrid",   fr: "Hybride",        en: "Hybrid" },
];
const INS_TYPES = [
  { value: "comprehensive", fr: "Tous risques",   en: "Comprehensive" },
  { value: "property",      fr: "Habitation",     en: "Property" },
  { value: "liability",     fr: "Responsabilité", en: "Liability" },
  { value: "fire",          fr: "Incendie",       en: "Fire" },
  { value: "flood",         fr: "Inondation",     en: "Flood" },
  { value: "umbrella",      fr: "Parapluie",      en: "Umbrella" },
];

const emptyExpense = {
  title: "", amount: "", category: "repairs", date: "", property_id: "",
  vendor: "", is_tax_deductible: false, notes: "",
};
const emptyMortgage = {
  property_name: "", lender: "", original_amount: "", balance: "", interest_rate: "",
  monthly_payment: "", start_date: "", maturity_date: "", type: "fixed", amortization_years: "25",
};
const emptyInsurance = {
  property_name: "", insurer: "", policy_number: "", type: "comprehensive",
  annual_premium: "", coverage_amount: "", renewal_date: "", deductible: "", contact_phone: "",
};

export default function FinancesPage() {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("expenses");

  // ── Shared ─────────────────────────────────────────────────────────────────
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // ── Expenses ───────────────────────────────────────────────────────────────
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [catFilter, setCatFilter] = useState("all");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expForm, setExpForm] = useState({ ...emptyExpense });
  const [deleteExpense, setDeleteExpense] = useState<Expense | null>(null);
  const [scanningReceipt, setScanningReceipt] = useState(false);

  // ── Mortgages ──────────────────────────────────────────────────────────────
  const [mortgages, setMortgages] = useState<Mortgage[]>([]);
  const [editingMortgage, setEditingMortgage] = useState<Mortgage | null>(null);
  const [mortForm, setMortForm] = useState({ ...emptyMortgage });
  const [deleteMortgage, setDeleteMortgage] = useState<Mortgage | null>(null);

  // ── Insurance ──────────────────────────────────────────────────────────────
  const [policies, setPolicies] = useState<Insurance[]>([]);
  const [editingIns, setEditingIns] = useState<Insurance | null>(null);
  const [insForm, setInsForm] = useState({ ...emptyInsurance });
  const [deleteIns, setDeleteIns] = useState<Insurance | null>(null);

  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!requireAuth()) return;
    Promise.all([api.getExpenses(), api.getMortgages(), api.getInsurances(), api.getProperties()])
      .then(([es, ms, ins, ps]) => {
        setExpenses(es); setMortgages(ms); setPolicies(ins); setProperties(ps);
      })
      .catch(e => showToast(e instanceof Error ? e.message : String(e), "error"))
      .finally(() => setLoading(false));
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const propName = (id: string) => properties.find(p => p.id === id || (p as any)._id === id)?.name ?? id;
  const catLabel = (cat: string) => {
    const c = EXPENSE_CATEGORIES.find(c => c.value === cat);
    return c ? (lang === "fr" ? c.fr : c.en) : cat;
  };
  const typeLabel = (types: { value: string; fr: string; en: string }[], v: string) =>
    types.find(x => x.value === v)?.[lang === "fr" ? "fr" : "en"] ?? v;

  function closeModal() { setShowModal(false); setFormError(""); }

  // ── EXPENSE CRUD ───────────────────────────────────────────────────────────
  function openAddExpense() {
    setEditingExpense(null); setExpForm({ ...emptyExpense }); setFormError(""); setShowModal(true);
  }
  function openEditExpense(ex: Expense) {
    setEditingExpense(ex);
    setExpForm({
      title: ex.title ?? "", amount: String(ex.amount ?? ""), category: ex.category ?? "repairs",
      date: ((ex as any).expense_date ?? ex.date ?? "")?.slice(0, 10),
      property_id: ex.property_id ?? "", vendor: ex.vendor ?? "",
      is_tax_deductible: ex.is_tax_deductible ?? false, notes: ex.notes ?? "",
    });
    setFormError(""); setShowModal(true);
  }
  function handleScanReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanningReceipt(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const scanned = await api.scanReceipt(base64);
        setExpForm(p => ({
          ...p,
          title: scanned.title ?? p.title,
          amount: scanned.amount != null ? String(scanned.amount) : p.amount,
          category: scanned.category ?? p.category,
          date: scanned.date?.slice(0, 10) ?? p.date,
          notes: scanned.notes ?? p.notes,
        }));
      } catch {
        setFormError(lang === "fr" ? "Impossible de lire le reçu. Réessayez." : "Could not read receipt. Please try again.");
      } finally {
        setScanningReceipt(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function saveExpense() {
    if (!expForm.title.trim()) { setFormError(lang === "fr" ? "Titre requis." : "Title required."); return; }
    if (!expForm.amount || isNaN(Number(expForm.amount))) { setFormError(lang === "fr" ? "Montant invalide." : "Invalid amount."); return; }
    setSaving(true); setFormError("");
    try {
      const { date, ...rest } = { ...expForm, amount: Number(expForm.amount) };
      if (editingExpense) await api.updateExpense(editingExpense.id, { ...rest, expense_date: date } as any);
      else await api.createExpense({ ...rest, expense_date: date });
      closeModal();
      setExpenses(await api.getExpenses());
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  }
  async function confirmDeleteExpense() {
    if (!deleteExpense) return;
    setDeleting(true);
    try { await api.deleteExpense(deleteExpense.id); setDeleteExpense(null); setExpenses(await api.getExpenses()); }
    catch (e: any) { showToast(e.message, "error"); }
    finally { setDeleting(false); }
  }

  // ── MORTGAGE CRUD ──────────────────────────────────────────────────────────
  function openAddMortgage() {
    setEditingMortgage(null); setMortForm({ ...emptyMortgage }); setFormError(""); setShowModal(true);
  }
  function openEditMortgage(m: Mortgage) {
    setEditingMortgage(m);
    setMortForm({
      property_name: (m as any).property_name ?? propName(m.property_id ?? ""),
      lender: m.lender ?? "",
      original_amount: String((m as any).original_amount ?? m.original_principal ?? ""),
      balance: String((m as any).balance ?? m.current_balance ?? ""),
      interest_rate: String(m.interest_rate ?? ""),
      monthly_payment: String(m.monthly_payment ?? ""),
      start_date: m.start_date?.slice(0, 10) ?? "",
      maturity_date: ((m as any).maturity_date ?? m.end_date ?? "")?.slice(0, 10),
      type: (m as any).type ?? m.mortgage_type ?? "fixed",
      amortization_years: String((m as any).amortization_years ?? 25),
    });
    setFormError(""); setShowModal(true);
  }
  async function saveMortgage() {
    setSaving(true); setFormError("");
    try {
      const payload = {
        property_name: mortForm.property_name, lender: mortForm.lender,
        original_amount: Number(mortForm.original_amount) || 0,
        balance: Number(mortForm.balance) || 0,
        interest_rate: Number(mortForm.interest_rate) || 0,
        monthly_payment: Number(mortForm.monthly_payment) || 0,
        start_date: mortForm.start_date, maturity_date: mortForm.maturity_date,
        type: mortForm.type, amortization_years: Number(mortForm.amortization_years) || 25,
        term_years: 5,
      };
      if (editingMortgage) await api.updateMortgage(editingMortgage.id, payload);
      else await api.createMortgage(payload);
      closeModal();
      setMortgages(await api.getMortgages());
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  }
  async function confirmDeleteMortgage() {
    if (!deleteMortgage) return;
    setDeleting(true);
    try { await api.deleteMortgage(deleteMortgage.id); setDeleteMortgage(null); setMortgages(await api.getMortgages()); }
    catch (e: any) { showToast(e.message, "error"); }
    finally { setDeleting(false); }
  }

  // ── INSURANCE CRUD ─────────────────────────────────────────────────────────
  function openAddInsurance() {
    setEditingIns(null); setInsForm({ ...emptyInsurance }); setFormError(""); setShowModal(true);
  }
  function openEditInsurance(ins: Insurance) {
    setEditingIns(ins);
    setInsForm({
      property_name: (ins as any).property_name ?? propName(ins.property_id ?? ""),
      insurer: ins.insurer ?? "",
      policy_number: (ins as any).policy_number ?? "",
      type: (ins as any).type ?? ins.insurance_type ?? "comprehensive",
      annual_premium: String(ins.annual_premium ?? ""),
      coverage_amount: String((ins as any).coverage_amount ?? ""),
      renewal_date: ((ins as any).renewal_date ?? ins.end_date ?? "")?.slice(0, 10),
      deductible: String((ins as any).deductible ?? ""),
      contact_phone: (ins as any).contact_phone ?? "",
    });
    setFormError(""); setShowModal(true);
  }
  async function saveInsurance() {
    setSaving(true); setFormError("");
    try {
      const payload = {
        property_name: insForm.property_name, insurer: insForm.insurer,
        policy_number: insForm.policy_number, type: insForm.type,
        annual_premium: Number(insForm.annual_premium) || 0,
        coverage_amount: Number(insForm.coverage_amount) || 0,
        renewal_date: insForm.renewal_date,
        deductible: Number(insForm.deductible) || 0,
        contact_phone: insForm.contact_phone,
      };
      if (editingIns) await api.updateInsurance(editingIns.id, payload);
      else await api.createInsurance(payload);
      closeModal();
      setPolicies(await api.getInsurances());
    } catch (e: any) { setFormError(e.message); }
    finally { setSaving(false); }
  }
  async function confirmDeleteInsurance() {
    if (!deleteIns) return;
    setDeleting(true);
    try { await api.deleteInsurance(deleteIns.id); setDeleteIns(null); setPolicies(await api.getInsurances()); }
    catch (e: any) { showToast(e.message, "error"); }
    finally { setDeleting(false); }
  }

  // ── Computed ───────────────────────────────────────────────────────────────
  const filteredExp = expenses.filter(e => catFilter === "all" || e.category === catFilter);
  const expTotal    = filteredExp.reduce((s, e) => s + (e.amount ?? 0), 0);
  const mortBalance = mortgages.reduce((s, m) => s + ((m as any).balance ?? m.current_balance ?? 0), 0);
  const mortMonthly = mortgages.reduce((s, m) => s + (m.monthly_payment ?? 0), 0);
  const insAnnual   = policies.reduce((s, p) => s + (p.annual_premium ?? 0), 0);

  const handleSave = tab === "expenses" ? saveExpense : tab === "mortgage" ? saveMortgage : saveInsurance;
  const isEditing  = tab === "expenses" ? !!editingExpense : tab === "mortgage" ? !!editingMortgage : !!editingIns;
  const modalTitle = { expenses: lang === "fr" ? "Dépense" : "Expense", mortgage: lang === "fr" ? "Hypothèque" : "Mortgage", insurance: lang === "fr" ? "Assurance" : "Insurance" }[tab];

  const TABS: { key: Tab; fr: string; en: string }[] = [
    { key: "expenses",  fr: "Dépenses",    en: "Expenses" },
    { key: "mortgage",  fr: "Hypothèques", en: "Mortgages" },
    { key: "insurance", fr: "Assurances",  en: "Insurance" },
  ];

  const pageActions = () => {
    const add = `+ ${lang === "fr" ? "Ajouter" : "Add"}`;
    if (tab === "expenses") return [
      { label: lang === "fr" ? "Exporter CSV" : "Export CSV", onClick: () => { const rows = expenses.map(ex => ({ Title: ex.title, Amount: ex.amount, Category: ex.category, Date: (ex as any).expense_date ?? ex.date ?? "" })); if (rows.length) downloadCsv(rows, "finances.csv"); } },
      { label: add, onClick: openAddExpense, primary: true },
    ];
    if (tab === "mortgage") return [{ label: add, onClick: openAddMortgage, primary: true }];
    return [{ label: add, onClick: openAddInsurance, primary: true }];
  };

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <PageHeader
        title={lang === "fr" ? "Finances" : "Finances"}
        subtitle={lang === "fr" ? "Dépenses, hypothèques et assurances" : "Expenses, mortgages & insurance"}
        actions={pageActions()}
      />

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        {TABS.map(({ key, fr, en }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
              tab === key
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}>
            {lang === "fr" ? fr : en}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── EXPENSES ──────────────────────────────────────────────────── */}
          {tab === "expenses" && (
            <div className="space-y-5">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5 inline-block">
                <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-1">Total</p>
                <p className="text-[26px] font-bold text-gray-900 dark:text-white">{formatCurrency(expTotal)}</p>
              </div>
              {/* Category filter — dropdown instead of 12 pills */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <select
                    value={catFilter}
                    onChange={e => setCatFilter(e.target.value)}
                    className="appearance-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-3.5 pr-8 py-2 text-[13px] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="all">{lang === "fr" ? "Toutes les catégories" : "All categories"}</option>
                    {EXPENSE_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{lang === "fr" ? c.fr : c.en}</option>
                    ))}
                  </select>
                  <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {catFilter !== "all" && (
                  <button onClick={() => setCatFilter("all")} className="text-[12px] text-teal-600 dark:text-teal-400 hover:underline">
                    {lang === "fr" ? "Effacer" : "Clear"}
                  </button>
                )}
              </div>
              {filteredExp.length === 0 ? (
                <EmptyState icon="dollar" title={lang === "fr" ? "Aucune dépense" : "No expenses yet"} description={lang === "fr" ? "Enregistrez vos dépenses par catégorie et visualisez vos coûts réels par propriété." : "Log expenses by category and visualize your real costs per property."} actionLabel={`+ ${lang === "fr" ? "Ajouter" : "Add"}`} onAction={openAddExpense} />
              ) : (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                          <th className="px-5 py-3 text-left">{lang === "fr" ? "Titre" : "Title"}</th>
                          <th className="px-5 py-3 text-left">{lang === "fr" ? "Catégorie" : "Category"}</th>
                          <th className="px-5 py-3 text-left">{lang === "fr" ? "Propriété" : "Property"}</th>
                          <th className="px-5 py-3 text-left">Date</th>
                          <th className="px-5 py-3 text-right">{lang === "fr" ? "Montant" : "Amount"}</th>
                          <th className="px-5 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {filteredExp.map(ex => (
                          <tr key={ex.id ?? (ex as any)._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-200">{ex.title}</td>
                            <td className="px-5 py-3"><span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-md text-[11px] font-medium">{catLabel(ex.category ?? "")}</span></td>
                            <td className="px-5 py-3 text-gray-500">{ex.property_id ? propName(ex.property_id) : "—"}</td>
                            <td className="px-5 py-3 text-gray-500">{((ex as any).expense_date ?? ex.date) ? formatDate(((ex as any).expense_date ?? ex.date) as string) : "—"}</td>
                            <td className="px-5 py-3 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(ex.amount ?? 0)}</td>
                            <td className="px-5 py-3">
                              <div className="flex gap-1.5 justify-end">
                                <button onClick={() => openEditExpense(ex)} className="px-3 py-1 text-[12px] font-medium text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/40 rounded-lg transition-colors">{lang === "fr" ? "Modifier" : "Edit"}</button>
                                <button onClick={() => setDeleteExpense(ex)} className="px-3 py-1 text-[12px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors">{lang === "fr" ? "Supprimer" : "Delete"}</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden divide-y divide-gray-50 dark:divide-gray-800">
                    {filteredExp.map(ex => (
                      <div key={ex.id ?? (ex as any)._id} className="p-4 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 dark:text-gray-200">{ex.title}</p>
                          <p className="text-[12px] text-gray-400">{catLabel(ex.category ?? "")} · {((ex as any).expense_date ?? ex.date) ? formatDate(((ex as any).expense_date ?? ex.date) as string) : "—"}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-semibold">{formatCurrency(ex.amount ?? 0)}</span>
                          <div className="flex gap-1.5">
                            <button onClick={() => openEditExpense(ex)} className="px-2.5 py-1 text-[11px] font-medium text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/40 rounded-lg transition-colors">{lang === "fr" ? "Modifier" : "Edit"}</button>
                            <button onClick={() => setDeleteExpense(ex)} className="px-2.5 py-1 text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors">{lang === "fr" ? "Supprimer" : "Delete"}</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── MORTGAGES ─────────────────────────────────────────────────── */}
          {tab === "mortgage" && (
            <div className="space-y-5">
              {mortgages.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
                    <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-1">{lang === "fr" ? "Solde total" : "Total balance"}</p>
                    <p className="text-[26px] font-bold text-gray-900 dark:text-white">{formatCurrency(mortBalance)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
                    <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-1">{lang === "fr" ? "Paiements/mois" : "Monthly payments"}</p>
                    <p className="text-[26px] font-bold text-gray-900 dark:text-white">{formatCurrency(mortMonthly)}</p>
                  </div>
                </div>
              )}
              {mortgages.length === 0 ? (
                <EmptyState icon="home" title={lang === "fr" ? "Aucune hypothèque" : "No mortgages yet"} description={lang === "fr" ? "Suivez vos prêts hypothécaires, taux d'intérêt et calendriers de remboursement." : "Track your mortgages, interest rates and repayment schedules."} actionLabel={`+ ${lang === "fr" ? "Ajouter" : "Add"}`} onAction={openAddMortgage} />
              ) : (
                <div className="space-y-4">
                  {mortgages.map(m => {
                    const orig    = (m as any).original_amount ?? m.original_principal ?? 0;
                    const bal     = (m as any).balance ?? m.current_balance ?? 0;
                    const paidPct = orig > 0 ? Math.round(((orig - bal) / orig) * 100) : 0;
                    const matDate = (m as any).maturity_date ?? m.end_date;
                    const mType   = (m as any).type ?? m.mortgage_type ?? "fixed";
                    const pName   = (m as any).property_name ?? propName(m.property_id ?? "");
                    return (
                      <div key={m.id ?? (m as any)._id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white text-[15px]">{m.lender || (lang === "fr" ? "Prêteur inconnu" : "Unknown lender")}</h3>
                            <p className="text-[13px] text-gray-400">{pName || "—"}</p>
                          </div>
                          <span className="text-[12px] font-medium px-2.5 py-1 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 rounded-full">{typeLabel(MORT_TYPES, mType)}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                          <div><p className="text-[11px] text-gray-400 mb-0.5">{lang === "fr" ? "Solde" : "Balance"}</p><p className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(bal)}</p></div>
                          <div><p className="text-[11px] text-gray-400 mb-0.5">{lang === "fr" ? "Paiement/mois" : "Monthly"}</p><p className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(m.monthly_payment ?? 0)}</p></div>
                          <div><p className="text-[11px] text-gray-400 mb-0.5">{lang === "fr" ? "Taux" : "Rate"}</p><p className="font-semibold text-gray-800 dark:text-gray-200">{m.interest_rate ?? 0}%</p></div>
                          <div><p className="text-[11px] text-gray-400 mb-0.5">{lang === "fr" ? "Renouvellement" : "Renewal"}</p><p className="font-semibold text-gray-800 dark:text-gray-200">{matDate ? formatDate(matDate) : "—"}</p></div>
                        </div>
                        {orig > 0 && (
                          <div className="mb-4">
                            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${paidPct}%` }} />
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1">{paidPct}% {lang === "fr" ? "remboursé" : "paid off"}</p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button onClick={() => openEditMortgage(m)} className="flex-1 py-1.5 text-[12px] font-medium text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 rounded-lg transition-colors">{lang === "fr" ? "Modifier" : "Edit"}</button>
                          <button onClick={() => setDeleteMortgage(m)} className="flex-1 py-1.5 text-[12px] font-medium text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 rounded-lg transition-colors">{lang === "fr" ? "Supprimer" : "Delete"}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── INSURANCE ─────────────────────────────────────────────────── */}
          {tab === "insurance" && (
            <div className="space-y-5">
              {policies.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5 inline-block">
                  <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mb-1">{lang === "fr" ? "Primes / an" : "Annual premiums"}</p>
                  <p className="text-[26px] font-bold text-gray-900 dark:text-white">{formatCurrency(insAnnual)}</p>
                </div>
              )}
              {policies.length === 0 ? (
                <EmptyState icon="shield" title={lang === "fr" ? "Aucune assurance" : "No insurance policies"} description={lang === "fr" ? "Centralisez vos polices d'assurance et recevez un rappel avant l'échéance." : "Centralize your insurance policies and get reminders before expiry."} actionLabel={`+ ${lang === "fr" ? "Ajouter" : "Add"}`} onAction={openAddInsurance} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {policies.map(ins => {
                    const renewDate = (ins as any).renewal_date ?? ins.end_date;
                    const days = renewDate ? daysUntil(renewDate) : null;
                    const expiringSoon = days !== null && days <= 60;
                    const pName = (ins as any).property_name ?? propName(ins.property_id ?? "");
                    const iType = (ins as any).type ?? ins.insurance_type ?? "comprehensive";
                    const coverage = (ins as any).coverage_amount ?? 0;
                    const deductible = (ins as any).deductible ?? 0;
                    return (
                      <div key={ins.id ?? (ins as any)._id} className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5 ${expiringSoon ? "border-orange-200 dark:border-orange-900" : "border-gray-100 dark:border-gray-800"}`}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white text-[15px]">{ins.insurer || (lang === "fr" ? "Assureur inconnu" : "Unknown insurer")}</h3>
                            <p className="text-[12px] text-gray-400">{pName || "—"}</p>
                          </div>
                          <span className="text-[12px] font-medium px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full">{typeLabel(INS_TYPES, iType)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-3 text-center">
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                            <p className="text-[10px] text-gray-400 mb-0.5">{lang === "fr" ? "Prime" : "Premium"}</p>
                            <p className="font-semibold text-gray-800 dark:text-gray-200 text-[13px]">{formatCurrency(ins.annual_premium ?? 0)}</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                            <p className="text-[10px] text-gray-400 mb-0.5">{lang === "fr" ? "Couverture" : "Coverage"}</p>
                            <p className="font-semibold text-gray-800 dark:text-gray-200 text-[13px]">{formatCurrency(coverage)}</p>
                          </div>
                          <div className={`rounded-xl p-3 ${expiringSoon ? "bg-orange-50 dark:bg-orange-900/20" : "bg-gray-50 dark:bg-gray-800"}`}>
                            <p className="text-[10px] text-gray-400 mb-0.5">{lang === "fr" ? "Renouvelle" : "Renews"}</p>
                            <p className={`font-semibold text-[13px] ${expiringSoon ? "text-orange-600 dark:text-orange-400" : "text-gray-800 dark:text-gray-200"}`}>
                              {renewDate ? (days !== null && days <= 60 ? `${days}${lang === "fr" ? "j" : "d"}` : formatDate(renewDate)) : "—"}
                            </p>
                          </div>
                        </div>
                        {(ins as any).policy_number && (
                          <p className="text-[11px] text-gray-400 mb-3">
                            {lang === "fr" ? "Police" : "Policy"} #{(ins as any).policy_number}
                            {deductible > 0 && ` · ${lang === "fr" ? "Franchise" : "Deductible"} ${formatCurrency(deductible)}`}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button onClick={() => openEditInsurance(ins)} className="flex-1 py-1.5 text-[12px] font-medium text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 rounded-lg transition-colors">{lang === "fr" ? "Modifier" : "Edit"}</button>
                          <button onClick={() => setDeleteIns(ins)} className="flex-1 py-1.5 text-[12px] font-medium text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 rounded-lg transition-colors">{lang === "fr" ? "Supprimer" : "Delete"}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Shared modal ──────────────────────────────────────────────────── */}
      <Modal isOpen={showModal} onClose={closeModal}
        title={`${isEditing ? (lang === "fr" ? "Modifier" : "Edit") : (lang === "fr" ? "Ajouter" : "Add")} — ${modalTitle}`}
        footer={
          <div className="flex gap-2 justify-end">
            <button onClick={closeModal} className="px-4 py-2 text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">{lang === "fr" ? "Annuler" : "Cancel"}</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-[13px] font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl transition-colors">
              {saving ? (lang === "fr" ? "Enregistrement…" : "Saving…") : (lang === "fr" ? "Enregistrer" : "Save")}
            </button>
          </div>
        }
      >
        {formError && <p className="text-[13px] text-red-500 mb-3">{formError}</p>}

        {tab === "expenses" && (
          <div className="space-y-4">
            <FormField label={lang === "fr" ? "Titre" : "Title"} required>
              <input className={inputClass} value={expForm.title} onChange={e => setExpForm(p => ({...p, title: e.target.value}))} placeholder={lang === "fr" ? "Ex: Réparation toiture" : "Ex: Roof repair"} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={lang === "fr" ? "Montant ($)" : "Amount ($)"} required>
                <input className={inputClass} type="number" min={0} value={expForm.amount} onChange={e => setExpForm(p => ({...p, amount: e.target.value}))} />
              </FormField>
              <FormField label="Date">
                <input className={inputClass} type="date" value={expForm.date} onChange={e => setExpForm(p => ({...p, date: e.target.value}))} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={lang === "fr" ? "Catégorie" : "Category"}>
                <select className={selectClass} value={expForm.category} onChange={e => setExpForm(p => ({...p, category: e.target.value}))}>
                  {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{lang === "fr" ? c.fr : c.en}</option>)}
                </select>
              </FormField>
              <FormField label={lang === "fr" ? "Propriété" : "Property"}>
                <select className={selectClass} value={expForm.property_id} onChange={e => setExpForm(p => ({...p, property_id: e.target.value}))}>
                  <option value="">—</option>
                  {properties.map(p => <option key={p.id ?? (p as any)._id} value={p.id ?? (p as any)._id}>{p.name}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label={lang === "fr" ? "Fournisseur" : "Vendor"}>
              <input className={inputClass} value={expForm.vendor} onChange={e => setExpForm(p => ({...p, vendor: e.target.value}))} />
            </FormField>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={expForm.is_tax_deductible as boolean} onChange={e => setExpForm(p => ({...p, is_tax_deductible: e.target.checked}))} className="accent-teal-600 w-4 h-4" />
              <span className="text-[13px] text-gray-700 dark:text-gray-300">{lang === "fr" ? "Déductible d'impôt" : "Tax deductible"}</span>
            </label>
            <FormField label="Notes">
              <textarea className={inputClass + " resize-none"} rows={2} value={expForm.notes} onChange={e => setExpForm(p => ({...p, notes: e.target.value}))} />
            </FormField>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {lang === "fr" ? "Numériser un reçu" : "Scan a receipt"}
              </label>
              <label className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border cursor-pointer transition-all text-[13px] font-medium ${
                scanningReceipt
                  ? "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 text-teal-600 cursor-wait"
                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-teal-400 hover:text-teal-600"
              }`}>
                <input type="file" accept="image/*,application/pdf" className="sr-only" disabled={scanningReceipt} onChange={handleScanReceipt} />
                {scanningReceipt ? (
                  <>
                    <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    {lang === "fr" ? "Analyse en cours…" : "Analysing…"}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>
                    {lang === "fr" ? "Choisir une photo ou PDF" : "Choose a photo or PDF"}
                    <span className="ml-auto text-[11px] font-semibold px-1.5 py-0.5 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 rounded">IA</span>
                  </>
                )}
              </label>
              <p className="text-[11px] text-gray-400 mt-1">
                {lang === "fr" ? "L'IA extrait automatiquement le titre, montant, date et catégorie." : "AI automatically extracts title, amount, date and category."}
              </p>
            </div>
          </div>
        )}

        {tab === "mortgage" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label={lang === "fr" ? "Propriété" : "Property"}>
                <select className={selectClass} value={properties.find(p => p.name === mortForm.property_name)?.id ?? ""} onChange={e => setMortForm(p => ({...p, property_name: properties.find(pp => (pp.id ?? (pp as any)._id) === e.target.value)?.name ?? ""}))}>
                  <option value="">—</option>
                  {properties.map(p => <option key={p.id ?? (p as any)._id} value={p.id ?? (p as any)._id}>{p.name}</option>)}
                </select>
              </FormField>
              <FormField label={lang === "fr" ? "Prêteur" : "Lender"}>
                <input className={inputClass} value={mortForm.lender} onChange={e => setMortForm(p => ({...p, lender: e.target.value}))} placeholder="Desjardins" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={lang === "fr" ? "Capital initial ($)" : "Original amount ($)"}>
                <input className={inputClass} type="number" min={0} value={mortForm.original_amount} onChange={e => setMortForm(p => ({...p, original_amount: e.target.value}))} />
              </FormField>
              <FormField label={lang === "fr" ? "Solde actuel ($)" : "Current balance ($)"}>
                <input className={inputClass} type="number" min={0} value={mortForm.balance} onChange={e => setMortForm(p => ({...p, balance: e.target.value}))} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={lang === "fr" ? "Taux (%)" : "Rate (%)"}>
                <input className={inputClass} type="number" min={0} step={0.01} value={mortForm.interest_rate} onChange={e => setMortForm(p => ({...p, interest_rate: e.target.value}))} />
              </FormField>
              <FormField label={lang === "fr" ? "Paiement mensuel ($)" : "Monthly payment ($)"}>
                <input className={inputClass} type="number" min={0} value={mortForm.monthly_payment} onChange={e => setMortForm(p => ({...p, monthly_payment: e.target.value}))} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Type">
                <select className={selectClass} value={mortForm.type} onChange={e => setMortForm(p => ({...p, type: e.target.value}))}>
                  {MORT_TYPES.map(m => <option key={m.value} value={m.value}>{lang === "fr" ? m.fr : m.en}</option>)}
                </select>
              </FormField>
              <FormField label={lang === "fr" ? "Amortissement (ans)" : "Amortization (yrs)"}>
                <input className={inputClass} type="number" min={1} max={30} value={mortForm.amortization_years} onChange={e => setMortForm(p => ({...p, amortization_years: e.target.value}))} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={lang === "fr" ? "Date de début" : "Start date"}>
                <input className={inputClass} type="date" value={mortForm.start_date} onChange={e => setMortForm(p => ({...p, start_date: e.target.value}))} />
              </FormField>
              <FormField label={lang === "fr" ? "Renouvellement" : "Maturity date"}>
                <input className={inputClass} type="date" value={mortForm.maturity_date} onChange={e => setMortForm(p => ({...p, maturity_date: e.target.value}))} />
              </FormField>
            </div>
          </div>
        )}

        {tab === "insurance" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label={lang === "fr" ? "Propriété" : "Property"}>
                <select className={selectClass} value={properties.find(p => p.name === insForm.property_name)?.id ?? ""} onChange={e => setInsForm(p => ({...p, property_name: properties.find(pp => (pp.id ?? (pp as any)._id) === e.target.value)?.name ?? ""}))}>
                  <option value="">—</option>
                  {properties.map(p => <option key={p.id ?? (p as any)._id} value={p.id ?? (p as any)._id}>{p.name}</option>)}
                </select>
              </FormField>
              <FormField label={lang === "fr" ? "Assureur" : "Insurer"}>
                <input className={inputClass} value={insForm.insurer} onChange={e => setInsForm(p => ({...p, insurer: e.target.value}))} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Type">
                <select className={selectClass} value={insForm.type} onChange={e => setInsForm(p => ({...p, type: e.target.value}))}>
                  {INS_TYPES.map(i => <option key={i.value} value={i.value}>{lang === "fr" ? i.fr : i.en}</option>)}
                </select>
              </FormField>
              <FormField label={lang === "fr" ? "N° de police" : "Policy number"}>
                <input className={inputClass} value={insForm.policy_number} onChange={e => setInsForm(p => ({...p, policy_number: e.target.value}))} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={lang === "fr" ? "Prime annuelle ($)" : "Annual premium ($)"}>
                <input className={inputClass} type="number" min={0} value={insForm.annual_premium} onChange={e => setInsForm(p => ({...p, annual_premium: e.target.value}))} />
              </FormField>
              <FormField label={lang === "fr" ? "Couverture ($)" : "Coverage ($)"}>
                <input className={inputClass} type="number" min={0} value={insForm.coverage_amount} onChange={e => setInsForm(p => ({...p, coverage_amount: e.target.value}))} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={lang === "fr" ? "Renouvellement" : "Renewal date"}>
                <input className={inputClass} type="date" value={insForm.renewal_date} onChange={e => setInsForm(p => ({...p, renewal_date: e.target.value}))} />
              </FormField>
              <FormField label={lang === "fr" ? "Franchise ($)" : "Deductible ($)"}>
                <input className={inputClass} type="number" min={0} value={insForm.deductible} onChange={e => setInsForm(p => ({...p, deductible: e.target.value}))} />
              </FormField>
            </div>
            <FormField label={lang === "fr" ? "Tél. assureur" : "Insurer phone"}>
              <input
                className={inputClass}
                type="tel"
                value={insForm.contact_phone}
                onChange={e => setInsForm(p => ({...p, contact_phone: formatPhone(e.target.value)}))}
                placeholder="1-800-123-4567"
              />
            </FormField>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={!!deleteExpense} title={lang === "fr" ? "Supprimer la dépense ?" : "Delete expense?"} message={`${deleteExpense?.title} — ${lang === "fr" ? "Cette action est irréversible." : "This cannot be undone."}`} confirmLabel={lang === "fr" ? "Supprimer" : "Delete"} onConfirm={confirmDeleteExpense} onCancel={() => setDeleteExpense(null)} loading={deleting} danger />
      <ConfirmDialog isOpen={!!deleteMortgage} title={lang === "fr" ? "Supprimer l'hypothèque ?" : "Delete mortgage?"} message={`${deleteMortgage?.lender} — ${lang === "fr" ? "Cette action est irréversible." : "This cannot be undone."}`} confirmLabel={lang === "fr" ? "Supprimer" : "Delete"} onConfirm={confirmDeleteMortgage} onCancel={() => setDeleteMortgage(null)} loading={deleting} danger />
      <ConfirmDialog isOpen={!!deleteIns} title={lang === "fr" ? "Supprimer la police ?" : "Delete policy?"} message={`${deleteIns?.insurer} — ${lang === "fr" ? "Cette action est irréversible." : "This cannot be undone."}`} confirmLabel={lang === "fr" ? "Supprimer" : "Delete"} onConfirm={confirmDeleteInsurance} onCancel={() => setDeleteIns(null)} loading={deleting} danger />
    </div>
  );
}
