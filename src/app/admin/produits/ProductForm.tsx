"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { api, uploadFile } from "@/lib/api";
import { Alert, Button, Card, Field, Input, Textarea, cx } from "@/components/ui";

type Category = { id: string; name: string };
export type ProductInput = {
  id?: string;
  sku: string;
  title: string;
  description: string;
  price: number | string;
  compareAtPrice: number | string;
  images: string[];
  active: boolean;
  featured: boolean;
  lowStockAlert: number | string;
  categoryIds: string[];
};

const EMPTY: ProductInput = { sku: "", title: "", description: "", price: "", compareAtPrice: "", images: [], active: true, featured: false, lowStockAlert: 5, categoryIds: [] };

export function ProductForm({ initial, categories }: { initial?: ProductInput; categories: Category[] }) {
  const router = useRouter();
  const [f, setF] = useState<ProductInput>(initial ?? EMPTY);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => setF((s) => ({ ...s, [k]: v }));

  async function addImages(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, 8 - f.images.length)) urls.push((await uploadFile(file, "product")).url);
      set("images", [...f.images, ...urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = { ...f, price: Number(f.price), compareAtPrice: f.compareAtPrice === "" ? null : Number(f.compareAtPrice), lowStockAlert: Number(f.lowStockAlert), description: f.description || undefined };
    try {
      if (f.id) {
        await api(`/api/admin/products/${f.id}`, { method: "PATCH", json: body });
        router.refresh();
      } else {
        const p = await api<{ id: string }>("/api/admin/products", { method: "POST", json: body });
        router.push(`/admin/produits/${p.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card className="space-y-5 p-5">
        <Field label="Nom du produit" htmlFor="title">
          <Input id="title" value={f.title} onChange={(e) => set("title", e.target.value)} required maxLength={120} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Référence (SKU)" htmlFor="sku" hint="Lettres, chiffres, tirets.">
            <Input id="sku" value={f.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} required pattern="[A-Za-z0-9\-_]+" maxLength={40} />
          </Field>
          <Field label="Prix (F)" htmlFor="price">
            <Input id="price" type="number" inputMode="numeric" min={1} step={1} value={f.price} onChange={(e) => set("price", e.target.value)} required />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Ancien prix (F, facultatif)" htmlFor="cmp" hint="S’il est renseigné, il s’affiche barré : promotion.">
            <Input id="cmp" type="number" inputMode="numeric" min={0} step={1} value={f.compareAtPrice} onChange={(e) => set("compareAtPrice", e.target.value)} />
          </Field>
          <Field label="Alerte stock bas" htmlFor="low" hint="Sous ce seuil, le produit remonte au tableau de bord.">
            <Input id="low" type="number" inputMode="numeric" min={0} step={1} value={f.lowStockAlert} onChange={(e) => set("lowStockAlert", e.target.value)} />
          </Field>
        </div>
        <Field label="Description" htmlFor="desc">
          <Textarea id="desc" value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={2000} />
        </Field>
      </Card>

      <Card className="space-y-4 p-5">
        <p className="text-sm font-semibold">Photos (8 maximum)</p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {f.images.map((src, i) => (
            <div key={src} className="group relative aspect-square overflow-hidden rounded-md bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              <button type="button" aria-label="Retirer cette photo" onClick={() => set("images", f.images.filter((s) => s !== src))} className="absolute right-1 top-1 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-background/90 text-foreground shadow">
                <X className="h-4 w-4" aria-hidden />
              </button>
              {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">Principale</span>}
            </div>
          ))}
          {f.images.length < 8 && (
            <label className={cx("grid aspect-square cursor-pointer place-items-center rounded-md border-2 border-dashed border-border-strong text-center text-sm font-semibold text-muted-foreground hover:bg-muted", uploading && "opacity-50")}>
              {uploading ? "Envoi…" : "+ Ajouter"}
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => addImages(e.target.files)} disabled={uploading} />
            </label>
          )}
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <p className="text-sm font-semibold">Catégories</p>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune catégorie créée.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const on = f.categoryIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set("categoryIds", on ? f.categoryIds.filter((x) => x !== c.id) : [...f.categoryIds, c.id])}
                  className={cx("cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold", on ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-card hover:bg-muted")}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        )}
        <label className="flex cursor-pointer items-center gap-3 pt-2">
          <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="h-5 w-5 accent-primary" />
          <span className="font-medium">En vente dans la boutique</span>
        </label>
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" checked={f.featured} onChange={(e) => set("featured", e.target.checked)} className="h-5 w-5 accent-primary" />
          <span className="font-medium">Mettre à la une (page d’accueil)</span>
        </label>
      </Card>

      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" size="lg" disabled={busy || uploading} loading={busy}>
        {busy ? "Enregistrement…" : f.id ? "Enregistrer" : "Créer le produit"}
      </Button>
    </form>
  );
}
