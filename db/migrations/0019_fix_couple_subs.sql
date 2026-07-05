-- Recreate couple_sessions + subscriptions with the schema the code expects (old tables had different columns).
DROP TABLE IF EXISTS couple_sessions CASCADE;
CREATE TABLE couple_sessions(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), a_tg BIGINT NOT NULL, a_name TEXT, a_about TEXT, b_tg BIGINT, b_name TEXT, b_about TEXT, lang TEXT, status TEXT NOT NULL DEFAULT 'waiting', created_at TIMESTAMPTZ NOT NULL DEFAULT now());
DROP TABLE IF EXISTS subscriptions CASCADE;
CREATE TABLE subscriptions(user_tg BIGINT PRIMARY KEY, active_until TIMESTAMPTZ, last_daily DATE, birth_info TEXT, lang TEXT, status TEXT NOT NULL DEFAULT 'active', created_at TIMESTAMPTZ NOT NULL DEFAULT now());
