CREATE TABLE IF NOT EXISTS subscriptions (
  user_tg      BIGINT PRIMARY KEY,
  active_until TIMESTAMPTZ,
  last_daily   DATE,
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
