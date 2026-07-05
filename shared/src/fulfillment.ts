import { pool } from "./repo.js";
import { weeklyRate, weekStartUTC, lastWeekStartUTC, netCentsFromStars } from "./referral.js";

export interface PaymentEvent {
  orderId: string;
  method: "stars" | "nowpayments";
  externalId: string;     // telegram charge id OR nowpayments payment_id
  amount: number;         // paid amount (XTR units or crypto)
  currency: string;       // 'XTR' | 'USDT' | ...
  uniqEventKey: string;   // anti-replay: e.g. `${payment_id}:${status}`
  raw: unknown;
}

export interface FulfillResult {
  alreadyProcessed: boolean;
  delivered: boolean;
  assetKind: string;
  commissionCents?: number;
  beneficiaryTgId?: string;
}

/**
 * Idempotently: record payment, mark order paid, accrue referral (custom weekly
 * weekly KPI tiers (rate set by last week), create delivery. One DB transaction,
 * row-locked. Safe to call multiple times for the same payment (replay-proof).
 */
export async function fulfillPaidOrder(ev: PaymentEvent): Promise<FulfillResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // lock the order
    const ord = await client.query(
      `SELECT o.id, o.user_id, o.status, o.amount_usd_cents, o.amount_stars, u.referred_by, u.tg_id, p.sku
         FROM orders o JOIN users u ON u.id=o.user_id JOIN products p ON p.id=o.product_id
        WHERE o.id=$1 FOR UPDATE`, [ev.orderId]);
    if (!ord.rows[0]) { await client.query("ROLLBACK"); throw new Error("order not found"); }
    const o = ord.rows[0];

    if (o.status === "delivered" || o.status === "paid") {
      await client.query("COMMIT");
      return { alreadyProcessed: true, delivered: o.status === "delivered", assetKind: "" };
    }

    // record payment with anti-replay uniqueness
    const pay = await client.query(
      `INSERT INTO payments (order_id, method, status, external_id, amount, currency, raw_event, uniq_event_key, confirmed_at)
       VALUES ($1,$2,'confirmed',$3,$4,$5,$6,$7,now())
       ON CONFLICT (uniq_event_key) DO NOTHING RETURNING id`,
      [ev.orderId, ev.method, ev.externalId, ev.amount, ev.currency, JSON.stringify(ev.raw), ev.uniqEventKey]);
    if (!pay.rows[0]) { // replay
      await client.query("COMMIT");
      return { alreadyProcessed: true, delivered: false, assetKind: "" };
    }

    await client.query(`UPDATE orders SET status='paid', updated_at=now() WHERE id=$1`, [ev.orderId]);

    // ---- referral accrual (L1 custom engine) ----
    let commission: number | undefined;
    let benefTg: string | undefined;
    if (o.referred_by) {
      const benef = await client.query(`SELECT id, tg_id FROM users WHERE id=$1 FOR UPDATE`, [o.referred_by]);
      const b = benef.rows[0];
      const week = weekStartUTC(new Date());
      const lastWeek = lastWeekStartUTC(new Date());
      const lw = await client.query(`SELECT paid_sales FROM referral_weekly_counters WHERE user_id=$1 AND week_start=$2`, [b.id, lastWeek]);
      const lastWeekSales = (lw.rows[0]?.paid_sales as number) ?? 0;
      const pct = weeklyRate(lastWeekSales);                       // rate set by LAST week's KPI
      const netCents = netCentsFromStars(o.amount_stars);          // what we actually receive (Telegram fee deducted)
      commission = Math.round((netCents * pct) / 100);             // % of received amount, NOT sticker price
      benefTg = b.tg_id;
      await client.query(
        `INSERT INTO referral_weekly_counters (user_id, week_start, paid_sales, earned_usd_cents)
         VALUES ($1,$2,1,$3)
         ON CONFLICT (user_id, week_start) DO UPDATE SET
           paid_sales = referral_weekly_counters.paid_sales + 1,
           earned_usd_cents = referral_weekly_counters.earned_usd_cents + $3`, [b.id, week, commission]);
      await client.query(
        `INSERT INTO referrals (order_id, beneficiary_id, level, pct, amount_usd_cents)
         VALUES ($1,$2,1,$3,$4) ON CONFLICT (order_id, beneficiary_id, level) DO NOTHING`,
        [ev.orderId, b.id, pct, commission]);
    }

    // ---- enqueue generation job (interactive stories are handled live by the bot, no worker job) ----
    const INTERACTIVE = new Set(["tale", "detective", "tarot"]);
    if (!INTERACTIVE.has(o.sku)) {
      await client.query(
        `INSERT INTO jobs (order_id, kind, status) VALUES ($1,$2,'queued')
         ON CONFLICT (order_id) DO NOTHING`, [ev.orderId, o.sku]);
    }
    await client.query(`UPDATE orders SET status='delivering', updated_at=now() WHERE id=$1`, [ev.orderId]);

    await client.query("COMMIT");
    return { alreadyProcessed: false, delivered: false, assetKind: o.sku, commissionCents: commission, beneficiaryTgId: benefTg };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
