"use client";
import { Icon, type IconName } from "@/lib/icons";

interface Props {
  icon: IconName;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  // Convenience aliases
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, description, action, actionLabel, onAction }: Props) {
  const btn = action ?? (actionLabel && onAction ? { label: actionLabel, onClick: onAction } : undefined);
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 bg-teal-50 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center mb-4">
        <Icon name={icon} size={24} className="text-teal-500 dark:text-teal-400" />
      </div>
      <p className="text-[16px] font-semibold text-gray-800 dark:text-white mb-1">{title}</p>
      {description && <p className="text-[13px] text-gray-500 dark:text-gray-400 max-w-xs mb-5">{description}</p>}
      {btn && (
        <button
          onClick={btn.onClick}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-[13px] font-semibold rounded-xl transition-colors"
        >
          {btn.label}
        </button>
      )}
    </div>
  );
}
