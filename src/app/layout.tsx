import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Le manifeste permet l'ajout à l'écran d'accueil : c'est la seule voie
  // vers les notifications push sur iPhone (iOS 16.4+).
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "DreamTeamShop" },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  title: "DreamTeamShop — Achetez. Vendez. Brillez.",
  description:
    "La marketplace sociale de Côte d'Ivoire : postez vos produits, négociez en direct, payez en Mobile Money.",
};

// Applique la palette et le mode sauvegardés avant l'hydratation React, pour
// éviter un flash du thème par défaut au chargement.
const themeInitScript = `
(function () {
  try {
    var preset = localStorage.getItem("dreamteamshop_theme_preset") || "gold";
    var mode = localStorage.getItem("dreamteamshop_theme_mode") || "dark";
    document.documentElement.dataset.preset = preset;
    document.documentElement.dataset.theme = mode;
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      data-theme="dark"
      data-preset="gold"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
