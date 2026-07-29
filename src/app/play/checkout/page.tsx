"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

  if (authed === false) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium">Connexion requise</p>
        <Link
          href="/play/login"
          className="mt-4 inline-block rounded-full bg-gold px-6 py-2.5 font-semibold text-black"
        >
          Se connecter
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
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-xl font-bold">Finaliser la commande</h1>

      <section className="mb-6">
        <h2 className="mb-2 font-semibold">Adresse de livraison</h2>
        <div className="space-y-3">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nom complet"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Téléphone"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
          />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ville"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
          />
          <input
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Quartier, repère…"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
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
                method.id === m.id ? "border-gold" : "border-border"
              }`}
            >
              <span>{m.label}</span>
              <span
                className={`h-4 w-4 rounded-full border ${
                  method.id === m.id ? "border-gold bg-gold" : "border-muted"
                }`}
              />
            </button>
          ))}
        </div>

        {method.needsPhone && (
          <input
            placeholder={`Numéro ${method.label}`}
            className="mt-3 w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
          />
        )}
        {method.needsCard && (
          <div className="mt-3 space-y-3">
            <input
              placeholder="Numéro de carte"
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
            />
            <div className="flex gap-3">
              <input
                placeholder="MM/AA"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
              />
              <input
                placeholder="CVV"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
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

      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex justify-between">
          <span className="text-muted">Sous-total</span>
          <span className="font-bold">{formatFcfa(subtotal)}</span>
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <button
          disabled={placing || !fullName || !phone || !city}
          onClick={placeOrder}
          className="mt-4 w-full rounded-full bg-gold py-3 font-semibold text-black disabled:opacity-50"
        >
          {placing
            ? "Traitement…"
            : method.id === "cod"
              ? "Confirmer la commande"
              : `Payer ${formatFcfa(subtotal)}`}
        </button>
      </div>
    </div>
  );
}
