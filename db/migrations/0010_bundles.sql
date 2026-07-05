-- Combo bundles: deliver 3 products at a discount
INSERT INTO products (sku, title, price_usd_cents, price_stars, active) VALUES
  ('bundle_romance', 'Romantic Bundle (poem + love letter + image)', 199, 120, true),
  ('bundle_mystic',  'Mystic Bundle (astrology + name + tarot)',     249, 150, true)
ON CONFLICT (sku) DO UPDATE SET title=EXCLUDED.title, price_usd_cents=EXCLUDED.price_usd_cents, price_stars=EXCLUDED.price_stars, active=true;
