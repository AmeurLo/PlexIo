"use client";

const STATUS_MAP: Record<string, string> = {
  paid:        "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  late:        "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  pending:     "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  open:        "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  assigned:    "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  in_progress: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  completed:   "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled:   "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  active:      "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  expired:     "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  reviewing:   "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  approved:    "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  rejected:    "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  urgent:               "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high:                 "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  medium:               "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  low:                  "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  partial:              "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  pending_confirmation: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const LABEL_MAP: Record<string, { fr: string; en: string }> = {
  paid:        { fr: "Payé",        en: "Paid" },
  late:        { fr: "En retard",   en: "Late" },
  pending:     { fr: "En attente",  en: "Pending" },
  open:        { fr: "Ouvert",      en: "Open" },
  assigned:    { fr: "Assigné",     en: "Assigned" },
  in_progress: { fr: "En cours",    en: "In Progress" },
  completed:   { fr: "Complété",    en: "Completed" },
  cancelled:   { fr: "Annulé",      en: "Cancelled" },
  active:      { fr: "Actif",       en: "Active" },
  expired:     { fr: "Expiré",      en: "Expired" },
  reviewing:   { fr: "En révision", en: "Reviewing" },
  approved:    { fr: "Approuvé",    en: "Approved" },
  rejected:    { fr: "Refusé",      en: "Rejected" },
  urgent:               { fr: "Urgent",      en: "Urgent" },
  high:                 { fr: "Élevé",       en: "High" },
  medium:               { fr: "Moyen",       en: "Medium" },
  low:                  { fr: "Bas",         en: "Low" },
  partial:              { fr: "Partiel",     en: "Partial" },
  pending_confirmation: { fr: "À confirmer", en: "To confirm" },
};

interface Props {
  status: string;
  lang?: "fr" | "en";
  label?: string;
  className?: string;
}

export default function StatusBadge({ status, lang = "fr", label, className = "" }: Props) {
  const colorClass = STATUS_MAP[status] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  const text = label ?? (LABEL_MAP[status]?.[lang] ?? status);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${colorClass} ${className}`}>
      {text}
    </span>
  );
}
