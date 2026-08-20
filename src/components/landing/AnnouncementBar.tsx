/// Bandeau défilant en haut de page : les items sont dupliqués pour créer la
/// boucle infinie (`@keyframes marquee` anime translateX jusqu'à -50%).
const ITEMS: { label: string; tone: "sun" | "orange" | "vert" }[] = [
  { label: "Paiement Mobile Money", tone: "sun" },
  { label: "Négocie directement avec le vendeur", tone: "orange" },
  { label: "Catalogue ouvert sans compte", tone: "vert" },
  { label: "Livraison partout en Côte d'Ivoire", tone: "sun" },
  { label: "Paiement à la livraison possible", tone: "orange" },
  { label: "Enchères & ventes flash chaque jour", tone: "vert" },
];

const TONE_CLASS = { sun: "text-sun", orange: "text-primary", vert: "text-secondary" };

function Row({ ariaHidden }: { ariaHidden?: boolean }) {
  return (
    <div className="flex items-center gap-8 pr-8" aria-hidden={ariaHidden}>
      {ITEMS.map((item) => (
        <span key={item.label} className="flex items-center gap-8">
          <span>{item.label}</span>
          <span className={TONE_CLASS[item.tone]}>✦</span>
        </span>
      ))}
    </div>
  );
}

export function AnnouncementBar() {
  return (
    <div className="relative z-50 overflow-hidden bg-foreground py-2.5 text-background">
      <div className="marquee-track font-display text-sm font-semibold tracking-wide uppercase">
        <Row />
        <Row ariaHidden />
      </div>
    </div>
  );
}
