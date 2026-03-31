"use client";
import { useEffect, useState, useCallback } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/lib/ToastContext";
import { requireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Reminder } from "@/lib/types";
import PageHeader from "@/components/dashboard/PageHeader";

// ─── i18n ─────────────────────────────────────────────────────────────────────
const T = {
  title:       { fr: "Rappels",                      en: "Tasks" },
  sub:         { fr: "Gérez vos tâches et rappels",  en: "Manage your tasks and reminders" },
  today:       { fr: "Aujourd'hui",                  en: "Today" },
  planned:     { fr: "Planifiés",                    en: "Planned" },
  flagged:     { fr: "Signalés",                     en: "Flagged" },
  completed:   { fr: "Terminés",                     en: "Completed" },
  addTask:     { fr: "Nouvelle tâche",               en: "New task" },
  noToday:     { fr: "Aucune tâche pour aujourd'hui", en: "No tasks due today" },
  noPlanned:   { fr: "Aucune tâche planifiée",       en: "No planned tasks" },
  noFlagged:   { fr: "Aucun élément signalé",        en: "No flagged tasks" },
  noCompleted: { fr: "Aucune tâche terminée",        en: "No completed tasks" },
  taskTitle:   { fr: "Titre",                        en: "Title" },
  taskDate:    { fr: "Date d'échéance",              en: "Due date" },
  taskNotes:   { fr: "Notes",                        en: "Notes" },
  taskProp:    { fr: "Propriété (optionnel)",        en: "Property (optional)" },
  save:        { fr: "Enregistrer",                  en: "Save" },
  cancel:      { fr: "Annuler",                      en: "Cancel" },
  overdue:     { fr: "En retard",                    en: "Overdue" },
  dueToday:    { fr: "Aujourd'hui",                  en: "Today" },
};

type ViewTab = "today" | "planned" | "flagged" | "completed";

const cardClass = "bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0_1px_4px_rgba(0,0,0,0.04)]";

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

