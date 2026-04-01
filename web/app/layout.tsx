import Script from "next/script";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Nunito } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/LanguageContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import CookieConsent from "@/components/CookieConsent";

const inter = Inter({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
const nunito = Nunito({ variable: "--font-brand", subsets: ["latin"], weight: ["800"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://domely.ca"),
  title: "Domely — Logiciel de gestion locative",
  description: "Gérez vos logements, maximisez vos revenus et restez conformes à la réglementation. La plateforme de gestion locative pour les propriétaires d'Amérique du Nord.",
  keywords: ["gestion locative", "propriétaire", "loyers", "baux", "investissement immobilier", "TAL", "LTB", "landlord software"],
  openGraph: {
    title: "Domely — Logiciel de gestion locative",
    description: "Gérez votre parc locatif intelligemment. Loyers, baux, IA, locataires.",
    type: "website",
    locale: "fr_CA",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "Domely" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Domely — Logiciel de gestion locative",
    description: "Gérez votre parc locatif intelligemment. Loyers, baux, IA, locataires.",
    images: ["/api/og"],
  },
  icons: { icon: "/favicon.svg" },
  manifest: "/manifest.json",
  themeColor: "#0d9488",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Domely" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable} ${nunito.variable} font-sans antialiased bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-200`}>
        <ThemeProvider>
          <LanguageProvider>
            {children}
            <CookieConsent />
          </LanguageProvider>
          
        </ThemeProvider>
                <Script
                            id="meta-pixel"
                            strategy="afterInteractive"
                            dangerouslySetInnerHTML={{
                                          __html: `
                                                        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
                                                                      fbq('init', '3482648511873376');
                                                                                    fbq('track', 'PageView');
                                                                                                `,
                            }}
                          />
      </body>
    </html>
  );
}
