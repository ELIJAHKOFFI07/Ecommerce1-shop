import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-2xl font-bold">
        Dream<span className="text-accent">Shop</span>
      </p>
      <h1 className="font-display mt-8 text-4xl font-semibold">Page introuvable</h1>
      <p className="mt-3 text-muted-foreground">Cette page n’existe pas ou n’est plus disponible.</p>
      <Link href="/" className="press mt-8 inline-flex h-12 items-center rounded-md bg-primary px-6 font-semibold text-primary-foreground hover:bg-secondary">
        Retour à la boutique
      </Link>
    </div>
  );
}
