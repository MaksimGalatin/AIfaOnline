CREATE TABLE IF NOT EXISTS gift_codes (
  code           TEXT PRIMARY KEY,
  product_sku    TEXT NOT NULL,
  buyer_tg       BIGINT NOT NULL,
  redeemed_by_tg BIGINT,
  redeemed_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
