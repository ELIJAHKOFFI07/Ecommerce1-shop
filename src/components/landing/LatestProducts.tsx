import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/backend/server";
import { isBackendConfigured } from "@/lib/backend/client";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/play/ProductCard";
import { Section } from "@/components/ui/Section";

/// Produits sur la vitrine publique : le client veut voir de la marchandise
/// dès l'arrivée, pas des arguments de vente. Composant serveur — la lecture
/// du catalogue est publique (policy `products_read`), aucun compte requis.
export async function LatestProducts() {
  if (!isBackendConfigured()) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, product_images(url, position), shops(*)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(8);

  const products = (data as Product[]) ?? [];
  if (products.length === 0) return null;

  return (
    <Section>
      <div className="mb-8 flex items-end justify-between gap-4">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
          Derniers produits
        </h2>
        <Link
          href="/play/search"
          className="press inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Tout voir
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </Section>
  );
}
