import Fastify from "fastify";
import { config } from "shared";
import { healthRoutes } from "./routes/health.js";
import { nowpaymentsRoutes } from "./routes/nowpayments.js";
import { appRoutes } from "./routes/app.js";
import { startBot } from "bot";
import { startWorker } from "workers";

const app = Fastify({ logger: true, bodyLimit: 1 << 20 });

await app.register(healthRoutes);
await app.register(nowpaymentsRoutes);
await app.register(appRoutes);

// Cloud Run needs an HTTP listener on $PORT; bot uses long-polling, worker loops.
app.listen({ host: "0.0.0.0", port: config.port })
  .then(() => {
    app.log.info(`API on :${config.port}`);
    if (process.env.ROLE !== "web") { startBot(); startWorker(); }   // VM runs bot+worker; Cloud Run (ROLE=web) serves Mini App only
  })
  .catch((e) => { app.log.error(e); process.exit(1); });
