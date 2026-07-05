import type { FastifyInstance } from "fastify";
import { config } from "shared";

// Telegram webhook. SECURITY: reject any request whose
// X-Telegram-Bot-Api-Secret-Token does not match our secret.
export async function telegramRoutes(app: FastifyInstance) {
  app.post("/webhook/telegram", async (req, reply) => {
    const got = req.headers["x-telegram-bot-api-secret-token"];
    if (!config.telegram.webhookSecret || got !== config.telegram.webhookSecret) {
      app.log.warn("telegram webhook: bad secret token");
      return reply.code(401).send({ ok: false });
    }
    // Phase 1: bot runs in long-polling for local dev; this endpoint is the
    // prod path. Hand the update to the bot handler (wired in Phase 2).
    app.log.info({ update: (req.body as any)?.update_id }, "tg update");
    return reply.send({ ok: true });
  });
}
