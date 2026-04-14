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

// ── UC Berkeley case study ────────────────────────────────────────────────────

export const UC_BERKELEY: CaseStudy = {
  id: "berkeley",
  title: "UC Berkeley Admissions (1970s)",
  context:
    "Overall, men appear to be admitted at a higher rate. But is there really bias against women?",
  xLabel: "Department",
  groupALabel: "Men",
  groupBLabel: "Women",
  aggregateRateA: 0.44,
  aggregateRateB: 0.35,
  subgroups: [
    { name: "Math",      treatmentA: { success: 512, total: 800 }, treatmentB: { success: 89,  total: 108 } },
    { name: "Physics",   treatmentA: { success: 353, total: 600 }, treatmentB: { success: 17,  total: 25  } },
    { name: "Chemistry", treatmentA: { success: 120, total: 325 }, treatmentB: { success: 202, total: 593 } },
    { name: "Biology",   treatmentA: { success: 53,  total: 191 }, treatmentB: { success: 94,  total: 393 } },
    { name: "English",   treatmentA: { success: 22,  total: 393 }, treatmentB: { success: 24,  total: 341 } },
    { name: "History",   treatmentA: { success: 26,  total: 373 }, treatmentB: { success: 23,  total: 341 } },
  ],
  lurkingVariable:
    "Department selectivity — women applied more to competitive departments",
  explanation:
    "Women tended to apply to more selective departments. Within each department, women were admitted at equal or higher rates. The aggregate misleads because of unequal distribution across departments.",
  directionReverses: true,
};

// ── Kidney stones case study ──────────────────────────────────────────────────

export const KIDNEY_STONES: CaseStudy = {
  id: "kidney",
  title: "Kidney Stone Treatments",
  context: "Which treatment works better? Surgery or medication?",
  xLabel: "Stone Size",
  groupALabel: "Surgery",
  groupBLabel: "Medication",
  aggregateRateA: 0.78,
  aggregateRateB: 0.83,
  subgroups: [
    { name: "Small Stones", treatmentA: { success: 81,  total: 87  }, treatmentB: { success: 234, total: 270 } },
    { name: "Large Stones", treatmentA: { success: 192, total: 263 }, treatmentB: { success: 55,  total: 80  } },
  ],
  lurkingVariable:
    "Stone size — surgery used more often for harder large-stone cases",
  explanation:
    "Doctors assigned surgery to harder cases (large stones). Surgery appears worse overall because it handles tougher patients. Within each stone-size group, surgery performs better or equal to medication.",
  directionReverses: true,
};

export const ALL_CASE_STUDIES: CaseStudy[] = [UC_BERKELEY, KIDNEY_STONES];
