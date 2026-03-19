import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ressources pour propriétaires · Domely",
  description: "Guides pratiques, articles et conseils pour gérer vos logements : flux de trésorerie, sélection de locataires, hausses de loyer, entretien et croissance de portefeuille.",
  openGraph: {
    title: "Ressources pour propriétaires · Domely",
    description: "Guides et articles pour propriétaires nord-américains.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
