import crypto from "node:crypto";
import { config } from "./config.js";

const BASE = "https://api.nowpayments.io/v1";

// Create a hosted invoice. Returns the payment URL to send the user.
export async function createNowInvoice(orderId: string, amountUsd: number, productTitle: string): Promise<{ url: string; id: string }> {
  const res = await fetch(`${BASE}/invoice`, {
    method: "POST",
    headers: { "x-api-key": config.nowpayments.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount: amountUsd,
      price_currency: "usd",
      order_id: orderId,
      order_description: productTitle,
      ipn_callback_url: `${config.publicBaseUrl}/webhook/nowpayments`,
      success_url: `https://t.me/${config.telegram.username}`,
      cancel_url: `https://t.me/${config.telegram.username}`,
    }),
  });
  if (!res.ok) throw new Error(`NOWPayments invoice failed: ${res.status} ${await res.text()}`);
  const j = await res.json() as any;
  return { url: j.invoice_url, id: String(j.id) };
}

// Sort object keys recursively, then HMAC-SHA512 — exactly how NOWPayments signs IPN.
function sortedStringify(obj: unknown): string {
  if (Array.isArray(obj)) return `[${obj.map(sortedStringify).join(",")}]`;
  if (obj && typeof obj === "object") {
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    return `{${keys.map(k => JSON.stringify(k) + ":" + sortedStringify((obj as any)[k])).join(",")}}`;
  }
  return JSON.stringify(obj);
}

export function verifyNowIpn(rawBody: Record<string, unknown>, signature: string): boolean {
  const secret = config.nowpayments.ipnSecret;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha512", secret).update(sortedStringify(rawBody)).digest("hex");
  const a = Buffer.from(signature); const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
