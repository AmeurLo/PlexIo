"use client";
import React from "react";

interface ActionButton {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode | ActionButton[];
}

export default function PageHeader({ title, subtitle, actions }: Props) {
  const rendered = Array.isArray(actions)
    ? actions.map((a, i) => (
        <button
          key={i}
          onClick={a.onClick}
          className={`px-4 py-2 text-[13px] font-semibold rounded-xl transition-colors ${
            a.primary
              ? "bg-teal-600 hover:bg-teal-700 text-white"
              : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          {a.label}
        </button>
      ))
    : actions;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 dark:text-white">{title}</h1>
        {subtitle && <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {rendered && <div className="flex items-center gap-2 flex-shrink-0">{rendered}</div>}
    </div>
  );
}
