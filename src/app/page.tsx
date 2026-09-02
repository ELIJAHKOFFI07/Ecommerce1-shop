import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Categories } from "@/components/landing/Categories";
import { LatestProducts } from "@/components/landing/LatestProducts";
import { Footer } from "@/components/landing/Footer";

/// Vitrine publique — réduite à ce qui sert à acheter : une accroche avec
/// la recherche, les catégories, les produits.
///
/// Ont été retirés à la demande du client (« trop d'informations, il veut
/// aller droit au but ») : le bandeau d'annonce, le bloc de réassurance,
/// la FAQ et l'appel final. Rien de tout cela ne montrait un produit.
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Categories />
        <LatestProducts />
      </main>
      <Footer />
    </div>
  );
}
