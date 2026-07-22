"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import type { Scenario } from "./types";
import ConceptExplainer from "./ConceptExplainer";

interface Props {
  scenario: Scenario;
  revealText: string;
  conceptTerms: { term: string; definition: string }[];
}

// ── Inline visualizations per scenario ───────────────────────────────────────

function ProductLaunchViz() {
  const bars = [
    { label: "Mobile", pct: 65, color: "var(--color-accent)" },
    { label: "Desktop", pct: 25, color: "#93c5fd" },
    { label: "All Users", pct: 45, color: "#94a3b8" },
  ];
  return (
    <div className="mt-4 space-y-2">
      <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-widest mb-2">Adoption by Device</p>
      {bars.map(({ label, pct, color }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-[11px] text-[#94a3b8] w-20 shrink-0">{label}</span>
          <div className="flex-1 bg-[#1e293b] rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-3 rounded-full"
              style={{ background: color }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, delay: 0.1 }}
            />
          </div>
          <span className="text-[11px] font-bold w-8 text-right" style={{ color }}>{pct}%</span>
        </div>
      ))}
      <p className="text-[11px] text-[#94a3b8] mt-2">Mobile users drive adoption. Headline &quot;45%&quot; hides device composition.</p>
    </div>
  );
}

function LoanDefaultViz() {
  const rows = [
    { group: "A", income: "High", defaultPct: 15 },
    { group: "A", income: "Low", defaultPct: 70 },
    { group: "B", income: "High", defaultPct: 12 },
    { group: "B", income: "Low", defaultPct: 68 },
  ];
  return (
    <div className="mt-4">
      <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-widest mb-3">Default Rate Stratified by Income</p>
      <div className="grid grid-cols-2 gap-3">
        {rows.map(({ group, income, defaultPct }) => (
          <div key={`${group}-${income}`} className="rounded-xl border border-[#1e293b] p-3">
            <p className="text-[11px] text-[#94a3b8] mb-1">Group {group} · {income} Income</p>
            <div className="bg-[#1e293b] rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-2 rounded-full bg-[#ef4444]"
                initial={{ width: 0 }}
                animate={{ width: `${defaultPct}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
            <p className="text-[12px] font-bold text-[#ef4444] mt-1">{defaultPct}% default</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[#94a3b8] mt-3">Within each income level, Groups A and B behave nearly identically. Income drives default, not group.</p>
    </div>
  );
}

function ClinicalTrialViz() {
  // Dot plot: mean and 95% CI for each group.
  // Consistent with the scenario's stated data (n = 30 per group):
  // Treated: 8 ± t(29, 0.975) * 15/sqrt(30) = 8 ± 5.6  -> [2.4, 13.6]
  // Control: 2 ± t(29, 0.975) * 14/sqrt(30) = 2 ± 5.2  -> [-3.2, 7.2]
  const treated = { mean: 8, ci: [2.4, 13.6] };
  const control = { mean: 2, ci: [-3.2, 7.2] };

  const groups = [
    { label: "Treated", ...treated, color: "#3bb4a4" },
    { label: "Control", ...control, color: "#93c5fd" },
  ];

  // Scale: map score range [-10, 20] to 0-100%
  const scale = (v: number) => ((v + 10) / 30) * 100;

  return (
    <div className="mt-4">
      <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-widest mb-3">Mean Improvement & 95% Confidence Interval</p>
      <div className="space-y-5 px-2">
        {groups.map(({ label, mean, ci, color }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-semibold" style={{ color }}>{label}</span>
              <span className="text-[11px] text-[#94a3b8]">Mean: {mean > 0 ? "+" : ""}{mean} pts</span>
            </div>
            {/* CI bar */}
            <div className="relative h-4 bg-[#1e293b] rounded-full overflow-hidden">
              {/* CI range */}
              <motion.div
                className="absolute top-1 h-2 rounded-full opacity-40"
                style={{
                  background: color,
                  left: `${scale(ci[0])}%`,
                  width: `${scale(ci[1]) - scale(ci[0])}%`,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                transition={{ duration: 0.5 }}
              />
              {/* Mean dot */}
              <motion.div
                className="absolute top-0.5 w-3 h-3 rounded-full -translate-x-1/2 border-2 border-[#0f172a]"
                style={{ background: color, left: `${scale(mean)}%` }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#475569] mt-0.5 px-0.5">
              <span>{ci[0]}</span>
              <span>95% CI</span>
              <span>{ci[1]}</span>
            </div>
          </div>
        ))}
        <p className="text-[11px] text-[#94a3b8]">
          What matters is the CI for the difference between groups: about -1.5 to +13.5 points, which includes zero (two-sample t-test p ≈ 0.11). Eyeballing whether two group CIs overlap is not a reliable significance test; groups whose CIs overlap somewhat can still differ significantly.
        </p>
      </div>
    </div>
  );
}

const VIZMAP: Record<Scenario, React.FC> = {
  product_launch: ProductLaunchViz,
  loan_default: LoanDefaultViz,
  clinical_trial: ClinicalTrialViz,
};

export default function RevealPanel({ scenario, revealText, conceptTerms }: Props) {
  const Viz = VIZMAP[scenario];
  const [animating, setAnimating] = useState(true);

  // Replace concept terms in text with tooltip components
  function renderText(text: string) {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let idx = 0;

    conceptTerms.forEach(({ term, definition }) => {
      const i = remaining.indexOf(term);
      if (i === -1) return;
      if (i > 0) parts.push(<span key={idx++}>{remaining.slice(0, i)}</span>);
      parts.push(<ConceptExplainer key={idx++} term={term} definition={definition} />);
      remaining = remaining.slice(i + term.length);
    });
    parts.push(<span key={idx++}>{remaining}</span>);
    return parts;
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.4 }}
      onAnimationComplete={() => setAnimating(false)}
      aria-live="polite"
      className={animating ? "overflow-hidden" : "overflow-visible"}
    >
      <div className="rounded-2xl border border-[#3bb4a4]/30 bg-[#3bb4a4]/5 p-5 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-[#3bb4a4] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#3bb4a4]">Why intuition fails</span>
        </div>
        <p className="text-[13px] text-[#f1f5f9] leading-relaxed">
          {renderText(revealText)}
        </p>
        <Viz />
      </div>
    </motion.div>
  );
}
