/// Bandeau promotionnel minimaliste : fond encre, texte crème, centré.
/// Volontairement statique (pas de marquee) : on ne garde que l'essentiel.
export function AnnouncementBar() {
  return (
    <div className="bg-foreground text-background">
      <p className="mx-auto max-w-7xl px-4 py-2.5 text-center text-sm font-medium">
        Livraison partout en Côte d&apos;Ivoire · Paiement Mobile Money &amp; à la livraison
      </p>
    </div>
  );
}
