import { config, t, parseBirth, pool, generateSong, generateLongSong, generateVocalSong, generateCover, geminiText, tgSendAudio, tgSendAudioMp3, tgSendPhoto, tgSendPhotoUrl, tgSendMessage, tgSendText, drawThree, tarotReadingPrompt, BUNDLES, makePdf, tgSendDocument, generateSpeech, tgSendVoice, makeVideoCard, tgSendVideo, tgSendButtons } from "shared";

const AUDIO_KINDS = new Set(["song", "lyric_video", "ai_clip", "bundle"]);
const langName = (l?: string) => (l === "ru" ? "Russian" : l === "es" ? "Spanish" : "English");
const lgKey = (l: any): "en" | "ru" | "es" => (l === "ru" || l === "es" ? l : "en");

const TEXT_KINDS = new Set(["poem", "love_letter", "dream", "compatibility"]);
function headerFor(kind: string, lang?: string): string {
  const ru = lang === "ru", es = lang === "es";
  const M: Record<string, [string, string, string]> = {
    poem: ["📝 Your AIfa poem", "📝 Твой стих от AIfa", "📝 Tu poema de AIfa"],
    love_letter: ["💌 Your love letter", "💌 Твоё любовное письмо", "💌 Tu carta de amor"],
    dream: ["🌙 Your dream interpretation", "🌙 Толкование твоего сна", "🌙 Interpretación de tu sueño"],
    compatibility: ["❤️ Your compatibility report", "❤️ Ваша совместимость", "❤️ Vuestra compatibilidad"],
    year_ahead: ["🔭 Your year ahead", "🔭 Твой год вперёд", "🔭 Tu año por delante"],
    tale: ["📖 Your AIfa fairy tale", "📖 Твоя сказка от AIfa", "📖 Tu cuento de AIfa"],
    tarot: ["🃏 Your tarot reading", "🃏 Твой расклад Таро", "🃏 Tu lectura de tarot"],
    astro_full: ["🔮 Your astrology reading", "🔮 Твой астропрогноз", "🔮 Tu lectura astrológica"],
    name_secrets: ["🔤 Secrets of your name", "🔤 Тайны твоего имени", "🔤 Secretos de tu nombre"],
  };
  const m = M[kind] ?? ["✨ Your AIfa gift", "✨ Твой подарок AIfa", "✨ Tu regalo AIfa"];
  return ru ? m[1] : es ? m[2] : m[0];
}
function promptFor(kind: string, input: any): string {
  const ln = langName(input?.lang);
  const p = String(input?.prompt ?? "");
  switch (kind) {
    case "poem": return `Write in ${ln}. Compose a heartfelt, beautiful personal poem based on: "${p}". 8-16 lines, warm, specific, with rhythm.`;
    case "love_letter": return `Write in ${ln}. Write a romantic, sincere love letter based on: "${p}". Tender and personal, about 150-220 words.`;
    case "dream": return `Write in ${ln}. Interpret this dream with empathy and insight (psychological and symbolic): "${p}". About 200-300 words, structured.`;
    case "compatibility": return `Write in ${ln}. Two people: "${p}". Give a warm, fun astrology + numerology compatibility report: overall match %, strengths, challenges, and advice. About 250-350 words.`;
    case "year_ahead": return `Write in ${ln}. For "${p}", write a detailed YEAR-AHEAD forecast: love, career, money, health, growth, and key months. About 400-500 words, uplifting and specific.`;
    case "tale": return `Write in ${ln}. Write a magical, child-friendly personal fairy tale where the hero is based on: "${p}". About 300-400 words, with a gentle moral.`;
    case "tarot": return `Write in ${ln}. Do a 3-card tarot reading (Past, Present, Future) for the question: "${p}". Name each drawn card, interpret it, and give guidance. About 250-350 words.`;
    default: return p;
  }
}
function taleJsonPrompt(input: any): string {
  const ln = langName(input?.lang);
  const p = String(input?.prompt ?? "");
  return `Write a magical, child-friendly fairy tale in ${ln} where the hero is based on: "${p}". ` +
    `Split it into EXACTLY 10 chapters with a clear story arc. Return ONLY a raw JSON array of 10 objects ` +
    `(no markdown, no code fences), each: {"title": short chapter title in ${ln}, "text": 250-330 words of story in ${ln}, ` +
    `"image": a vivid ENGLISH description of a scene illustrating this chapter, with NO text/words/letters in it}. ` +
    `Each chapter MUST be 250-330 words (rich, detailed, vivid). EXACTLY 10 chapters, each with its own image. Output ONLY the JSON array.`;
}
function parseChapters(raw: string): Array<{ title: string; text: string; image: string }> {
  let t = raw.trim();
  const a = t.indexOf("["), b = t.lastIndexOf("]");
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  try {
    const arr = JSON.parse(t);
    if (Array.isArray(arr) && arr.length) return arr.map((x: any) => ({ title: String(x.title ?? ""), text: String(x.text ?? ""), image: String(x.image ?? "a magical fairy tale scene") }));
  } catch { /* fall through */ }
  return [{ title: "", text: raw.slice(0, 3500), image: "a magical fairy tale scene" }];
}
async function sendFriendCta(tgId: number | string, refCode: string, lang: "en"|"ru"|"es") {
  const link = `https://t.me/${config.telegram.username}?start=ref_${refCode}`;
  const txt = { en: "Loved it? 🎁 Create the same for a friend!", ru: "Понравилось? 🎁 Создай такое же для друга!", es: "¿Te gustó? 🎁 ¡Crea lo mismo para un amigo!" }[lang];
  const btn = { en: "🎁 Gift to a friend", ru: "🎁 Подарить другу", es: "🎁 Regalar a un amigo" }[lang];
  await tgSendMessage(tgId, txt, { reply_markup: { inline_keyboard: [[{ text: btn, switch_inline_query: `Create AI gifts with AIfa 🎁 ${link}` }]] } });
}

