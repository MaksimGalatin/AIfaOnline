CREATE TABLE IF NOT EXISTS brands (
  code       TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  owner_tg   BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_brands_owner ON brands(owner_tg);
