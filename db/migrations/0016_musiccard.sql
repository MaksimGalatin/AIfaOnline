INSERT INTO products (sku, title, price_usd_cents, price_stars, active) VALUES
  ('music_card', 'Living Musical Card (image + music video)', 299, 180, true)
ON CONFLICT (sku) DO UPDATE SET title=EXCLUDED.title, price_usd_cents=EXCLUDED.price_usd_cents, price_stars=EXCLUDED.price_stars, active=true;
