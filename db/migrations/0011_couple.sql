CREATE TABLE IF NOT EXISTS couple_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  a_tg       BIGINT NOT NULL,
  a_name     TEXT,
  a_about    TEXT,
  b_tg       BIGINT,
  b_name     TEXT,
  b_about    TEXT,
  lang       TEXT DEFAULT 'en',
  status     TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
