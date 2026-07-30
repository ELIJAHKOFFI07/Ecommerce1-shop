-- Données de départ : catégories + zones de livraison + coupon de bienvenue.
insert into public.categories (name, slug, icon, position) values
  ('Mode & Vêtements', 'mode', '👗', 1),
  ('Téléphones & Tablettes', 'telephones', '📱', 2),
  ('Électronique', 'electronique', '💻', 3),
  ('Maison & Déco', 'maison', '🛋️', 4),
  ('Beauté & Soins', 'beaute', '💄', 5),
  ('Chaussures', 'chaussures', '👟', 6),
  ('Sacs & Accessoires', 'accessoires', '👜', 7),
  ('Alimentation', 'alimentation', '🍯', 8),
  ('Bébés & Enfants', 'enfants', '🧸', 9),
  ('Sport & Loisirs', 'sport', '⚽', 10),
  ('Véhicules & Pièces', 'vehicules', '🚗', 11),
  ('Immobilier', 'immobilier', '🏠', 12)
on conflict (slug) do nothing;

insert into public.delivery_zones (name, base_fee, free_above) values
  ('Abidjan — Cocody / Plateau', 1500, 50000),
  ('Abidjan — Yopougon / Abobo', 2000, 50000),
  ('Abidjan — Autres communes', 2500, 75000),
  ('Grand Bassam / Bingerville', 3000, 100000),
  ('Intérieur du pays', 5000, 0)
on conflict do nothing;

insert into public.coupons (code, type, value, min_order_amount, max_uses) values
  ('BIENVENUE10', 'percent', 10, 5000, 1000),
  ('DREAMTEAM2000', 'fixed', 2000, 20000, 500)
on conflict (code) do nothing;
