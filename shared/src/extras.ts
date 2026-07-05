import { KPI_T40, KPI_T50 } from "./referral.js";
// THIS week's sales decide NEXT week's rate. Returns the rate this week's pace would lock for next week,
// the next higher tier to aim for, sales remaining, and a progress bar.
export function tierBar(thisWeekSales: number): { lockedRate: number; nextRate: number | null; toNext: number; bar: string } {
  let lockedRate = 30, nextRate: number | null = 40, base = 0, target = KPI_T40;
  if (thisWeekSales >= KPI_T50) { lockedRate = 50; nextRate = null; base = KPI_T50; target = KPI_T50; }
  else if (thisWeekSales >= KPI_T40) { lockedRate = 40; nextRate = 50; base = KPI_T40; target = KPI_T50; }
  const span = (target - base) || 1;
  const blocks = Math.max(0, Math.min(10, Math.round(((thisWeekSales - base) / span) * 10)));
  const bar = "█".repeat(blocks) + "░".repeat(10 - blocks);
  const toNext = nextRate === null ? 0 : target - thisWeekSales;
  return { lockedRate, nextRate, toNext, bar };
}

// VIP buyer status by lifetime delivered purchases
export interface Vip { emoji: string; name: { en: string; ru: string; es: string }; nextAt: number | null; }
export function buyerTier(n: number): Vip | null {
  if (n >= 50) return { emoji: "💎", name: { en: "Legend", ru: "Легенда", es: "Leyenda" }, nextAt: null };
  if (n >= 15) return { emoji: "🥇", name: { en: "Patron", ru: "Меценат", es: "Mecenas" }, nextAt: 50 };
  if (n >= 5)  return { emoji: "🥈", name: { en: "Generous", ru: "Щедрый", es: "Generoso" }, nextAt: 15 };
  if (n >= 1)  return { emoji: "🥉", name: { en: "Giver", ru: "Дарящий", es: "Donante" }, nextAt: 5 };
  return null;
}

// Nearest upcoming holiday within 16 days (light seasonal calendar)
export function upcomingHoliday(now: Date = new Date()): { en: string; ru: string; es: string } | null {
  const items = [
    { m: 1, d: 1,  en: "New Year", ru: "Новый год", es: "Año Nuevo" },
    { m: 2, d: 14, en: "Valentine's Day", ru: "День святого Валентина", es: "San Valentín" },
    { m: 3, d: 8,  en: "Women's Day", ru: "8 Марта", es: "Día de la Mujer" },
    { m: 12, d: 25, en: "Christmas", ru: "Рождество", es: "Navidad" },
    { m: 12, d: 31, en: "New Year's Eve", ru: "Новый год", es: "Nochevieja" },
  ];
  const y = now.getUTCFullYear();
  let best: any = null, bestDiff = 99;
  for (const it of items) {
    let dt = new Date(Date.UTC(y, it.m - 1, it.d));
    if (dt.getTime() < now.getTime()) dt = new Date(Date.UTC(y + 1, it.m - 1, it.d));
    const diff = Math.ceil((dt.getTime() - now.getTime()) / 86400000);
    if (diff >= 0 && diff <= 16 && diff < bestDiff) { best = it; bestDiff = diff; }
  }
  return best ? { en: best.en, ru: best.ru, es: best.es } : null;
}
