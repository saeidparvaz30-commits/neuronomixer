export type Season = "summer" | "fall" | "winter" | "spring";
export type CausalDiagram = "incorrect" | "correct" | "chain";

export interface ChartPoint {
  x: number;
  y: number;
  season?: Season;
  group?: string;
  id: number;
}

export interface SpuriousExample {
  id: number;
  title: string;
  var1Label: string;
  var2Label: string;
  r: string;
  data: { x: number; y: number }[];
  source: string;
}

export interface RealExample {
  id: number;
  title: string;
  var1: string;
  var2: string;
  r: string;
  confound: string;
  confoundColor: string;
  explanation: string;
  data: { x: number; y: number; group: string }[];
}

export const SEASON_COLORS: Record<Season, string> = {
  summer: "#ef4444",
  fall:   "#f97316",
  winter: "#3b82f6",
  spring: "#22c55e",
};

export const SEASON_LABELS: Record<Season, string> = {
  summer: "Summer",
  fall:   "Fall",
  winter: "Winter",
  spring: "Spring",
};

// r ≈ 0.97 — clear linear trend driven by season
export const ICE_CREAM_DATA: (ChartPoint & { season: Season })[] = [
  { id: 0,  x: 5,  y: 0,  season: "winter" },
  { id: 1,  x: 8,  y: 1,  season: "winter" },
  { id: 2,  x: 10, y: 2,  season: "winter" },
  { id: 3,  x: 20, y: 5,  season: "spring" },
  { id: 4,  x: 25, y: 7,  season: "spring" },
  { id: 5,  x: 28, y: 8,  season: "spring" },
  { id: 6,  x: 36, y: 12, season: "summer" },
  { id: 7,  x: 40, y: 13, season: "summer" },
  { id: 8,  x: 42, y: 14, season: "summer" },
  { id: 9,  x: 38, y: 12, season: "summer" },
  { id: 10, x: 18, y: 4,  season: "fall"   },
  { id: 11, x: 22, y: 5,  season: "fall"   },
];

export const SPURIOUS_EXAMPLES: SpuriousExample[] = [
  {
    id: 0,
    title: "Cheese Consumption vs Bedsheet Deaths",
    var1Label: "Per-capita cheese (lbs/yr)",
    var2Label: "Bedsheet entanglement deaths",
    r: "0.95",
    data: [
      { x: 29.8, y: 327 }, { x: 30.1, y: 456 }, { x: 30.5, y: 509 },
      { x: 30.6, y: 497 }, { x: 30.8, y: 596 }, { x: 31.3, y: 573 },
      { x: 31.7, y: 661 }, { x: 32.6, y: 741 },
    ],
    source: "Tyler Vigen, Spurious Correlations",
  },
  {
    id: 1,
    title: "Nicolas Cage Films vs Pool Drownings",
    var1Label: "Nicolas Cage films (per year)",
    var2Label: "Pool drowning deaths",
    r: "0.67",
    data: [
      { x: 2, y: 109 }, { x: 2, y: 102 }, { x: 2, y: 102 }, { x: 3, y: 98 },
      { x: 1, y: 85 },  { x: 1, y: 95 },  { x: 2, y: 96 },  { x: 3, y: 98 },
      { x: 4, y: 123 }, { x: 1, y: 94 },
    ],
    source: "Tyler Vigen, Spurious Correlations",
  },
  {
    id: 2,
    title: "Spelling Bee Word Length vs Spider Deaths",
    var1Label: "Letters in winning word",
    var2Label: "Spider-related deaths",
    r: "0.80",
    data: [
      { x: 6, y: 6 }, { x: 8, y: 5 }, { x: 9, y: 6 }, { x: 8, y: 8 },
      { x: 7, y: 6 }, { x: 7, y: 7 }, { x: 10, y: 9 }, { x: 8, y: 6 },
    ],
    source: "Tyler Vigen, Spurious Correlations",
  },
];

