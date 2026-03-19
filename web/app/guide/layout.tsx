import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guide de gestion locative en Amérique du Nord · Domely",
  description: "Sélection de locataires, hausses de loyer TAL et LTB, entretien, baux et plus. Le guide complet pour propriétaires canadiens et américains — mis à jour 2025.",
  keywords: [
    "guide gestion locative",
    "TAL hausse loyer",
    "LTB rent increase",
    "sélection locataires",
    "bail résidentiel",
    "landlord guide Canada",
    "property management guide",
  ],
  openGraph: {
    title: "Guide de gestion locative · Domely",
    description: "Le guide complet pour propriétaires nord-américains : loyers, baux, entretien, conformité TAL/LTB.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
