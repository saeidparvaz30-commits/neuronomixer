"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  NonparametricData,
  TestResult,
  mannWhitneyU,
  wilcoxonSignedRank,
  kruskalWallis,
  signTest,
  mean,
} from "./types";

type TabId = "mann-whitney" | "wilcoxon" | "kruskal-wallis" | "sign-test";

interface Props {
  currentData: NonparametricData;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "mann-whitney", label: "Mann-Whitney U" },
  { id: "wilcoxon", label: "Wilcoxon Signed-Rank" },
  { id: "kruskal-wallis", label: "Kruskal-Wallis" },
  { id: "sign-test", label: "Sign Test" },
];

interface TabContent {
  scenario: string;
  steps: string[];
  // Returns null when the test is not applicable to the current dataset
  // (paired tests must not be run on independent groups).
  run: (data: NonparametricData) => TestResult | null;
}

const TAB_CONTENT: Record<TabId, TabContent> = {
  "mann-whitney": {
    scenario:
      "Two independent groups (e.g. Group A vs Group B). Tests whether the rank distribution of one group is stochastically greater than the other.",
    steps: [
      "1. Combine all values from both groups into one list",
      "2. Sort combined list and assign ranks (average ties)",
      "3. Compute R₁ = sum of ranks for group 1",
      "4. U₁ = n₁·n₂ + n₁(n₁+1)/2 − R₁",
      "5. U = min(U₁, U₂)  where U₂ = n₁·n₂ − U₁",
      "6. μᵤ = n₁·n₂/2,  σᵤ = √(n₁·n₂·(n₁+n₂+1)/12)",
      "7. z = (U − μᵤ) / σᵤ,  p = 2·Φ(z)",
    ],
    run: (data) => {
      if (!data.group1 || !data.group2) {
        return {
          testName: "Mann-Whitney U",
          statistic: 0,
          statisticLabel: "U",
          pValue: 1,
          significant: false,
          assumptionsMet: true,
          reliable: true,
        };
      }
      return mannWhitneyU(data.group1, data.group2);
    },
  },
  wilcoxon: {
    scenario:
      "Paired or before/after measurements from the same subjects. Tests whether the median difference is zero.",
    steps: [
      "1. Compute differences: dᵢ = before_i − after_i",
      "2. Remove zero differences",
      "3. Rank absolute values |dᵢ|, average ties",
      "4. W⁺ = sum of ranks where dᵢ > 0",
      "5. W⁻ = sum of ranks where dᵢ < 0",
      "6. T = min(W⁺, W⁻)",
      "7. μₜ = m(m+1)/4,  σₜ = √(m(m+1)(2m+1)/24)  where m = # nonzero diffs",
      "8. z = (T − μₜ) / σₜ,  p = 2·Φ(z)",
    ],
    run: (data) => {
      // Only genuinely paired data may be used; pairing up two independent
      // groups would be statistically invalid.
      if (!data.before || !data.after) return null;
      return wilcoxonSignedRank(data.before, data.after);
    },
  },
  "kruskal-wallis": {
    scenario:
      "Three or more independent groups. Nonparametric analog of one-way ANOVA using ranks. Here we split the data into three equal-ish groups.",
    steps: [
      "1. Combine all observations into one list",
      "2. Rank all N values (average ties)",
      "3. Compute Rⱼ = sum of ranks in group j",
      "4. H = [12 / (N(N+1))] · Σ(Rⱼ² / nⱼ) − 3(N+1)",
      "5. df = k − 1  (k = number of groups)",
      "6. p ≈ P(χ²_{df} > H)  via normal approximation",
    ],
    run: (data) => {
      // Split into 3 groups
      const all = data.values;
      const n = all.length;
      const s1 = Math.floor(n / 3);
      const s2 = Math.floor((2 * n) / 3);
      const g1 = all.slice(0, s1);
      const g2 = all.slice(s1, s2);
      const g3 = all.slice(s2);
      return kruskalWallis([g1, g2, g3]);
    },
  },
  "sign-test": {
    scenario:
      "Simplest nonparametric test for paired data. Only counts the sign of differences — ignores magnitude entirely.",
    steps: [
      "1. Compute differences: dᵢ = before_i − after_i",
      "2. Remove zero differences (ties)",
      "3. Count S = number of positive differences",
      "4. Under H₀: S ~ Binomial(m, 0.5)  where m = # nonzero diffs",
      "5. Normal approximation with continuity correction:",
      "   z = (|S − m/2| − 0.5) / √(m/4)",
      "6. p = 2·(1 − Φ(|z|))",
    ],
    run: (data) => {
      // Only genuinely paired data may be used; pairing up two independent
      // groups would be statistically invalid.
      if (!data.before || !data.after) return null;
      return signTest(data.before, data.after);
    },
  },
};

