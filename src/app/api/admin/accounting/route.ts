import { withApi, parseQuery, ok } from "@/lib/apiError";
import { requirePermission } from "@/lib/requireAuth";
import { monthRange, summary, monthly, ledger, toCsv } from "@/lib/accounting";
import { z } from "zod";

const query = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  format: z.enum(["json", "csv"]).default("json"),
  what: z.enum(["ledger", "monthly"]).default("ledger"),
});

/// Comptabilité (lecture : permission wallet:view). `format=csv` renvoie un
/// fichier Excel-compatible (séparateur ; et BOM UTF-8).
export const GET = withApi(async (req) => {
  await requirePermission("wallet", "view");
  const q = parseQuery(req, query);
  const period = monthRange(q.month);
  if (q.format === "csv") {
    const rows =
      q.what === "monthly"
        ? (await monthly(24)).map((m) => ({ Mois: m.ym, "Commandes validées": m.count, "Ventes HT": m.total - m.tax, TVA: m.tax, "Total TTC": m.total, "TVA encaissée": m.taxCollected }))
        : (await ledger(period, 5000)).map((t) => ({
            Date: t.createdAt.toISOString().slice(0, 19).replace("T", " "),
            Type: t.type,
            Montant: Number(t.amount),
            Membre: t.user ? `${t.user.name} (${t.user.memberNumber})` : "Caisse",
            Description: t.description ?? "",
            Référence: t.referenceId ?? "",
            Moyen: t.paymentMethod ?? "",
            Par: t.admin?.name ?? "",
          }));
    const name = q.what === "monthly" ? "superlifeshop-mensuel.csv" : `superlifeshop-mouvements-${q.month ?? "mois"}.csv`;
    return new Response(toCsv(rows), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"` } });
  }
  const [s, m, l] = await Promise.all([summary(period), monthly(12), ledger(period)]);
  return ok({ period, summary: s, monthly: m, ledger: l });
});
