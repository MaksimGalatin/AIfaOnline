ALTER TABLE orders ADD COLUMN IF NOT EXISTS regenerated BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS ratings (
  order_id   UUID PRIMARY KEY,
  user_tg    BIGINT NOT NULL,
  sku        TEXT NOT NULL,
  rating     SMALLINT NOT NULL,        -- 1 = like, -1 = dislike
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ratings_sku ON ratings(sku);
