import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { Money } from "@/components/ui";
import { AddToCart } from "./AddToCart";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await db.product.findFirst({
    where: { slug, active: true },
    select: { id: true, slug: true, title: true, description: true, price: true, tva: true, images: true, categories: { select: { name: true, slug: true } } },
  });
  if (!p) notFound();

  return (
    <div>
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Retour à la boutique
      </Link>
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <Gallery images={p.images} title={p.title} />
        <div className="flex flex-col">
          {p.categories[0] && <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{p.categories[0].name}</p>}
          <h1 className="font-display mt-2 text-4xl font-semibold leading-tight lg:text-5xl">{p.title}</h1>
          <Money value={p.price} className="mt-5 text-4xl" />
          <p className="mt-1 text-sm text-muted-foreground">TVA {Number(p.tva)} % en sus, réglée au retrait.</p>
          {p.description && <p className="mt-6 whitespace-pre-line leading-relaxed text-foreground/85">{p.description}</p>}
          <div className="mt-8">
            <AddToCart product={{ productId: p.id, slug: p.slug, title: p.title, image: p.images[0], price: Number(p.price) }} />
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
      <div className="aspect-square overflow-hidden rounded-lg bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[0]} alt={title} className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {images.slice(1, 5).map((src, i) => (
            <div key={src} className="aspect-square overflow-hidden rounded-md bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${title} — vue ${i + 2}`} loading="lazy" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
