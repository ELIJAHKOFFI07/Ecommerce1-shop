import { withApi, parseQuery, ok } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { monthRange, summary, monthly, ledger, toCsv } from "@/lib/accounting";
import { z } from "zod";

const query = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional(), format: z.enum(["json", "csv"]).default("json"), what: z.enum(["ledger", "monthly"]).default("ledger") });
const PM: Record<string, string> = { CASH_ON_DELIVERY: "Paiement à la livraison", MOBILE_MONEY: "Mobile Money" };

export const GET = withApi(async (req) => {
  await requirePermission("accounting", "view");
  const q = parseQuery(req, query);
  const period = monthRange(q.month);
  if (q.format === "csv") {
    const rows = q.what === "monthly"
      ? (await monthly(24)).map((m) => ({ Mois: m.ym, "Commandes livrées": m.count, "Ventes": m.total - m.shipping, "Livraison": m.shipping, "Total encaissé": m.total }))
      : (await ledger(period, 5000)).map((o) => ({ Date: o.createdAt.toISOString().slice(0, 10), Commande: o.orderNumber, Client: `${o.user.name} (${o.user.email})`, Statut: o.status, Paiement: PM[o.paymentMethod], "Payée": o.paymentStatus, Total: Number(o.total) }));
    const name = q.what === "monthly" ? "dreamshop-mensuel.csv" : `dreamshop-commandes-${q.month ?? "mois"}.csv`;
    return new Response(toCsv(rows), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"` } });
  }
  const [s, m, l] = await Promise.all([summary(period), monthly(12), ledger(period)]);
  return ok({ period, summary: s, monthly: m, ledger: l });
});
