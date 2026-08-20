import { cache, Suspense } from "react";
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
import { Skeleton } from "@/components/Skeleton";
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
/// Seules les sections alimentées par la base (Stats et Catalogue) sont
/// asynchrones, chacune sous son propre Suspense : le reste de la page (héro,
/// piliers, FAQ…) est rendu immédiatement. Recharger la page ne bloque donc
/// plus tout le rendu sur les requêtes Supabase — au pire, ces deux sections
/// affichent un squelette le temps que la base réponde. Sans backend configuré,
/// des produits d'exemple restituent la maquette.

/// Les deux sections asynchrones partagent la même requête via `cache()`
/// (mémoïsation serveur par requête) : une seule lecture de la base, deux
/// consommateurs.
const getLandingData = cache(async () => {
  if (!isBackendConfigured()) {
    return { products: [], counts: { products: 0, shops: 0 } };
  }
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
  return {
    products: (productRes.data as Product[]) ?? [],
    counts: {
      products: productCount.count ?? 0,
      shops: shopCount.count ?? 0,
    },
  };
});

async function StatsAsync() {
  const { counts } = await getLandingData();
  return <Stats products={counts.products} shops={counts.shops} />;
}

async function CatalogueAsync() {
  const { products } = await getLandingData();
  // Vitrine : on met en avant les produits réels, puis on complète la grille
  // avec les produits d'exemple de la maquette pour qu'elle reste pleine
  // même quand la base est peu fournie.
  const realProducts = products.map(toLandingProduct);
  const landingProducts =
    realProducts.length > 0
      ? [...realProducts, ...SAMPLE_PRODUCTS].slice(0, 9)
      : SAMPLE_PRODUCTS;
  return <Catalogue products={landingProducts} />;
}

/// Squelette des compteurs (Stats) pendant l'attente de la base.
function StatsSkeleton() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-hard-sm rounded-3xl bg-card p-6 text-center">
            <Skeleton className="mx-auto h-9 w-24" />
            <Skeleton className="mx-auto mt-2 h-4 w-32" />
          </div>
        ))}
      </div>
    </section>
  );
}

/// Squelette de la grille du catalogue pendant l'attente de la base.
function CatalogueSkeleton() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
      <Skeleton className="mb-3 h-4 w-40" />
      <Skeleton className="mb-8 h-10 w-72 max-w-full" />
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card-hard-sm rounded-3xl bg-card p-2">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <Skeleton className="mt-3 h-4 w-4/5" />
            <Skeleton className="mt-2 h-4 w-2/5" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">
        <Hero />
        <PaymentStrip />
        <Suspense fallback={<StatsSkeleton />}>
          <StatsAsync />
        </Suspense>
        <Pillars />
        <Negotiation />
        <Auctions />
        <Suspense fallback={<CatalogueSkeleton />}>
          <CatalogueAsync />
        </Suspense>
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