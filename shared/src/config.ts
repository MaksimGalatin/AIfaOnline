// Centralised env loader. Throws early if a required secret is missing.
// NEVER hardcode secrets here — only read from process.env.
function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}
function opt(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const config = {
  nodeEnv: opt("NODE_ENV", "development"),
  port: Number(opt("PORT", "8080")),
  publicBaseUrl: opt("PUBLIC_BASE_URL"),
  telegram: {
    token: opt("TELEGRAM_BOT_TOKEN"),
    webhookSecret: opt("TELEGRAM_WEBHOOK_SECRET"),
    username: opt("TELEGRAM_BOT_USERNAME", "AIfaCreativityBot"),
  },
  databaseUrl: opt("DATABASE_URL"),
  nowpayments: {
    apiKey: opt("NOWPAYMENTS_API_KEY"),
    ipnSecret: opt("NOWPAYMENTS_IPN_SECRET"),
  },
  gemini: { apiKey: opt("GEMINI_API_KEY"), projectId: opt("GCP_PROJECT_ID") },
  adminTgIds: (process.env.ADMIN_TG_IDS ?? "").split(",").map(x=>x.trim()).filter(Boolean),
  referral: {
    prestigeFloorPct: Number(opt("REF_PRESTIGE_FLOOR_PCT", "45")),
  },
  // call this on startup of services that REQUIRE these
  assertProd() {
    req("TELEGRAM_BOT_TOKEN");
    req("DATABASE_URL");
  },
};