export const REAL_EXAMPLES: RealExample[] = [
  {
    id: 0,
    title: "Coffee & Heart Disease",
    var1: "Coffee cups/day",
    var2: "Heart disease risk (%)",
    r: "+0.12",
    confound: "Smoking status",
    confoundColor: "#6b7280",
    explanation: "Early studies linked coffee to heart disease. But smokers drink more coffee AND have higher heart disease risk. Controlling for smoking largely eliminates the coffee association.",
    data: [
      { x: 0, y: 8,  group: "non-smoker" }, { x: 2, y: 10, group: "non-smoker" }, { x: 4, y: 11, group: "non-smoker" },
      { x: 1, y: 18, group: "smoker" },     { x: 3, y: 22, group: "smoker" },     { x: 5, y: 25, group: "smoker" },
    ],
  },
  {
    id: 1,
    title: "Education & Income",
    var1: "Years of education",
    var2: "Annual income ($1000s)",
    r: "+0.65",
    confound: "Socioeconomic background",
    confoundColor: "#d4af37",
    explanation: "Education and income are strongly correlated. But wealthier families self-select into more education. Both causation and confounding are at play — it's genuinely complex.",
    data: [
      { x: 12, y: 35,  group: "low-ses" }, { x: 14, y: 42,  group: "low-ses" }, { x: 16, y: 55,  group: "low-ses" },
      { x: 14, y: 65,  group: "high-ses" }, { x: 16, y: 85, group: "high-ses" }, { x: 18, y: 105, group: "high-ses" },
    ],
  },
  {
    id: 2,
    title: "Chocolate & Nobel Prizes",
    var1: "Chocolate consumption (kg/yr)",
    var2: "Nobel laureates per 10M",
    r: "+0.79",
    confound: "Country wealth (GDP)",
    confoundColor: "#a855f7",
    explanation: "Wealthy countries eat more chocolate AND produce more Nobel laureates — driven by wealth and education infrastructure, not cocoa. A famous spurious correlation.",
    data: [
      { x: 1.8, y: 0.1, group: "developing" }, { x: 2.1, y: 0.2, group: "developing" },
      { x: 4.0, y: 2.0, group: "emerging" },   { x: 4.5, y: 2.5, group: "emerging" },
      { x: 8.0, y: 10,  group: "developed" },  { x: 11.5, y: 25, group: "developed" },
    ],
  },
  {
    id: 3,
    title: "Internet Use & Depression",
    var1: "Daily internet use (hrs)",
    var2: "Depression score (PHQ-9)",
    r: "+0.40",
    confound: "Passive vs active use",
    confoundColor: "#3bb4a4",
    explanation: "Both directions are likely true: depression increases passive doomscrolling, and excessive passive social media use worsens depression. Bidirectional causation with confounds.",
    data: [
      { x: 1, y: 3,  group: "active" }, { x: 3, y: 4,  group: "active" },
      { x: 5, y: 11, group: "passive" }, { x: 7, y: 14, group: "passive" }, { x: 2, y: 12, group: "passive" },
    ],
  },
  {
    id: 4,
    title: "Cell Phones & Traffic Accidents",
    var1: "Smartphone ownership (%)",
    var2: "Traffic accidents (per 1000)",
    r: "+0.72",
    confound: "Car ownership & road density",
    confoundColor: "#ef4444",
    explanation: "Smartphones and accidents both rose over time. But so did car ownership and road usage. The relationship is real but partially driven by overall modernization trends.",
    data: [
      { x: 20, y: 3.2, group: "low-density" }, { x: 35, y: 3.8, group: "low-density" },
      { x: 65, y: 5.0, group: "high-density" }, { x: 85, y: 6.8, group: "high-density" },
    ],
  },
];

// ── Statistics ──────────────────────────────────────────────────────────────

export function pearsonR(pts: { x: number; y: number }[]): number {
  const n = pts.length;
  if (n < 2) return 0;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  const num  = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0);
  const denX = Math.sqrt(pts.reduce((s, p) => s + (p.x - mx) ** 2, 0));
  const denY = Math.sqrt(pts.reduce((s, p) => s + (p.y - my) ** 2, 0));
  return denX * denY === 0 ? 0 : num / (denX * denY);
}

export function linearRegression(pts: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = pts.length;
  if (n < 2) return { slope: 0, intercept: 0 };
  const mx  = pts.reduce((s, p) => s + p.x, 0) / n;
  const my  = pts.reduce((s, p) => s + p.y, 0) / n;
  const num = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0);
  const den = pts.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: my - slope * mx };
}
