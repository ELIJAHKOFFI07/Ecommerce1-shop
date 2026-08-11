"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, History, Minus, Plus } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import { formatFcfa, type Product, type StockMovement } from "@/lib/types";
import { HeaderSkeleton, ListSkeleton } from "@/components/Skeleton";

const LOW_STOCK_THRESHOLD = 5;

export default function AdminStockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [historyFor, setHistoryFor] = useState<Product | null>(null);

  const load = useCallback(async () => {
    const { data } = await createClient()
      .from("products")
      .select("*, product_variants(*), shops(*)")
      .order("stock", { ascending: true })
      .limit(300);
    setProducts((data as Product[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const adjust = async (product: Product, variantId: string | null, delta: number) => {
    const reason = window.prompt(
      `Motif de l'ajustement (${delta > 0 ? "+" : ""}${delta}) pour « ${product.title}${
        variantId ? " — variante" : ""
      } » :`,
    );
    if (!reason?.trim()) return;
    const { error } = await createClient().rpc("admin_adjust_stock", {
      p_product_id: product.id,
      p_variant_id: variantId,
      p_delta: delta,
      p_reason: reason.trim(),
    });
    if (error) {
      window.alert(error.message);
      return;
    }
    load();
  };

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (query && !p.title.toLowerCase().includes(query.toLowerCase())) return false;
      if (lowOnly && p.stock > LOW_STOCK_THRESHOLD) return false;
      return true;
    });
  }, [products, query, lowOnly]);

  if (loading) return <div className="space-y-6"><HeaderSkeleton /><ListSkeleton count={5} /></div>;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Gestion du stock</h1>
      <p className="mb-6 text-sm text-muted">
        Ajustez le stock de n&apos;importe quel produit, avec motif et traçabilité
        complète (table stock_movements).
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un produit…"
          className="w-64 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={lowOnly}
            onChange={(e) => setLowOnly(e.target.checked)}
          />
          Stock faible uniquement (≤ {LOW_STOCK_THRESHOLD})
        </label>
        <span className="text-sm text-muted">{filtered.length} produit(s)</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-muted">
            <tr>
              <th className="p-3">Produit</th>
              <th className="p-3">Boutique</th>
              <th className="p-3">Prix</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Ajuster</th>
              <th className="p-3">Historique</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <Fragment key={p.id}>
                <tr className="border-t border-border">
                  <td className="max-w-xs truncate p-3">{p.title}</td>
                  <td className="p-3 text-muted">{p.shops?.name}</td>
                  <td className="p-3">{formatFcfa(p.price)}</td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        p.stock <= LOW_STOCK_THRESHOLD ? "text-red-400" : ""
                      }`}
                    >
                      {p.stock <= LOW_STOCK_THRESHOLD && (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      )}
                      {p.stock}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => adjust(p, null, -1)}
                        className="rounded-md border border-border p-1.5 hover:border-red-500 hover:text-red-400"
                        aria-label="Retirer 1"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => adjust(p, null, 1)}
                        className="rounded-md border border-border p-1.5 hover:border-accent hover:text-accent"
                        aria-label="Ajouter 1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          const raw = window.prompt("Quantité à ajouter (négatif pour retirer) :", "0");
                          const delta = Number(raw);
                          if (raw && Number.isInteger(delta) && delta !== 0) adjust(p, null, delta);
                        }}
                        className="rounded-md border border-border px-2 py-1 text-xs hover:border-accent"
                      >
                        Quantité…
                      </button>
                    </div>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => setHistoryFor(p)}
                      className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent"
                    >
                      <History className="h-3.5 w-3.5" /> Voir
                    </button>
                  </td>
                </tr>
                {p.product_variants && p.product_variants.length > 0 && (
                  <tr className="border-t border-border bg-surface/40">
                    <td colSpan={6} className="p-3">
                      <div className="space-y-1.5 pl-4">
                        {p.product_variants.map((v) => (
                          <div key={v.id} className="flex items-center gap-3 text-xs">
                            <span className="w-32 truncate text-muted">↳ {v.name}</span>
                            <span
                              className={
                                v.stock <= LOW_STOCK_THRESHOLD ? "font-semibold text-red-400" : ""
                              }
                            >
                              Stock : {v.stock}
                            </span>
                            <button
                              onClick={() => adjust(p, v.id, -1)}
                              className="rounded border border-border p-1 hover:border-red-500 hover:text-red-400"
                              aria-label="Retirer 1"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => adjust(p, v.id, 1)}
                              className="rounded border border-border p-1 hover:border-accent hover:text-accent"
                              aria-label="Ajouter 1"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {historyFor && (
        <StockHistoryDialog product={historyFor} onClose={() => setHistoryFor(null)} />
      )}
    </div>
  );
}

function StockHistoryDialog({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await createClient()
        .from("stock_movements")
        .select("*")
        .eq("product_id", product.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setMovements((data as StockMovement[]) ?? []);
      setLoading(false);
    })();
  }, [product.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Historique — {product.title}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            ✕
          </button>
        </div>
        {loading ? (
          <div className="space-y-6"><HeaderSkeleton /><ListSkeleton count={5} /></div>
        ) : movements.length === 0 ? (
          <p className="py-8 text-center text-muted">Aucun mouvement enregistré.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {movements.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <p>{m.reason}</p>
                  <p className="text-xs text-muted">
                    {new Date(m.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
                <span
                  className={`font-bold ${m.delta > 0 ? "text-green-400" : "text-red-400"}`}
                >
                  {m.delta > 0 ? "+" : ""}
                  {m.delta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
