"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import { useCart } from "@/lib/cart";
import { HeaderSkeleton, ListSkeleton } from "@/components/Skeleton";
import { formatFcfa } from "@/lib/types";

type PayMethod = {
  id: string;
  label: string;
  needsPhone?: boolean;
  needsCard?: boolean;
};

const METHODS: PayMethod[] = [
  { id: "orange_money", label: "Orange Money", needsPhone: true },
  { id: "mtn_momo", label: "MTN Mobile Money", needsPhone: true },
  { id: "moov_money", label: "Moov Money", needsPhone: true },
  { id: "wave", label: "Wave", needsPhone: true },
  { id: "card", label: "Carte bancaire", needsCard: true },
  { id: "cod", label: "Paiement à la livraison" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, subtotal, clear, hydrated } = useCart();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [details, setDetails] = useState("");
  const [method, setMethod] = useState<PayMethod>(METHODS[5]);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setAuthed(Boolean(data.user)));
  }, []);

  // authed === null : état encore inconnu. Sans ce garde, le formulaire de
  // commande complet s'affichait avant de basculer sur « Connexion requise ».
  if (authed === null || !hydrated) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <HeaderSkeleton />
        <ListSkeleton count={3} />
      </div>
    );
  }

  // Seule étape où la connexion devient obligatoire : le visiteur a pu
  // parcourir le catalogue et remplir son panier librement. Le panier vit
  // dans le navigateur, il est donc intact au retour.
  if (authed === false) {
    return (
      <div className="animate-rise mx-auto max-w-sm py-16 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/15">
          <LockKeyhole className="h-6 w-6 text-accent" />
        </span>
        <h1 className="mt-4 text-xl font-medium tracking-tight">Plus qu&apos;une étape</h1>
        <p className="mt-2 text-sm text-muted">
          Connectez-vous pour finaliser votre commande. Votre panier est
          conservé.
        </p>
        <Link
          href="/play/login?next=/play/checkout"
          className="press mt-6 inline-block w-full rounded-full bg-foreground px-6 py-3 font-semibold text-background"
        >
          Se connecter
        </Link>
        <Link
          href="/play/register"
          className="press mt-3 inline-block w-full rounded-full border border-border px-6 py-3 font-semibold transition-colors hover:border-accent hover:text-accent"
        >
          Créer un compte
        </Link>
      </div>
    );
  }

  if (lines.length === 0) {
    return <p className="py-16 text-center text-muted">Panier vide.</p>;
  }

  async function placeOrder() {
    setPlacing(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("place_order", {
      p_items: lines.map((l) => ({
        product_id: l.productId,
        variant_id: l.variantId,
        quantity: l.quantity,
      })),
      p_address: {
        full_name: fullName,
        phone,
        city,
        details,
      },
      p_zone_id: null,
      p_delivery_method: "standard",
      p_payment_method: method.id,
      p_coupon_code: null,
    });
    setPlacing(false);
    if (error) {
      setError(error.message);
      return;
    }
    clear();
    const ids = (data as string[]) ?? [];
    router.push(`/play/orders?success=${ids.length}`);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-xl font-medium tracking-tight">Finaliser la commande</h1>

      {/* Deux colonnes dès `lg` : le récapitulatif et le bouton de paiement
          restent visibles pendant la saisie, plutôt qu'en bas d'un formulaire
          qu'il faut parcourir entièrement pour valider. */}
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
      <div>
      <section className="mb-6">
        <h2 className="mb-2 font-semibold">Adresse de livraison</h2>
        <div className="space-y-3">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nom complet"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Téléphone"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
          />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ville"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
          />
          <input
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Quartier, repère…"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
          />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold">Moyen de paiement</h2>
        <div className="space-y-2">
          {METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMethod(m)}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left ${
                method.id === m.id ? "border-accent" : "border-border"
              }`}
            >
              <span>{m.label}</span>
              <span
                className={`h-4 w-4 rounded-full border ${
                  method.id === m.id ? "border-accent bg-accent" : "border-muted"
                }`}
              />
            </button>
          ))}
        </div>

        {method.needsPhone && (
          <input
            placeholder={`Numéro ${method.label}`}
            className="mt-3 w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
          />
        )}
        {method.needsCard && (
          <div className="mt-3 space-y-3">
            <input
              placeholder="Numéro de carte"
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
            />
            <div className="flex gap-3">
              <input
                placeholder="MM/AA"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
              />
              <input
                placeholder="CVV"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
              />
            </div>
          </div>
        )}
        {method.id !== "cod" && (
          <p className="mt-3 text-xs text-muted">
            ⚠️ Démo : aucun débit réel. La commande est créée en « paiement en
            attente » ; le paiement en ligne sera activé prochainement.
          </p>
        )}
      </section>
      </div>

      <aside className="rounded-xl border border-border bg-surface p-5 lg:sticky lg:top-20">
        <h2 className="mb-4 font-semibold">Récapitulatif</h2>

        {/* Rappel des articles : sur une page à deux colonnes, le panier
            n'est plus visible ailleurs. */}
        <ul className="mb-4 space-y-2 border-b border-border pb-4">
          {lines.map((line) => (
            <li
              key={`${line.productId}-${line.variantId ?? ""}`}
              className="flex justify-between gap-3 text-sm"
            >
              <span className="min-w-0 truncate text-muted">
                {line.quantity} × {line.title}
              </span>
              <span className="shrink-0">
                {formatFcfa(line.unitPrice * line.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex justify-between">
          <span className="text-muted">Sous-total</span>
          <span className="font-bold text-accent">{formatFcfa(subtotal)}</span>
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <button
          disabled={placing || !fullName || !phone || !city}
          onClick={placeOrder}
          className="press mt-4 w-full rounded-full bg-foreground py-3 font-semibold text-background disabled:opacity-50"
        >
          {placing
            ? "Traitement…"
            : method.id === "cod"
              ? "Confirmer la commande"
              : `Payer ${formatFcfa(subtotal)}`}
        </button>
      </aside>
      </div>
    </div>
  );
}
