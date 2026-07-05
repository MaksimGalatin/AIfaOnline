CREATE TABLE IF NOT EXISTS reminders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_tg    BIGINT NOT NULL,
  label      TEXT NOT NULL,
  mm         SMALLINT NOT NULL,
  dd         SMALLINT NOT NULL,
  last_year  SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reminders_md ON reminders(mm, dd);
