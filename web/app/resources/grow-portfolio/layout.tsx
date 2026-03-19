import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Faire croître son portefeuille locatif · Domely",
  description: "Stratégies, indicateurs et étapes concrètes pour passer de 1 à 5+ propriétés : refinancement, BRRRR, analyse de marché et gestion à grande échelle.",
  keywords: [
    "croissance portefeuille locatif",
    "investissement immobilier Canada",
    "BRRRR stratégie",
    "refinancement locatif",
    "scale rental portfolio",
  ],
  openGraph: {
    title: "Faire croître son portefeuille locatif · Domely",
    description: "Stratégies éprouvées pour faire évoluer votre parc immobilier locatif.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
