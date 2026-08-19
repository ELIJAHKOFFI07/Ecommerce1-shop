"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useReducedMotion } from "@/lib/useReducedMotion";
import {
  ChevronDown,
  Menu,
  Search,
  ShoppingBag,
  ShoppingCart,
  Store,
  User,
  X,
  Zap,
} from "lucide-react";

/// Liens de catégorie de la rangée 2. Le contenu des menus déroulants est
/// provisoirement composé de cartes squelette (placeholders) : à remplacer
/// par de vraies cartes produit quand les données seront branchées.
/// `skeletonCards` pilote le nombre de cartes affichées au survol.
const CATEGORIES = [
  { label: "Bons plans", href: "/play/search", highlight: true, skeletonCards: 3 },
  { label: "Téléphones & Tablettes", href: "/play/search?category=telephones", skeletonCards: 4 },
  { label: "Mode & Vêtements", href: "/play/search?category=mode", skeletonCards: 4 },
  { label: "Électronique", href: "/play/search?category=electronique", skeletonCards: 4 },
  { label: "Beauté & Soins", href: "/play/search?category=beaute", skeletonCards: 3 },
  { label: "Maison & Déco", href: "/play/search?category=maison", skeletonCards: 4 },
  { label: "Sport & Loisirs", href: "/play/search?category=sport", skeletonCards: 4 },
  { label: "Enchères", href: "/play/auctions", skeletonCards: 3 },
];

/// Liens utilitaires (desktop), regroupés à droite de la barre.
const UTILITY_LINKS = [
  { label: "Besoin d'aide ?", href: "#" },
  { label: "Entreprise", href: "#" },
];

/// Carte squelette : placeholder d'une image produit + deux lignes de texte.
/// Volontairement isolée : on la remplace par de vraies cartes produit
/// sans toucher à la structure du header.
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-paper p-2">
      <div className="aspect-[4/3] w-full bg-ink/10" />
      <div className="mt-2 space-y-1.5">
        <div className="h-2 w-4/5 rounded-full bg-ink/15" />
        <div className="h-2 w-1/2 rounded-full bg-ink/15" />
      </div>
    </div>
  );
}

