// ============================================================
// Custom referral engine — progressive weekly tiers.
//   sales 1..10  -> 30%
//   sales 11..60 -> 40%
//   sales 61..   -> 50%
// Counter resets every Monday 00:00 UTC.
// Prestige floor: once a user reaches "eternal", they keep a
// permanent floor of 45% (env REF_PRESTIGE_FLOOR_PCT) so a weekly
// reset never drops them below it.
// P2P transfers: 0% (not handled here — only platform sales accrue).
// ============================================================

export interface Tier { fromSale: number; toSale: number | null; pct: number; }

export const DEFAULT_TIERS: Tier[] = [
  { fromSale: 1,  toSale: 10,   pct: 30 },
  { fromSale: 11, toSale: 60,   pct: 40 },
  { fromSale: 61, toSale: null, pct: 50 },
];

/** Base tier % for the Nth PAID sale within the current week (1-based). */
export function tierPctForSaleIndex(saleIndex: number, tiers: Tier[] = DEFAULT_TIERS): number {
  if (saleIndex < 1) throw new Error("saleIndex is 1-based");
  for (const t of tiers) {
    const within = saleIndex >= t.fromSale && (t.toSale === null || saleIndex <= t.toSale);
    if (within) return t.pct;
  }
  return tiers[tiers.length - 1]?.pct ?? 0;
}

/** Effective % applying the prestige floor if the user earned it. */
export function effectivePct(
  saleIndex: number,
  hasPrestigeFloor: boolean,
  floorPct = 45,
  tiers: Tier[] = DEFAULT_TIERS,
): number {
  const base = tierPctForSaleIndex(saleIndex, tiers);
  return hasPrestigeFloor ? Math.max(base, floorPct) : base;
}

/** Commission in integer cents for one sale. Rounds half-up. */
export function commissionCents(
  amountCents: number,
  saleIndex: number,
  hasPrestigeFloor: boolean,
  floorPct = 45,
  tiers: Tier[] = DEFAULT_TIERS,
): number {
  const pct = effectivePct(saleIndex, hasPrestigeFloor, floorPct, tiers);
  return Math.round((amountCents * pct) / 100);
}

/** Monday 00:00:00 UTC of the week containing `d`. Returns YYYY-MM-DD. */
export function weekStartUTC(d: Date = new Date()): string {
  const day = d.getUTCDay();              // 0=Sun..6=Sat
  const diff = (day + 6) % 7;             // days since Monday
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
  return monday.toISOString().slice(0, 10);
}

/** Prestige progression by lifetime paid sales (tune thresholds freely). */
export function prestigeForLifetimeSales(total: number): "none" | "spark" | "resonance" | "eternal" {
  if (total >= 100) return "eternal";
  if (total >= 50)  return "resonance";
  if (total >= 10)  return "spark";
  return "none";
}

// ===== Weekly KPI model (current) =====
// Your commission rate for THIS week is set by LAST week's sales:
//   last-week sales >= KPI_T50 -> 50% all this week
//   last-week sales >= KPI_T40 -> 40% all this week
//   otherwise                  -> 30% (base)
// Everyone starts at 30%. Hit the weekly KPI -> keep the higher rate next week.
export const KPI_T40 = 10;  // last-week sales needed to earn 40% this week
export const KPI_T50 = 60;  // last-week sales needed to earn 50% this week
export function weeklyRate(lastWeekSales: number): number {
  if (lastWeekSales >= KPI_T50) return 50;
  if (lastWeekSales >= KPI_T40) return 40;
  return 30;
}
export function lastWeekStartUTC(d: Date = new Date()): string {
  return weekStartUTC(new Date(d.getTime() - 7 * 86400000));
}

// Telegram pays developers ~$0.009/Star on mobile (after Apple/Google 30%) .. ~$0.013 desktop.
// We pay ambassadors a % of what we ACTUALLY receive (platform fee deducted). Conservative net = $0.009/Star.
export const NET_CENTS_PER_STAR = 0.9; // 0.9 cent = $0.009 per Star (conservative, mobile-inclusive)
export function netCentsFromStars(stars: number): number { return Math.round(stars * NET_CENTS_PER_STAR); }
