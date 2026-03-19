import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calculer le flux de trésorerie d'un logement locatif · Domely",
  description: "Comment mesurer la rentabilité réelle de vos investissements locatifs : revenus bruts, dépenses d'exploitation, capex, impôts et indicateurs clés comme le cap rate et le cash-on-cash.",
  keywords: [
    "flux de trésorerie locatif",
    "cash flow immobilier",
    "cap rate immeuble",
    "rentabilité locative",
    "ROI immobilier Canada",
  ],
  openGraph: {
    title: "Flux de trésorerie locatif · Domely",
    description: "Comment mesurer la rentabilité réelle de votre portefeuille locatif.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
