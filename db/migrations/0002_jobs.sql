-- Generation job queue (Phase 3). One job per order.
CREATE TABLE IF NOT EXISTS jobs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES orders(id),
  kind       TEXT NOT NULL,                       -- song|lyric_video|stickerpack|astro|...
  status     TEXT NOT NULL DEFAULT 'queued',      -- queued|processing|done|failed
  attempts   INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status, created_at);
