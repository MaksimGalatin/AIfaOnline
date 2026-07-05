import type { FastifyInstance } from "fastify";
import { verifyNowIpn, fulfillPaidOrder, tgSendMessage, pool } from "shared";

// NOWPayments IPN: verify HMAC-SHA512, then idempotently fulfill on success.
export async function nowpaymentsRoutes(app: FastifyInstance) {
  app.post("/webhook/nowpayments", async (req, reply) => {
    const sig = req.headers["x-nowpayments-sig"];
    if (typeof sig !== "string" || !verifyNowIpn(req.body as Record<string, unknown>, sig)) {
      app.log.warn("nowpayments IPN: bad signature");
      return reply.code(401).send({ ok: false });
    }
    const b = req.body as any;
    const status = String(b.payment_status || "");
    const orderId = String(b.order_id || "");
    if (!["finished", "confirmed", "partially_paid"].includes(status)) {
      app.log.info({ status }, "nowpayments IPN: non-final status, ack");
      return reply.send({ ok: true }); // ack intermediate states
    }
    try {
      const res = await fulfillPaidOrder({
        orderId, method: "nowpayments", externalId: String(b.payment_id),
        amount: Number(b.pay_amount ?? b.price_amount ?? 0), currency: String(b.pay_currency ?? "usd"),
        uniqEventKey: `now:${b.payment_id}:${status}`, raw: b,
      });
      // deliver to buyer
      const u = await pool.query(
        `SELECT u.tg_id FROM orders o JOIN users u ON u.id=o.user_id WHERE o.id=$1`, [orderId]);
      const tg = u.rows[0]?.tg_id;
      if (tg && !res.alreadyProcessed) {
        await tgSendMessage(tg, "🎁 <b>Payment confirmed — your AIfa gift is ready!</b>");
        if (res.commissionCents && res.beneficiaryTgId)
          await tgSendMessage(res.beneficiaryTgId, `💸 You earned <b>$${(res.commissionCents/100).toFixed(2)}</b> from a referral sale!`).catch(()=>{});
      }
      return reply.send({ ok: true });
    } catch (e) {
      app.log.error(e, "fulfill failed");
      return reply.code(500).send({ ok: false }); // NOWPayments will retry
    }
  });
}
