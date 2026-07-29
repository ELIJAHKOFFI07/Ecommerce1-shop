export type Profile = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  city: string | null;
  bio: string | null;
  is_admin: boolean;
  is_seller: boolean;
  referral_code: string | null;
  referred_by: string | null;
  whatsapp: string | null;
  loyalty_points: number;
  created_at: string;
};

export type Shop = {
  whatsapp?: string | null;
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  city: string | null;
  phone: string | null;
  identity_verified: boolean;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  parent_id: string | null;
  position: number;
};

export type ProductImage = { id: string; url: string; position: number };
export type ProductVariant = {
  id: string;
  product_id: string;
  name: string;
  price: number | null;
  stock: number;
};

export type Product = {
  id: string;
  shop_id: string;
  seller_id: string;
  category_id: string | null;
  title: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  condition: "neuf" | "occasion" | "reconditionne";
  city: string | null;
  status: string;
  is_flash: boolean;
  flash_ends_at: string | null;
  favorites_count: number;
  views_count: number;
  created_at: string;
  product_images?: ProductImage[];
  product_variants?: ProductVariant[];
  shops?: Shop;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  title: string;
  variant_name: string | null;
  unit_price: number;
  quantity: number;
  image_url: string | null;
};

export type Order = {
  id: string;
  buyer_id: string;
  shop_id: string;
  status:
    | "pending"
    | "confirmed"
    | "preparing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded";
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  payment_status: string;
  address_snapshot: Record<string, unknown>;
  coupon_code: string | null;
  created_at: string;
  order_items?: OrderItem[];
  shops?: Shop;
  profiles?: Profile;
};

export type Review = {
  id: string;
  product_id: string;
  shop_id: string;
  author_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles?: Profile;
};

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export const ORDER_STATUS_LABELS: Record<Order["status"], string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  preparing: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
  refunded: "Remboursée",
};

export function formatFcfa(amount: number): string {
  return `${amount.toLocaleString("fr-FR").replace(/,/g, " ")} FCFA`;
}

// ---- Engagement & croissance ----

export type SpinPrizeKind = "points" | "coupon" | "nothing";

export type SpinReward = {
  id: string;
  prize_kind: SpinPrizeKind;
  prize_value: number;
  coupon_code: string | null;
  created_at: string;
};

/// Miroir des segments de la RPC `spin_wheel` — affichage uniquement, le
/// tirage réel est décidé côté serveur.
export const SPIN_SEGMENTS: { kind: SpinPrizeKind; value: number; label: string }[] = [
  { kind: "nothing", value: 0, label: "Retente demain" },
  { kind: "points", value: 10, label: "+10 points" },
  { kind: "points", value: 50, label: "+50 points" },
  { kind: "coupon", value: 5, label: "-5% coupon" },
  { kind: "coupon", value: 15, label: "-15% coupon" },
];

export function spinResultLabel(reward: SpinReward): string {
  switch (reward.prize_kind) {
    case "nothing":
      return "Pas de chance aujourd'hui, retentez demain !";
    case "points":
      return `Vous avez gagné ${reward.prize_value} points fidélité !`;
    case "coupon":
      return `Vous avez gagné un coupon -${reward.prize_value}% : ${reward.coupon_code}`;
  }
}

export function canSpinToday(lastSpinAt: string | null): boolean {
  if (!lastSpinAt) return true;
  const last = new Date(lastSpinAt);
  const now = new Date();
  return (
    last.getFullYear() !== now.getFullYear() ||
    last.getMonth() !== now.getMonth() ||
    last.getDate() !== now.getDate()
  );
}

/// Miroir des tarifs de la RPC `boost_product`.
export const BOOST_DURATIONS = [
  { hours: 24, cost: 500, label: "24 heures" },
  { hours: 72, cost: 1200, label: "3 jours" },
  { hours: 168, cost: 2500, label: "7 jours" },
] as const;

export type ProductBoost = {
  id: string;
  product_id: string;
  shop_id: string;
  cost: number;
  starts_at: string;
  ends_at: string;
};

export type PriceAlert = {
  id: string;
  product_id: string;
  price_at_creation: number;
  notified: boolean;
};

export type ProductQuestion = {
  id: string;
  product_id: string;
  author_id: string;
  question: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
  profiles?: { username: string } | null;
};

export type Wishlist = {
  id: string;
  name: string;
  created_at: string;
  wishlist_items?: { product_id: string }[];
};

export type ReferralLeaderboardEntry = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  referrals_count: number;
};

