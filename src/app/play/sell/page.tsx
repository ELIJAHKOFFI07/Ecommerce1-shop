"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Store, Zap } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import { useSession } from "@/lib/session";
import { uploadImage } from "@/lib/storage";
import {
  ORDER_STATUS_LABELS,
  formatFcfa,
  type Category,
  type Order,
  type Product,
  type Shop,
  type ShopStats,
} from "@/lib/types";
import { BoostDialog } from "@/components/play/BoostDialog";
import { EditProductDialog } from "@/components/play/EditProductDialog";
import { ImagePicker } from "@/components/play/ImagePicker";
import { ListSkeleton, Skeleton } from "@/components/Skeleton";
import { StoriesManager } from "@/components/play/StoriesManager";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-bold text-accent">{value}</p>
    </div>
  );
}

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
  const [editing, setEditing] = useState<Product | null>(null);
  const [stats, setStats] = useState<ShopStats | null>(null);
  const { canSell, loading: sessionLoading } = useSession();

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
      const [{ data: prods }, { data: ords }, { data: shopStats }] =
        await Promise.all([
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
          // Agrégats calculés côté serveur (RPC shop_stats).
          supabase.rpc("shop_stats", { p_shop_id: (shopData as Shop).id }),
        ]);
      setProducts((prods as Product[]) ?? []);
      setOrders((ords as Order[]) ?? []);
      setStats((shopStats as ShopStats | null) ?? null);
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
          className="mt-4 inline-block rounded-full bg-foreground px-6 py-2.5 font-semibold text-background"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  if (authed === null || sessionLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
        <ListSkeleton count={4} />
      </div>
    );
  }

  // Seuls les comptes vendeur (ou admin) peuvent vendre. Le statut est
  // accordé par un administrateur — voir migration 005. La base applique la
  // même règle via les policies shops_insert / products_insert : masquer
  // l'écran ne suffirait pas.
  if (!canSell) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Store className="mx-auto h-10 w-10 text-accent" />
        <h1 className="mt-4 text-xl font-medium tracking-tight">Compte vendeur requis</h1>
        <p className="mt-2 text-sm text-muted">
          Votre compte est un compte client : vous pouvez acheter, mais pas
          encore vendre. Contactez l&apos;administrateur de la plateforme pour
          demander l&apos;activation du statut vendeur.
        </p>
        <Link
          href="/play"
          className="mt-6 inline-block rounded-full bg-foreground px-6 py-2.5 font-semibold text-background"
        >
          Retour à la boutique
        </Link>
      </div>
    );
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
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 font-bold text-accent">
          {shop.name[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-bold">{shop.name}</p>
          <p className="text-sm text-muted">{shop.city}</p>
        </div>
      </div>

      {stats && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="Ventes livrées" value={formatFcfa(stats.total_sales)} />
          <StatTile
            label="Commandes en cours"
            value={String(stats.pending_orders)}
          />
          <StatTile
            label="Produits actifs"
            value={String(stats.active_products)}
          />
          <StatTile
            label="Note moyenne"
            value={
              stats.rating_count > 0
                ? `${stats.average_rating}/5 (${stats.rating_count})`
                : "—"
            }
          />
        </div>
      )}

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
              tab === value ? "bg-foreground text-background" : "bg-surface-2 text-muted"
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
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-muted">
                    {formatFcfa(p.price)} · stock {p.stock} · {p.status}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <button
                    onClick={() => setEditing(p)}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs hover:border-accent"
                  >
                    <Pencil className="h-3.5 w-3.5 text-accent" /> Modifier
                  </button>
                  <button
                    onClick={() => setBoosting(p)}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs hover:border-accent"
                  >
                    <Zap className="h-3.5 w-3.5 text-accent" /> Booster
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "stories" && <StoriesManager shopId={shop.id} />}

      {boosting && (
        <BoostDialog product={boosting} onClose={() => setBoosting(null)} />
      )}

      {editing && (
        <EditProductDialog
          product={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
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
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                    {ORDER_STATUS_LABELS[o.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-accent">{formatFcfa(o.total)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {NEXT_STATUS[o.status]?.map((s) => (
                    <button
                      key={s}
                      onClick={() => advance(o.id, s)}
                      className="rounded-full border border-border px-3 py-1 text-xs hover:border-accent"
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
      <h1 className="mb-2 text-xl font-medium tracking-tight">Ouvrez votre boutique</h1>
      <p className="mb-6 text-sm text-muted">
        Gratuit, en quelques secondes.
      </p>
      <div className="space-y-3">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom de la boutique"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
        />
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Ville"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={3}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          disabled={loading}
          className="w-full rounded-full bg-foreground py-3 font-semibold text-background disabled:opacity-50"
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
        // uploadImage assainit le nom du fichier : accents, espaces et
        // parenthèses sont rejetés par Supabase Storage.
        const url = await uploadImage("product-images", uid, files[i]);
        await supabase
          .from("product_images")
          .insert({ product_id: product.id, url, position: i });
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
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={3}
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
      />
      <div className="flex gap-3">
        <input
          required
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Prix (FCFA)"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
        />
        <input
          required
          type="number"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          placeholder="Stock"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
        />
      </div>
      <div className="flex gap-3">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
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
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
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
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent"
      />
      <ImagePicker files={files} onChange={setFiles} />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        disabled={loading}
        className="w-full rounded-full bg-foreground py-3 font-semibold text-background disabled:opacity-50"
      >
        {loading ? "Publication…" : "Publier le produit"}
      </button>
    </form>
  );
}
