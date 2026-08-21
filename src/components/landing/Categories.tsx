import Link from "next/link";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Card } from "@/components/ui/Card";

/// Catégories dérivées des slugs réels de la table `categories` (seed SQL) :
/// les liens pointent vers la recherche pré-filtrée, cohérents avec le reste
/// du site. Images locales (aucun domaine distant à déclarer).
const CATEGORIES: { name: string; slug: string; image: string }[] = [
  { name: "Mode & Vêtements", slug: "mode", image: "/assets/product-wax.png" },
  { name: "Téléphones & Tablettes", slug: "telephones", image: "/assets/product-phone.png" },
  { name: "Électronique", slug: "electronique", image: "/assets/product-headphones.png" },
  { name: "Chaussures", slug: "chaussures", image: "/assets/product-sneakers.png" },
  { name: "Sacs & Accessoires", slug: "accessoires", image: "/assets/product-bag.png" },
  { name: "Sport & Loisirs", slug: "sport", image: "/assets/product-watch.png" },
];

export function Categories() {
  return (
    <Section>
      <SectionHeading
        title="Explorer par catégorie"
        subtitle="Trouvez vite ce que vous cherchez, du smartphone à la paire de sneakers."
      />
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
