"use client";
import { Icon, type IconName } from "@/lib/icons";

interface Props {
  icon: IconName;
  iconBg?: string;
  iconColor?: string;
  label: string;
  value: string | number;
  sub?: string;
  trend?: { value: number; positive: boolean };
  onClick?: () => void;
}

export default function StatCard({
  icon, iconBg = "bg-teal-50 dark:bg-teal-900/30",
  iconColor = "text-teal-600 dark:text-teal-400",
  label, value, sub, trend, onClick,
}: Props) {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm ${onClick ? "cursor-pointer hover:shadow-md hover:border-teal-200 dark:hover:border-teal-800 transition-all" : ""}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon name={icon} size={18} className={iconColor} />
        </div>
        {trend && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${trend.positive ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"}`}>
            {trend.positive ? "+" : ""}{trend.value}%
          </span>
        )}
      </div>
      <p className="text-[26px] font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
      <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
      {sub && <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