export type ShopStory = {
  id: string;
  shop_id: string;
  image_url: string;
  caption: string | null;
  product_id: string | null;
  created_at: string;
  expires_at: string;
};

export type ShopWithActiveStories = {
  shop_id: string;
  name: string;
  logo_url: string | null;
  last_story_at: string;
  active_stories_count: number;
};

export function storyRemainingLabel(expiresAt: string): string {
  const left = new Date(expiresAt).getTime() - Date.now();
  if (left <= 0) return "Expirée";
  const hours = Math.floor(left / 3_600_000);
  if (hours >= 1) return `il reste ${hours} h`;
  return `il reste ${Math.floor(left / 60_000)} min`;
}

// ---- Enchères ----

export type Auction = {
  id: string;
  product_id: string;
  shop_id: string;
  starting_price: number;
  current_bid: number | null;
  current_bidder: string | null;
  bids_count: number;
  status: "active" | "ended" | "cancelled";
  ends_at: string;
  products?: Product;
};

/// Miroir de la RPC `place_bid` : +5 % minimum au-dessus de l'offre courante.
export function minNextBid(auction: Auction): number {
  if (auction.current_bid == null) return auction.starting_price;
  return Math.ceil(auction.current_bid * 1.05);
}

export function auctionRemainingLabel(endsAt: string): string {
  const left = new Date(endsAt).getTime() - Date.now();
  if (left <= 0) return "Terminée";
  const minutes = Math.floor(left / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days >= 1) return `${days} j ${hours % 24} h`;
  if (hours >= 1) return `${hours} h ${minutes % 60} min`;
  if (minutes >= 1) return `${minutes} min`;
  return `${Math.floor(left / 1000)} s`;
}

// ---- Historique des prix ----

export type PriceHistoryEntry = { price: number; created_at: string };

// ---- Conversion de points (miroir de la RPC `redeem_points`) ----

export const POINTS_FCFA_PER_POINT = 10;
export const POINTS_MIN_REDEEM = 50;

// ---- Back-office : stock, comptabilité, paramètres plateforme ----

export type StockMovement = {
  id: string;
  product_id: string;
  variant_id: string | null;
  delta: number;
  reason: string;
  created_by: string | null;
  created_at: string;
};

export type PlatformSettings = {
  commission_percent: number;
  min_withdrawal: number;
  support_phone: string | null;
  support_email: string | null;
  /// Message à la une affiché en haut de /play (voir migration 007).
  announcement: string | null;
  announcement_active: boolean;
  updated_at: string;
};

export type RevenueDay = {
  day: string;
  orders_count: number;
  gmv: number;
  commission: number;
};

export type ShopRevenue = {
  shop_id: string;
  shop_name: string;
  orders_count: number;
  gmv: number;
  commission: number;
  payout: number;
};

export type WalletOverviewRow = {
  user_id: string;
  username: string;
  shop_name: string | null;
  balance: number;
  lifetime_credit: number;
  lifetime_withdrawn: number;
};

// ---- Portefeuille vendeur ----

export type WalletTransactionKind =
  | "sale_credit"
  | "withdrawal"
  | "refund"
  | "referral_bonus";

export type WalletTransaction = {
  id: string;
  wallet_user_id: string;
  amount: number;
  kind: WalletTransactionKind;
  order_id: string | null;
  note: string | null;
  created_at: string;
};

export const WALLET_KIND_LABELS: Record<WalletTransactionKind, string> = {
  sale_credit: "Vente créditée",
  withdrawal: "Retrait",
  refund: "Remboursement",
  referral_bonus: "Bonus parrainage",
};

// ---- Offres (négociation de prix) ----

export type OfferStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "countered"
  | "expired";

export type Offer = {
  id: string;
  product_id: string;
  buyer_id: string;
  shop_id: string;
  amount: number;
  counter_amount: number | null;
  status: OfferStatus;
  created_at: string;
  products?: Product;
  profiles?: Profile;
};

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  declined: "Refusée",
  countered: "Contre-offre",
  expired: "Expirée",
};

// ---- Messagerie ----

export type Conversation = {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string | null;
  last_message: string | null;
  last_message_at: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  image_url: string | null;
  read_at: string | null;
  created_at: string;
};

// ---- Statistiques boutique (RPC shop_stats) ----

export type ShopStats = {
  total_sales: number;
  delivered_orders: number;
  pending_orders: number;
  active_products: number;
  average_rating: number;
  rating_count: number;
  followers_count: number;
};

export function relativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem`;
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`;
  return `il y a ${Math.floor(days / 365)} an(s)`;
}
