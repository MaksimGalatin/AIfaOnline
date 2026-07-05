import crypto from "node:crypto";
import { config } from "./config.js";

export function validateInitData(initData: string): null | { id: number; first_name?: string; language_code?: string } {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash"); if (!hash) return null;
    params.delete("hash");
    const dcs = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
    const secret = crypto.createHmac("sha256", "WebAppData").update(config.telegram.token).digest();
    const calc = crypto.createHmac("sha256", secret).update(dcs).digest("hex");
    const a = Buffer.from(calc, "hex"), b = Buffer.from(hash, "hex");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const authDate = Number(params.get("auth_date") || 0);
    if (!authDate || (Date.now() / 1000 - authDate) > 86400) return null; // reject initData older than 24h (replay protection)
    const user = JSON.parse(params.get("user") || "{}");
    if (!user.id) return null;
    return { id: user.id, first_name: user.first_name, language_code: user.language_code };
  } catch { return null; }
}

export async function createStarsInvoiceLink(title: string, description: string, payload: string, stars: number): Promise<string> {
  const res = await fetch(`https://api.telegram.org/bot${config.telegram.token}/createInvoiceLink`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description, payload, provider_token: "", currency: "XTR", prices: [{ label: title, amount: stars }] }),
  });
  const j = await res.json() as any;
  if (!j.ok) throw new Error("createInvoiceLink: " + JSON.stringify(j).slice(0, 200));
  return j.result as string;
}

export async function createStarsSubscriptionLink(title: string, description: string, payload: string, stars: number): Promise<string> {
  const res = await fetch(`https://api.telegram.org/bot${config.telegram.token}/createInvoiceLink`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description, payload, provider_token: "", currency: "XTR", prices: [{ label: title, amount: stars }], subscription_period: 2592000 }),
  });
  const j = await res.json() as any;
  if (!j.ok) throw new Error("createSubLink: " + JSON.stringify(j).slice(0, 200));
  return j.result as string;
}
