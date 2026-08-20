import type { Product } from "@/lib/types";
import { createClient } from "@/lib/backend/server";
import { isBackendConfigured } from "@/lib/backend/client";
import { AnnouncementBar } from "@/components/landing/AnnouncementBar";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { PaymentStrip } from "@/components/landing/PaymentStrip";
import { Stats } from "@/components/landing/Stats";
import { Pillars } from "@/components/landing/Pillars";
import { Negotiation } from "@/components/landing/Negotiation";
import { Auctions } from "@/components/landing/Auctions";
import { Catalogue } from "@/components/landing/Catalogue";
import {
  SAMPLE_PRODUCTS,
  toLandingProduct,
} from "@/components/landing/landingProducts";
import { PhonesAndDevices } from "@/components/landing/BestSellers";
import { ModeEtAccessoires } from "@/components/landing/ModeEtAccessoires";
import { EtBienPlus } from "@/components/landing/OtherProducts";
import { Bonus } from "@/components/landing/Bonus";
import { VendorSection } from "@/components/landing/VendorSection";
import { Trust } from "@/components/landing/Trust";
import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";

/// Page d'accueil publique — reprend le style de la maquette
/// `dreamOnSteroid/index.html` : bandeau défilant, héro à l'arche orange,
/// négo interactive, enchères live, roue de la chance et vitrine produits.
///
/// Le catalogue est alimenté par la base quand le backend est configuré,
/// sinon des produits d'exemple restituent la maquette.
///
/// Le rendu est volontairement monobloc : tant que la base n'a pas répondu,
/// le loader plein écran (`loading.tsx` racine) reste affiché, puis la page
/// entière apparaît d'un bloc — pas de squelettes de sections.
export default async function Home() {
  let products: Product[] = [];
  let counts = { products: 0, shops: 0 };

  // La vitrine doit rester consultable même sans backend configuré.
  const backendConfigured = isBackendConfigured();
  if (backendConfigured) {
    const supabase = await createClient();
    const [productRes, productCount, shopCount] = await Promise.all([
      supabase
        .from("products")
        .select("*, product_images(url, position)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(9),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase.from("shops").select("id", { count: "exact", head: true }),
    ]);
    products = (productRes.data as Product[]) ?? [];
    counts = {
      products: productCount.count ?? 0,
      shops: shopCount.count ?? 0,
    };
  }

  // Vitrine : on met en avant les produits réels, puis on complète la grille
  // avec les produits d'exemple de la maquette pour qu'elle reste pleine
  // même quand la base est peu fournie.
  const realProducts = products.map(toLandingProduct);
  const landingProducts =
    realProducts.length > 0
      ? [...realProducts, ...SAMPLE_PRODUCTS].slice(0, 9)
      : SAMPLE_PRODUCTS;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">
        <Hero />
        <PaymentStrip />
        <Stats
          products={backendConfigured ? counts.products : undefined}
          shops={backendConfigured ? counts.shops : undefined}
        />
        <Pillars />
        <Negotiation />
        <Auctions />
        <Catalogue products={landingProducts} />
        <PhonesAndDevices />
        <ModeEtAccessoires />
        <EtBienPlus />
        <Bonus />
        <VendorSection />
        <Trust />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}