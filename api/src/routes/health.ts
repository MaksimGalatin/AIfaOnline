import type { FastifyInstance } from "fastify";
export async function healthRoutes(app: FastifyInstance) {
  app.get("/healthz", async () => ({ ok: true, ts: Date.now() }));
  app.get("/readyz", async () => ({ ready: true }));
}
