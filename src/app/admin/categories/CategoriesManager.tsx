"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { api, uploadFile } from "@/lib/api";
import { Alert, Button, Card, Empty, Field, Input } from "@/components/ui";
import { ActionButton } from "@/components/admin";

type Cat = { id: string; name: string; slug: string; image: string | null; position: number; _count: { products: number } };

/// Catégories : nom, image (facultative, affichée en rayon sur l'accueil),
/// ordre d'affichage. Suppression seulement si vide.
export function CategoriesManager({ categories, canEdit }: { categories: Cat[]; canEdit: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", image: "", position: "0" });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function wrap(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      setF((s) => ({ ...s, image: "" }));
      const { url } = await uploadFile(file, "category");
      setF((s) => ({ ...s, image: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {canEdit && (
        <form onSubmit={async (e) => { e.preventDefault(); if (await wrap(() => api("/api/admin/categories", { method: "POST", json: { name: name.trim() } }))) setName(""); }} className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nouvelle catégorie" aria-label="Nom de la catégorie" required maxLength={120} />
          <Button type="submit" disabled={busy} loading={busy}>Ajouter</Button>
        </form>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      {categories.length === 0 ? (
        <Empty title="Aucune catégorie" />
      ) : (
        <Card className="divide-y divide-border">
          {categories.map((c) =>
            editing === c.id ? (
              <form key={c.id} onSubmit={async (e) => { e.preventDefault(); if (await wrap(() => api(`/api/admin/categories/${c.id}`, { method: "PATCH", json: { name: f.name.trim(), image: f.image || null, position: Number(f.position) } }))) setEditing(null); }} className="space-y-4 p-5">
                <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                  <Field label="Nom" htmlFor={`n-${c.id}`}><Input id={`n-${c.id}`} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required maxLength={120} autoFocus /></Field>
                  <Field label="Ordre" htmlFor={`p-${c.id}`}><Input id={`p-${c.id}`} type="number" min={0} max={1000} value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} /></Field>
                </div>
                <div className="flex items-center gap-4">
                  <div className="scene relative h-20 w-20 shrink-0 overflow-hidden rounded-md p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {f.image ? <img src={f.image} alt="" className="relative z-10 h-full w-full object-contain" /> : null}
                    {f.image && <button type="button" aria-label="Retirer l’image" onClick={() => setF({ ...f, image: "" })} className="absolute right-1 top-1 z-20 grid h-6 w-6 place-items-center rounded-full bg-background/90 shadow"><X className="h-3 w-3" aria-hidden /></button>}
                  </div>
                  <label className="cursor-pointer rounded-md border border-dashed border-border-strong px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted">
                    {uploading ? "Envoi…" : "Choisir une image (facultatif)"}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} disabled={uploading} />
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={busy || uploading} loading={busy}>Enregistrer</Button>
                  <Button variant="ghost" onClick={() => setEditing(null)}>Annuler</Button>
                </div>
              </form>
            ) : (
              <div key={c.id} className="flex items-center gap-4 px-5 py-3">
                <div className="scene relative h-12 w-12 shrink-0 overflow-hidden rounded-md p-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.image ? <img src={c.image} alt="" className="relative z-10 h-full w-full object-contain" /> : <span className="grid h-full w-full place-items-center font-display text-xl text-stone-400">{c.name[0]}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-muted-foreground">{c._count.products} produit(s) · ordre {c.position}</p>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="secondary" onClick={() => { setEditing(c.id); setF({ name: c.name, image: c.image ?? "", position: String(c.position) }); setError(null); }}>Modifier</Button>
                    <ActionButton path={`/api/admin/categories/${c.id}`} method="DELETE" variant="ghost" size="sm" confirm={`Supprimer « ${c.name} » ?`} disabled={c._count.products > 0}>Supprimer</ActionButton>
                  </div>
                )}
              </div>
            ),
          )}
        </Card>
      )}
    </div>
  );
}