async function claimJob() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const j = await client.query(
      `SELECT j.id, j.order_id, j.kind, j.attempts, u.tg_id, u.ref_code, o.input
         FROM jobs j JOIN orders o ON o.id=j.order_id JOIN users u ON u.id=o.user_id
        WHERE j.status='queued'
        ORDER BY j.created_at
        FOR UPDATE SKIP LOCKED LIMIT 1`);
    if (!j.rows[0]) { await client.query("COMMIT"); return null; }
    const job = j.rows[0];
    await client.query(`UPDATE jobs SET status='processing', attempts=attempts+1, updated_at=now() WHERE id=$1`, [job.id]);
    await client.query("COMMIT");
    return job;
  } finally { client.release(); }
}

function fullAstroPrompt(input: any): string {
  const b = input?.birth ?? parseBirth(String(input?.prompt ?? "")) ?? {};
  const ln = langName(input?.lang);
  const today = new Date().toISOString().slice(0, 10);
  return `You are AIfa, a master astrologer and numerologist. Today's date is ${today} (year 2026, NOT 2024). Write in ${ln}. ` +
    `Person: name "${b.name}", born ${b.day}.${b.month}.${b.year}, Western zodiac ${b.zodiac}, ` +
    `Chinese year of the ${b.chinese}. Produce a DETAILED daily forecast (about 350-450 words) with sections: ` +
    `Overall energy, Love and relationships, Career and money, Health, Numerology (life-path number with meaning), ` +
    `Lucky number and color, and a short personal affirmation. Be specific, warm, practical and uplifting.`;
}
function nameSecretsPrompt(input: any): string {
  const b = input?.birth ?? parseBirth(String(input?.prompt ?? "")) ?? {};
  const ln = langName(input?.lang);
  return `You are AIfa, an expert in onomastics and numerology. Write in ${ln}. ` +
    `For the name "${b.name}" (born ${b.day}.${b.month}.${b.year}, ${b.zodiac}, year of the ${b.chinese}), ` +
    `write a rich, flattering yet honest personality profile (about 350-450 words): origin and meaning of the name, ` +
    `core traits, strengths, growth areas, numerology life-path number and meaning, ideal careers, and love notes.`;
}

