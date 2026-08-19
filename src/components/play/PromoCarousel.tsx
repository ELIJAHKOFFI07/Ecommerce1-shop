"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Dices,
  Flame,
  Gavel,
  Gift,
  Pause,
  Play,
  Sparkles,
  Tag,
  UserPlus,
} from "lucide-react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

const INTERVAL = 6000;

/// Contenu des quatre slides de la bande promo, repris de la maquette
/// `dreamteamshop-play(3).html` : pastille de rubrique, titre, description,
/// bouton d'action et médaillon flottant. `background` est la couleur de la
/// rubrique (posée en fond, sous l'image), `image` l'illustration assombrie.
/// `titleAccent` est le mot du titre mis en couleur : une touche par slide
/// (orange, rose, bleu, rose), reprise sur le bouton d'action — les
/// flèches, elles, restent neutres pour ne pas rivaliser avec le contenu.
const SLIDES = [
  {
    label: "Ventes flash",
    icon: Flame,
    href: "/play/search?sort=flash",
    titleBefore: "Jusqu'à ",
    titleAccent: "−40 %",
    titleAfter: " aujourd'hui",
    text: "Sur une sélection de produits près de chez vous.",
    cta: "Voir les ventes flash",
    image: "/assets/hero/promo-flash.jpg",
    circle: Tag,
    background: "var(--primary)",
    accent: "var(--primary)",
  },
  {
    label: "Enchères",
    icon: Gavel,
    href: "/play/auctions",
    titleBefore: "",
    titleAccent: "Misez",
    titleAfter: " avant la fin du compte à rebours",
    text: "Des enchères se terminent en ce moment même.",
    cta: "Découvrir les enchères",
    image: "/assets/hero/promo-auction.jpg",
    circle: Gavel,
    background: "var(--pillar-deal)",
    accent: "var(--pillar-gift)",
  },
  {
    label: "Chaque jour",
    icon: Sparkles,
    href: "/play/spin",
    titleBefore: "Un tirage ",
    titleAccent: "gratuit",
    titleAfter: " vous attend",
    text: "Points de fidélité ou bon d'achat à gagner en un tour.",
    cta: "Tenter ma chance",
    image: "/assets/hero/promo-spin.jpg",
    circle: Dices,
    background: "var(--pillar-play)",
    accent: "var(--pillar-deal)",
  },
  {
    label: "Parrainage",
    icon: Gift,
    href: "/play/referral",
    titleBefore: "",
    titleAccent: "200 points",
    titleAfter: " offerts par ami invité",
    text: "Votre filleul reçoit aussi 100 points à son premier achat.",
    cta: "Inviter un ami",
    image: "/assets/hero/promo-referral.jpg",
    circle: UserPlus,
    background: "var(--pillar-gift)",
    accent: "var(--pillar-gift)",
  },
];

/// Bande promo pleine largeur en tête de la page d'accueil membre.
///
/// Carrousel à défilement automatique avec les garde-fous d'usage : pause au
/// survol et au focus clavier, bouton de contrôle explicite, et aucun
/// démarrage automatique si le visiteur a demandé à réduire les animations.
/// Construit sur le pattern `c-carousel-8` (primitives Embla de
/// `components/ui/carousel.tsx`), hauteur fixe de 300 px.
export function PromoCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();

  // La préférence de réduction des animations l'emporte sur le bouton, qui
  // reste disponible pour relancer manuellement le défilement.
  const playing = !reducedMotion && !paused;

  useEffect(() => {
    if (!api || !playing) return;
    const id = setInterval(() => api.scrollNext(), INTERVAL);
    return () => clearInterval(id);
  }, [api, playing]);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setIndex(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  return (
    <Carousel
      setApi={setApi}
      opts={{ loop: true }}
      aria-label="Promotions"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className="card-hard relative h-[300px] overflow-hidden rounded-[1.75rem]"
    >
      <CarouselContent>
        {SLIDES.map((slide) => (
          <CarouselItem key={slide.label} className="h-[300px]">
            <div
              className="relative h-full w-full"
              style={{ background: slide.background }}
            >
              {/* Image de fond + assombrissement : le texte reste lisible
                  quel que soit le thème. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-50"
              />
              <div className="absolute inset-0 bg-linear-to-r from-black/65 via-black/35 to-black/10" />
              <div className="wax-pattern absolute inset-0 opacity-60" />

              <div className="relative flex h-full items-center justify-between gap-6 px-6 sm:px-10">
                <div className="max-w-sm">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                    <slide.icon className="h-3.5 w-3.5" />
                    {slide.label}
                  </span>
                  <h2 className="mt-3 font-display text-2xl font-black leading-tight text-white sm:text-3xl">
                    {slide.titleBefore}
                    <span style={{ color: slide.accent }}>
                      {slide.titleAccent}
                    </span>
                    {slide.titleAfter}
                  </h2>
                  <p className="mt-2 text-sm text-white/90">{slide.text}</p>
                  <Link
                    href={slide.href}
                    className="press mt-4 inline-flex items-center gap-2 rounded-full border-2 border-border px-5 py-2.5 font-display text-sm font-bold text-white transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:brightness-90"
                    style={{ backgroundColor: slide.accent }}
                  >
                    {slide.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {/* Médaillon flottant (caché sur mobile, comme la maquette). */}
                <span className="floaty-slow hidden h-28 w-28 shrink-0 items-center justify-center rounded-full border-2 border-white/30 bg-white/15 sm:flex">
                  <slide.circle className="h-11 w-11 text-white" />
                </span>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>

      {/* Compteur de position (marque la position sans la seule couleur). */}
      <span className="absolute left-3 top-3 z-10 rounded-full bg-foreground/70 px-2 py-1 text-[11px] font-bold text-background backdrop-blur">
        {index + 1} / {SLIDES.length}
      </span>

      {/* Bouton arrêt/relance du défilement automatique. */}
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-label={
          playing ? "Arrêter le défilement" : "Relancer le défilement"
        }
        className="press absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border-2 border-border bg-background/90 shadow-hard-sm"
      >
        {playing ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </button>

      {/* Flèches (le geste tactile remplace sur téléphone). Neutres : ce sont
          les mots et les boutons d'action qui portent la couleur. */}
      <button
        type="button"
        aria-label="Slide précédente"
        onClick={() => api?.scrollPrev()}
        className="press absolute left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border-2 border-border bg-background/90 text-foreground shadow-hard-sm sm:grid"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Slide suivante"
        onClick={() => api?.scrollNext()}
        className="press absolute right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border-2 border-border bg-background/90 text-foreground shadow-hard-sm sm:grid"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Puces. */}
      <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.label}
            type="button"
            aria-label={`Aller à la slide ${i + 1} sur ${SLIDES.length}`}
            aria-current={i === index}
            onClick={() => api?.scrollTo(i)}
            className={`press h-2.5 rounded-full transition-all ${
              i === index
                ? "w-6 bg-background"
                : "w-2.5 bg-background/50 hover:bg-background/80"
            }`}
          />
        ))}
      </div>
    </Carousel>
  );
}