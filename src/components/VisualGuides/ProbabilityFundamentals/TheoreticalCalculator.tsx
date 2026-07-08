"use client";

import React from "react";
import {
  type CompoundEvent,
  SINGLE_P,
  labelFor,
  countMatching,
  countMatchingBoth,
  sampleSpaceSize,
} from "./types";

interface TheoreticalCalculatorProps {
  event: CompoundEvent;
}

export default function TheoreticalCalculator({ event }: TheoreticalCalculatorProps) {
  const p = event.theoretical;
  const pct = (p * 100).toFixed(1);

  const { ruleName, formula, sampleSpace } = buildExplanation(event);

  return (
    <div className="space-y-4">
      {/* Large P display */}
      <div className="rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/5 px-5 py-4 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[var(--color-accent)] mb-1">
          Theoretical Probability
        </p>
        <p className="text-3xl font-black text-white font-mono">
          {p.toFixed(3)}{" "}
          <span className="text-[var(--color-accent)] text-xl">({pct}%)</span>
        </p>
      </div>

      {/* Rule name */}
      <div className="rounded-xl border border-[#3bb4a4]/30 bg-[#3bb4a4]/5 px-4 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#3bb4a4] mb-0.5">
          Rule Applied
        </p>
        <p className="text-[13px] text-white">{ruleName}</p>
      </div>

      {/* Formula */}
      <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] px-4 py-3 font-mono text-[13px] text-[#94a3b8] leading-relaxed whitespace-pre-wrap">
        {formula}
      </div>

      {/* Sample space */}
      <p className="text-[12px] text-[#94a3b8] leading-relaxed">{sampleSpace}</p>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  // Show as fraction if it's a clean fraction, otherwise decimal
  const fracs: [number, string][] = [
    [1 / 2, "1/2"],
    [1 / 6, "1/6"],
    [2 / 6, "2/6"],
    [3 / 6, "3/6"],
    [4 / 6, "4/6"],
    [5 / 6, "5/6"],
    [13 / 52, "13/52"],
    [26 / 52, "26/52"],
    [12 / 52, "12/52"],
    [4 / 52, "4/52"],
  ];
  const hit = fracs.find(([v]) => Math.abs(v - n) < 0.0001);
  return hit ? `${hit[1]} ≈ ${n.toFixed(3)}` : n.toFixed(3);
}

function sampleSpaceDesc(type: string, outcome: string): { n: number; m: number } {
  const totals: Record<string, number> = {
    coin_flip: 2,
    die_roll: 6,
    card_draw: 52,
  };
  const n = totals[type] ?? 1;
  const p = SINGLE_P[type as keyof typeof SINGLE_P]?.[outcome] ?? 0;
  const m = Math.round(p * n);
  return { n, m };
}

function buildExplanation(event: CompoundEvent): {
  ruleName: string;
  formula: string;
  sampleSpace: string;
} {
  const { firstType, firstOutcome, operator, secondType, secondOutcome, theoretical: p } = event;
  const pA = SINGLE_P[firstType]?.[firstOutcome] ?? 0;
  const aLabel = `P(${labelFor(firstType)}: ${firstOutcome})`;

  if (operator === "none") {
    const { n, m } = sampleSpaceDesc(firstType, firstOutcome);
    return {
      ruleName: "Basic Probability",
      formula: `${aLabel} = ${fmt(pA)}`,
      sampleSpace: `Out of ${n} possible outcomes, ${m} match your event.`,
    };
  }

  if (operator === "NOT") {
    const { n, m } = sampleSpaceDesc(firstType, firstOutcome);
    return {
      ruleName: "Complement Rule",
      formula: `P(NOT ${labelFor(firstType)}: ${firstOutcome})\n= 1 − ${aLabel}\n= 1 − ${fmt(pA)}\n≈ ${p.toFixed(3)}`,
      sampleSpace: `Out of ${n} possible outcomes, ${n - m} do NOT match "${firstOutcome}".`,
    };
  }

  if (!secondType || !secondOutcome) {
    return { ruleName: "—", formula: "Select a second event.", sampleSpace: "" };
  }

  const pB = SINGLE_P[secondType]?.[secondOutcome] ?? 0;
  const bLabel = `P(${labelFor(secondType)}: ${secondOutcome})`;
  const sameSpace = firstType === secondType;

  if (sameSpace) {
    // One draw decides both events: they are overlapping sets in the same
    // sample space (exactly the Venn diagram picture).
    const N = sampleSpaceSize(firstType);
    const both = countMatchingBoth(firstType, firstOutcome, secondOutcome);
    const mA = countMatching(firstType, firstOutcome);
    const mB = countMatching(firstType, secondOutcome);

    if (operator === "AND") {
      return {
        ruleName: "Intersection of Events (Same Draw)",
        formula: `P(A AND B)\n= |A ∩ B| / N\n= ${both}/${N}\n≈ ${p.toFixed(3)}`,
        sampleSpace: `Both events are decided by the SAME ${labelFor(firstType).toLowerCase()}: ${both} of the ${N} possible outcomes satisfy both, like the overlap region of a Venn diagram.`,
      };
    }
    return {
      ruleName: "Addition Rule (Same Draw, Inclusion-Exclusion)",
      formula: `P(A OR B)\n= |A ∪ B| / N\n= (${mA} + ${mB} − ${both})/${N}\n≈ ${p.toFixed(3)}`,
      sampleSpace: `Both events are decided by the SAME ${labelFor(firstType).toLowerCase()}: we count outcomes in either set, subtracting the ${both} counted twice, like the union of two Venn circles.`,
    };
  }

  if (operator === "AND") {
    return {
      ruleName: "Multiplication Rule for Independent Events",
      formula: `P(A AND B)\n= ${aLabel} × ${bLabel}\n= ${fmt(pA)} × ${fmt(pB)}\n≈ ${p.toFixed(3)}`,
      sampleSpace: `The two events come from different experiments (independent draws). P(both) = product of individual probabilities.`,
    };
  }

  // OR (independent draws)
  const pAB = pA * pB;
  return {
    ruleName: "Addition Rule (Inclusion-Exclusion)",
    formula: `P(A OR B)\n= ${aLabel} + ${bLabel} − P(A AND B)\n= ${fmt(pA)} + ${fmt(pB)} − ${pAB.toFixed(3)}\n≈ ${p.toFixed(3)}`,
    sampleSpace: `We subtract the overlap P(A AND B) = ${fmt(pA)} × ${fmt(pB)} (independent draws) to avoid double-counting trials where both events occur.`,
  };
}
