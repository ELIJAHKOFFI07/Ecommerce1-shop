import Image from "next/image";
import { formatFcfa } from "@/lib/money";
import { PrintButton } from "./PrintButton";

export type ReceiptLine = { code: string; description: string; quantity: number; unitPrice: number | null; total: number | null };
export type ReceiptProps = {
  kind: "COMMANDE" | "RETRAIT";
  number: string;
  issuedAt: Date;
  status: string;
  member: { name: string; memberNumber: string; pseudo?: string | null; phone?: string | null; email?: string | null; city?: string | null };
  refs: { label: string; value: string }[];
  lines: ReceiptLine[];
  totals?: { label: string; value: number; strong?: boolean }[];
  preparedBy?: string | null;
  site: { name: string; email?: string | null; phone?: string | null };
};

/// Document imprimable à la mise en page de la facture SuperLife World :
/// en-tête société, bloc membre (Username / Full Name / Contact), numéro
/// et références, tableau (No, Code, Description, Qty, Unit Price, Total),
/// totaux, mention « document généré », signature. Une feuille A4.
///
/// Généré en HTML avec des styles d'impression : Ctrl+P → « Enregistrer
/// en PDF » sur tout navigateur, sans bibliothèque ni service externe.
export function ReceiptDocument(r: ReceiptProps) {
  const dt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(r.issuedAt);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">Utilisez « Imprimer » puis « Enregistrer en PDF » pour conserver ce document.</p>
        <PrintButton />
      </div>

      <article className="receipt rounded-lg border border-border bg-white p-8 text-[13px] leading-snug text-black print:rounded-none print:border-0 print:p-0">
        {/* En-tête société */}
        <header className="flex items-start justify-between gap-6 border-b-2 border-black pb-4">
          <div>
            <Image src="/logo-print.png" alt="SuperLife Côte d’Ivoire" width={1974} height={360} className="h-12 w-auto" />
            <p className="mt-2 font-bold">{r.site.name}</p>
            {r.site.email && <p>Email : {r.site.email}</p>}
            {r.site.phone && <p>Phone/WhatsApp : {r.site.phone}</p>}
            <p>Agency : Côte d’Ivoire Authorized Agency</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black tracking-wide">{r.kind === "COMMANDE" ? "RECEIPT" : "WITHDRAWAL NOTE"}</p>
            <p className="mt-1 text-lg font-bold">{r.number}</p>
            <p>Issued Date : {dt}</p>
            <p>
              Status : <strong>{r.status}</strong>
            </p>
          </div>
        </header>

        {/* Membre + références */}
        <section className="grid grid-cols-2 gap-6 border-b border-black py-4">
          <dl className="space-y-0.5">
            <Row k="Username" v={r.member.pseudo ?? r.member.memberNumber} />
            <Row k="Full Name" v={r.member.name} />
            <Row k="Member No" v={r.member.memberNumber} />
            <Row k="Contact No" v={r.member.phone ?? "—"} />
            <Row k="Address" v={r.member.city ?? "—"} />
          </dl>
          <dl className="space-y-0.5">
            {r.refs.map((x) => (
              <Row key={x.label} k={x.label} v={x.value} />
            ))}
          </dl>
        </section>

        {/* Lignes */}
        <table className="mt-4 w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black text-left text-xs uppercase">
              <th className="py-1 pr-2">No</th>
              <th className="py-1 pr-2">Code</th>
              <th className="py-1 pr-2">Description</th>
              <th className="py-1 pr-2 text-right">Qty</th>
              {r.totals && <th className="py-1 pr-2 text-right">Unit Price</th>}
              {r.totals && <th className="py-1 text-right">Total</th>}
            </tr>
          </thead>
          <tbody>
            {r.lines.map((l, i) => (
              <tr key={i} className="border-b border-neutral-300">
                <td className="py-1.5 pr-2">{i + 1}</td>
                <td className="py-1.5 pr-2 font-mono">{l.code}</td>
                <td className="py-1.5 pr-2">{l.description}</td>
                <td className="py-1.5 pr-2 text-right tabular">{l.quantity}</td>
                {r.totals && <td className="py-1.5 pr-2 text-right tabular">{l.unitPrice !== null ? formatFcfa(l.unitPrice) : ""}</td>}
                {r.totals && <td className="py-1.5 text-right tabular">{l.total !== null ? formatFcfa(l.total) : ""}</td>}
              </tr>
            ))}
          </tbody>
        </table>

        {r.totals && (
          <div className="mt-3 ml-auto w-64 space-y-1">
            {r.totals.map((t) => (
              <div key={t.label} className={`flex justify-between ${t.strong ? "border-t-2 border-black pt-1 text-base font-black" : ""}`}>
                <span>{t.label} :</span>
                <span className="tabular">{formatFcfa(t.value)}</span>
              </div>
            ))}
          </div>
        )}

        <footer className="mt-10 grid grid-cols-2 gap-6 border-t border-black pt-4">
          <div>
            <p className="italic">This is a computer-generated document, no signature required.</p>
            <p className="mt-1 text-xs text-neutral-600">Document généré par SuperlifeShop le {dt}.</p>
          </div>
          <div className="text-right">
            <p>Prepared By,</p>
            <p className="mt-6 font-bold">{r.preparedBy ?? "SuperlifeShop"}</p>
            <p className="text-xs">Name / Date</p>
          </div>
        </footer>
      </article>

      <style>{`@media print { body { background: #fff !important; } @page { size: A4; margin: 14mm; } }`}</style>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-neutral-600">{k}</dt>
      <dd className="font-medium">: {v}</dd>
    </div>
  );
}
