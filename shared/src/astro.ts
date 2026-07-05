// Zodiac + Chinese year + birthdate parsing (no external deps).
export interface Birth { name: string; day: number; month: number; year: number; zodiac: string; chinese: string; }

const SIGNS: [number, number, string][] = [
  [1,20,"Capricorn"],[2,19,"Aquarius"],[3,20,"Pisces"],[4,20,"Aries"],[5,21,"Taurus"],
  [6,21,"Gemini"],[7,22,"Cancer"],[8,23,"Leo"],[9,23,"Virgo"],[10,23,"Libra"],
  [11,22,"Scorpio"],[12,22,"Sagittarius"],[12,31,"Capricorn"],
];
export function zodiacSign(day: number, month: number): string {
  for (const [m, d, s] of SIGNS) if (month < m || (month === m && day <= d)) return s;
  return "Capricorn";
}
const ANIMALS = ["Monkey","Rooster","Dog","Pig","Rat","Ox","Tiger","Rabbit","Dragon","Snake","Horse","Goat"];
export function chineseYear(year: number): string { return ANIMALS[((year % 12) + 12) % 12]; }

/** Parse "Maria 14.02.1990" / "Иван 1990-02-14" etc. Returns null if no valid date. */
export function parseBirth(text: string): Birth | null {
  const m = text.match(/(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4})/) || text.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
  if (!m) return null;
  let day: number, month: number, year: number;
  if (m[1].length === 4) { year = +m[1]; month = +m[2]; day = +m[3]; }
  else { day = +m[1]; month = +m[2]; year = +m[3]; }
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2025) return null;
  const name = text.replace(m[0], "").replace(/[,]/g, " ").trim().slice(0, 60) || "friend";
  return { name, day, month, year, zodiac: zodiacSign(day, month), chinese: chineseYear(year) };
}
