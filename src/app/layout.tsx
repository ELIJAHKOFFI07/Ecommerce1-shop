import type { Metadata, Viewport } from "next";
import { Cormorant, Montserrat } from "next/font/google";
import "./globals.css";

/// Polices chargées par next/font : servies depuis notre domaine, sans
/// requête vers Google au chargement (CSP plus stricte, pas de fuite d'IP).
const cormorant = Cormorant({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-cormorant", display: "swap" });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-montserrat", display: "swap" });

export const metadata: Metadata = {
  title: { default: "SuperlifeShop", template: "%s · SuperlifeShop" },
  description: "Boutique et espace membre SuperlifeShop.",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.ico", apple: "/icon-192.png" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fafaf9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${cormorant.variable} ${montserrat.variable}`} suppressHydrationWarning>
      <head>
        {/* Applique le thème mémorisé AVANT le premier rendu : pas d'éclair blanc. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("superlifeshop.theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.dataset.theme="dark"}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-dvh">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
          Aller au contenu
        </a>
        {children}
      </body>
    </html>
  );
}
