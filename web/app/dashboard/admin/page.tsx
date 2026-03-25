"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth, getUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Icon } from "@/lib/icons";
import PageHeader from "@/components/dashboard/PageHeader";

type AdminUser = {
  id: string; email: string; full_name: string; phone: string;
  plan: string; plan_status: string; is_admin: boolean;
  created_at: string; properties: number; tenants: number;
};

type Stats = {
  total_users: number; free_users: number; pro_users: number; team_users: number;
  total_properties: number; total_tenants: number; total_leases: number;
};

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  free:  { label: "Free",  color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  pro:   { label: "Pro",   color: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  team:  { label: "Team",  color: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
};
const STATUS_COLORS: Record<string, string> = {
  active:    "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  past_due:  "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

export default function AdminPage() {
  const { lang } = useLanguage();
  const { showToast } = useToast();

  const [stats, setStats]       = useState<Stats | null>(null);
  const [users, setUsers]       = useState<AdminUser[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [changePlanFor, setChangePlanFor] = useState<AdminUser | null>(null);
  const [newPlan, setNewPlan]   = useState("free");

  useEffect(() => {
    if (!requireAuth()) return;
    const me = getUser();
    if (!me?.is_admin) {
      window.location.href = "/dashboard";
      return;
    }
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([api.adminGetStats(), api.adminListUsers()]);
      setStats(s);
      setUsers(u);
    } catch (e: any) {
      showToast(e.message ?? "Erreur", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePlan() {
    if (!changePlanFor) return;
    try {
      await api.adminUpdatePlan(changePlanFor.id, newPlan);
      showToast(lang === "fr" ? "Plan mis à jour" : "Plan updated", "success");
      setChangePlanFor(null);
      load();
    } catch (e: any) { showToast(e.message, "error"); }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await api.adminDeleteUser(confirmDelete.id);
      showToast(lang === "fr" ? "Compte supprimé" : "Account deleted", "success");
      setConfirmDelete(null);
      load();
    } catch (e: any) { showToast(e.message, "error"); }
  }

  async function handleToggleAdmin(u: AdminUser) {
    try {
      const res = await api.adminToggleAdmin(u.id);
      showToast(
        res.is_admin
          ? (lang === "fr" ? "Admin accordé" : "Admin granted")
          : (lang === "fr" ? "Admin retiré" : "Admin revoked"),
        "success"
      );
      load();
    } catch (e: any) { showToast(e.message, "error"); }
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.email.toLowerCase().includes(q) || u.full_name.toLowerCase().includes(q);
    const matchPlan = planFilter === "all" || u.plan === planFilter;
    return matchSearch && matchPlan;
  });

  if (loading) {
    return (
      <div className="p-6 flex justify-center pt-24">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <PageHeader
        title={lang === "fr" ? "Administration" : "Admin Panel"}
        subtitle={lang === "fr" ? "Gérez vos clients, plans et accès" : "Manage customers, plans and access"}
      />

      {/* ── Stats row ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: lang === "fr" ? "Utilisateurs" : "Users",      value: stats.total_users,      icon: "users",       color: "text-teal-600" },
            { label: "Pro",                                           value: stats.pro_users,        icon: "sparkles",    color: "text-teal-600" },
            { label: "Team",                                          value: stats.team_users,       icon: "users",       color: "text-purple-600" },
            { label: lang === "fr" ? "Propriétés" : "Properties",   value: stats.total_properties, icon: "home",        color: "text-blue-600" },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-gray-800 ${s.color}`}>
                <Icon name={s.icon as any} size={16} />
              </div>
              <div>
                <p className="text-[22px] font-bold text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-[11px] text-gray-400 font-medium">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={lang === "fr" ? "Rechercher un utilisateur…" : "Search user…"}
            className="w-full pl-9 pr-4 py-2.5 text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          />
        </div>
        <select
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value)}
          className="px-3 py-2.5 text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        >
          <option value="all">{lang === "fr" ? "Tous les plans" : "All plans"}</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="team">Team</option>
        </select>
      </div>

      {/* ── User table ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_80px_80px_100px] gap-4 px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30">
          {["Utilisateur / User", "Plan", "Statut", lang === "fr" ? "Biens" : "Props", lang === "fr" ? "Locataires" : "Tenants", "Actions"].map((h, i) => (
            <p key={i} className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{h}</p>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-[13px] text-gray-400 py-12">
            {lang === "fr" ? "Aucun utilisateur trouvé" : "No users found"}
          </p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {filtered.map(u => {
              const planMeta  = PLAN_LABELS[u.plan] ?? PLAN_LABELS.free;
              const statColor = STATUS_COLORS[u.plan_status] ?? STATUS_COLORS.active;
              return (
                <div key={u.id} className="grid sm:grid-cols-[2fr_1fr_1fr_80px_80px_100px] grid-cols-1 gap-4 px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors items-center">
                  {/* User info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">{u.full_name}</p>
                      {u.is_admin && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex-shrink-0">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-gray-400 truncate">{u.email}</p>
                    <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-0.5">
                      {lang === "fr" ? "Inscrit le" : "Joined"} {formatDate(u.created_at)}
                    </p>
                  </div>

                  {/* Plan badge */}
                  <div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${planMeta.color}`}>
                      {planMeta.label}
                    </span>
                  </div>

                  {/* Status badge */}
                  <div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statColor}`}>
                      {u.plan_status}
                    </span>
                  </div>

                  {/* Properties count */}
                  <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">{u.properties}</p>

                  {/* Tenants count */}
                  <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">{u.tenants}</p>

                  {/* Actions */}
                  <div className="relative">
                    <button
                      onClick={() => setActionUserId(actionUserId === u.id ? null : u.id)}
                      className="flex items-center gap-1.5 text-[12px] font-medium text-gray-500 hover:text-teal-600 transition-colors"
                    >
                      <Icon name="more-horizontal" size={16} />
                    </button>

                    {actionUserId === u.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setActionUserId(null)} />
                        <div className="absolute right-0 top-6 z-20 w-44 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden">
                          <button
                            onClick={() => { setChangePlanFor(u); setNewPlan(u.plan); setActionUserId(null); }}
                            className="w-full text-left px-4 py-2.5 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 flex items-center gap-2"
                          >
                            <Icon name="credit-card" size={13} />
                            {lang === "fr" ? "Changer le plan" : "Change plan"}
                          </button>
                          <button
                            onClick={() => { handleToggleAdmin(u); setActionUserId(null); }}
                            className="w-full text-left px-4 py-2.5 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 flex items-center gap-2"
                          >
                            <Icon name="shield" size={13} />
                            {u.is_admin
                              ? (lang === "fr" ? "Retirer admin" : "Revoke admin")
                              : (lang === "fr" ? "Rendre admin" : "Make admin")}
                          </button>
                          <div className="border-t border-gray-100 dark:border-gray-800" />
                          <button
                            onClick={() => { setConfirmDelete(u); setActionUserId(null); }}
                            className="w-full text-left px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                          >
                            <Icon name="trash" size={13} />
                            {lang === "fr" ? "Supprimer" : "Delete account"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Change plan modal ── */}
      {changePlanFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setChangePlanFor(null)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-sm p-6 space-y-4">
            <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white">
              {lang === "fr" ? "Changer le plan" : "Change plan"}
            </h3>
            <p className="text-[13px] text-gray-500">{changePlanFor.email}</p>
            <select
              value={newPlan}
              onChange={e => setNewPlan(e.target.value)}
              className="w-full px-3 py-2.5 text-[13px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            >
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="team">Team</option>
            </select>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setChangePlanFor(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-[13px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                {lang === "fr" ? "Annuler" : "Cancel"}
              </button>
              <button onClick={handleChangePlan}
                className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-[13px] font-semibold transition-colors">
                {lang === "fr" ? "Confirmer" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-sm p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto">
              <Icon name="trash" size={20} className="text-red-600" />
            </div>
            <div className="text-center">
              <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white">
                {lang === "fr" ? "Supprimer ce compte ?" : "Delete this account?"}
              </h3>
              <p className="text-[13px] text-gray-500 mt-1">{confirmDelete.email}</p>
              <p className="text-[12px] text-red-500 mt-2">
                {lang === "fr"
                  ? "Cette action est irréversible. Toutes les données seront supprimées."
                  : "This is irreversible. All data will be permanently deleted."}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-[13px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                {lang === "fr" ? "Annuler" : "Cancel"}
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold transition-colors">
                {lang === "fr" ? "Supprimer" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
