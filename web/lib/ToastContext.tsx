"use client";
import { createContext, useContext, useState, useCallback, useRef } from "react";
import { Icon } from "@/lib/icons";

// ─── Types ────────────────────────────────────────────────────────────────────
export type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

// ─── Config per type ──────────────────────────────────────────────────────────
const CONFIG: Record<ToastType, { icon: string; bar: string; text: string; bg: string }> = {
  success: { icon: "check",   bar: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", bg: "bg-white dark:bg-gray-900 border-emerald-100 dark:border-emerald-800/40" },
  error:   { icon: "warning", bar: "bg-red-500",     text: "text-red-700 dark:text-red-300",         bg: "bg-white dark:bg-gray-900 border-red-100 dark:border-red-800/40" },
  info:    { icon: "bell",    bar: "bg-teal-500",    text: "text-teal-700 dark:text-teal-300",       bg: "bg-white dark:bg-gray-900 border-teal-100 dark:border-teal-800/40" },
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++counter.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  function dismiss(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container — bottom-right */}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => {
          const cfg = CONFIG[toast.type];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg ${cfg.bg} animate-slide-toast`}
            >
              {/* Left accent bar */}
              <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${cfg.bar}`} />
              <p className={`flex-1 text-[13px] font-medium ${cfg.text}`}>{toast.message}</p>
              <button
                onClick={() => dismiss(toast.id)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mt-0.5"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        @keyframes slide-toast {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
        .animate-slide-toast { animation: slide-toast 0.2s ease-out; }
      `}</style>
    </ToastContext.Provider>
  );
}
