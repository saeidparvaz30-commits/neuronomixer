// ── Sub-group rate ─────────────────────────────────────────────────────────────

export interface SubgroupRate {
  name: string;
  treatmentA: { success: number; total: number };
  treatmentB: { success: number; total: number };
}

// ── Case study ────────────────────────────────────────────────────────────────

export interface CaseStudy {
  id: string;
  title: string;
  context: string;
  xLabel: string;
  groupALabel: string;
  groupBLabel: string;
  aggregateRateA: number;
  aggregateRateB: number;
  subgroups: SubgroupRate[];
  lurkingVariable: string;
  explanation: string;
  directionReverses: boolean;
}

// ── Helper ────────────────────────────────────────────────────────────────────

export function computeSubgroupRates(subgroup: SubgroupRate): { rateA: number; rateB: number } {
  const rateA = subgroup.treatmentA.total > 0
    ? subgroup.treatmentA.success / subgroup.treatmentA.total
    : 0;
  const rateB = subgroup.treatmentB.total > 0
    ? subgroup.treatmentB.success / subgroup.treatmentB.total
    : 0;
  return { rateA, rateB };
}

// ── Aggregate computation ─────────────────────────────────────────────────────
// Aggregates are ALWAYS derived from the subgroup counts so the numbers on
// screen can never disagree with the displayed strata.

function aggregateRate(subgroups: SubgroupRate[], side: "treatmentA" | "treatmentB"): number {
  const success = subgroups.reduce((s, g) => s + g[side].success, 0);
  const total = subgroups.reduce((s, g) => s + g[side].total, 0);
  return total > 0 ? success / total : 0;
}

// ── UC Berkeley case study ────────────────────────────────────────────────────
// Real fall 1973 admissions counts for the six largest departments (labelled
// A-F in the original paper), from Bickel, Hammel & O'Connell, Science (1975).

const BERKELEY_SUBGROUPS: SubgroupRate[] = [
  { name: "Dept A", treatmentA: { success: 512, total: 825 }, treatmentB: { success: 89,  total: 108 } },
  { name: "Dept B", treatmentA: { success: 353, total: 560 }, treatmentB: { success: 17,  total: 25  } },
  { name: "Dept C", treatmentA: { success: 120, total: 325 }, treatmentB: { success: 202, total: 593 } },
  { name: "Dept D", treatmentA: { success: 138, total: 417 }, treatmentB: { success: 131, total: 375 } },
  { name: "Dept E", treatmentA: { success: 53,  total: 191 }, treatmentB: { success: 94,  total: 393 } },
  { name: "Dept F", treatmentA: { success: 22,  total: 373 }, treatmentB: { success: 24,  total: 341 } },
];

export const UC_BERKELEY: CaseStudy = {
  id: "berkeley",
  title: "UC Berkeley Admissions (1973)",
  context:
    "Real admissions data from the six largest departments (Bickel et al., 1975). Overall, men appear to be admitted at a much higher rate. But is there really bias against women?",
  xLabel: "Department",
  groupALabel: "Men",
  groupBLabel: "Women",
  aggregateRateA: aggregateRate(BERKELEY_SUBGROUPS, "treatmentA"), // 1198/2691 ≈ 44.5%
  aggregateRateB: aggregateRate(BERKELEY_SUBGROUPS, "treatmentB"), // 557/1835 ≈ 30.4%
  subgroups: BERKELEY_SUBGROUPS,
  lurkingVariable:
    "Department selectivity: women applied far more often to the competitive departments",
  explanation:
    "Women applied disproportionately to the hardest-to-enter departments (C through F), while men flooded the easy ones (A and B admit over 60%). Department by department there is no consistent penalty for women: their admission rate is higher in four of the six departments, including department A, the largest, and only slightly lower in the other two. The aggregate gap comes almost entirely from where people applied.",
  directionReverses: true,
};

// ── Kidney stones case study ──────────────────────────────────────────────────
// Real counts from Charig et al., BMJ (1986): open surgery vs percutaneous
// nephrolithotomy (a keyhole procedure), split by stone size.

const KIDNEY_SUBGROUPS: SubgroupRate[] = [
  { name: "Small Stones", treatmentA: { success: 81,  total: 87  }, treatmentB: { success: 234, total: 270 } },
  { name: "Large Stones", treatmentA: { success: 192, total: 263 }, treatmentB: { success: 55,  total: 80  } },
];

export const KIDNEY_STONES: CaseStudy = {
  id: "kidney",
  title: "Kidney Stone Treatments (1986)",
  context:
    "Real data from Charig et al. (1986). Which works better: open surgery, or the less invasive percutaneous (keyhole) procedure?",
  xLabel: "Stone Size",
  groupALabel: "Open Surgery",
  groupBLabel: "Percutaneous",
  aggregateRateA: aggregateRate(KIDNEY_SUBGROUPS, "treatmentA"), // 273/350 = 78.0%
  aggregateRateB: aggregateRate(KIDNEY_SUBGROUPS, "treatmentB"), // 289/350 ≈ 82.6%
  subgroups: KIDNEY_SUBGROUPS,
  lurkingVariable:
    "Stone size: open surgery was used far more often for the harder large-stone cases",
  explanation:
    "Doctors sent the harder cases (large stones) to open surgery. Open surgery wins within BOTH stone-size groups (93% vs 87% for small, 73% vs 69% for large), yet looks worse overall because its caseload is dominated by the difficult large stones. This is confounding by indication: severity influenced both the treatment chosen and the outcome.",
  directionReverses: true,
};

export const ALL_CASE_STUDIES: CaseStudy[] = [UC_BERKELEY, KIDNEY_STONES];
