-- Conversation state (collect name/birthdate/prompt before generation)
CREATE TABLE IF NOT EXISTS bot_sessions (
  tg_id      BIGINT PRIMARY KEY,
  state      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Store user inputs on the order (prompt / name / birthdate / options)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS input JSONB NOT NULL DEFAULT '{}';

-- New / updated products
INSERT INTO products (sku, title, price_usd_cents, price_stars, active) VALUES
  ('name_secrets', 'Secrets of Your Name',  99,  60, true),
  ('astro_full',   'Full Daily Forecast',   99,  60, true),
  ('song_vocal',   'Song with Vocals',     299, 180, true)
ON CONFLICT (sku) DO UPDATE SET title=EXCLUDED.title, price_usd_cents=EXCLUDED.price_usd_cents, price_stars=EXCLUDED.price_stars, active=true;

-- price the instrumental song at ~$2 with custom prompt
UPDATE products SET title='Instrumental Track (custom)', price_usd_cents=199, price_stars=120 WHERE sku='song';
