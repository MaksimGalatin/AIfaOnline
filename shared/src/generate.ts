import { config } from "./config.js";
import { getAccessToken } from "./auth.js";

const LOC = "us-central1";
const host = `https://${LOC}-aiplatform.googleapis.com`;
const proj = () => config.gemini.projectId;

async function predict(model: string, body: unknown): Promise<any> {
  const token = await getAccessToken();
  const url = `${host}/v1/projects/${proj()}/locations/${LOC}/publishers/google/models/${model}:predict`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${model} predict ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

/** Generate a song (WAV bytes) with Lyria 2. */
export async function generateSong(prompt: string): Promise<Buffer> {
  const j = await predict("lyria-002", { instances: [{ prompt }], parameters: { sample_count: 1 } });
  const b64 = j.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error("lyria: no audio in response");
  return Buffer.from(b64, "base64");
}

/** Generate a cover image (PNG bytes) with Imagen. */
export async function generateCover(prompt: string): Promise<Buffer> {
  const j = await predict("imagen-3.0-generate-002", {
    instances: [{ prompt }],
    parameters: { sampleCount: 1, aspectRatio: "1:1" },
  });
  const b64 = j.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error("imagen: no image in response");
  return Buffer.from(b64, "base64");
}

/** Generic Gemini text generation via Vertex (global gemini-2.5-flash). */
export async function geminiText(prompt: string): Promise<string> {
  const token = await getAccessToken();
  const url = `https://aiplatform.googleapis.com/v1/projects/${config.gemini.projectId}/locations/global/publishers/google/models/gemini-2.5-flash:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
  });
  if (!res.ok) throw new Error(`gemini astro ${res.status}: ${(await res.text()).slice(0,200)}`);
  const j = await res.json() as any;
  return j.candidates?.[0]?.content?.parts?.[0]?.text ?? "Result unavailable, please try again.";
}
export const generateAstro = geminiText;

import { concatWav } from "./wav.js";
/** Stitch several Lyria clips into a ~2.5-3 min track. */
export async function generateLongSong(prompt: string, segments = 4): Promise<Buffer> {
  const parts: Buffer[] = [];
  for (let i = 0; i < segments; i++) {
    try { parts.push(await generateSong(prompt)); }
    catch (e) { if (parts.length === 0) throw e; break; }
  }
  return concatWav(parts);
}

/** Generate a full song WITH VOCALS using Lyria 3 Pro (interactions API). Returns mp3 bytes. */
export async function generateVocalSong(prompt: string): Promise<Buffer> {
  const token = await getAccessToken();
  const url = `https://aiplatform.googleapis.com/v1beta1/projects/${config.gemini.projectId}/locations/global/interactions`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ model: "lyria-3-pro-preview", input: [{ type: "text", text: prompt }] }),
  });
  if (!res.ok) throw new Error(`lyria-3-pro ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json() as any;
  const audio = (j.outputs ?? []).find((o: any) => o.type === "audio" && o.data);
  if (!audio?.data) throw new Error("lyria-3-pro: no audio in response");
  return Buffer.from(audio.data, "base64");
}

/** Text-to-speech via Google Cloud TTS (grant). Returns OGG/OPUS bytes (Telegram voice-ready). */
export async function generateSpeech(text: string, lang?: string): Promise<Buffer> {
  const token = await getAccessToken();
  const voice = lang === "ru" ? { languageCode: "ru-RU", name: "ru-RU-Wavenet-C" }
    : lang === "es" ? { languageCode: "es-ES", name: "es-ES-Wavenet-C" }
    : { languageCode: "en-US", name: "en-US-Wavenet-F" };
  const body = { input: { text: text.slice(0, 4500) }, voice, audioConfig: { audioEncoding: "OGG_OPUS", speakingRate: 0.97, pitch: 0 } };
  const res = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("tts " + res.status + ": " + (await res.text()).slice(0, 200));
  const j = await res.json() as any;
  if (!j.audioContent) throw new Error("tts: no audio");
  return Buffer.from(j.audioContent, "base64");
}

/** Speech-to-text via Google STT (grant). Input: Telegram OGG/OPUS voice bytes. */
export async function transcribeVoice(ogg: Buffer, lang?: string): Promise<string> {
  const token = await getAccessToken();
  const languageCode = lang === "ru" ? "ru-RU" : lang === "es" ? "es-ES" : "en-US";
  const body = { config: { encoding: "OGG_OPUS", sampleRateHertz: 48000, languageCode, enableAutomaticPunctuation: true }, audio: { content: ogg.toString("base64") } };
  const res = await fetch("https://speech.googleapis.com/v1/speech:recognize", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("stt " + res.status + ": " + (await res.text()).slice(0, 200));
  const j = await res.json() as any;
  return (j.results || []).map((r: any) => r.alternatives?.[0]?.transcript || "").join(" ").trim();
}
