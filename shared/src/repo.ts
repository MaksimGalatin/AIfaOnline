import pg from "pg";
import { config } from "./config.js";

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

const origQuery = pool.query.bind(pool);
(pool as any).query = async (...args: any[]) => {
  try {
    return await origQuery.apply(pool, args as any);
  } catch (e) {
    console.warn("DB offline/fallback:", String(e).slice(0, 100));
    return { rows: [], rowCount: 0 };
  }
};


export const q = (text: string, params?: unknown[]) => pool.query(text, params);

// short alnum referral code from tg id + entropy
export function makeRefCode(tgId: number): string {
  const base = tgId.toString(36);
  const rnd = Math.random().toString(36).slice(2, 6);
  return (base + rnd).replace(/[^a-z0-9]/gi, "").slice(0, 12);
}

export interface DbUser { id: string; tg_id: string; referred_by: string | null; prestige_floor: boolean; }

/** Upsert user on /start. Sets referred_by ONCE (only if currently null and ref resolves to another user). */
export async function upsertUser(
  tgId: number, username: string | null, firstName: string | null, refCode: string | null,
  lang: string | null = null,
): Promise<DbUser> {
  const ins = await q(
    `INSERT INTO users (tg_id, username, first_name, ref_code, lang)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (tg_id) DO UPDATE SET username=EXCLUDED.username, first_name=EXCLUDED.first_name, lang=COALESCE(users.lang, EXCLUDED.lang), updated_at=now()
     RETURNING id, tg_id, referred_by, prestige_floor`,
    [tgId, username, firstName, makeRefCode(tgId), lang],
  );
  const user = (ins.rows[0] as DbUser) || { id: "offline-" + tgId, tg_id: String(tgId), referred_by: null, prestige_floor: false };
  if (!ins.rows[0]) return user;
  if (refCode && !user.referred_by) {
    const ref = await q(`SELECT id FROM users WHERE ref_code=$1`, [refCode]);
    const refId = ref.rows[0]?.id;
    if (refId && refId !== user.id) {
      const upd = await q(
        `UPDATE users SET referred_by=$1, updated_at=now()
         WHERE id=$2 AND referred_by IS NULL RETURNING id, tg_id, referred_by, prestige_floor`,
        [refId, user.id],
      );
      if (upd.rows[0]) return upd.rows[0] as DbUser;
    }
  }
  return user;
}

export interface Product { id: number; sku: string; title: string; price_usd_cents: number; price_stars: number; }
export async function getProduct(sku: string): Promise<Product | null> {
  const r = await q(`SELECT id, sku, title, price_usd_cents, price_stars FROM products WHERE sku=$1 AND active=true`, [sku]);
  return (r.rows[0] as Product) ?? null;
}

/** Create an order with a stable idempotency key. */
export async function createOrder(userId: string, p: Product): Promise<string> {
  const idem = `ord_${userId}_${p.sku}_${Date.now()}`;
  const r = await q(
    `INSERT INTO orders (user_id, product_id, amount_usd_cents, amount_stars, idempotency_key, status)
     VALUES ($1,$2,$3,$4,$5,'awaiting_payment') RETURNING id`,
    [userId, p.id, p.price_usd_cents, p.price_stars, idem],
  );
  return r.rows[0].id as string;
}


export async function bumpStreak(tgId: number): Promise<{ count: number; reward: number | null }> {
  const r = await pool.query(`SELECT streak_count, streak_last::text AS last, streak_reward FROM users WHERE tg_id=$1`, [tgId]);
  const row = r.rows[0]; if (!row) return { count: 0, reward: null };
  const today = new Date().toISOString().slice(0, 10);
  const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let count = row.streak_count ?? 0;
  if (row.last === today) { /* already counted today */ }
  else if (row.last === y) count = count + 1;
  else count = 1;
  let reward: number | null = null;
  const milestones = [3, 7, 14, 30];
  for (const m of milestones) { if (count >= m && m > (row.streak_reward ?? 0)) reward = m; }
  const newRewardMark = reward ?? row.streak_reward ?? 0;
  await pool.query(`UPDATE users SET streak_count=$2, streak_last=CURRENT_DATE, streak_reward=$3 WHERE tg_id=$1`, [tgId, count, newRewardMark]);
  return { count, reward };
}

export function isAdmin(tgId: number | string): boolean {
  return config.adminTgIds.includes(String(tgId));
}

export async function getReferralStats(tgId: number) {
  const u = await q(`SELECT id, ref_code FROM users WHERE tg_id=$1`, [tgId]);
  if (!u.rows[0]) return null;
  const id = u.rows[0].id;
  const R = await import("./referral.js");
  const week = R.weekStartUTC(new Date());
  const lastWeek = R.lastWeekStartUTC(new Date());
  const wc = await q(`SELECT paid_sales, earned_usd_cents FROM referral_weekly_counters WHERE user_id=$1 AND week_start=$2`, [id, week]);
  const lw = await q(`SELECT paid_sales FROM referral_weekly_counters WHERE user_id=$1 AND week_start=$2`, [id, lastWeek]);
  const life = await q(`SELECT COUNT(*)::int n, COALESCE(SUM(amount_usd_cents),0)::int earned FROM referrals WHERE beneficiary_id=$1`, [id]);
  const mine = await q(`SELECT COUNT(*)::int n FROM orders WHERE user_id=$1 AND status='delivered'`, [id]);
  const lastWeekSales = (lw.rows[0]?.paid_sales as number) ?? 0;
  return {
    refCode: u.rows[0].ref_code as string,
    weekSales: wc.rows[0]?.paid_sales ?? 0,
    weekEarnedCents: wc.rows[0]?.earned_usd_cents ?? 0,
    lastWeekSales,
    currentRate: R.weeklyRate(lastWeekSales),
    lifeSales: life.rows[0].n as number,
    lifeEarnedCents: life.rows[0].earned as number,
    myOrders: mine.rows[0].n as number,
  };
}
