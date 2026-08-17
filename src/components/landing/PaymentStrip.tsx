const METHODS: { label: string; className: string }[] = [
  { label: "Orange Money", className: "bg-[#FF7900]/15 text-[#C24E00] border-[#FF7900]/30" },
  { label: "MTN MoMo", className: "bg-[#FFCC00]/20 text-[#8a6d00] border-[#FFCC00]/40" },
  { label: "Moov Money", className: "bg-[#0057FF]/10 text-[#0042c2] border-[#0057FF]/25" },
  { label: "Wave", className: "bg-[#1DC4F2]/15 text-[#0b7ea0] border-[#1DC4F2]/30" },
  { label: "Carte bancaire", className: "bg-ink/5 text-ink/70 border-ink/15" },
  { label: "À la livraison", className: "bg-vert-soft text-vert-deep border-vert/30" },
];

/// Bandeau des moyens de paiement (couleurs de marque conservées).
export function PaymentStrip() {
  return (
    <section className="border-y-2 border-ink bg-paper py-5">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 sm:px-6">
        <p className="w-full text-center font-display text-sm font-bold uppercase tracking-widest text-ink/50 sm:w-auto">
          Tu paies comme tu veux
        </p>
        {METHODS.map((method) => (
          <span
            key={method.label}
            className={`rounded-xl border-2 px-4 py-1.5 font-display text-lg font-extrabold ${method.className}`}
          >
            {method.label}
          </span>
        ))}
      </div>
    </section>
  );
}
