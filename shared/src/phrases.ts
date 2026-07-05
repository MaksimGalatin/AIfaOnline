import type { Lang } from "./i18n.js";
const P: Record<Lang, string[]> = {
  en: ["✨ Entering the Astral…", "🌌 Channeling the cosmos…", "🔮 Weaving your magic…", "🎨 Summoning inspiration…", "⚡ Igniting the spark…", "🌠 Painting with stardust…", "🛸 Tuning into the muse…", "🧬 Composing your essence…", "🔥 Forging your gift…", "💫 Aligning the stars…", "🎵 Catching the melody…", "🌀 Diving into the flow…", "🪐 Consulting the universe…", "🌈 Mixing the colors of fate…", "🕯 Lighting the creative fire…", "🌙 Listening to the night…", "💎 Crystallizing the idea…", "🦋 Letting it take shape…", "📡 Receiving the signal…", "🎁 Wrapping your surprise…"],
  ru: ["✨ Выхожу в Астрал…", "🌌 Подключаюсь к космосу…", "🔮 Плету твою магию…", "🎨 Призываю вдохновение…", "⚡ Зажигаю искру…", "🌠 Рисую звёздной пылью…", "🛸 Настраиваюсь на музу…", "🧬 Складываю твою суть…", "🔥 Куём твой подарок…", "💫 Выравниваю звёзды…", "🎵 Ловлю мелодию…", "🌀 Ныряю в поток…", "🪐 Советуюсь со Вселенной…", "🌈 Смешиваю краски судьбы…", "🕯 Зажигаю творческий огонь…", "🌙 Слушаю ночь…", "💎 Кристаллизую идею…", "🦋 Даю этому форму…", "📡 Принимаю сигнал…", "🎁 Заворачиваю сюрприз…"],
  es: ["✨ Entrando al Astral…", "🌌 Canalizando el cosmos…", "🔮 Tejiendo tu magia…", "🎨 Invocando inspiración…", "⚡ Encendiendo la chispa…", "🌠 Pintando con polvo estelar…", "🛸 Sintonizando la musa…", "🧬 Componiendo tu esencia…", "🔥 Forjando tu regalo…", "💫 Alineando estrellas…", "🎵 Atrapando la melodía…", "🌀 Buceando en el flujo…", "🪐 Consultando al universo…", "🌈 Mezclando colores del destino…", "🕯 Encendiendo el fuego creativo…", "🌙 Escuchando la noche…", "💎 Cristalizando la idea…", "🦋 Dándole forma…", "📡 Recibiendo la señal…", "🎁 Envolviendo tu sorpresa…"],
};
export function randomGenPhrase(lang: Lang): string {
  const a = P[lang] ?? P.en;
  return a[Math.floor(Math.random() * a.length)];
}
