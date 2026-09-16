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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fafaf9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${cormorant.variable} ${montserrat.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