const REGEN_KINDS = new Set(["astro_full", "name_secrets", "dream", "compatibility", "poem", "love_letter"]);
async function sendPostDelivery(tgId: number, orderId: string, kind: string, lang: string) {
  const lg: "en"|"ru"|"es" = (lang === "ru" || lang === "es") ? lang : "en";
  const btns: { text: string; callback_data: string }[][] = [];
  if (REGEN_KINDS.has(kind)) btns.push([{ text: t(lg, "regen_btn"), callback_data: "regen:" + orderId }]);
  btns.push([{ text: t(lg, "rate_up"), callback_data: "rate:up:" + orderId }, { text: t(lg, "rate_down"), callback_data: "rate:down:" + orderId }]);
  try { await tgSendButtons(tgId, t(lg, "rate_q"), btns); } catch (e) { console.warn("postdeliver", String(e).slice(0, 60)); }
}
async function processOne(): Promise<boolean> {
  const job = await claimJob();
  if (!job) return false;
  const input = job.input ?? {};
  try {
    if (AUDIO_KINDS.has(job.kind)) {
      const userPrompt = typeof input.prompt === "string" && input.prompt ? input.prompt : "warm heartfelt personal gift";
      const en = await geminiText(`Rewrite this music idea as a short ENGLISH instrumental music prompt (style, mood, tempo, instruments; NO lyrics, NO vocals), ONE line only: "${userPrompt}"`);
      const audio = await generateLongSong(`Instrumental: ${en}. Emotional, melodic, high quality.`, 4);
      try {
        const cover = await generateCover(`album cover art, warm, tasteful, abstract: ${en}. No text, no words, no letters.`);
        await tgSendPhoto(job.tg_id, cover, "Your cover art");
      } catch (e) { console.warn("cover failed", String(e).slice(0, 120)); }
      await tgSendAudio(job.tg_id, audio, "AIfa Song", { en: "🎵 <b>Your personal AIfa track</b>", ru: "🎵 <b>Твой персональный трек AIfa</b>", es: "🎵 <b>Tu pista personal de AIfa</b>" }[lgKey(input?.lang)]);
    } else if (job.kind === "song_vocal") {
      const userPrompt = typeof input.prompt === "string" && input.prompt ? input.prompt : "uplifting personal song";
      const en = await geminiText(`Rewrite this as a concise ENGLISH prompt for a complete vocal SONG with lyrics (include style, mood, theme, and the requested male or female voice), 1-2 lines: "${userPrompt}"`);
      const audio = await generateVocalSong(en);
      const lg: "en"|"ru"|"es" = (input?.lang === "ru" || input?.lang === "es") ? input.lang : "en";
      const cap = { en: "🎤 <b>Your personal AIfa song</b>", ru: "🎤 <b>Твоя персональная песня AIfa</b>", es: "🎤 <b>Tu canción personal de AIfa</b>" }[lg];
      await tgSendAudioMp3(job.tg_id, audio, "AIfa Song", cap);
    } else if (job.kind === "astro_full" || job.kind === "astro_once" || job.kind === "astro_sub") {
      const text = await geminiText(fullAstroPrompt(input));
      await tgSendText(job.tg_id, headerFor("astro_full", input?.lang) + "\n\n" + text);
      try { const pdf = await makePdf(input?.lang === "ru" ? "Твой астропрогноз от AIfa" : input?.lang === "es" ? "Tu astrología de AIfa" : "Your AIfa Astrology", text); await tgSendDocument(job.tg_id, pdf, "AIfa_Astrology.pdf", "📄 Premium PDF"); } catch (e) { console.warn("astro pdf", String(e).slice(0, 80)); }
    } else if (job.kind === "name_secrets") {
      const text = await geminiText(nameSecretsPrompt(input));
      await tgSendText(job.tg_id, headerFor("name_secrets", input?.lang) + "\n\n" + text);
      try { const pdf = await makePdf(input?.lang === "ru" ? "Тайны твоего имени" : input?.lang === "es" ? "Secretos de tu nombre" : "Secrets of Your Name", text); await tgSendDocument(job.tg_id, pdf, "AIfa_Name.pdf", "📄 Premium PDF"); } catch (e) { console.warn("name pdf", String(e).slice(0, 80)); }
    } else if (job.kind === "year_ahead") {
      const ln = langName(input?.lang);
      const p = String(input?.prompt ?? "");
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const months: string[] = [];
      for (let i = 0; i < 12; i++) { const d = new Date(now.getFullYear(), now.getMonth() + i, 1); months.push(d.toLocaleString("en-US", { month: "long", year: "numeric" })); }
      await tgSendText(job.tg_id, headerFor("year_ahead", input?.lang));
      try {
        const ov = await geminiText(`Today is ${todayStr} (year 2026). Write in ${ln}. For "${p}", write an inspiring, DETAILED overview of the year AHEAD starting from TODAY (covering ${months[0]} through ${months[11]}): the overarching theme, the biggest opportunities, the key lessons, and what makes this year special. 3500-4500 characters, specific, warm, vivid.`);
        await tgSendText(job.tg_id, ov);
      } catch (e) { console.warn("yo overview", String(e).slice(0, 60)); }
      for (const m of months) {
        try {
          const part = await geminiText(`Today is ${todayStr}. Write in ${ln}. For "${p}", write a DETAILED forecast for the month of ${m}: love & relationships, career, money, health, key dates, and concrete advice. 3000-4000 characters, specific and practical. Refer ONLY to ${m}; do not mention any other month or year.`);
          await tgSendText(job.tg_id, part);
          try { const mi = await generateCover(`atmospheric symbolic illustration representing the mood and energy of ${m}, seasonal, beautiful, evocative. ABSOLUTELY NO text, no letters, no words, no numbers.`); await tgSendPhoto(job.tg_id, mi); } catch (e) { console.warn("year img", String(e).slice(0, 60)); }
        } catch (e) { console.warn("yo month", String(e).slice(0, 60)); }
      }
      for (const area of ["LOVE and relationships", "CAREER and purpose", "MONEY and abundance", "HEALTH and energy", "PERSONAL GROWTH and spirituality", "lucky periods, lucky numbers and colors, plus final personal advice and affirmations"]) {
        try {
          const part = await geminiText(`Today is ${todayStr}. Write in ${ln}. For "${p}", write a deep-dive on ${area} across the next 12 months starting from today. 3000-4000 characters, specific, with concrete guidance.`);
          await tgSendText(job.tg_id, part);
        } catch (e) { console.warn("yo area", String(e).slice(0, 60)); }
      }
    } else if (TEXT_KINDS.has(job.kind)) {
      const text = await geminiText(promptFor(job.kind, input));
      await tgSendText(job.tg_id, headerFor(job.kind, input?.lang) + "\n\n" + text);
      if (job.kind === "poem" || job.kind === "love_letter") {
        try { const ogg = await generateSpeech(text, input?.lang); await tgSendVoice(job.tg_id, ogg, t(input?.lang || "en", "voice_caption")); } catch (e) { console.warn("voice", String(e).slice(0, 80)); }
        try {
          const teaser = text.replace(/\s+/g, " ").trim().slice(0, 150);
          const bg = job.kind === "love_letter"
            ? "romantic vintage love-letter aesthetic, soft rose light, delicate flowers, elegant bokeh, tasteful. ABSOLUTELY no text, no letters, no words."
            : "soft poetic decorative background, warm golden bokeh, gentle pastel tones, elegant, dreamy. ABSOLUTELY no text, no letters, no words.";
          const card = await generateCover(bg);
          const cap = `<i>«${teaser}…»</i>\n\n✨ @AIfaCreativityBot`;
          await tgSendPhoto(job.tg_id, card, cap);
        } catch (e) { console.warn("teaser card", String(e).slice(0, 80)); }
      }
    } else if (job.kind === "tale") {
      const ln = langName(input?.lang);
      const p = String(input?.prompt ?? "");
      const outline = await geminiText(`Give EXACTLY 10 short ENGLISH visual scene beats for a children fairy tale about: "${p}". One per line, numbered 1 to 10. Each beat is a vivid visual scene to illustrate (characters, setting, action), with NO text/letters/words in the scene.`);
      let beats = outline.split("\n").map((l) => l.replace(/^\s*\d+[.):]?\s*/, "").trim()).filter((l) => l.length > 3).slice(0, 10);
      while (beats.length < 10) beats.push(`a magical fairy tale scene featuring the hero (${p})`);
      await tgSendText(job.tg_id, headerFor("tale", input?.lang));
      for (let i = 0; i < 10; i++) {
        const beat = beats[i];
        const text = await geminiText(`Write in ${ln}. This is chapter ${i + 1} of 10 of a warm, child-friendly fairy tale whose hero is based on: "${p}". This chapter depicts: ${beat}. Write 250-330 words, vivid and continuous, advancing the story. Output ONLY the chapter prose (no title, no chapter number).`);
        await tgSendText(job.tg_id, `${i + 1}/10\n\n${text}`);
        try {
          const img = await generateCover(`${beat}. Children storybook illustration, colorful, whimsical, cinematic, highly detailed. ABSOLUTELY NO text, no letters, no words, no writing, no captions, no numbers, no signs.`);
          await tgSendPhoto(job.tg_id, img);
        } catch (e) { console.warn("tale img " + (i + 1), String(e).slice(0, 100)); }
      }
    } else if (job.kind === "tarot") {
      const cards = drawThree();
      const pos = input?.lang === "ru" ? ["Прошлое","Настоящее","Будущее"] : input?.lang === "es" ? ["Pasado","Presente","Futuro"] : ["Past","Present","Future"];
      await tgSendText(job.tg_id, headerFor("tarot", input?.lang));
      for (let i = 0; i < 3; i++) {
        const name = input?.lang === "ru" ? cards[i].ru : cards[i].en;
        try { await tgSendPhotoUrl(job.tg_id, cards[i].url, `🃏 ${pos[i]}: <b>${name}</b>`); } catch (e) { console.warn("tarot card", String(e).slice(0,80)); }
      }
      const text = await geminiText(tarotReadingPrompt(cards, String(input?.prompt || ""), langName(input?.lang)));
      await tgSendText(job.tg_id, text);
    } else if (job.kind === "music_card") {
      const p = String(input?.prompt ?? "a warm greeting");
      const en = await geminiText(`Translate to a short ENGLISH instrumental music style/mood line for: "${p}". Only the description.`).catch(() => "warm gentle acoustic, heartfelt");
      const img = await generateCover(`beautiful tasteful greeting-card illustration for: ${p}. Warm, elegant, soft light. ABSOLUTELY no text, no letters, no words.`);
      const cap = input?.lang === "ru" ? "🎬 Твоя живая музыкальная открытка" : input?.lang === "es" ? "🎬 Tu tarjeta musical viva" : "🎬 Your living musical card";
      let audio: Buffer | null = null;
      try { audio = await generateSong(en); } catch (e) { console.warn("mc song", String(e).slice(0, 60)); }
      if (audio) {
        try { const mp4 = await makeVideoCard(img, audio); await tgSendVideo(job.tg_id, mp4, cap); }
        catch (e) { console.warn("mc video", String(e).slice(0, 80)); await tgSendPhoto(job.tg_id, img, cap); await tgSendAudio(job.tg_id, audio, "AIfa"); }
      } else { await tgSendPhoto(job.tg_id, img, cap); }
    } else if (job.kind.startsWith("bundle_")) {
      const comps = BUNDLES[job.kind] || [];
      const ln = langName(input?.lang);
      const p = String(input?.prompt ?? "");
      const head = input?.lang === "ru" ? "🎁 Твой набор готовится — лови по очереди:" : input?.lang === "es" ? "🎁 Tu pack está listo — aquí va:" : "🎁 Your bundle is ready — here it comes:";
      await tgSendText(job.tg_id, head);
      for (const k of comps) {
        try {
          if (k === "image") {
            const img = await generateCover(`romantic, warm, tasteful illustration for: ${p}. Beautiful, no text, no letters.`);
            await tgSendPhoto(job.tg_id, img, "🖼");
          } else if (k === "tarot") {
            const cards = drawThree();
            const pos = input?.lang === "ru" ? ["Прошлое","Настоящее","Будущее"] : input?.lang === "es" ? ["Pasado","Presente","Futuro"] : ["Past","Present","Future"];
            for (let i = 0; i < 3; i++) { const nm = input?.lang === "ru" ? cards[i].ru : cards[i].en; try { await tgSendPhotoUrl(job.tg_id, cards[i].url, `🃏 ${pos[i]}: <b>${nm}</b>`); } catch {} }
            await tgSendText(job.tg_id, await geminiText(tarotReadingPrompt(cards, p, ln)));
          } else if (k === "astro_full") {
            await tgSendText(job.tg_id, headerFor("astro_full", input?.lang) + "\n\n" + await geminiText(`Write in ${ln}. Warm, personal astrology reading for: "${p}". About 200 words.`));
          } else if (k === "name_secrets") {
            await tgSendText(job.tg_id, headerFor("name_secrets", input?.lang) + "\n\n" + await geminiText(`Write in ${ln}. Reveal the meaning, hidden energy and lucky traits of the name in: "${p}". About 180 words.`));
          } else {
            await tgSendText(job.tg_id, headerFor(k, input?.lang) + "\n\n" + await geminiText(promptFor(k, input)));
          }
        } catch (e) { console.warn("bundle " + k, String(e).slice(0, 80)); }
      }
    } else if (job.kind === "image" || job.kind === "postcard" || job.kind === "stickerpack") {
      const base = typeof input.prompt === "string" && input.prompt ? input.prompt : "beautiful artwork";
      const style = job.kind === "postcard"
        ? `greeting card design, festive, elegant, tasteful, leave space for text: ${base}`
        : job.kind === "stickerpack"
        ? `cute sticker, bold clean outline, vibrant flat colors, plain background: ${base}`
        : base;
      const img = await generateCover(style);
      const _lg = lgKey(input?.lang);
      const cap = job.kind === "postcard" ? { en: "🎉 <b>Your AIfa postcard</b>", ru: "🎉 <b>Твоя открытка AIfa</b>", es: "🎉 <b>Tu postal AIfa</b>" }[_lg]
        : job.kind === "stickerpack" ? { en: "💗 <b>Your AIfa sticker</b>", ru: "💗 <b>Твой стикер AIfa</b>", es: "💗 <b>Tu sticker AIfa</b>" }[_lg]
        : { en: "🖼 <b>Your AIfa image</b>", ru: "🖼 <b>Твоё изображение AIfa</b>", es: "🖼 <b>Tu imagen AIfa</b>" }[_lg];
      await tgSendPhoto(job.tg_id, img, cap);
    } else {
      const cover = await generateCover(`beautiful gift image for ${job.kind}, warm, vibrant, tasteful`);
      await tgSendPhoto(job.tg_id, cover, { en: "🎁 <b>Your AIfa gift</b>", ru: "🎁 <b>Твой подарок AIfa</b>", es: "🎁 <b>Tu regalo AIfa</b>" }[lgKey(input?.lang)]);
    }
    await pool.query(
      `INSERT INTO deliveries (order_id, delivered, asset_kind, attempts, delivered_at)
       VALUES ($1,true,$2,1,now())
       ON CONFLICT (order_id) DO UPDATE SET delivered=true, delivered_at=now()`, [job.order_id, job.kind]);
    await pool.query(`UPDATE orders SET status='delivered', updated_at=now() WHERE id=$1`, [job.order_id]);
    await pool.query(`UPDATE jobs SET status='done', updated_at=now() WHERE id=$1`, [job.id]);
    console.log("delivered job", job.id, job.kind);
    await sendPostDelivery(job.tg_id, job.order_id, job.kind, input?.lang);
    try { await sendFriendCta(job.tg_id, job.ref_code, (input?.lang === "ru" || input?.lang === "es") ? input.lang : "en"); } catch (e) { console.warn("friend cta", String(e).slice(0, 80)); }
  } catch (e) {
    const msg = String(e).slice(0, 500);
    const lang: "en"|"ru"|"es" = (input?.lang === "ru" || input?.lang === "es") ? input.lang : "en";
    const blocked = /block|safety|prohibit|policy|filter|responsible|sensitive|harm|not allowed|violat/i.test(msg);
    const status = blocked ? "failed" : (job.attempts >= 3 ? "failed" : "queued");
    await pool.query(`UPDATE jobs SET status=$3, last_error=$2, updated_at=now() WHERE id=$1`, [job.id, msg, status]);
    const note = blocked
      ? { en: "⚠️ I couldn't create this from your prompt (it may break content rules). Please send a different, correct prompt and try again.", ru: "⚠️ Не получилось создать по этому запросу (возможно, нарушает правила контента). Пришли, пожалуйста, другой корректный промт и попробуй снова.", es: "⚠️ No pude crear esto con tu prompt (puede infringir las reglas). Envía un prompt diferente y correcto e inténtalo de nuevo." }[lang]
      : { en: "Your gift is taking a bit longer, we are on it.", ru: "Твой подарок чуть задерживается, уже работаем.", es: "Tu regalo tarda un poco, ya estamos en ello." }[lang];
    await tgSendMessage(job.tg_id, note).catch(() => {});
    if (status === "failed" && !blocked) {
      try {
        const code = "AIFA-" + Math.random().toString(36).slice(2, 8).toUpperCase();
        await pool.query(`INSERT INTO gift_codes (code, product_sku, buyer_tg) VALUES ($1,$2,$3) ON CONFLICT (code) DO NOTHING`, [code, job.kind, job.tg_id]);
        const sorry = { en: `I'm so sorry — it didn't come out. Here's a FREE code to recreate it: <code>${code}</code> 🎁 Just send it to me.`, ru: `Прости — не получилось с первого раза. Вот бесплатный код на повтор: <code>${code}</code> 🎁 Просто пришли его мне.`, es: `Lo siento — no salió. Aquí un código GRATIS para rehacerlo: <code>${code}</code> 🎁` }[lang];
        await tgSendMessage(job.tg_id, sorry).catch(() => {});
      } catch (e2) { console.warn("insurance code", String(e2).slice(0, 60)); }
    }
    try { const admin = config.adminTgIds?.[0]; if (admin) await tgSendMessage(Number(admin), `⚠️ Job FAILED: ${job.kind} (order ${job.order_id})\n${msg.slice(0, 200)}`).catch(() => {}); } catch {}
    console.error("job failed", job.id, msg);
  }
  return true;
}

