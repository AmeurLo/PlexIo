import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portail locataire · Domely",
  description: "Payez votre loyer en ligne, soumettez des demandes de maintenance et consultez vos documents directement depuis votre portail Domely — sur iOS, Android ou navigateur.",
  keywords: ["portail locataire", "payer loyer en ligne", "demande maintenance locataire", "tenant portal Canada"],
  openGraph: {
    title: "Portail locataire · Domely",
    description: "Votre espace locataire : loyer, maintenance, documents et messagerie avec votre propriétaire.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
