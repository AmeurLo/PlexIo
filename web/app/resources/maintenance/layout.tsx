import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guide d'entretien des logements locatifs · Domely",
  description: "Check-lists saisonnières, obligations légales du propriétaire, entretien préventif vs correctif et stratégies pour réduire vos coûts de maintenance à long terme.",
  keywords: [
    "entretien logement locatif",
    "maintenance propriétaire",
    "check-list entretien immeuble",
    "obligations propriétaire réparations",
    "rental property maintenance Canada",
  ],
  openGraph: {
    title: "Entretien des logements locatifs · Domely",
    description: "Guide pratique d'entretien et de maintenance pour propriétaires nord-américains.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
