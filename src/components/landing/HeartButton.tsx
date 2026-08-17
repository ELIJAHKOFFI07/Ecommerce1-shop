"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

/// Bouton favori : le cœur se remplit en orange quand il est actif
/// (voir `.heart-btn.active svg` dans globals.css).
export function HeartButton({ className = "" }: { className?: string }) {
  const [active, setActive] = useState(false);
  return (
    <button
      type="button"
      aria-label="Ajouter aux favoris"
      aria-pressed={active}
      onClick={() => setActive((a) => !a)}
      className={`heart-btn ${active ? "active" : ""} ${className}`}
    >
      <Heart className="h-4 w-4" strokeWidth={2.2} />
    </button>
  );
}
