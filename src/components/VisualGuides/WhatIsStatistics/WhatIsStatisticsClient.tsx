"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import type { Scenario, FramingType, ScenarioInfo, WhatIsStatisticsState } from "./types";
import { initialState } from "./types";
import ScenarioCard from "./ScenarioCard";

// ── Scenario data ─────────────────────────────────────────────────────────────

const SCENARIOS: ScenarioInfo[] = [
  {
    id: "product_launch",
    title: "Product Launch Success",
    context:
      "A company launches a new feature. After 1 week, 45% of users adopted it. Marketing says 'success!' but the data analyst is skeptical. The raw data covers 200 users with adoption status, device type, traffic source, and user tenure.",
    decisionQuestion:
      "Can we confidently say the feature is a success based on 45% adoption?",
    options: ["Yes, 45% is strong", "I need more information", "No, it failed"],
    correctAnswer: "I need more information",
    notQuiteHint:
      "Think about what baseline you'd need to interpret 45%. Is that number good or bad without context?",
    revealText:
      "45% compared to what? Without a baseline, this number is meaningless. The data reveals a Simpson's Paradox-style structure: mobile users adopt at 65% while desktop users adopt at only 25%. The headline figure blurs this critical difference. Asking 'compared to what?' is the first move of statistical thinking.",
    conceptTerms: [
      {
        term: "Simpson's Paradox",
        definition:
          "A trend appears in different groups of data but reverses or disappears when the groups are combined.",
      },
    ],
    framings: {
      descriptive:
        "45% of the 200 sampled users adopted the feature. Mobile adoption was 65%; desktop was 25%. The mode traffic source was Organic.",
      inferential:
        "Can we generalize this 45% to all users? Only if the 200 users are a random sample. The device split in our sample must match the overall user base — otherwise our estimate is biased.",
      predictive:
        "If the next 1000 users have the same device mix (50% mobile), predicted adoption is ~45%. If mobile share grows to 70%, predicted adoption rises to ~53%.",
    },
  },
  {
    id: "loan_default",
    title: "Loan Default Bias",
    context:
      "You are auditing a loan approval algorithm. In the raw data: 70% of Group A loans defaulted; 30% of Group B loans defaulted. The conclusion: 'Group A is riskier.' But there is hidden structure — Group A has a different income composition than Group B.",
    decisionQuestion: "Is Group A truly riskier, or is something else happening?",
    options: [
      "Yes, Group A is riskier",
      "Something else is happening",
      "Need more data",
    ],
    correctAnswer: "Something else is happening",
    notQuiteHint:
      "Consider whether the two groups have the same mix of high-income and low-income borrowers.",
    revealText:
      "This is a classic case of Simpson's Paradox and confounding. Group A has 50% low-income borrowers; Group B has only 20%. When you stratify by income, defaults depend almost entirely on income level, not group membership. The algorithm may be encoding income-based risk and calling it group-based — a serious fairness issue.",
    conceptTerms: [
      {
        term: "Simpson's Paradox",
        definition:
          "A trend that appears in combined data reverses when the data is broken into sub-groups.",
      },
      {
        term: "confounding",
        definition:
          "A variable that influences both the predictor and the outcome, creating a spurious association.",
      },
    ],
    framings: {
      descriptive:
        "Group A: 70% default overall (15% high-income, 70% low-income). Group B: 30% default overall (12% high-income, 68% low-income). Income level, not group, explains defaults.",
      inferential:
        "If we built a model using group as a predictor, it would learn a spurious signal. A properly controlled model would show group membership has near-zero effect once income is included.",
      predictive:
        "For a future applicant, the best default predictor is income level, not group. A future Group A applicant with high income is predicted to default at ~15%, same as Group B high-income.",
    },
  },
  {
    id: "clinical_trial",
    title: "Clinical Trial Ambiguity",
    context:
      "A pharmaceutical company reports their new drug reduced symptom severity by an average of 8 points (on a 100-point scale) compared to a placebo (which showed 2 points improvement). The company claims 'clinically meaningful.' You see all individual data points in the raw table.",
    decisionQuestion:
      "Is the drug's 8-point effect real and clinically meaningful, or could it be noise?",
    options: [
      "Yes, 8 points is meaningful",
      "I need to see variation and confidence intervals",
      "No, 2 vs 8 is not different",
    ],
    correctAnswer: "I need to see variation and confidence intervals",
    notQuiteHint:
      "An 8-point mean difference tells you nothing about whether that difference is consistent or driven by a few extreme values.",
    revealText:
      "The individual scores show high variance within both groups. The 95% confidence interval around the treatment effect stretches from near zero to +15.5 — overlapping with the placebo CI. Without a formal significance test, we cannot conclude the effect is real. Statistical significance (is this likely due to chance?) must be answered before clinical significance (is this large enough to matter?).",
    conceptTerms: [
      {
        term: "confidence interval",
        definition:
          "A range of plausible values for the true effect. A 95% CI means: if we repeated the study many times, 95% of the CIs would contain the true value.",
      },
      {
        term: "statistical significance",
        definition:
          "A test of whether an observed effect is likely due to chance, typically assessed via p-value < 0.05.",
      },
    ],
    framings: {
      descriptive:
        "Treated group mean improvement: 8 points (SD ≈ 15). Control group mean improvement: 2 points (SD ≈ 14). Individual data points show substantial overlap.",
      inferential:
        "A two-sample t-test on these 60 subjects would yield a p-value near 0.09 — not significant at the 0.05 threshold. We cannot reject the null hypothesis that the drug has no effect.",
      predictive:
        "With the current evidence, predicting the drug works for the next patient is premature. A larger trial (n ≥ 150) would be needed to reliably detect an 8-point effect given this variance.",
    },
  },
];

