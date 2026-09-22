"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CatalogProduct } from "@/lib/catalog";
import { Money } from "@/components/ui";
import { QuickAdd } from "@/components/QuickAdd";
import { cx } from "@/components/ui";

/// Vedette de l'accueil (adapté de « Spatial Product Showcase », 21st.dev).
/// Le produit à la une flotte sur un disque, un anneau tourne lentement,
/// un halo or respire. Les pastilles en bas changent de produit : image en
/// rotation d'entrée, texte en fondu monté, halo qui glisse. Défilement
/// automatique toutes les 7 s, arrêté dès que l'utilisateur touche.
export function Showcase({ products, siteName }: { products: CatalogProduct[]; siteName: string }) {
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  const n = products.length;
  useEffect(() => {
    if (!auto || n < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 7000);
    return () => clearInterval(t);
  }, [auto, n]);
  const p = products[i];
  if (!p) return null;
  const promo = p.compareAtPrice && p.compareAtPrice > p.price ? Math.round(100 - (p.price / p.compareAtPrice) * 100) : 0;
  const glowX = n > 1 ? `${20 + (60 * i) / (n - 1)}%` : "30%";

  return (
    <section aria-roledescription="carrousel" aria-label="Produits à la une" className="showcase relative overflow-hidden rounded-[22px] text-[#f5f0e8]" style={{ "--glow-x": glowX } as React.CSSProperties}>
      <div className="grid items-center gap-10 px-6 py-10 sm:px-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:py-16">
        <div key={p.id} className="order-2 lg:order-1">
          <p className="enter-up text-[11px] font-bold uppercase tracking-[0.2em] text-[#e5b35d]">{siteName} · À la une</p>
          <h1 className="enter-up font-display mt-3 text-5xl font-semibold leading-[0.98] sm:text-6xl lg:text-7xl">{p.title}</h1>
          {p.description && <p className="enter-up mt-5 max-w-md text-[#f5f0e8]/70 line-clamp-3">{p.description}</p>}
          <div className="enter-up mt-8 flex flex-wrap items-end gap-x-6 gap-y-4">
            <div>
              {promo > 0 && <Money value={p.compareAtPrice!} className="block text-base text-[#f5f0e8]/45 line-through" />}
              <Money value={p.price} className="text-5xl leading-none text-[#e5b35d]" />
            </div>
            <div className="flex flex-wrap gap-3">
              <QuickAdd product={{ productId: p.id, slug: p.slug, title: p.title, image: p.images[0], price: p.price }} tone="gold" disabled={!p.inStock} />
              <Link href={`/produit/${p.slug}`} className="press inline-flex h-11 items-center gap-1.5 rounded-md border border-[#f5f0e8]/25 px-4 text-sm font-bold hover:bg-white/10">
                Voir le produit <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>

        <div className="order-1 flex justify-center lg:order-2">
          <div className="relative h-72 w-72 sm:h-96 sm:w-96 lg:h-[440px] lg:w-[440px]">
            <span aria-hidden className="ring-spin absolute inset-[-9%] rounded-full border border-dashed border-[#e5b35d]/30" />
            <span aria-hidden className="halo absolute inset-[6%] rounded-full bg-[#e5b35d] blur-3xl" />
            <div className="disc relative h-full w-full overflow-hidden rounded-full border border-white/10">
              <div className="float absolute inset-0 grid place-items-center p-10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img key={p.id} src={p.images[0]} alt="" className="enter-spin h-full w-full object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.55)]" draggable={false} />
              </div>
            </div>
            {promo > 0 && <span className="absolute -right-2 top-6 rounded-full bg-[#e5b35d] px-3 py-1.5 text-sm font-black text-[#1c1917] shadow-lg">−{promo} %</span>}
            {!p.inStock && <span className="absolute inset-x-0 -bottom-3 mx-auto w-fit rounded-full bg-stone-900/90 px-4 py-1.5 text-xs font-bold uppercase tracking-wider">Rupture</span>}
          </div>
        </div>
      </div>

      {n > 1 && (
        <div className="flex justify-center pb-6">
          <div role="tablist" aria-label="Choisir le produit vedette" className="flex items-center gap-1 rounded-full border border-white/10 bg-black/40 p-1.5 backdrop-blur">
            {products.map((x, k) => (
              <button
                key={x.id}
                type="button"
                role="tab"
                aria-selected={k === i}
                aria-label={x.title}
                onClick={() => { setI(k); setAuto(false); }}
                className={cx("press h-11 min-w-11 cursor-pointer rounded-full px-4 text-sm font-semibold transition-colors", k === i ? "bg-white/15 text-white" : "text-[#f5f0e8]/55 hover:text-white")}
              >
                <span className="hidden sm:inline">{x.title}</span>
                <span className="sm:hidden">{k + 1}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
