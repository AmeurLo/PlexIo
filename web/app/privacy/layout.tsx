import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité · Domely",
  description: "Comment Domely collecte, utilise et protège vos données personnelles. Politique conforme au RGPD et aux lois canadiennes sur la protection des renseignements personnels.",
  openGraph: {
    title: "Politique de confidentialité · Domely",
    description: "Vos données personnelles et la façon dont nous les protégeons.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
