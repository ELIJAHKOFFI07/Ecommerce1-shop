import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Police d'affichage (titres) et de corps (texte courant) de l'accueil public.
// Exposées sous --font-bricolage / --font-inter puis mappées sur
// font-display / font-body dans globals.css.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
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
    var mode = localStorage.getItem("dreamteamshop_theme_mode") || "light";
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
      data-theme="light"
      data-preset="gold"
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col mx-auto w-full max-w-6xl">{children}</body>
    </html>
  );
}
