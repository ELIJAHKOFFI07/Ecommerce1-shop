import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/catalog";
import { Money } from "@/components/ui";
import { AddToCart } from "./AddToCart";

/// Fiche produit — servie depuis le cache catalogue (pas d'appel base).
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) notFound();

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
      <Gallery images={p.images} title={p.title} />
      <div className="flex flex-col">
        {p.categories[0] && <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{p.categories[0].name}</p>}
        <h1 className="font-display mt-2 text-4xl font-semibold leading-tight lg:text-5xl">{p.title}</h1>
        {p.description && <p className="mt-5 whitespace-pre-line leading-relaxed text-foreground/85">{p.description}</p>}
        <div className="socle relative mt-8 rounded-[14px] p-6 text-[#f5f0e8]">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#f5f0e8]/60">Prix</p>
          <Money value={p.price} className="mt-1 block text-5xl leading-none text-[#e5b35d]" />
          <p className="mt-2 text-sm text-[#f5f0e8]/70">TVA {p.tva} % en sus, réglée au retrait.</p>
          <div className="mt-6">
            <AddToCart product={{ productId: p.id, slug: p.slug, title: p.title, image: p.images[0], price: p.price, tva: p.tva }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Gallery({ images, title }: { images: string[]; title: string }) {
  if (images.length === 0) {
    return <div className="grid aspect-square place-items-center rounded-lg bg-muted text-muted-foreground">Pas d&apos;image</div>;
  }
  return (
    <div className="space-y-3">
      <div className="scene group relative overflow-hidden rounded-[14px] p-10 sm:p-14">
        <div className="relative aspect-square">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[0]} alt={title} className="product-img relative z-10 h-full w-full object-contain" />
          <span aria-hidden className="floor-shadow" />
        </div>
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {images.slice(1, 5).map((src, i) => (
            <div key={src} className="scene relative aspect-square overflow-hidden rounded-md p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${title} — vue ${i + 2}`} loading="lazy" className="relative z-10 h-full w-full object-contain" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
