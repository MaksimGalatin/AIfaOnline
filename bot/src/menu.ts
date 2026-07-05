// Catalogue shown in the main menu (sku must exist in DB products).
export const CATALOG = [
  { sku: "song",         emoji: "🎵", key: "Instrumental track", price: "$1.99" },
  { sku: "song_vocal",   emoji: "🎤", key: "Song with vocals",   price: "$2.99" },
  { sku: "astro",        emoji: "🔮", key: "Astrology forecast", price: "free / $0.99" },
  { sku: "name_secrets", emoji: "🔡", key: "Secrets of your name", price: "$0.99" },
  { sku: "stickerpack",  emoji: "💗", key: "Sticker pack",        price: "$1.99" },
] as const;
