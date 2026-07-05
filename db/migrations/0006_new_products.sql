INSERT INTO products (sku, title, price_usd_cents, price_stars, active) VALUES
  ('poem',          'Personal Poem',           99,  60, true),
  ('love_letter',   'Love Letter',             99,  60, true),
  ('dream',         'Dream Interpretation',    99,  60, true),
  ('compatibility', 'Couple Compatibility',   199, 120, true),
  ('tarot',         '3-Card Tarot Reading',   199, 120, true),
  ('tale',          'Personal Fairy Tale',    299, 180, true),
  ('year_ahead',    'Your Year Ahead',        499, 300, true)
ON CONFLICT (sku) DO UPDATE SET title=EXCLUDED.title, price_usd_cents=EXCLUDED.price_usd_cents, price_stars=EXCLUDED.price_stars, active=true;
