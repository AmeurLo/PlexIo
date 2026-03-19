import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sélection de locataires : bonnes pratiques · Domely",
  description: "Comment évaluer les candidats locataires, vérifier les références et les dossiers de crédit, et choisir le bon locataire — en toute conformité avec les lois canadiennes.",
  keywords: [
    "sélection locataires",
    "vérification dossier locataire",
    "tenant screening Canada",
    "crédit locataire",
    "références locataires",
  ],
  openGraph: {
    title: "Sélection de locataires · Domely",
    description: "Guide complet pour choisir les bons locataires en toute conformité.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
