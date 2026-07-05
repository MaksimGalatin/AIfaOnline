import { config } from "./config.js";
const API = () => `https://api.telegram.org/bot${config.telegram.token}`;

export async function tgSendMessage(chatId: number | string, text: string, extra: Record<string, unknown> = {}) {
  const res = await fetch(`${API()}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...extra }),
  });
  return res.json();
}

// Stars invoice via Bot API (provider_token empty, currency XTR).
export async function tgSendStarsInvoice(chatId: number | string, title: string, description: string, payload: string, stars: number) {
  const res = await fetch(`${API()}/sendInvoice`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId, title, description, payload,
      provider_token: "", currency: "XTR",
      prices: [{ label: title, amount: stars }],
    }),
  });
  return res.json();
}

async function sendMultipart(method: string, chatId: number | string, field: string, filename: string, mime: string, bytes: Buffer, extra: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("chat_id", String(chatId));
  for (const [k, v] of Object.entries(extra)) fd.set(k, v);
  fd.set(field, new Blob([new Uint8Array(bytes)], { type: mime }), filename);
  const res = await fetch(`${API()}/${method}`, { method: "POST", body: fd });
  return res.json();
}
export const tgSendAudio = (chatId: number | string, bytes: Buffer, title = "AIfa Song", caption = "") =>
  sendMultipart("sendAudio", chatId, "audio", `${title}.wav`, "audio/wav", bytes, caption ? { caption, parse_mode: "HTML" } : {});
export const tgSendPhoto = (chatId: number | string, bytes: Buffer, caption = "") =>
  sendMultipart("sendPhoto", chatId, "photo", "cover.png", "image/png", bytes, caption ? { caption, parse_mode: "HTML" } : {});

export const tgSendVoice = (chatId: number | string, bytes: Buffer, caption = "") =>
  sendMultipart("sendVoice", chatId, "voice", "voice.ogg", "audio/ogg", bytes, caption ? { caption, parse_mode: "HTML" } : {});

export const tgSendVideo = (chatId: number | string, bytes: Buffer, caption = "") =>
  sendMultipart("sendVideo", chatId, "video", "card.mp4", "video/mp4", bytes, caption ? { caption, parse_mode: "HTML" } : {});



export async function tgSendDocument(chatId: number | string, bytes: Buffer, filename: string, caption = "") {
  const fd = new FormData();
  fd.set("chat_id", String(chatId));
  if (caption) { fd.set("caption", caption); fd.set("parse_mode", "HTML"); }
  fd.set("document", new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" }), filename);
  const res = await fetch(`${API()}/sendDocument`, { method: "POST", body: fd });
  return res.json();
}

// Escape HTML special chars so AI text won't break parse_mode=HTML.
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Send plain text (no parse_mode), split into <=4000 char chunks. Reliable for long AI output.
export async function tgSendText(chatId: number | string, text: string) {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += 4000) chunks.push(text.slice(i, i + 4000));
  let last: any;
  for (const c of (chunks.length ? chunks : [text])) {
    const res = await fetch(`${API()}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: c }),
    });
    last = await res.json();
  }
  return last;
}

export const tgSendAudioMp3 = (chatId: number | string, bytes: Buffer, title = "AIfa Song", caption = "") =>
  sendMultipart("sendAudio", chatId, "audio", `${title}.mp3`, "audio/mpeg", bytes, caption ? { caption, parse_mode: "HTML" } : {});

export async function tgSendPhotoUrl(chatId: number | string, url: string, caption = "") {
  const res = await fetch(`${API()}/sendPhoto`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, photo: url, caption, parse_mode: caption ? "HTML" : undefined }),
  });
  return res.json();
}

export async function tgSendButtons(chatId: number | string, text: string, buttons: { text: string; callback_data?: string; url?: string; switch_inline_query?: string }[][]) {
  const res = await fetch(`${API()}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }),
  });
  return res.json();
}
