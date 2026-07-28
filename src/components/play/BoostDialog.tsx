"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Zap } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import { BOOST_DURATIONS, formatFcfa, type Product } from "@/lib/types";

export function BoostDialog({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<number>(72);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    const { data } = await createClient()
      .from("wallets")
      .select("balance")
      .maybeSingle();
    setBalance((data?.balance as number) ?? 0);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const duration = BOOST_DURATIONS.find((d) => d.hours === selected)!;
  const insufficient = balance < duration.cost;

  const confirm = async () => {
    setLoading(true);
    setError(null);
    const { error: rpcError } = await createClient().rpc("boost_product", {
      p_product_id: product.id,
      p_hours: selected,
    });
    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }
    setDone(true);
    setLoading(false);
    setTimeout(onClose, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-start justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Zap className="h-5 w-5 text-gold" /> Mettre en avant
          </h2>
          <button onClick={onClose} aria-label="Fermer" className="text-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-1 line-clamp-1 text-sm text-muted">{product.title}</p>

        {done ? (
          <p className="py-8 text-center font-semibold text-gold">
            Produit mis en avant ! 🚀
          </p>
        ) : (
          <>
            <div className="mt-4 rounded-lg bg-gold/10 p-3 text-sm">
              Un produit mis en avant apparaît en priorité dans la recherche et
              l&apos;accueil.
            </div>

            <div className="mt-4 space-y-2">
              {BOOST_DURATIONS.map((d) => (
                <label
                  key={d.hours}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 ${
                    selected === d.hours ? "border-gold bg-gold/5" : "border-border"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="duration"
                      checked={selected === d.hours}
                      onChange={() => setSelected(d.hours)}
                      className="accent-[#E6C15C]"
                    />
                    <span>
                      {d.label}
                      <span className="ml-2 text-xs text-muted">
                        {formatFcfa(Math.round(d.cost / d.hours))} / h
                      </span>
                    </span>
                  </span>
                  <span className="font-bold">{formatFcfa(d.cost)}</span>
                </label>
              ))}
            </div>

            <p className="mt-3 text-center text-xs text-muted">
              Solde portefeuille : {formatFcfa(balance)}
            </p>
            {error && (
              <p className="mt-2 text-center text-xs text-red-400">{error}</p>
            )}

            <button
              onClick={confirm}
              disabled={loading || insufficient}
              className="mt-4 w-full rounded-lg bg-gold py-3 font-semibold text-black disabled:opacity-40"
            >
              {insufficient
                ? "Solde insuffisant"
                : loading
                  ? "Traitement…"
                  : `Payer ${formatFcfa(duration.cost)} et booster`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
