import Link from "next/link";
import { ShoppingBag } from "lucide-react";

const EXPLORE_LINKS = [
  { href: "#catalogue", label: "Catalogue" },
  { href: "#negocier", label: "Négocier un prix" },
  { href: "#encheres", label: "Enchères" },
  { href: "#bonus", label: "Roue de la chance" },
];

const SELLER_LINKS = [
  { href: "#vendre", label: "Ouvrir une boutique" },
  { href: "#vendre", label: "Portefeuille & retraits" },
  { href: "#faq", label: "FAQ" },
  { href: "#confiance", label: "Confiance & sécurité" },
];

const PAYMENTS = ["Orange Money", "MTN MoMo", "Moov", "Wave"];

/// Pied de page sombre, quatre colonnes.
export function Footer() {
  return (
    <footer className="border-t-2 border-border bg-ink text-cream">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight"
          >
            <span className="grid h-10 w-10 rotate-[-6deg] place-items-center rounded-xl border-2 border-cream/20 bg-orange">
              <ShoppingBag className="h-5 w-5 text-white" strokeWidth={2.4} />
            </span>
            DreamTeam<span className="text-orange">Shop</span>
          </Link>
          <p className="mt-4 max-w-sm leading-relaxed text-cream/60">
            La marketplace sociale de Côte d&apos;Ivoire. Achète, vends et
            négocie près de chez toi — en Mobile Money ou à la livraison.
          </p>
          <div className="mt-6 flex gap-2.5">
            {PAYMENTS.map((payment) => (
              <span
                key={payment}
                className="rounded-lg border border-cream/20 bg-cream/10 px-3 py-1.5 font-display text-xs font-bold"
              >
                {payment}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-4 font-display text-sm font-bold uppercase tracking-widest text-sun">
            Explorer
          </p>
          <ul className="space-y-2.5 font-medium text-cream/70">
            {EXPLORE_LINKS.map((link) => (
              <li key={link.label}>
                <a href={link.href} className="transition-colors hover:text-orange">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-4 font-display text-sm font-bold uppercase tracking-widest text-sun">
            Vendeurs
          </p>
          <ul className="space-y-2.5 font-medium text-cream/70">
            {SELLER_LINKS.map((link) => (
              <li key={link.label}>
                <a href={link.href} className="transition-colors hover:text-orange">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-cream/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-cream/50 sm:px-6">
          <p>© 2026 DreamTeamShop — Fait avec fierté à Abidjan.</p>
          <p className="font-display font-bold text-cream/60">
            Acheter · Négocier · Vendre
          </p>
        </div>
      </div>
    </footer>
  );
}