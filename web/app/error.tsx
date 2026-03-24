"use client";

import { useEffect } from "react";
import Link from "next/link";

// Next.js 14 global error boundary — catches unhandled client-side errors.
// Must be a Client Component and export default with (error, reset) props.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in production for debugging (replace with Sentry etc. later)
    console.error("[Domely] Unhandled error:", error);
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ margin: 0, padding: 0, background: "#f9fafb", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ textAlign: "center", maxWidth: 420 }}>

            {/* Icon */}
            <div style={{
              width: 64, height: 64, borderRadius: 16, margin: "0 auto 24px",
              background: "linear-gradient(135deg,#1E7A6E,#3FAF86)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>

            {/* Heading */}
            <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 700, color: "#111827" }}>
              Quelque chose s&apos;est mal passé
            </h1>
            <p style={{ margin: "0 0 32px", fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
              Une erreur inattendue s&apos;est produite. Veuillez réessayer ou retourner au tableau de bord.
              {error?.digest && (
                <span style={{ display: "block", marginTop: 8, fontSize: 11, color: "#9ca3af" }}>
                  Réf. : {error.digest}
                </span>
              )}
            </p>

            {/* Actions */}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={reset}
                style={{
                  padding: "12px 28px", borderRadius: 12, border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg,#1E7A6E,#3FAF86)",
                  color: "#fff", fontSize: 14, fontWeight: 600,
                }}>
                Réessayer
              </button>
              <a
                href="/dashboard"
                style={{
                  padding: "12px 28px", borderRadius: 12, textDecoration: "none",
                  border: "1.5px solid #d1d5db", color: "#374151",
                  fontSize: 14, fontWeight: 600, background: "#fff",
                }}>
                Tableau de bord
              </a>
            </div>

          </div>
        </div>
      </body>
    </html>
  );
}