function ResultCard({ result }: { result: TestResult }) {
  const fmtP = (p: number) => (p < 0.001 ? "< 0.001" : p.toFixed(4));

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-4 space-y-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-white">{result.testName} Result</span>
        {result.significant ? (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30">
            Significant
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-white/10 text-[#94a3b8] border border-white/10">
            Not Significant
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[9px] text-[#94a3b8] uppercase tracking-wide">Statistic</p>
          <p className="text-[13px] font-mono font-bold text-white">
            {result.statisticLabel} = {result.statistic.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-[9px] text-[#94a3b8] uppercase tracking-wide">p-value</p>
          <p
            className={`text-[13px] font-mono font-bold ${
              result.significant ? "text-[#10b981]" : "text-white"
            }`}
          >
            {fmtP(result.pValue)}
          </p>
        </div>
      </div>
      <p className="text-[10px] text-[#94a3b8] leading-relaxed">
        {result.significant
          ? `p < 0.05: There is a statistically significant difference. Reject H₀.`
          : `p ≥ 0.05: No statistically significant difference detected. Fail to reject H₀.`}
      </p>
    </motion.div>
  );
}

export default function ResultsComparison({ currentData, activeTab, onTabChange }: Props) {
  const [result, setResult] = useState<TestResult | null>(null);
  const [notApplicable, setNotApplicable] = useState(false);
  const [dataKey, setDataKey] = useState("");

  const currentKey = `${currentData.id}-${activeTab}`;

  React.useEffect(() => {
    if (currentKey !== dataKey) {
      setResult(null);
      setNotApplicable(false);
      setDataKey(currentKey);
    }
  }, [currentKey, dataKey]);

  const handleRun = () => {
    const content = TAB_CONTENT[activeTab];
    const r = content.run(currentData);
    setResult(r);
    setNotApplicable(r === null);
  };

  const content = TAB_CONTENT[activeTab];
  const dataMean1 = currentData.group1 ? mean(currentData.group1).toFixed(2) : "—";
  const dataMean2 = currentData.group2 ? mean(currentData.group2).toFixed(2) : "—";
  const n1 = currentData.group1?.length ?? 0;
  const n2 = currentData.group2?.length ?? 0;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <h3 className="text-[13px] font-bold text-white mb-1">Test Calculations</h3>
      <p className="text-[11px] text-[#94a3b8] mb-4">
        Step-by-step breakdown of each nonparametric test
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
              activeTab === tab.id
                ? "bg-[#d4af37] text-[#0a0e1a]"
                : "border border-[#1e293b] text-[#94a3b8] hover:border-[#d4af37] hover:text-[#d4af37]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {/* Scenario */}
          <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/20 p-3 mb-3">
            <p className="text-[10px] text-[#94a3b8] font-medium uppercase tracking-wide mb-1">
              When to Use
            </p>
            <p className="text-[11px] text-white leading-relaxed">{content.scenario}</p>
          </div>

          {/* Data context */}
          <div className="flex gap-3 mb-3 flex-wrap">
            <div className="text-[10px] text-[#94a3b8]">
              Dataset:{" "}
              <span className="text-white font-semibold">{currentData.label}</span>
            </div>
            {n1 > 0 && (
              <div className="text-[10px] text-[#94a3b8]">
                Group 1: n={n1}, mean={dataMean1}
              </div>
            )}
            {n2 > 0 && (
              <div className="text-[10px] text-[#94a3b8]">
                Group 2: n={n2}, mean={dataMean2}
              </div>
            )}
          </div>

          {/* Steps */}
          <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/10 p-3 mb-3">
            <p className="text-[10px] text-[#94a3b8] font-medium uppercase tracking-wide mb-2">
              Calculation Steps
            </p>
            <ul className="space-y-1">
              {content.steps.map((step, i) => (
                <li key={i} className="text-[11px] font-mono text-[#94a3b8] leading-relaxed">
                  {step}
                </li>
              ))}
            </ul>
          </div>

          {/* Run button */}
          <motion.button
            onClick={handleRun}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full px-4 py-2 rounded-xl text-[12px] font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Run on Current Data
          </motion.button>

          {/* Result */}
          <AnimatePresence>
            {result && <ResultCard result={result} />}
          </AnimatePresence>
          {notApplicable && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/5 p-4"
            >
              <p className="text-[11px] font-bold text-[#f59e0b] mb-1">
                Not applicable to this dataset
              </p>
              <p className="text-[10px] text-[#94a3b8] leading-relaxed">
                This test requires paired before/after measurements from the same
                subjects. The current dataset contains two independent groups, so
                running it here would be statistically invalid. Load the{" "}
                <span className="text-white font-semibold">Small Sample</span> dataset
                (paired, n=12) to try it.
              </p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
