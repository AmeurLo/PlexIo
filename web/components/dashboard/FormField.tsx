"use client";

interface Props {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactElement;
}

export default function FormField({ label, error, required, children }: Props) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  );
}

export const inputClass =
  "w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all";

export const selectClass =
  "w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[14px] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all";