let lastRemDay = "";
async function checkReminders() {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  if (day === lastRemDay) return;
  lastRemDay = day;
  const target = new Date(now.getTime() + 3 * 86400000);
  const mm = target.getUTCMonth() + 1, dd = target.getUTCDate(), yr = target.getUTCFullYear();
  const r = await pool.query(`SELECT id, user_tg, label FROM reminders WHERE mm=$1 AND dd=$2 AND (last_year IS NULL OR last_year < $3)`, [mm, dd, yr]);
  for (const row of r.rows) {
    try {
      await tgSendMessage(row.user_tg, t("ru", "rem_fire", { label: row.label }), { reply_markup: { inline_keyboard: [[{ text: "🎁", url: `https://t.me/${config.telegram.username}` }]] } });
      await pool.query(`UPDATE reminders SET last_year=$2 WHERE id=$1`, [row.id, yr]);
    } catch (e) { console.warn("rem fire", String(e).slice(0, 60)); }
  }
}
async function loop() {
  console.log("AIfa generation worker started");
  for (;;) {
    try { await checkReminders(); await checkSubscribers(); await checkScheduledGifts(); const did = await processOne(); if (!did) await new Promise(r => setTimeout(r, 3000)); }
    catch (e) { console.error("loop error", e); await new Promise(r => setTimeout(r, 5000)); }
  }
}
async function checkSubscribers() {
  try {
    const r = await pool.query(`SELECT s.user_tg, s.birth_info, COALESCE(s.lang, u.lang) AS lang FROM subscriptions s LEFT JOIN users u ON u.tg_id=s.user_tg WHERE s.status='active' AND s.active_until > now() AND s.birth_info IS NOT NULL AND (s.last_daily IS NULL OR s.last_daily < CURRENT_DATE) LIMIT 200`);
    const today = new Date().toISOString().slice(0, 10);
    for (const row of r.rows) {
      try {
        const lg: "en"|"ru"|"es" = (row.lang === "ru" || row.lang === "es") ? row.lang : "en";
        const ln = langName(lg);
        let who = "the subscriber";
        if (row.birth_info) { const b = parseBirth(String(row.birth_info)); who = b ? `${b.name} (born ${row.birth_info}, zodiac sign ${b.zodiac})` : String(row.birth_info); }
        const prompt = `Today is ${today}. Write in ${ln}. Write a DETAILED, warm, engaging PERSONAL daily forecast for ${who} for today (${today}). Sections: overall energy & mood; love & relationships; money & work; health; a lucky detail (color/number/time of day); and 2-3 concrete personal recommendations for today. About 2500-3500 characters, structured with short clear sections, uplifting and specific. Output only the forecast.`;
        const fc = (await geminiText(prompt)).replace(/&/g, "&amp;").replace(/</g, "&lt;").slice(0, 3600);
        const share = { en: "📤 Share", ru: "📤 Поделиться", es: "📤 Compartir" }[lg];
        await tgSendButtons(row.user_tg, t(lg, "sub_daily_header") + "\n\n" + fc, [[{ text: share, switch_inline_query: "My personal daily AI forecast from AIfa 🔮 t.me/AIfaCreativityBot" }]]);
        await pool.query(`UPDATE subscriptions SET last_daily=CURRENT_DATE WHERE user_tg=$1`, [row.user_tg]);
      } catch (e) { console.warn("sub daily", String(e).slice(0, 80)); }
    }
  } catch (e) { console.warn("checkSubscribers", String(e).slice(0, 60)); }
}
async function checkScheduledGifts() {
  try {
    const r = await pool.query(`SELECT id, user_tg, prompt, lang FROM scheduled_gifts WHERE delivered=false AND deliver_on <= CURRENT_DATE LIMIT 100`);
    for (const row of r.rows) {
      try {
        const ln = langName(row.lang);
        const poem = await geminiText(`Write in ${ln}. Compose a heartfelt, beautiful personal poem based on: "${row.prompt}". 8-16 lines, warm, specific.`);
        await tgSendText(row.user_tg, t(row.lang || "en", "sched_deliver") + "\n\n" + poem);
        await pool.query(`UPDATE scheduled_gifts SET delivered=true WHERE id=$1`, [row.id]);
      } catch (e) { console.warn("sched gift", String(e).slice(0, 60)); }
    }
  } catch (e) { console.warn("checkScheduledGifts", String(e).slice(0, 60)); }
}
export function startWorker() { console.log("[worker] boot v2 — tarot=3cards live-in-bot"); return loop(); }
