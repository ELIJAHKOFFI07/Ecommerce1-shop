"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/backend/client";

export function AdminProductRow({
  id,
  status,
  price,
  stock,
}: {
  id: string;
  status: string;
  price: number;
  stock: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [priceInput, setPriceInput] = useState(String(price));
  const [stockInput, setStockInput] = useState(String(stock));

  async function setStatus(next: string) {
    setBusy(true);
    await createClient().from("products").update({ status: next }).eq("id", id);
    setBusy(false);
    router.refresh();
  }

  async function saveEdit() {
    setBusy(true);
    await createClient()
      .from("products")
      .update({ price: Number(priceInput), stock: Number(stockInput) })
      .eq("id", id);
    setBusy(false);
    setEditing(false);
    router.refresh();
  }

  async function removePermanently() {
    if (!window.confirm("Supprimer définitivement ce produit ? Irréversible.")) return;
    setBusy(true);
    await createClient().from("products").delete().eq("id", id);
    setBusy(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value)}
          className="w-20 rounded-md border border-border bg-background px-1.5 py-1 text-xs"
          placeholder="Prix"
        />
        <input
          type="number"
          value={stockInput}
          onChange={(e) => setStockInput(e.target.value)}
          className="w-16 rounded-md border border-border bg-background px-1.5 py-1 text-xs"
          placeholder="Stock"
        />
        <button
          disabled={busy}
          onClick={saveEdit}
          className="rounded-md border border-accent p-1 text-accent"
          aria-label="Valider"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setEditing(false)}
          className="rounded-md border border-border p-1"
          aria-label="Annuler"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-accent hover:text-accent"
      >
        <Pencil className="h-3 w-3" /> Modifier
      </button>
      {status !== "removed" && (
        <button
          disabled={busy}
          onClick={() => setStatus("removed")}
          className="rounded-md border border-border px-2 py-1 text-xs hover:border-red-500 hover:text-red-400"
        >
          Retirer
        </button>
      )}
      {status !== "active" && (
        <button
          disabled={busy}
          onClick={() => setStatus("active")}
          className="rounded-md border border-border px-2 py-1 text-xs hover:border-accent hover:text-accent"
        >
          Réactiver
        </button>
      )}
      <button
        disabled={busy}
        onClick={removePermanently}
        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-red-400 hover:border-red-500"
      >
        <Trash2 className="h-3 w-3" /> Supprimer
      </button>
    </div>
  );
}
