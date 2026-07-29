"use client";

import { useState } from "react";
import { createClient } from "@/lib/backend/client";
import { uploadImage } from "@/lib/storage";
import type { Category, Product, ProductImage } from "@/lib/types";

/// Édition d'un produit par son vendeur.
///
/// Les colonnes réellement modifiables sont limitées côté base par le
/// `grant update (...)` de schema.sql, et la policy `products_update`
/// n'autorise que le vendeur propriétaire (ou un admin) : masquer ce
/// dialogue ne suffirait pas, la base applique la même règle.
export function EditProductDialog({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: Product;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(product.title);
  const [description, setDescription] = useState(product.description ?? "");
  const [price, setPrice] = useState(String(product.price));
  const [stock, setStock] = useState(String(product.stock));
  const [categoryId, setCategoryId] = useState(product.category_id ?? "");
  const [condition, setCondition] = useState<Product["condition"]>(
    product.condition,
  );
  const [city, setCity] = useState(product.city ?? "");
  const [status, setStatus] = useState(product.status);
  const [images, setImages] = useState<ProductImage[]>(
    [...(product.product_images ?? [])].sort((a, b) => a.position - b.position),
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function removeImage(image: ProductImage) {
    setError(null);
    const { error: delErr } = await createClient()
      .from("product_images")
      .delete()
      .eq("id", image.id);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    setImages((prev) => prev.filter((i) => i.id !== image.id));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Session expirée, reconnectez-vous.");

      const { error: updErr } = await supabase
        .from("products")
        .update({
          title,
          description,
          price: Number(price),
          stock: Number(stock),
          category_id: categoryId || null,
          condition,
          city: city || null,
          status,
        })
        .eq("id", product.id);
      if (updErr) throw updErr;

      let position = images.length;
      for (const file of newFiles) {
        // uploadImage assainit le nom du fichier (accents, espaces,
        // parenthèses), que Supabase Storage refuse.
        const url = await uploadImage("product-images", uid, file);
        const { error: imgErr } = await supabase
          .from("product_images")
          .insert({ product_id: product.id, url, position: position++ });
        if (imgErr) throw imgErr;
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  const field =
    "w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-gold";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 p-4 sm:items-center">
      <form
        onSubmit={save}
        className="my-auto w-full max-w-lg space-y-3 rounded-2xl border border-border bg-surface p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Modifier le produit</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 text-xl leading-none text-muted hover:text-foreground"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre"
          className={field}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={3}
          className={field}
        />

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            required
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Prix (FCFA)"
            className={field}
          />
          <input
            required
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="Stock"
            className={field}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={field}
          >
            <option value="">Catégorie…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
          <select
            value={condition}
            onChange={(e) =>
              setCondition(e.target.value as Product["condition"])
            }
            className={field}
          >
            <option value="neuf">Neuf</option>
            <option value="occasion">Occasion</option>
            <option value="reconditionne">Reconditionné</option>
          </select>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ville"
            className={field}
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={field}
          >
            <option value="active">En vente</option>
            <option value="paused">En pause</option>
            <option value="sold">Vendu</option>
          </select>
        </div>

        <div>
          <p className="mb-2 text-sm text-muted">Photos</p>
          {images.length > 0 && (
            <div className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {images.map((img) => (
                <div key={img.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt=""
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(img)}
                    className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white"
                    aria-label="Supprimer la photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setNewFiles(Array.from(e.target.files ?? []))}
            className="w-full text-sm text-muted"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full border border-border py-3 font-semibold sm:w-auto sm:px-6"
          >
            Annuler
          </button>
          <button
            disabled={saving}
            className="w-full rounded-full bg-gold py-3 font-semibold text-black disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
