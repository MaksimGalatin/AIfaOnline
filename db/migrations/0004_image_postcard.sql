INSERT INTO products (sku, title, price_usd_cents, price_stars, active) VALUES
  ('image',    'AI Image (your prompt)',  99, 60, true),
  ('postcard', 'Greeting Postcard',       99, 60, true)
ON CONFLICT (sku) DO UPDATE SET title=EXCLUDED.title, price_usd_cents=EXCLUDED.price_usd_cents, price_stars=EXCLUDED.price_stars, active=true;
