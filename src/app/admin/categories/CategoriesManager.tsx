"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Alert, Button, Card, Empty, Input } from "@/components/ui";
import { ActionButton } from "@/components/admin";

type Cat = { id: string; name: string; slug: string; _count: { products: number } };

export function CategoriesManager({ categories, canEdit }: { categories: Cat[]; canEdit: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/categories", { method: "POST", json: { name: name.trim() } });
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {canEdit && (
        <form onSubmit={create} className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nouvelle catégorie" aria-label="Nom de la catégorie" required maxLength={120} />
          <Button type="submit" disabled={busy} loading={busy}>
            Ajouter
          </Button>
        </form>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      {categories.length === 0 ? (
        <Empty title="Aucune catégorie" />
      ) : (
        <Card className="divide-y divide-border">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-muted-foreground">{c._count.products} produit(s)</p>
              </div>
              {canEdit && (
                <ActionButton path={`/api/admin/categories/${c.id}`} method="DELETE" variant="ghost" size="sm" confirm={`Supprimer « ${c.name} » ?`} disabled={c._count.products > 0}>
                  Supprimer
                </ActionButton>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
