"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { GitCompareArrows, Trash2 } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import { clearCompare, getCompareIds, toggleCompareId } from "@/lib/compare";
import { formatFcfa, type Product } from "@/lib/types";
import { HeaderSkeleton, ListSkeleton } from "@/components/Skeleton";

const CONDITION_LABELS: Record<string, string> = {
  neuf: "Neuf",
  occasion: "Occasion",
  reconditionne: "Reconditionné",
};

export default function ComparePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const ids = getCompareIds();
    if (ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    const { data } = await createClient()
      .from("products")
      .select("*, product_images(url, position), shops(*)")
      .in("id", ids);
    const rows = (data as Product[]) ?? [];
    // Conserve l'ordre d'ajout au comparateur.
    setProducts(
      ids
        .map((id) => rows.find((p) => p.id === id))
        .filter((p): p is Product => p != null),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const remove = (id: string) => {
    toggleCompareId(id);
    load();
  };

  if (loading) return <div className="space-y-6"><HeaderSkeleton /><ListSkeleton count={5} /></div>;

  if (products.length < 2) {
    return (
      <div className="py-20 text-center">
        <GitCompareArrows className="mx-auto h-10 w-10 text-accent" />
        <p className="mt-4 font-medium">Ajoutez au moins 2 produits</p>
        <p className="mt-1 text-sm text-muted">
          Utilisez le bouton « Comparer » sur une fiche produit (3 max).
        </p>
      </div>
    );
  }

  const rows: { label: string; value: (p: Product) => string }[] = [
    { label: "Prix", value: (p) => formatFcfa(p.price) },
    { label: "État", value: (p) => CONDITION_LABELS[p.condition] ?? p.condition },
    { label: "Stock", value: (p) => String(p.stock) },
    { label: "Ville", value: (p) => p.city ?? "—" },
    { label: "Boutique", value: (p) => p.shops?.name ?? "—" },
    { label: "Favoris", value: (p) => String(p.favorites_count) },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Comparer</h1>
        <button
          onClick={() => {
            clearCompare();
            load();
          }}
          className="text-sm text-muted hover:text-red-400"
        >
          Vider
        </button>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-28" />
              {products.map((p) => (
                <th key={p.id} className="p-2 text-left align-top">
                  <Link href={`/play/product/${p.id}`} className="block">
                    <div className="h-24 w-24 overflow-hidden rounded-lg bg-surface-2">
                      {p.product_images?.[0]?.url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.product_images[0].url}
                          alt={p.title}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 w-28 font-medium">
                      {p.title}
                    </p>
                  </Link>
                  <button
                    onClick={() => remove(p.id)}
                    className="mt-1 inline-flex items-center gap-1 text-xs text-muted hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" /> Retirer
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-border">
                <td className="p-2 font-bold">{row.label}</td>
                {products.map((p) => (
                  <td
                    key={p.id}
                    className={`p-2 ${row.label === "Prix" ? "font-bold text-accent" : ""}`}
                  >
                    {row.value(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
