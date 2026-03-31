"use client";

import { useEffect } from "react";

// Next.js 14 error boundary for all /dashboard/* routes.
// Must be a Client Component — do NOT import from auth or API layers here.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Domely] Dashboard error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">

        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#0d9488,#14b8a6)" }}
        >
          <svg
            width="26"
            height="26"
            fill="none"
            viewBox="0 0 24 24"
            stroke="white"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        {/* Title — bilingual */}
        <h2 className="text-xl font-bold text-gray-900 mb-0.5">
          Une erreur est survenue
        </h2>
        <p className="text-sm text-gray-400 mb-5">Something went wrong</p>

        {/* Error message in code block */}
        {error?.message ? (
          <pre className="text-left text-xs bg-gray-100 text-gray-700 rounded-xl px-4 py-3 mb-6 overflow-auto whitespace-pre-wrap break-words max-h-40">
            {error.message}
          </pre>
        ) : (
          <div className="mb-6" />
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={reset}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
            style={{ background: "linear-gradient(135deg,#0d9488,#14b8a6)" }}
          >
            Réessayer · Retry
          </button>
          <a
            href="/dashboard"
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            Tableau de bord
          </a>
        </div>

        {/* Digest (server-side error ref) */}
        {error?.digest && (
          <p className="mt-5 text-[11px] text-gray-400">
            Réf.&nbsp;{error.digest}
          </p>
        )}

      </div>
    </div>
  );
}
