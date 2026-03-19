import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nous contacter · Domely",
  description: "Une question, un problème ou une suggestion ? L'équipe Domely répond en moins de 24h les jours ouvrés.",
  openGraph: {
    title: "Contacter Domely",
    description: "Support, questions commerciales, retours — contactez-nous, nous répondons sous 24h.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
