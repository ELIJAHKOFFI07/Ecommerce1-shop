"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  ORDER_STATUS_LABELS,
  formatFcfa,
  type Category,
  type Order,
  type Product,
  type Shop,
} from "@/lib/types";
import { BoostDialog } from "@/components/play/BoostDialog";
import { StoriesManager } from "@/components/play/StoriesManager";

const NEXT_STATUS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
  refunded: [],
};

export default function SellPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tab, setTab] = useState<"products" | "orders" | "new" | "stories">(
    "products",
  );
  const [boosting, setBoosting] = useState<Product | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setAuthed(false);
      return;
    }
    setAuthed(true);
    const { data: shopData } = await supabase
      .from("shops")
      .select("*")
      .eq("owner_id", userData.user.id)
      .maybeSingle();
    setShop(shopData as Shop | null);
    const { data: cats } = await supabase
      .from("categories")
      .select("*")
      .order("position");
    setCategories((cats as Category[]) ?? []);
    if (shopData) {
      const [{ data: prods }, { data: ords }] = await Promise.all([
        supabase
          .from("products")
          .select("*, product_images(url, position)")
          .eq("shop_id", (shopData as Shop).id)
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select("*, order_items(*)")
          .eq("shop_id", (shopData as Shop).id)
          .order("created_at", { ascending: false }),
      ]);
      setProducts((prods as Product[]) ?? []);
      setOrders((ords as Order[]) ?? []);
    }
  }, []);

  useEffect(() => {
    // Chargement initial des données vendeur (setState après await, hors
    // rendu synchrone).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (authed === false) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium">Connexion requise pour vendre</p>
        <Link
          href="/play/login"
          className="mt-4 inline-block rounded-full bg-gold px-6 py-2.5 font-semibold text-black"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  if (authed === null) {
    return <p className="py-16 text-center text-muted">Chargement…</p>;
  }

  if (!shop) {
    return <CreateShopForm onCreated={load} />;
  }

  async function advance(orderId: string, status: string) {
    // Le passage en "livrée" exige le code de retrait à 6 chiffres que seul
    // l'acheteur détient (RPC confirm_delivery).
    if (status === "delivered") {
      const code = window.prompt(
        "Code de retrait à 6 chiffres (demandez-le à l'acheteur) :",
      );
      if (!code) return;
      const { error } = await createClient().rpc("confirm_delivery", {
        p_order_id: orderId,
        p_code: code.trim(),
      });
      if (error) {
        window.alert(error.message);
        return;
      }
      load();
      return;
    }
    await createClient().rpc("advance_order_status", {
      p_order_id: orderId,
      p_new_status: status,
      p_note: null,
    });
    load();
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 font-bold text-gold">
          {shop.name[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-bold">{shop.name}</p>
          <p className="text-sm text-muted">{shop.city}</p>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {(
          [
            ["products", "Produits"],
            ["orders", "Commandes"],
            ["stories", "Stories"],
            ["new", "+ Publier"],
          ] as [typeof tab, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`rounded-full px-4 py-1.5 text-sm ${
              tab === value ? "bg-gold text-black" : "bg-surface-2 text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "products" && (
        <div className="space-y-2">
          {products.length === 0 ? (
            <p className="py-8 text-center text-muted">Aucun produit publié.</p>
          ) : (
            products.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
              >
                <div className="h-12 w-12 overflow-hidden rounded-lg bg-surface-2">
                  {p.product_images?.[0]?.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.product_images[0].url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p className="line-clamp-1 text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-muted">
                    {formatFcfa(p.price)} · stock {p.stock} · {p.status}
                  </p>
                </div>
                <button
                  onClick={() => setBoosting(p)}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs hover:border-gold"
                >
                  <Zap className="h-3.5 w-3.5 text-gold" /> Booster
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "stories" && <StoriesManager shopId={shop.id} />}

      {boosting && (
        <BoostDialog product={boosting} onClose={() => setBoosting(null)} />
      )}

      {tab === "orders" && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <p className="py-8 text-center text-muted">Aucune commande reçue.</p>
          ) : (
            orders.map((o) => (
              <div
                key={o.id}
                className="rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    #{o.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs text-gold">
                    {ORDER_STATUS_LABELS[o.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gold">{formatFcfa(o.total)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {NEXT_STATUS[o.status]?.map((s) => (
                    <button
                      key={s}
                      onClick={() => advance(o.id, s)}
                      className="rounded-full border border-border px-3 py-1 text-xs hover:border-gold"
                    >
                      {ORDER_STATUS_LABELS[s as Order["status"]]}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "new" && (
        <NewProductForm
          shopId={shop.id}
          categories={categories}
          onCreated={() => {
            setTab("products");
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateShopForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const { error } = await createClient()
      .from("shops")
      .insert({ name, slug, city, description });
    setLoading(false);
    if (error) setError(error.message);
    else onCreated();
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md py-8">
      <h1 className="mb-2 text-xl font-bold">Ouvrez votre boutique</h1>
      <p className="mb-6 text-sm text-muted">
        Gratuit, en quelques secondes.
      </p>
      <div className="space-y-3">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom de la boutique"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
        />
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Ville"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={3}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          disabled={loading}
          className="w-full rounded-full bg-gold py-3 font-semibold text-black disabled:opacity-50"
        >
          {loading ? "Création…" : "Créer ma boutique"}
        </button>
      </div>
    </form>
  );
}

function NewProductForm({
  shopId,
  categories,
  onCreated,
}: {
  shopId: string;
  categories: Category[];
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [categoryId, setCategoryId] = useState("");
  const [condition, setCondition] = useState("neuf");
  const [city, setCity] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user!.id;
    try {
      const { data: product, error: prodErr } = await supabase
        .from("products")
        .insert({
          shop_id: shopId,
          title,
          description,
          price: Number(price),
          stock: Number(stock),
          category_id: categoryId || null,
          condition,
          city: city || null,
        })
        .select("id")
        .single();
      if (prodErr) throw prodErr;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = `${uid}/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("product-images")
          .upload(path, file);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage
          .from("product-images")
          .getPublicUrl(path);
        await supabase
          .from("product_images")
          .insert({ product_id: product.id, url: pub.publicUrl, position: i });
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre"
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={3}
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
      />
      <div className="flex gap-3">
        <input
          required
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Prix (FCFA)"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
        />
        <input
          required
          type="number"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          placeholder="Stock"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
        />
      </div>
      <div className="flex gap-3">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
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
          onChange={(e) => setCondition(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
        >
          <option value="neuf">Neuf</option>
          <option value="occasion">Occasion</option>
          <option value="reconditionne">Reconditionné</option>
        </select>
      </div>
      <input
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="Ville"
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-gold"
      />
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        className="w-full text-sm text-muted"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        disabled={loading}
        className="w-full rounded-full bg-gold py-3 font-semibold text-black disabled:opacity-50"
      >
        {loading ? "Publication…" : "Publier le produit"}
      </button>
    </form>
  );
}
