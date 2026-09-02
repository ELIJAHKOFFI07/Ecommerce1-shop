import Link from "next/link";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";

/// Six catégories, pas douze : au-delà, la grille devient un mur de choix
/// et l'acheteur ne choisit plus rien. Les six retenues couvrent l'essentiel
/// du catalogue ; les anciennes (maison, beauté, alimentation, enfants,
/// véhicules, immobilier) ont été fusionnées ou retirées — voir
/// supabase/migrations/011_reduce_categories.sql.
///
/// Les slugs correspondent à ceux de la table `categories` : les liens
/// pointent vers la recherche pré-filtrée. Images locales (aucun domaine
/// distant à déclarer dans next.config.ts).
const CATEGORIES: { name: string; slug: string; image: string }[] = [
  { name: "Mode", slug: "mode", image: "/assets/product-wax.png" },
  { name: "Téléphones", slug: "telephones", image: "/assets/product-phone.png" },
  { name: "Électronique", slug: "electronique", image: "/assets/product-headphones.png" },
  { name: "Chaussures", slug: "chaussures", image: "/assets/product-sneakers.png" },
  { name: "Accessoires", slug: "accessoires", image: "/assets/product-bag.png" },
  { name: "Maison", slug: "maison", image: "/assets/product-watch.png" },
];

export function Categories() {
  return (
    <Section>
      <SectionHeading title="Explorer par catégorie" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={`/play/search?category=${cat.slug}`}
            className="press block"
          >
            <Card
              variant="minimal"
              className="overflow-hidden rounded-sm transition-colors hover:bg-surface-2"
            >
              <div className="aspect-square w-full overflow-hidden bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="px-3 py-3 text-sm font-medium">{cat.name}</p>
            </Card>
          </Link>
        ))}
      </div>
    </Section>
  );
}
