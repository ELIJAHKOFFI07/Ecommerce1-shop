import Link from "next/link";
import { Sparkles } from "lucide-react";

/// Pied de page en colonnes, repris de Turbodeal : le bloc de marque puis
/// des rubriques courtes, et une ligne de copyright séparée par un filet.
export function LandingFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface/40 py-12">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="press inline-flex items-center gap-2 text-lg font-bold text-accent"
            >
              <Sparkles className="h-5 w-5" />
              DreamTeamShop
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted">
              La marketplace sociale de Côte d&apos;Ivoire : achetez,
              négociez, vendez.
            </p>
          </div>

          <FooterColumn
            title="Navigation"
            links={[
              { href: "/play", label: "Boutique" },
              { href: "/play/search", label: "Rechercher" },
              { href: "/play/auctions", label: "Enchères" },
            ]}
          />

          <FooterColumn
            title="Vendre"
            links={[
              { href: "/play/register", label: "Créer un compte" },
              { href: "/play/sell", label: "Ma boutique" },
            ]}
          />

          <FooterColumn
            title="Compte"
            links={[
              { href: "/play/login", label: "Se connecter" },
              { href: "/play/orders", label: "Mes commandes" },
              { href: "/play/wallet", label: "Portefeuille" },
            ]}
          />
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted">
          © {new Date().getFullYear()} DreamTeamShop. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold">{title}</h4>
      <ul className="space-y-2 text-sm text-muted">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="underline-grow transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
