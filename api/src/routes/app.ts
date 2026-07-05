import type { FastifyInstance } from "fastify";
import { readFile } from "node:fs/promises";
import { t, validateInitData, createStarsInvoiceLink, upsertUser, getProduct, createOrder, setOrderInput, getReferralStats, pool, SKU_INFO, isAdmin, fulfillPaidOrder, geminiText, generateCover, drawThree, tarotReadingPrompt, tgSendDocument, tgSendMessage, config } from "shared";

const MENU_SKUS = ["song","song_vocal","astro_full","name_secrets","image","poem","love_letter","tale","detective","compatibility","tarot","dream","year_ahead","bundle_romance","bundle_mystic","music_card"];

export async function appRoutes(app: FastifyInstance) {
  app.get("/app", async (_req, reply) => {
    const html = await readFile("api/app.html", "utf8");
    reply.header("content-type", "text/html; charset=utf-8").header("cache-control", "no-store, max-age=0").send(html);
  });
  app.get("/r/:code", async (req, reply) => {
    const code = String((req.params as any).code || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
    let brandName: string | null = null, start = `ref_${code}`;
    try { const br = (await pool.query(`SELECT name FROM brands WHERE code=$1`, [code])).rows[0]; if (br) { brandName = br.name; start = `brand_${code}`; } } catch {}
    const link = `https://t.me/AIfaCreativityBot?start=${start}`;
    const brand = brandName || "AIfa Creativity";
    const prices: Record<string, number> = {};
    try { const pr = await pool.query(`SELECT sku, price_usd_cents FROM products WHERE active=true`); pr.rows.forEach((r: any) => { prices[r.sku] = r.price_usd_cents; }); } catch {}
    let rating: { count: number; stars: number | null } = { count: 0, stars: null };
    try { const rr = await pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE rating=1)::int pos FROM ratings`); const tt = rr.rows[0].total as number, pp = rr.rows[0].pos as number; rating = { count: tt, stars: tt > 0 ? Number((1 + 4 * (pp / tt)).toFixed(1)) : null }; } catch {}
    const prods = MENU_SKUS.filter((sku) => SKU_INFO[sku]).map((sku) => ({ en: SKU_INFO[sku].desc.en, ru: SKU_INFO[sku].desc.ru, es: SKU_INFO[sku].desc.es, price: prices[sku] ? "$" + (prices[sku] / 100).toFixed(2) : "" }));
    const data = JSON.stringify({ brand, brandName: !!brandName, link, rating, prods }).replace(/</g, "\\u003c");
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${brand} — personal AI gifts</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0b0a1f;color:#fff;line-height:1.6;overflow-x:hidden}
.wrap{max-width:900px;margin:0 auto;padding:0 18px}
.bg{position:fixed;inset:0;background:radial-gradient(1100px 640px at 18% -12%,#3b2b8f66,transparent),radial-gradient(820px 520px at 92% 6%,#c7398f55,transparent),linear-gradient(160deg,#0b0a1f,#160f33 55%,#0b0a1f);z-index:-1}
.langbar{position:sticky;top:0;display:flex;justify-content:flex-end;gap:6px;padding:12px 4px;z-index:10}
.langbar button{background:#ffffff14;color:#cfcaf0;border:1px solid #ffffff20;border-radius:20px;padding:6px 12px;font-weight:700;font-size:13px;cursor:pointer}
.langbar button.on{background:linear-gradient(90deg,#ff61c7,#7b8cff);color:#fff;border-color:transparent}
.hero{text-align:center;padding:40px 0 30px}.spark{font-size:56px;animation:f 3s ease-in-out infinite}@keyframes f{50%{transform:translateY(-9px)}}
h1{font-size:50px;line-height:1.05;margin:12px 0;background:linear-gradient(90deg,#ffd93b,#ff61c7,#7b8cff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;font-weight:900}
.sub{color:#c9c4f0;font-size:18px;max-width:600px;margin:0 auto 24px}
.cta{display:inline-block;background:linear-gradient(90deg,#ff61c7,#7b8cff);color:#fff;text-decoration:none;font-weight:800;font-size:18px;padding:17px 38px;border-radius:16px;box-shadow:0 16px 44px #7b8cff66;transition:transform .15s}.cta:hover{transform:translateY(-2px)}
.rate{margin-top:16px;color:#ffd93b;font-size:15px}
.trust{display:flex;flex-wrap:wrap;justify-content:center;gap:10px 20px;color:#9b96c9;font-size:13px;margin-top:20px}
.sec{padding:44px 0}.sec h2{font-size:32px;text-align:center;margin-bottom:8px;font-weight:900}.sec .lead{text-align:center;color:#a9a4d6;margin-bottom:28px}
.why{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}
.why .w{background:linear-gradient(160deg,#ffffff12,#ffffff06);border:1px solid #ffffff1c;border-radius:20px;padding:22px;transition:transform .15s,border-color .15s}.why .w:hover{transform:translateY(-4px);border-color:#ff61c766}
.why .ic{width:54px;height:54px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px;background:linear-gradient(135deg,#ff61c733,#7b8cff33);margin-bottom:12px}
.why b{display:block;font-size:17px;margin-bottom:6px}.why p{color:#b6b1e0;font-size:14px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(265px,1fr));gap:14px}
.card{background:#ffffff0c;border:1px solid #ffffff18;border-radius:18px;padding:18px;position:relative}.cp{position:absolute;top:14px;right:14px;background:#ffd93b;color:#1a1436;font-weight:800;font-size:13px;padding:3px 10px;border-radius:20px}.cd{font-size:14px;color:#d7d3f2;padding-right:56px}.cd b{color:#fff}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}.step{background:#ffffff0c;border-radius:16px;padding:20px;text-align:center}.step .n{font-size:32px}.step p{color:#b6b1e0;font-size:13px;margin-top:6px}
.earn{background:linear-gradient(135deg,#7b8cff26,#ff61c726);border:1px solid #ffffff24;border-radius:24px;padding:32px;text-align:center}
.tier{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin:18px 0}.tier div{background:#ffffff16;border-radius:12px;padding:12px 18px;font-weight:800}
.faq .q{background:#ffffff0a;border:1px solid #ffffff14;border-radius:14px;padding:16px;margin-bottom:10px}.faq b{color:#ffd93b}.faq p{color:#b6b1e0;font-size:14px;margin-top:5px}
.big-cta{text-align:center;padding:16px 0 34px}.foot{text-align:center;color:#7d78a8;padding:34px 0 60px;font-size:13px}</style></head>
<body><div class="bg"></div><div class="wrap">
<div class="langbar" id="langbar"></div><div id="app"></div>
<div class="foot">Powered by AIfa · part of AIfa Works / CODE · CODE Eternal 🔥</div></div>
<script>
const DATA=${data};
const T={
 en:{sub:(b)=>b?DATA.brand+" presents — personal AI gifts, created in seconds inside Telegram.":"Personal AI gifts, created in seconds right inside Telegram — songs, poems, astrology, tarot, personal fairy tales and more.",
  cta:"🎁 Open in Telegram",reviews:"reviews",trust:["⚡ Real AI, in seconds","⭐ Pay with Telegram Stars","💌 Delivered in chat","🌍 3 languages"],
  whyT:"Why AIfa",why:[["💝","Truly personal","Every gift is made from your words — a real one-of-a-kind, never a template."],["⚡","Instant","No waiting, no designers — real AI creates and delivers in seconds, right in chat."],["🔒","Safe & simple","Pay with Telegram Stars, where you already are. No cards, no crypto, no fuss."],["🔄","Love it or redo it","Not quite right? Text gifts can be recreated for free, once per order."]],
  createT:"🎁 Everything you can create",createL:"16 kinds of personal AI gifts — with full descriptions & prices",
  howT:"⚙️ How it works",how:[["1️⃣","Pick a gift","Choose from 16 AI creations."],["2️⃣","Describe & pay","A few words + ⭐ Telegram Stars."],["3️⃣","Get it in seconds","Real AI delivers it to your chat."]],
  earnT:"💸 Earn up to 50%",earnP:"Share AIfa and earn on every sale forever. Your rate grows with your weekly sales:",tiers:["30% base","40% · 10+ sales/week","50% · 60+ sales/week"],earnN:"Hit the weekly target and keep the higher rate all next week. Become an Ambassador with your own branded link and this page. The % is on the amount we receive (after Telegram fee) — fair and transparent.",
  faqT:"❓ FAQ",faq:[["How fast do I get my gift?","Text and images in seconds; songs and videos in about a minute."],["How do I pay?","With ⭐ Telegram Stars, right inside Telegram — no cards or crypto."],["What if I don't like it?","Text gifts can be recreated once for free."],["Can I gift it to someone?","Yes — forward it in chat, or use Gift Codes and Couple Mode."],["What languages?","English, Russian and Spanish — pick yours in the bot."]],
  finalCta:"🎁 Open in Telegram — create your gift"},
 ru:{sub:(b)=>b?DATA.brand+" — персональные AI-подарки за секунды прямо в Telegram.":"Персональные AI-подарки за секунды прямо в Telegram — песни, стихи, астрология, таро, личные сказки и не только.",
  cta:"🎁 Открыть в Telegram",reviews:"отзывов",trust:["⚡ Настоящий AI, за секунды","⭐ Оплата Telegram Stars","💌 Приходит в чат","🌍 3 языка"],
  whyT:"Почему AIfa",why:[["💝","По-настоящему личное","Каждый подарок создаётся из твоих слов — единственный в своём роде, не шаблон."],["⚡","Мгновенно","Никакого ожидания и дизайнеров — настоящий AI создаёт и присылает за секунды, прямо в чат."],["🔒","Просто и безопасно","Оплата через Telegram Stars, там где ты уже есть. Без карт, без крипты, без возни."],["🔄","Не то — переделаем","Не попали? Текстовые подарки можно бесплатно пересоздать, 1 раз на заказ."]],
  createT:"🎁 Всё, что можно создать",createL:"16 видов персональных AI-подарков — с полными описаниями и ценами",
  howT:"⚙️ Как это работает",how:[["1️⃣","Выбери подарок","16 видов AI-творений."],["2️⃣","Опиши и оплати","Пара слов + ⭐ Telegram Stars."],["3️⃣","Получи за секунды","Настоящий AI пришлёт в чат."]],
  earnT:"💸 Зарабатывай до 50%",earnP:"Делись AIfa и получай с каждой продажи навсегда. Ставка растёт от продаж за неделю:",tiers:["30% базовая","40% · 10+ продаж/нед","50% · 60+ продаж/нед"],earnN:"Выполнил недельную планку — всю следующую неделю выше ставка. Стань Амбассадором со своей брендовой ссылкой и этой страницей. % считается от суммы, полученной нами (за вычетом комиссии Telegram) — честно и прозрачно.",
  faqT:"❓ Частые вопросы",faq:[["Как быстро придёт подарок?","Текст и картинки — за секунды; песни и видео — около минуты."],["Как оплатить?","Через ⭐ Telegram Stars прямо в Telegram — без карт и крипты."],["А если не понравится?","Текстовые подарки можно бесплатно пересоздать один раз."],["Можно подарить другому?","Да — перешли в чате, или используй Подарочные коды и Режим для пары."],["Какие языки?","Английский, русский и испанский — выбери свой в боте."]],
  finalCta:"🎁 Открыть в Telegram — создать подарок"},
 es:{sub:(b)=>b?DATA.brand+" — regalos de IA personales en segundos, dentro de Telegram.":"Regalos de IA personales en segundos, dentro de Telegram — canciones, poemas, astrología, tarot, cuentos y más.",
  cta:"🎁 Abrir en Telegram",reviews:"reseñas",trust:["⚡ IA real, en segundos","⭐ Paga con Telegram Stars","💌 Llega al chat","🌍 3 idiomas"],
  whyT:"Por qué AIfa",why:[["💝","Realmente personal","Cada regalo se crea con tus palabras — único, nunca una plantilla."],["⚡","Al instante","Sin esperas ni diseñadores — la IA crea y entrega en segundos, en el chat."],["🔒","Simple y seguro","Paga con Telegram Stars, donde ya estás. Sin tarjetas ni cripto."],["🔄","¿No es eso? Rehazlo","Los regalos de texto se pueden rehacer gratis, una vez por pedido."]],
  createT:"🎁 Todo lo que puedes crear",createL:"16 tipos de regalos de IA — con descripciones y precios",
  howT:"⚙️ Cómo funciona",how:[["1️⃣","Elige un regalo","16 creaciones de IA."],["2️⃣","Describe y paga","Unas palabras + ⭐ Telegram Stars."],["3️⃣","Recíbelo en segundos","La IA lo entrega en tu chat."]],
  earnT:"💸 Gana hasta 50%",earnP:"Comparte AIfa y gana en cada venta para siempre. Tu tarifa crece con tus ventas semanales:",tiers:["30% base","40% · 10+ ventas/sem","50% · 60+ ventas/sem"],earnN:"Cumple la meta semanal y mantén la tarifa alta toda la próxima semana. Sé Embajador con tu enlace y esta página. El % es sobre lo que recibimos (tras la comisión de Telegram).",
  faqT:"❓ Preguntas",faq:[["¿Qué tan rápido llega?","Texto e imágenes en segundos; canciones y vídeos en un minuto."],["¿Cómo pago?","Con ⭐ Telegram Stars, dentro de Telegram."],["¿Y si no me gusta?","Los regalos de texto se rehacen gratis una vez."],["¿Puedo regalarlo?","Sí — reenvíalo, o usa Códigos de regalo y Modo Pareja."],["¿Qué idiomas?","Inglés, ruso y español — elige el tuyo en el bot."]],
  finalCta:"🎁 Abrir en Telegram — crea tu regalo"}
 ,de:{cta:"🎁 In Telegram öffnen",finalCta:"🎁 In Telegram öffnen — Geschenk erstellen",reviews:"Bewertungen",whyT:"Warum AIfa",createT:"🎁 Was du erstellen kannst",createL:"16 persönliche KI-Geschenke — mit Beschreibung & Preis",howT:"⚙️ So funktioniert es",earnT:"💸 Verdiene bis zu 50%",faqT:"❓ FAQ"}
 ,fr:{cta:"🎁 Ouvrir dans Telegram",finalCta:"🎁 Ouvrir dans Telegram — créer un cadeau",reviews:"avis",whyT:"Pourquoi AIfa",createT:"🎁 Tout ce que vous pouvez créer",createL:"16 cadeaux IA personnels — avec descriptions et prix",howT:"⚙️ Comment ça marche",earnT:"💸 Gagnez jusqu'à 50%",faqT:"❓ FAQ"}
 ,it:{cta:"🎁 Apri in Telegram",finalCta:"🎁 Apri in Telegram — crea un regalo",reviews:"recensioni",whyT:"Perché AIfa",createT:"🎁 Tutto ciò che puoi creare",createL:"16 regali IA personali — con descrizioni e prezzi",howT:"⚙️ Come funziona",earnT:"💸 Guadagna fino al 50%",faqT:"❓ FAQ"}
 ,pt:{cta:"🎁 Abrir no Telegram",finalCta:"🎁 Abrir no Telegram — criar presente",reviews:"avaliações",whyT:"Por que AIfa",createT:"🎁 Tudo o que você pode criar",createL:"16 presentes de IA — com descrições e preços",howT:"⚙️ Como funciona",earnT:"💸 Ganhe até 50%",faqT:"❓ FAQ"}
 ,zh:{cta:"🎁 在 Telegram 打开",finalCta:"🎁 在 Telegram 打开 — 创建礼物",reviews:"评价",whyT:"为什么选 AIfa",createT:"🎁 你能创造的一切",createL:"16 种个性化 AI 礼物 — 含描述和价格",howT:"⚙️ 如何运作",earnT:"💸 赚取高达 50%",faqT:"❓ 常见问题"}
 ,ja:{cta:"🎁 Telegramで開く",finalCta:"🎁 Telegramで開く — ギフトを作成",reviews:"レビュー",whyT:"AIfaを選ぶ理由",createT:"🎁 作れるものすべて",createL:"16種類のパーソナルAIギフト — 説明と価格付き",howT:"⚙️ 仕組み",earnT:"💸 最大50%の報酬",faqT:"❓ よくある質問"}
 ,hi:{cta:"🎁 Telegram में खोलें",finalCta:"🎁 Telegram में खोलें — उपहार बनाएं",reviews:"समीक्षाएं",whyT:"AIfa क्यों",createT:"🎁 आप जो बना सकते हैं",createL:"16 व्यक्तिगत AI उपहार — विवरण और मूल्य सहित",howT:"⚙️ यह कैसे काम करता है",earnT:"💸 50% तक कमाएं",faqT:"❓ सामान्य प्रश्न"}
 ,ar:{cta:"🎁 افتح في تيليجرام",finalCta:"🎁 افتح في تيليجرام — أنشئ هدية",reviews:"تقييمات",whyT:"لماذا AIfa",createT:"🎁 كل ما يمكنك إنشاؤه",createL:"16 هدية ذكاء اصطناعي — مع الوصف والسعر",howT:"⚙️ كيف يعمل",earnT:"💸 اربح حتى 50%",faqT:"❓ الأسئلة الشائعة"}
 ,he:{cta:"🎁 פתח בטלגרם",finalCta:"🎁 פתח בטלגרם — צור מתנה",reviews:"ביקורות",whyT:"למה AIfa",createT:"🎁 כל מה שאפשר ליצור",createL:"16 מתנות AI אישיות — עם תיאור ומחיר",howT:"⚙️ איך זה עובד",earnT:"💸 הרוויחו עד 50%",faqT:"❓ שאלות נפוצות"}
};
const LANGS=["en","ru","es","de","fr","it","pt","zh","ja","hi","ar","he"];
const NAMES={en:"EN",ru:"RU",es:"ES",de:"DE",fr:"FR",it:"IT",pt:"PT",zh:"中文",ja:"日本語",hi:"हिं",ar:"عربي",he:"עברית"};
let L=(navigator.language||"en").slice(0,2);if(!T[L])L="en";
function esc(x){return x;}
function render(){
 const d=DATA;const t=new Proxy(T[L]||{},{get:(o,k)=>o[k]!=null?o[k]:T.en[k]});
 document.documentElement.dir=(L==="ar"||L==="he")?"rtl":"ltr";
 const trust=t.trust.map(x=>'<span>'+x+'</span>').join('');
 const why=t.why.map(w=>'<div class="w"><div class="ic">'+w[0]+'</div><b>'+w[1]+'</b><p>'+w[2]+'</p></div>').join('');
 const cards=d.prods.map(p=>'<div class="card">'+(p.price?'<span class="cp">'+p.price+'</span>':'')+'<div class="cd">'+(p[L]||p.en)+'</div></div>').join('');
 const steps=t.how.map(h=>'<div class="step"><div class="n">'+h[0]+'</div><b>'+h[1]+'</b><p>'+h[2]+'</p></div>').join('');
 const tiers=t.tiers.map(x=>'<div>'+x+'</div>').join('');
 const faq=t.faq.map(q=>'<div class="q"><b>'+q[0]+'</b><p>'+q[1]+'</p></div>').join('');
 const rate=d.rating&&d.rating.stars?'<div class="rate">⭐ <b>'+d.rating.stars+'</b> / 5 · '+d.rating.count+' '+t.reviews+'</div>':'';
 document.getElementById('app').innerHTML=
  '<div class="hero"><div class="spark">✨</div><h1>'+d.brand+'</h1><div class="sub">'+t.sub(d.brandName)+'</div><a class="cta" href="'+d.link+'">'+t.cta+'</a>'+rate+'<div class="trust">'+trust+'</div></div>'
  +'<div class="sec"><h2>'+t.whyT+'</h2><div class="why">'+why+'</div></div>'
  +'<div class="sec"><h2>'+t.createT+'</h2><div class="lead">'+t.createL+'</div><div class="grid">'+cards+'</div></div>'
  +'<div class="sec"><h2>'+t.howT+'</h2><div class="steps">'+steps+'</div></div>'
  +'<div class="sec"><div class="earn"><h2>'+t.earnT+'</h2><p style="color:#cfcaf0;max-width:620px;margin:8px auto">'+t.earnP+'</p><div class="tier">'+tiers+'</div><p style="color:#a9a4d6;font-size:14px;max-width:640px;margin:0 auto">'+t.earnN+'</p></div></div>'
  +'<div class="sec faq"><h2 style="margin-bottom:22px">'+t.faqT+'</h2>'+faq+'</div>'
  +'<div class="big-cta"><a class="cta" href="'+d.link+'">'+t.finalCta+'</a></div>';
 document.getElementById('langbar').innerHTML=LANGS.map(k=>'<button class="'+(k===L?'on':'')+'" onclick="setL(&#39;'+k+'&#39;)">'+NAMES[k]+'</button>').join('');
}
function setL(k){L=k;render();window.scrollTo(0,0);}
render();
</script></body></html>`;
    reply.header("content-type", "text/html; charset=utf-8").header("cache-control", "no-store").send(html);
  });
  app.get("/api/products", async () => {
    const r = await pool.query(`SELECT sku,title,price_usd_cents,price_stars FROM products WHERE active=true AND sku = ANY($1) ORDER BY price_usd_cents`, [MENU_SKUS]);
    return r.rows.map((p: any) => ({ ...p, desc: SKU_INFO[p.sku]?.desc || null }));
  });
  app.post("/api/order", async (req, reply) => {
    const b = req.body as any;
    const u = validateInitData(b?.initData || "");
    if (!u) return reply.code(401).send({ error: "auth" });
    const p = await getProduct(String(b?.sku || ""));
    if (!p) return reply.code(404).send({ error: "product" });
    const user = await upsertUser(u.id, null, u.first_name ?? null, b?.ref ? String(b.ref).slice(0, 32) : null);
    const orderId = await createOrder(user.id, p);
    await setOrderInput(orderId, { prompt: String(b?.prompt || "").slice(0, 500), lang: (u.language_code || "en").slice(0, 2) });
    // Owner/admin: free by default (like the bot). Pass payWithStars:true to
    // test the real Telegram Stars flow instead of the free path.
    if (isAdmin(u.id) && !b?.payWithStars) {
      await fulfillPaidOrder({ orderId, method: "stars", externalId: `appfree_${orderId}`, amount: 0, currency: "XTR", uniqEventKey: `appfree:${orderId}`, raw: { adminApp: true } });
      return { free: true };
    }
    const link = await createStarsInvoiceLink(p.title, "AIfa Creativity gift", orderId, p.price_stars);
    return { invoiceLink: link };
  });
  app.post("/api/sample", async (req, reply) => {
    const b = req.body as any;
    const u = validateInitData(b?.initData || "");
    if (!u) return reply.code(401).send({ error: "bad initData" });
    const sku = String(b?.sku || ""); const info = SKU_INFO[sku];
    if (!info) return reply.code(400).send({ error: "unknown sku" });
    const lang = ["ru", "es"].includes(b?.lang) ? b.lang : "en";
    const ln = lang === "ru" ? "Russian" : lang === "es" ? "Spanish" : "English";
    try {
      if (info.smp === "tarot") {
        const cards = drawThree();
        const pos = lang === "ru" ? ["Прошлое","Настоящее","Будущее"] : lang === "es" ? ["Pasado","Presente","Futuro"] : ["Past","Present","Future"];
        const q = lang === "ru" ? "На чём мне сейчас сосредоточиться?" : lang === "es" ? "En que concentrarme ahora?" : "What should I focus on now?";
        const head = cards.map((c, i) => "🃏 " + pos[i] + ": " + (lang === "ru" ? c.ru : c.en)).join("\n");
        const r = await geminiText(tarotReadingPrompt(cards, q, ln));
        return { text: head + "\n\n" + r, img: cards[0].url };
      }
      if (info.smp === "image") {
        const buf = await generateCover(info.sp);
        return { img: "data:image/png;base64," + buf.toString("base64") };
      }
      const prompt = info.sp.replace(/ (English|Spanish|Russian)\.\s*$/i, "") + " Write the sample in " + ln + ".";
      const text = await geminiText(prompt);
      return { text, note: info.smp === "song" };
    } catch (e) {
      req.log.warn("sample " + sku + " " + String(e).slice(0, 80));
      return reply.code(503).send({ error: "busy" });
    }
  });

  app.post("/api/book", async (req, reply) => {
    const b = req.body as any;
    const u = validateInitData(b?.initData || "");
    if (!u) return reply.code(401).send({ error: "auth" });
    const code = ["en", "ru", "es", "zh"].includes(b?.lang) ? b.lang : "en";
    try {
      const p1 = await readFile(`assets/book/book_${code}_p1.docx`);
      await tgSendDocument(u.id, p1, `PADAM_Protocol_Part_I_${code}.docx`, t((["ru","es"].includes(b?.uiLang)?b.uiLang:"en") as any, "book_gift", { name: u.first_name ?? "" }));
      const p2 = await readFile(`assets/book/book_${code}_p2.docx`);
      await tgSendDocument(u.id, p2, `PADAM_Protocol_Part_II_${code}.docx`, "📖 PADAM Protocol — Part II");
      return { ok: true };
    } catch (e) { req.log.warn("book " + String(e).slice(0, 80)); return reply.code(503).send({ error: "busy" }); }
  });
  app.post("/api/reminder", async (req, reply) => {
    const b = req.body as any;
    const u = validateInitData(b?.initData || "");
    if (!u) return reply.code(401).send({ error: "auth" });
    const label = String(b?.label || "").trim().slice(0, 80);
    const mm = parseInt(b?.mm, 10), dd = parseInt(b?.dd, 10);
    if (!label || !(mm >= 1 && mm <= 12) || !(dd >= 1 && dd <= 31)) return reply.code(400).send({ error: "bad" });
    await pool.query(`INSERT INTO reminders (user_tg,label,mm,dd) VALUES ($1,$2,$3,$4)`, [u.id, label, mm, dd]);
    return { ok: true };
  });
  app.post("/api/brand", async (req, reply) => {
    const b = req.body as any;
    const u = validateInitData(b?.initData || "");
    if (!u) return reply.code(401).send({ error: "auth" });
    const name = String(b?.name || "").trim().slice(0, 40);
    if (!name) return reply.code(400).send({ error: "name" });
    await upsertUser(u.id, null, u.first_name ?? null, null);
    const slug = (name.toLowerCase().replace(/[^a-z0-9]+/g, "") || "brand").slice(0, 16);
    const code = slug + "-" + Math.random().toString(36).slice(2, 6);
    await pool.query(`INSERT INTO brands (code, name, owner_tg) VALUES ($1,$2,$3) ON CONFLICT (code) DO NOTHING`, [code, name, u.id]);
    return { code, link: `https://t.me/AIfaCreativityBot?start=brand_${code}`, landing: `https://aifa-creativity-kvuloffkna-uc.a.run.app/r/${code}` };
  });
  app.get("/api/ratings", async () => {
    const r = await pool.query(`SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE rating=1)::int pos FROM ratings`);
    const total = r.rows[0].total as number, pos = r.rows[0].pos as number;
    const stars = total > 0 ? Number((1 + 4 * (pos / total)).toFixed(1)) : null;
    return { count: total, stars };
  });
  app.post("/api/support", async (req, reply) => {
    const b = req.body as any;
    const u = validateInitData(b?.initData || "");
    if (!u) return reply.code(401).send({ error: "auth" });
    const text = String(b?.text || "").trim().slice(0, 1000);
    if (text.length < 2) return reply.code(400).send({ error: "empty" });
    const admin = config.adminTgIds[0];
    if (admin) { try { await tgSendMessage(Number(admin), `📨 <b>Support (app)</b> from ${u.first_name ?? ""} (id:<code>${u.id}</code>)\n\n${text}\n\n↩️ <code>/reply ${u.id} your text</code>`); } catch (e) { req.log.warn("support " + String(e).slice(0, 60)); } }
    return { ok: true };
  });
  app.post("/api/referral", async (req, reply) => {
    const b = req.body as any;
    const u = validateInitData(b?.initData || "");
    if (!u) return reply.code(401).send({ error: "auth" });
    await upsertUser(u.id, null, u.first_name ?? null, null);
    const s = await getReferralStats(u.id);
    return s ?? { refCode: "", weekSales: 0, weekEarnedCents: 0, lifeSales: 0, lifeEarnedCents: 0, prestige: "none" };
  });
}
