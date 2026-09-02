"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

/// Barre de recherche du héros. Client (état + navigation) isolée dans son
/// propre fichier pour que le reste du héros — et donc la vitrine — demeure
/// un composant serveur.
export function HeroSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const q = query.trim();
        router.push(q ? `/play/search?q=${encodeURIComponent(q)}` : "/play/search");
      }}
      className="relative mt-8 max-w-xl"
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un produit…"
        aria-label="Rechercher un produit"
        className="rounded-sm w-full border border-border bg-surface py-4 pl-12 pr-4 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
      />
    </form>
  );
}
