UPDATE products SET title='Interactive Fairy Tale', price_usd_cents=499, price_stars=300 WHERE sku='tale';
INSERT INTO products (sku, title, price_usd_cents, price_stars, active) VALUES
  ('detective', 'Interactive Detective Story', 499, 300, true)
ON CONFLICT (sku) DO UPDATE SET title=EXCLUDED.title, price_usd_cents=EXCLUDED.price_usd_cents, price_stars=EXCLUDED.price_stars, active=true;
