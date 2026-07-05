CREATE TABLE IF NOT EXISTS scheduled_gifts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_tg    BIGINT NOT NULL,
  kind       TEXT NOT NULL DEFAULT 'poem',
  prompt     TEXT NOT NULL,
  deliver_on DATE NOT NULL,
  lang       TEXT DEFAULT 'en',
  delivered  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sched_due ON scheduled_gifts(deliver_on) WHERE delivered=false;