/// En-tête façon Back Market, décliné dans le thème néo-brutal de la vitrine :
/// deux rangées sur desktop (principale + catégories à menus déroulants),
/// deux rangées compactes sur mobile avec panneau latéral.
export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();

  // Le header se masque au scroll vers le bas et réapparaît au scroll vers le
  // haut, mais reste toujours visible en tête de page (scrollY < SEUIL).
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    const scrollingDown = latest > previous;
    setHidden(scrollingDown && latest > 80);
  });

  // Le panneau se rend hors du conteneur `overflow-x-auto` (sinon il serait
  // rogné). On passe donc par un état + un petit délai de fermeture qui
  // laisse le temps à la souris de traverser l'espace entre le lien et le
  // panneau sans faire clignoter le menu.
  // L'ouverture au survol est volontairement différée (`OPEN_DELAY`) pour
  // éviter d'afficher le menu quand la souris ne fait que traverser les
  // liens ; le clic et le focus clavier ouvrent immédiatement.
  const OPEN_DELAY = 300;
  const openMenu = (label: string, immediate = false) => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (immediate) {
      setActiveCat(label);
      return;
    }
    openTimer.current = setTimeout(() => setActiveCat(label), OPEN_DELAY);
  };
  const closeMenu = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveCat(null);
  };
  const toggleMenu = (label: string) => {
    if (activeCat === label) {
      closeMenu();
    } else {
      openMenu(label, true);
    }
  };
  const scheduleClose = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setActiveCat(null), 120);
  };
  useEffect(() => () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  return (
    <>
      <motion.div
        className="sticky top-0 z-40"
        animate={{ y: hidden ? "-100%" : "0%" }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
        }
      >
        <header className="border-b-2 border-border/10 bg-cream/90 backdrop-blur-md">
      {/* ---- Rangée 1 : logo, recherche, actions ---- */}
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:h-[4.5rem] sm:px-6 lg:gap-6">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Ouvrir le menu"
          aria-expanded={menuOpen}
          className="card-hard-sm grid h-11 w-11 shrink-0 place-items-center rounded-full bg-paper lg:hidden"
        >
          <Menu className="h-5 w-5" strokeWidth={2.5} />
        </button>

        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-display text-xl font-extrabold tracking-tight sm:text-2xl"
        >
          <span className="card-hard-sm grid h-9 w-9 rotate-[-6deg] place-items-center rounded-xl bg-orange sm:h-10 sm:w-10">
            <ShoppingBag className="h-5 w-5 text-white" strokeWidth={2.4} />
          </span>
          DreamTeam<span className="text-orange">Shop</span>
        </Link>

        <Link
          href="/play/search"
          className="card-hard-sm hidden flex-1 items-center gap-2 rounded-full bg-paper px-5 py-2.5 text-sm text-ink/50 transition-colors hover:bg-paper/70 lg:flex lg:max-w-xl"
        >
          <Search className="h-4 w-4 shrink-0" strokeWidth={2.5} />
          Rechercher un produit…
        </Link>

        <nav className="ml-auto hidden shrink-0 items-center gap-4 text-sm font-semibold text-ink/70 xl:flex">
          {UTILITY_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="transition-colors hover:text-orange"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/play/sell"
          className="card-hard-sm hidden items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-display text-sm font-bold text-cream transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-orange hover:text-ink hover:shadow-none sm:inline-flex"
        >
          <Store className="h-4 w-4" strokeWidth={2.5} />
          Vendre
        </Link>

        <Link
          href="/play/account"
          aria-label="Mon compte"
          className="card-hard-sm grid h-11 w-11 shrink-0 place-items-center rounded-full bg-paper transition-colors hover:bg-orange-soft"
        >
          <User className="h-5 w-5" strokeWidth={2.4} />
        </Link>

        <Link
          href="/play/cart"
          aria-label="Panier"
          className="card-hard-sm grid h-11 w-11 shrink-0 place-items-center rounded-full bg-paper transition-colors hover:bg-orange-soft"
        >
          <ShoppingCart className="h-5 w-5" strokeWidth={2.4} />
        </Link>
      </div>

      {/* ---- Rangée 1 (mobile) : Vendre + recherche compacte ---- */}
      <div className="flex items-center gap-2.5 px-4 pb-3 sm:px-6 lg:hidden">
        <Link
          href="/play/sell"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border-2 border-border bg-ink px-4 py-2.5 font-display text-sm font-bold text-cream"
        >
          <Store className="h-4 w-4" strokeWidth={2.5} />
          Vendre
        </Link>
        <Link
          href="/play/search"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-full border-2 border-border bg-paper px-4 py-2.5 text-sm text-ink/50"
        >
          <Search className="h-4 w-4 shrink-0" strokeWidth={2.5} />
          Rechercher…
        </Link>
      </div>

      {/* ---- Rangée 2 : catégories + menus déroulants (desktop) ---- */}
      <nav className="relative hidden border-t-2 border-border/10 lg:block">
        <div className="scrollbar-hide mx-auto flex max-w-7xl items-stretch gap-1 overflow-x-auto px-4 sm:px-6">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.label}
              href={cat.href}
              aria-haspopup="true"
              aria-expanded={activeCat === cat.label}
              onMouseEnter={() => openMenu(cat.label)}
              onMouseLeave={scheduleClose}
              onClick={(e) => {
                e.preventDefault();
                toggleMenu(cat.label);
              }}
              onFocus={() => openMenu(cat.label, true)}
              className={`group flex items-center gap-1.5 whitespace-nowrap px-4 py-3 font-display text-[15px] font-bold transition-colors ${
                cat.highlight
                  ? "text-orange hover:text-orange-deep"
                  : "text-ink/80 hover:text-orange"
              }`}
            >
              {cat.highlight && <Zap className="h-4 w-4" strokeWidth={2.5} />}
              {cat.label}
              <ChevronDown
                className={`h-3.5 w-3.5 opacity-50 transition-transform duration-200 ${
                  activeCat === cat.label ? "rotate-180" : ""
                } group-hover:rotate-180`}
              />
            </Link>
          ))}
        </div>

        {/* Panneau déroulant — rendu en dehors du conteneur à scroll pour ne
            pas être rogné, largeur pleine du header (contenu calé sur le
            même conteneur que le reste), transition d'apparition/disparition
            via AnimatePresence (la catégorie change → le panneau rejoue
            l'animation grâce à `key`). */}
        <AnimatePresence>
          {activeCat && (
            <motion.div
              key={activeCat}
              initial={reduceMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onMouseEnter={() => openMenu(activeCat, true)}
              onMouseLeave={scheduleClose}
              className="absolute inset-x-0 top-full z-50"
            >
              <div className="mx-auto max-w-7xl px-4 sm:px-6">
                <div className="border-x-2 border-b-2 border-border bg-paper p-5 shadow-hard">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-display text-sm font-extrabold uppercase tracking-widest text-ink/50">
                      {activeCat}
                    </p>
                    <Link
                      href={
                        CATEGORIES.find((c) => c.label === activeCat)?.href ??
                        "/play/search"
                      }
                      onClick={closeMenu}
                      className="font-display text-sm font-bold text-orange transition-colors hover:text-orange-deep"
                    >
                      Voir tout →
                    </Link>
                  </div>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                    {Array.from({
                      length: CATEGORIES.find((c) => c.label === activeCat)
                        ?.skeletonCards ?? 3,
                    }).map((_, i) => (
                      <SkeletonCard key={i} />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </nav>
        </header>
      </motion.div>

      {/* ---- Panneau latéral mobile ---- */}
      {/* Rendu en dehors du conteneur transformé (sticky + translate) : une
          transformation sur un ancêtre créerait un containing block qui
          casserait le positionnement `fixed` du panneau. */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col border-r-2 border-border bg-cream shadow-hard">
            <div className="flex items-center justify-between border-b-2 border-border/10 px-5 py-4">
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight"
              >
                <span className="card-hard-sm grid h-9 w-9 rotate-[-6deg] place-items-center rounded-xl bg-orange">
                  <ShoppingBag className="h-5 w-5 text-white" strokeWidth={2.4} />
                </span>
                DreamTeam<span className="text-orange">Shop</span>
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Fermer le menu"
                className="card-hard-sm grid h-10 w-10 place-items-center rounded-full bg-paper"
              >
                <X className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="mb-2 font-display text-xs font-extrabold uppercase tracking-widest text-ink/50">
                Catégories
              </p>
              <ul className="flex flex-col">
                {CATEGORIES.map((cat) => (
                  <li key={cat.label}>
                    <Link
                      href={cat.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 border-b border-border/10 py-3 font-display text-lg font-bold transition-colors hover:text-orange"
                    >
                      {cat.highlight && (
                        <Zap className="h-4 w-4 text-orange" strokeWidth={2.5} />
                      )}
                      {cat.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <p className="mb-2 mt-6 font-display text-xs font-extrabold uppercase tracking-widest text-ink/50">
                Aide
              </p>
              <ul className="flex flex-col">
                {UTILITY_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="border-b border-border/10 py-3 text-sm font-semibold text-ink/70 transition-colors hover:text-orange"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t-2 border-border/10 p-4">
              <Link
                href="/play/sell"
                onClick={() => setMenuOpen(false)}
                className="card-hard-sm flex w-full items-center justify-center gap-2 rounded-full bg-orange px-5 py-3 font-display font-bold text-white"
              >
                <Store className="h-5 w-5" strokeWidth={2.5} />
                Vendre
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}