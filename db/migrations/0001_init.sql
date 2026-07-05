-- ============================================================
-- AIfa Works Creativity — initial schema (Phase 1)
-- Postgres (Neon) + pgvector. All money in integer cents (USD)
-- or Telegram Stars (XTR) units to avoid float errors.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS vector;      -- pgvector for RAG

-- ---------- enums ----------
DO $$ BEGIN
  CREATE TYPE order_status   AS ENUM ('created','awaiting_payment','paid','delivering','delivered','refunded','failed','canceled');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('stars','nowpayments');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending','confirmed','failed','refunded');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE prestige_rank  AS ENUM ('none','spark','resonance','eternal');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ---------- users ----------
CREATE TABLE IF NOT EXISTS users (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tg_id           BIGINT UNIQUE NOT NULL,
  username        TEXT,
  first_name      TEXT,
  lang            TEXT DEFAULT 'en',
  ref_code        TEXT UNIQUE NOT NULL,             -- own code to share
  referred_by     BIGINT REFERENCES users(id),       -- L1 referrer (set once, on first /start)
  prestige        prestige_rank NOT NULL DEFAULT 'none',
  prestige_floor  BOOLEAN NOT NULL DEFAULT false,    -- true once Eternal reached => permanent 45% floor
  ton_wallet      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- products ----------
CREATE TABLE IF NOT EXISTS products (
  id            SERIAL PRIMARY KEY,
  sku           TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  price_usd_cents INTEGER NOT NULL,                  -- e.g. 199 = $1.99
  price_stars   INTEGER NOT NULL,                    -- XTR amount
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- orders ----------
CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         BIGINT NOT NULL REFERENCES users(id),
  product_id      INTEGER NOT NULL REFERENCES products(id),
  status          order_status NOT NULL DEFAULT 'created',
  amount_usd_cents INTEGER NOT NULL,
  amount_stars    INTEGER,
  idempotency_key TEXT UNIQUE NOT NULL,              -- anti double-processing
  payload         JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ---------- payments ----------
CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id),
  method          payment_method NOT NULL,
  status          payment_status NOT NULL DEFAULT 'pending',
  external_id     TEXT,                              -- provider payment id / telegram charge id
  amount          NUMERIC(20,8) NOT NULL,
  currency        TEXT NOT NULL,                     -- 'XTR' | 'USDT' | ...
  raw_event       JSONB,                             -- last verified webhook payload
  uniq_event_key  TEXT UNIQUE,                       -- anti-replay for IPN
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

-- ---------- deliveries ----------
CREATE TABLE IF NOT EXISTS deliveries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id),
  delivered   BOOLEAN NOT NULL DEFAULT false,
  asset_url   TEXT,
  asset_kind  TEXT,                                  -- mp3|mp4|pdf|tgs|png
  attempts    INTEGER NOT NULL DEFAULT 0,
  delivered_at TIMESTAMPTZ,
  UNIQUE(order_id)                                   -- one delivery per order (idempotent)
);

-- ---------- referrals (attribution + accrual ledger) ----------
CREATE TABLE IF NOT EXISTS referrals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id),
  beneficiary_id BIGINT NOT NULL REFERENCES users(id), -- who earns
  level       SMALLINT NOT NULL,                      -- 1 (custom engine uses L1; multi-level optional)
  pct         NUMERIC(5,2) NOT NULL,                  -- 30/40/50/45
  amount_usd_cents INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(order_id, beneficiary_id, level)             -- accrue once
);
CREATE INDEX IF NOT EXISTS idx_referrals_benef ON referrals(beneficiary_id);

-- ---------- weekly counters (tier threshold; reset Mon 00:00 UTC) ----------
CREATE TABLE IF NOT EXISTS referral_weekly_counters (
  user_id      BIGINT NOT NULL REFERENCES users(id),
  week_start   DATE NOT NULL,                         -- Monday (UTC)
  paid_sales   INTEGER NOT NULL DEFAULT 0,
  earned_usd_cents INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, week_start)
);

-- ---------- tier config (auditable, editable without redeploy) ----------
CREATE TABLE IF NOT EXISTS referral_tiers (
  id         SERIAL PRIMARY KEY,
  from_sale  INTEGER NOT NULL,                        -- inclusive lower bound within week
  to_sale    INTEGER,                                 -- inclusive upper bound (NULL = infinity)
  pct        NUMERIC(5,2) NOT NULL
);

-- ---------- prestige ranks log ----------
CREATE TABLE IF NOT EXISTS prestige_ranks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    BIGINT NOT NULL REFERENCES users(id),
  rank       prestige_rank NOT NULL,
  reached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, rank)
);

-- ---------- milestone bonuses (10/50/100 lifetime sales) ----------
CREATE TABLE IF NOT EXISTS milestone_bonuses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    BIGINT NOT NULL REFERENCES users(id),
  milestone  INTEGER NOT NULL,                        -- 10|50|100
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reward_stars INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, milestone)
);

-- ---------- weekly leaderboard snapshot ----------
CREATE TABLE IF NOT EXISTS leaderboard (
  week_start DATE NOT NULL,
  user_id    BIGINT NOT NULL REFERENCES users(id),
  rank       INTEGER NOT NULL,
  paid_sales INTEGER NOT NULL,
  earned_usd_cents INTEGER NOT NULL,
  PRIMARY KEY (week_start, user_id)
);

-- ---------- api cost tracking (protect the grant) ----------
CREATE TABLE IF NOT EXISTS api_costs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID REFERENCES orders(id),
  service    TEXT NOT NULL,                            -- gemini|lyria|imagen|veo|elevenlabs
  units      NUMERIC(20,6),
  cost_usd   NUMERIC(20,6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- promo posts (Buffer/own channel, Phase 6) ----------
CREATE TABLE IF NOT EXISTS promo_posts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel    TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  posted_at  TIMESTAMPTZ,
  status     TEXT NOT NULL DEFAULT 'planned',
  body       TEXT
);

-- ---------- knowledge base (RAG, pgvector) ----------
CREATE TABLE IF NOT EXISTS kb_documents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source     TEXT NOT NULL,                            -- url/path
  chunk_idx  INTEGER NOT NULL DEFAULT 0,
  content    TEXT NOT NULL,
  embedding  vector(768),                              -- text-embedding-004 dim
  content_hash TEXT NOT NULL,                          -- skip re-embed if unchanged
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source, chunk_idx)
);
-- ANN index (cosine). Build after bulk load for best recall.
CREATE INDEX IF NOT EXISTS idx_kb_embedding ON kb_documents
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ---------- seed: tier config + products ----------
INSERT INTO referral_tiers (from_sale, to_sale, pct) VALUES
  (1, 10, 30.00), (11, 60, 40.00), (61, NULL, 50.00)
ON CONFLICT DO NOTHING;

INSERT INTO products (sku, title, price_usd_cents, price_stars) VALUES
  ('song',        'Personal AI Song',         199,  120),
  ('lyric_video', 'Song + Lyric Video',       499,  300),
  ('ai_clip',     'Song + AI Clip (Veo)',    1299,  780),
  ('tale',        'Personal AI Tale',         299,  180),
  ('stickerpack', 'AI Sticker Pack',          199,  120),
  ('voice',       'AI Voice Message',          99,   60),
  ('astro_once',  'Astro/Numerology (once)',   99,   60),
  ('astro_sub',   'Astro Subscription',       499,  300),
  ('bundle',      'Mega Bundle',              999,  600)
ON CONFLICT (sku) DO NOTHING;
