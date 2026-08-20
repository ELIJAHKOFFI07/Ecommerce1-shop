import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Pastille d'icône : carré arrondi avec bordure, fond coloré          */
/* ------------------------------------------------------------------ */

type IconBadgeTone =
  | "orange"
  | "vert"
  | "sun"
  | "ink"
  | "orange-soft"
  | "vert-soft"
  | "paper"
  | "white";

const ICON_BADGE_TONES: Record<IconBadgeTone, string> = {
  orange: "bg-primary text-primary-foreground",
  vert: "bg-secondary text-secondary-foreground",
  sun: "bg-sun text-foreground",
  ink: "bg-foreground text-sun",
  "orange-soft": "bg-surface-2 text-accent-dark",
  "vert-soft": "bg-vert-soft text-vert-deep",
  paper: "bg-card text-foreground",
  white: "bg-white text-vert-deep",
};

const ICON_BADGE_SIZES = {
  sm: "w-9 h-9 rounded-xl",
  md: "w-11 h-11 rounded-xl",
  lg: "w-14 h-14 rounded-2xl",
} as const;

export function IconBadge({
  children,
  size = "md",
  tone = "orange",
  className = "",
}: {
  children: ReactNode;
  size?: keyof typeof ICON_BADGE_SIZES;
  tone?: IconBadgeTone;
  className?: string;
}) {
  return (
    <span
      className={`${ICON_BADGE_SIZES[size]} ${ICON_BADGE_TONES[tone]} grid place-items-center border-2 border-border shrink-0 ${className}`}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Puce / badge arrondi                                                */
/* ------------------------------------------------------------------ */

type PillTone = "paper" | "ink" | "orange" | "vert" | "sun";

const PILL_TONES: Record<PillTone, string> = {
  paper: "bg-card text-foreground",
  ink: "bg-foreground text-background",
  orange: "bg-primary text-primary-foreground",
  vert: "bg-secondary text-secondary-foreground",
  sun: "bg-sun text-foreground",
};

export function Pill({
  children,
  tone = "paper",
  size = "md",
  className = "",
}: {
  children: ReactNode;
  tone?: PillTone;
  size?: "sm" | "md";
  className?: string;
}) {
  const sizing =
    size === "sm" ? "px-3.5 py-1.5 text-sm" : "px-5 py-2.5 text-base";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border-2 border-border font-display font-bold ${PILL_TONES[tone]} ${sizing} ${className}`}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Bouton d'appel à l'action à ombre dure                              */
/* ------------------------------------------------------------------ */

type CtaVariant = "orange" | "paper" | "ink" | "vert" | "white" | "sun";

const CTA_VARIANTS: Record<CtaVariant, string> = {
  orange: "bg-primary text-primary-foreground",
  paper: "bg-card text-foreground",
  ink: "bg-foreground text-background",
  vert: "bg-secondary text-secondary-foreground",
  white: "bg-white text-foreground",
  sun: "bg-sun text-foreground",
};

const CTA_SIZES = {
  md: "px-6 py-3 text-base",
  lg: "px-7 py-4 text-lg",
} as const;

export function CtaButton({
  children,
  href = "#",
  variant = "orange",
  size = "md",
  withArrow = true,
  className = "",
}: {
  children: ReactNode;
  href?: string;
  variant?: CtaVariant;
  size?: keyof typeof CTA_SIZES;
  withArrow?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`card-hard inline-flex items-center gap-2 rounded-full font-display font-bold transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none ${CTA_VARIANTS[variant]} ${CTA_SIZES[size]} ${className}`}
    >
      {children}
      {withArrow && <ArrowRight className="h-5 w-5" strokeWidth={2.5} />}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Carte flottante (animation floaty, rotation personnalisable)        */
/* ------------------------------------------------------------------ */

export function FloatingCard({
  children,
  variant = "floaty",
  rotation = 0,
  delay,
  className = "",
}: {
  children: ReactNode;
  variant?: "floaty" | "floaty-slow";
  rotation?: number;
  delay?: number;
  className?: string;
}) {
  const style: CSSProperties = {
    "--r": `${rotation}deg`,
    animationDelay: delay !== undefined ? `${delay}s` : undefined,
  } as CSSProperties;
  return (
    <div
      className={`absolute ${variant} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
