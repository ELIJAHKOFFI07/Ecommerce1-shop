import { ORDER_STATUS_LABELS, type Order } from "./types";

export type Slice = { label: string; value: number };

/// Regroupe les commandes par statut en conservant l'ordre du cycle de vie
/// plutôt qu'un tri par volume : la couleur suit le statut, jamais son rang.
/// Un statut qui devient majoritaire ne doit pas repeindre les autres.
///
/// Module volontairement sans "use client" : il est appelé depuis un
/// composant serveur, ce qu'un module client interdit.
export function statusDistribution(orders: Pick<Order, "status">[]): Slice[] {
  const lifecycle: Order["status"][] = [
    "pending",
    "confirmed",
    "preparing",
    "shipped",
    "delivered",
    "cancelled",
  ];

  const counts = new Map<string, number>();
  let others = 0;
  for (const o of orders) {
    if (lifecycle.includes(o.status)) {
      counts.set(o.status, (counts.get(o.status) ?? 0) + 1);
    } else {
      // « refunded » et tout statut ajouté plus tard : regroupés pour rester
      // sous six segments, au-delà desquels un anneau devient illisible.
      others += 1;
    }
  }

  const slices = lifecycle
    .filter((s) => (counts.get(s) ?? 0) > 0)
    .map((s) => ({ label: ORDER_STATUS_LABELS[s], value: counts.get(s)! }));

  if (others > 0) slices.push({ label: "Autres", value: others });
  return slices;
}