export default function TasksPage() {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [view, setView]       = useState<ViewTab>("today");
  const [tasks, setTasks]     = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask]   = useState<Reminder | null>(null);
  const [form, setForm] = useState({ title: "", due_date: "", description: "", property_id: "", is_flagged: false });
  const [saving, setSaving] = useState(false);
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [all, props] = await Promise.all([
        api.getReminders(true),
        api.getProperties(),
      ]);
      setTasks(all);
      setProperties(props.map(p => ({ id: p.id ?? (p as any)._id, name: p.name })));
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (!requireAuth()) return; load(); }, []);

  // Categorize tasks
  const incomplete = tasks.filter(t => !t.is_completed);
  const todayTasks = incomplete.filter(t => {
    const d = new Date(t.due_date); d.setHours(0,0,0,0);
    return d <= today;
  });
  const plannedTasks = incomplete.filter(t => {
    const d = new Date(t.due_date); d.setHours(0,0,0,0);
    return d > today;
  });
  const flaggedTasks = incomplete.filter(t => t.is_flagged);
  const completedTasks = tasks.filter(t => t.is_completed);

  const countMap: Record<ViewTab, number> = {
    today: todayTasks.length,
    planned: plannedTasks.length,
    flagged: flaggedTasks.length,
    completed: completedTasks.length,
  };

  function currentList(): Reminder[] {
    if (view === "today") return todayTasks;
    if (view === "planned") return plannedTasks;
    if (view === "flagged") return flaggedTasks;
    return completedTasks;
  }

  function openAdd() {
    setEditTask(null);
    const todayStr = new Date().toISOString().slice(0, 10);
    setForm({ title: "", due_date: todayStr, description: "", property_id: "", is_flagged: false });
    setShowModal(true);
  }
  function openEdit(task: Reminder) {
    setEditTask(task);
    setForm({ title: task.title, due_date: task.due_date, description: task.description ?? "", property_id: task.property_id ?? "", is_flagged: task.is_flagged ?? false });
    setShowModal(true);
  }

  async function save() {
    if (!form.title.trim() || !form.due_date) return;
    setSaving(true);
    try {
      const data = { title: form.title, due_date: form.due_date, description: form.description || undefined, property_id: form.property_id || undefined, is_flagged: form.is_flagged, reminder_type: "general" as const };
      if (editTask) {
        const updated = await api.updateReminder(editTask.id, data);
        setTasks(prev => prev.map(t => t.id === editTask.id ? updated : t));
      } else {
        const created = await api.createReminder(data);
        setTasks(prev => [...prev, created]);
      }
      setShowModal(false);
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  }

  async function toggleComplete(task: Reminder) {
    try {
      if (!task.is_completed) {
        await api.completeReminder(task.id);
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: true } : t));
      } else {
        const updated = await api.updateReminder(task.id, { is_completed: false });
        setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
      }
    } catch (e: any) { showToast(e.message, "error"); }
  }

  async function toggleFlag(task: Reminder) {
    try {
      const updated = await api.updateReminder(task.id, { is_flagged: !task.is_flagged });
      setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    } catch (e: any) { showToast(e.message, "error"); }
  }

  async function deleteTask(task: Reminder) {
    if (!confirm(lang === "fr" ? `Supprimer "${task.title}" ?` : `Delete "${task.title}"?`)) return;
    try {
      await api.deleteReminder(task.id);
      setTasks(prev => prev.filter(t => t.id !== task.id));
    } catch (e: any) { showToast(e.message, "error"); }
  }

  function dueBadge(task: Reminder) {
    const d = new Date(task.due_date); d.setHours(0,0,0,0);
    if (task.is_completed) return null;
    if (d < today) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">{t(T.overdue)}</span>;
    if (isSameDay(d, today)) return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">{t(T.dueToday)}</span>;
    return <span className="text-[11px] text-gray-400">{d.toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { month: "short", day: "numeric" })}</span>;
  }

  const TABS: { id: ViewTab; label: string }[] = [
    { id: "today",     label: t(T.today) },
    { id: "planned",   label: t(T.planned) },
    { id: "flagged",   label: t(T.flagged) },
    { id: "completed", label: t(T.completed) },
  ];

  const emptyMessages: Record<ViewTab, string> = {
    today: t(T.noToday),
    planned: t(T.noPlanned),
    flagged: t(T.noFlagged),
    completed: t(T.noCompleted),
  };

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader title={t(T.title)} subtitle={t(T.sub)} />
        <button onClick={openAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors flex-shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          {t(T.addTask)}
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {TABS.map(tb => (
          <button key={tb.id} onClick={() => setView(tb.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-semibold rounded-lg transition-all ${
              view === tb.id
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}>
            {tb.label}
            {countMap[tb.id] > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                view === tb.id ? "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300" : "bg-gray-200 dark:bg-gray-700 text-gray-500"
              }`}>{countMap[tb.id]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : currentList().length === 0 ? (
        <div className={`${cardClass} p-12 text-center`}>
          <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="font-semibold text-gray-700 dark:text-gray-300">{emptyMessages[view]}</p>
        </div>
      ) : (
        <div className={`${cardClass} overflow-hidden`}>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {currentList().map(task => {
              const propName = properties.find(p => p.id === task.property_id)?.name;
              return (
                <div key={task.id} className="flex items-start gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                  {/* Checkbox */}
                  <button onClick={() => toggleComplete(task)}
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      task.is_completed
                        ? "border-teal-500 bg-teal-500"
                        : "border-gray-300 dark:border-gray-600 hover:border-teal-400"
                    }`}>
                    {task.is_completed && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[14px] font-semibold leading-tight ${task.is_completed ? "line-through text-gray-400" : "text-gray-800 dark:text-gray-200"}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {dueBadge(task)}
                      {propName && <span className="text-[11px] text-gray-400">{propName}</span>}
                      {task.description && <span className="text-[11px] text-gray-400 truncate max-w-[200px]">{task.description}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Flag */}
                    <button onClick={() => toggleFlag(task)}
                      className={`p-1.5 rounded-lg transition-colors ${task.is_flagged ? "text-orange-500" : "text-gray-300 hover:text-orange-400"}`}
                      title={lang === "fr" ? "Signaler" : "Flag"}>
                      <svg className="w-4 h-4" fill={task.is_flagged ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" /></svg>
                    </button>
                    {/* Edit */}
                    <button onClick={() => openEdit(task)} className="p-1.5 rounded-lg text-gray-300 hover:text-teal-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                    </button>
                    {/* Delete */}
                    <button onClick={() => deleteTask(task)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-[15px] font-bold text-gray-900 dark:text-white">
                {editTask ? (lang === "fr" ? "Modifier la tâche" : "Edit task") : t(T.addTask)}
              </h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t(T.taskTitle)} *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder={lang === "fr" ? "Renouveler le bail de Martin…" : "Renew Martin's lease…"} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t(T.taskDate)} *</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t(T.taskProp)}</label>
                  <select value={form.property_id} onChange={e => setForm(p => ({ ...p, property_id: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="">—</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t(T.taskNotes)}</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.is_flagged} onChange={e => setForm(p => ({ ...p, is_flagged: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400 accent-orange-500" />
                <span className="text-[13px] text-gray-700 dark:text-gray-300">{lang === "fr" ? "Signaler cette tâche" : "Flag this task"}</span>
              </label>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 text-[13px] font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
                {t(T.cancel)}
              </button>
              <button onClick={save} disabled={saving || !form.title.trim() || !form.due_date}
                className="flex-1 py-2.5 text-[13px] font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-xl transition-colors">
                {saving ? "…" : t(T.save)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