// ── Main component ─────────────────────────────────────────────────────────────

export default function WhatIsStatisticsClient() {
  const { data: session } = useSession();
  const completionFired = useRef(false);
  const [state, setState] = useState<WhatIsStatisticsState>(initialState);
  const [framingToggled, setFramingToggled] = useState<Set<FramingType>>(new Set());

  // Completion logic
  const correctAnswersCount = Object.values(state.revealed).filter(Boolean).length;
  const allScenariosComplete = correctAnswersCount === 3;
  const allFramingsToggled = framingToggled.size === 3;
  const allComplete = allScenariosComplete && allFramingsToggled;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "what-is-statistics", score: 5 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  function handleAnswer(scenario: Scenario, answer: string) {
    const info = SCENARIOS.find((s) => s.id === scenario)!;
    const correct = answer === info.correctAnswer;
    setState((prev) => ({
      ...prev,
      userAnswers: { ...prev.userAnswers, [scenario]: answer },
      revealed: { ...prev.revealed, [scenario]: correct ? true : prev.revealed[scenario] },
    }));
  }

  function handleFraming(scenario: Scenario, f: FramingType) {
    setState((prev) => ({ ...prev, framing: f }));
    setFramingToggled((prev) => new Set([...prev, f]));
    // Suppress unused scenario param — framing is global
    void scenario;
  }

  const progress = [
    { label: `Scenarios solved: ${correctAnswersCount}/3`, done: allScenariosComplete },
    { label: `Framings toggled: ${framingToggled.size}/3`, done: allFramingsToggled },
  ];

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">What Is Statistics?</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#d4af37]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#d4af37]">Statistics</span>
            <span className="w-6 h-px bg-[#d4af37]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            What Is Statistics?{" "}
            <span className="text-[#d4af37]">Why It Matters</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[680px] mb-4">
            Three real-world scenarios where raw intuition fails. See why organizations rely on statistical thinking to extract signal from noise.
          </p>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[680px]">
            Statistics is not about memorizing formulas — it is about asking the right questions of data. Each scenario below presents raw data and an intuitive conclusion. Your job is to decide whether to trust it.
          </p>
        </section>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progress.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full transition-colors ${done ? "bg-[#3bb4a4]" : "bg-[#1e293b]"}`} />
              <span className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}>{label}</span>
            </div>
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link href="/auth/sign-in" className="underline underline-offset-2 hover:text-[#94a3b8]">Sign in</Link>{" "}to track progress
            </p>
          )}
          <AnimatePresence>
            {allComplete && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-auto text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Scenarios */}
        <div className="space-y-6">
          {SCENARIOS.map((info, i) => (
            <ScenarioCard
              key={info.id}
              info={info}
              userAnswer={state.userAnswers[info.id]}
              revealed={state.revealed[info.id]}
              framing={state.framing}
              onAnswer={(answer) => handleAnswer(info.id, answer)}
              onFramingChange={(f) => handleFraming(info.id, f)}
              scenarioIndex={i}
            />
          ))}
        </div>

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← All Guides
          </Link>
          <Link
            href="/visual-guides/types-of-data-measurement-scales"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Next: Types of Data →
          </Link>
        </div>
      </div>
    </div>
  );
}
