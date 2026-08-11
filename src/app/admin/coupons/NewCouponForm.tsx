"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/backend/client";

export function NewCouponForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [type, setType] = useState("percent");
  const [value, setValue] = useState("10");
  const [minOrder, setMinOrder] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().from("coupons").insert({
      code: code.trim().toUpperCase(),
      type,
      value: Number(value),
      min_order_amount: Number(minOrder),
    });
    setBusy(false);
    if (error) setError(error.message);
    else {
      setCode("");
      router.refresh();
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4"
    >
      <input
        required
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="CODE"
        className="rounded-lg border border-border bg-background px-3 py-2 uppercase outline-none focus:border-accent"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
      >
        <option value="percent">Pourcentage</option>
        <option value="fixed">Montant fixe</option>
      </select>
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Valeur"
        className="w-24 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
      />
      <input
        type="number"
        value={minOrder}
        onChange={(e) => setMinOrder(e.target.value)}
        placeholder="Min. commande"
        className="w-32 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
      />
      <button
        disabled={busy}
        className="rounded-full bg-foreground px-5 py-2 font-semibold text-background disabled:opacity-50"
      >
        Créer
      </button>
      {error && <p className="w-full text-sm text-red-400">{error}</p>}
    </form>
  );
}
