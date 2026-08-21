import { AnnouncementBar } from "@/components/landing/AnnouncementBar";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Categories } from "@/components/landing/Categories";
import { Trust } from "@/components/landing/Trust";
import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";

/// Page d'accueil publique — refonte minimaliste. Vitrine sobre, essentiel
/// uniquement : accroche, catégories, confiance, FAQ, appel final. Plus de
/// démo interactive ni de néo-brutalisme. Composant serveur : ces sections ne
/// nécessitent aucune donnée dynamique.
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Categories />
        <Trust />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
