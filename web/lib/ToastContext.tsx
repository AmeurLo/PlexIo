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

      {/* Toast container — top-right */}
      <div className="fixed top-5 right-5 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => {
          const cfg = CONFIG[toast.type];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl border shadow-xl ${cfg.bg} animate-slide-toast`}
            >
              {/* Colored icon dot */}
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.bar}`} />
              <p className={`flex-1 text-[13px] font-medium ${cfg.text}`}>{toast.message}</p>
              <button
                onClick={() => dismiss(toast.id)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-1"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        @keyframes slide-toast {
          from { transform: translateY(-12px) scale(0.97); opacity: 0; }
          to   { transform: translateY(0)     scale(1);    opacity: 1; }
        }
        .animate-slide-toast { animation: slide-toast 0.18s ease-out; }
      `}</style>
    </ToastContext.Provider>
  );
}
