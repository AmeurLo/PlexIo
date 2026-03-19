import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions d'utilisation · Domely",
  description: "Les conditions régissant l'utilisation de la plateforme Domely — droits, obligations, limitations de responsabilité et avis important concernant le conseiller IA.",
  openGraph: {
    title: "Conditions d'utilisation · Domely",
    description: "Conditions d'utilisation de la plateforme Domely.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
