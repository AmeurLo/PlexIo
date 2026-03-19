import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hausses de loyer : guide TAL et LTB 2025 · Domely",
  description: "Comment calculer et appliquer une hausse de loyer légale au Québec (TAL) et en Ontario (LTB). Délais, formulaires, barèmes 2025 et erreurs à éviter.",
  keywords: [
    "hausse de loyer Québec",
    "augmentation loyer TAL",
    "rent increase Ontario LTB",
    "barème TAL 2025",
    "avis hausse loyer",
  ],
  openGraph: {
    title: "Hausses de loyer : guide TAL et LTB · Domely",
    description: "Calculez et appliquez vos hausses de loyer correctement au Canada.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
