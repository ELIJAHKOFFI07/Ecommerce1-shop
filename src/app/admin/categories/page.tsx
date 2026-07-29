"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import { ListSkeleton } from "@/components/Skeleton";
import type { Category } from "@/lib/types";

/// Gestion des catégories. L'écriture est réservée aux admins par la policy
/// `categories_admin` (schema.sql) : cet écran ne fait qu'exposer ce que la
/// base autorise déjà.
export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("🛍️");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const { data } = await createClient()
      .from("categories")
      .select("*")
      .order("position");
    setCategories((data as Category[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function patch(id: string, changes: Partial<Category>) {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...changes } : c)),
    );
  }

  async function save(category: Category) {
    setSavingId(category.id);
    setError(null);
    const { error: updErr } = await createClient()
      .from("categories")
      .update({
        name: category.name,
        icon: category.icon,
        position: category.position,
      })
      .eq("id", category.id);
    setSavingId(null);
    if (updErr) setError(updErr.message);
  }

  async function remove(category: Category) {
    if (
      !window.confirm(
        `Supprimer « ${category.name} » ? Les produits de cette catégorie n'auront plus de catégorie.`,
      )
    ) {
      return;
    }
    setError(null);
    const { error: delErr } = await createClient()
      .from("categories")
      .delete()
      .eq("id", category.id);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    load();
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    const slug = newName
      .trim()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
    const { error: insErr } = await createClient().from("categories").insert({
      name: newName.trim(),
      slug,
      icon: newIcon || "🛍️",
      position: categories.length + 1,
    });
    setCreating(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setNewName("");
    setNewIcon("🛍️");
    load();
  }

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">Catégories</h1>
        <ListSkeleton count={6} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Catégories ({categories.length})</h1>
      <p className="mb-6 text-sm text-muted">
        L&apos;icône est un emoji : collez celui de votre choix dans le champ.
      </p>

      {error && (
        <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <form
        onSubmit={create}
        className="mb-6 flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-end"
      >
        <label className="sm:w-24">
          <span className="mb-1 block text-xs text-muted">Icône</span>
          <input
            value={newIcon}
            onChange={(e) => setNewIcon(e.target.value)}
            maxLength={4}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-center text-xl outline-none focus:border-gold"
          />
        </label>
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-xs text-muted">
            Nouvelle catégorie
          </span>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom de la catégorie"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </label>
        <button
          disabled={creating || !newName.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </form>

      <div className="space-y-2">
        {categories.map((c) => (
          <div
            key={c.id}
            className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-surface p-3"
          >
            <label className="w-20">
              <span className="mb-1 block text-xs text-muted">Icône</span>
              <input
                value={c.icon}
                onChange={(e) => patch(c.id, { icon: e.target.value })}
                maxLength={4}
                className="w-full rounded-lg border border-border bg-background px-2 py-2 text-center text-xl outline-none focus:border-gold"
              />
            </label>
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-xs text-muted">Nom</span>
              <input
                value={c.name}
                onChange={(e) => patch(c.id, { name: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
              />
            </label>
            <label className="w-20">
              <span className="mb-1 block text-xs text-muted">Ordre</span>
              <input
                type="number"
                value={c.position}
                onChange={(e) =>
                  patch(c.id, { position: Number(e.target.value) })
                }
                className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus:border-gold"
              />
            </label>
            <button
              onClick={() => save(c)}
              disabled={savingId === c.id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs hover:border-gold disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5 text-gold" />
              {savingId === c.id ? "…" : "Enregistrer"}
            </button>
            <button
              onClick={() => remove(c)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs hover:border-red-500 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
