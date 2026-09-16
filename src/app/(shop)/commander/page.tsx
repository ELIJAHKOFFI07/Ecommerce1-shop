import { pageUser } from "@/lib/pageAuth";
import { PageTitle } from "@/components/ui";
import { CheckoutForm } from "./CheckoutForm";

/// « Commander » = envoyer son reçu d'achat. Le membre a payé au bureau ou
/// ailleurs ; il déclare ici ce qu'il a acheté avec la référence du reçu.
/// L'administration valide, et les produits entrent dans son stock.
export default async function CheckoutPage() {
  await pageUser("/commander");
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Envoyer mon reçu" subtitle="Indiquez la référence de votre reçu. L’administration vérifie, puis vos produits entrent dans votre stock." />
      <CheckoutForm />
    </div>
  );
}
