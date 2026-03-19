import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notre mission · Domely",
  description: "Domely a été construit pour donner à chaque propriétaire nord-américain les outils d'une équipe de gestion complète — automatisation, IA et conformité provinciale réunis en une plateforme.",
  openGraph: {
    title: "Notre mission · Domely",
    description: "Découvrez pourquoi nous avons créé Domely et ce en quoi nous croyons.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
