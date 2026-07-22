"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";

import {
  DatasetId,
  DATASETS,
  runIndependentTTest,
  mannWhitneyU,
  TestResult,
} from "./types";
import DataLoader from "./DataLoader";
import AssumptionChecker from "./AssumptionChecker";
import ComparisonPanel from "./ComparisonPanel";
import DecisionHelper from "./DecisionHelper";
import ResultsComparison from "./ResultsComparison";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

type TabId = "mann-whitney" | "wilcoxon" | "kruskal-wallis" | "sign-test";

const NEXT_GUIDE_SLUG = "correlation-covariance";

export default function NonparametricGuideClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const completionFired = useRef(false);

  // ── State ───────────────────────────────────────────────────────────────────
  const [selectedDataset, setSelectedDataset] = useState<DatasetId>("skewed");
  const [assumptionChecks, setAssumptionChecks] = useState(0);
  const [normalityViolationIdentified, setNormalityViolationIdentified] = useState(false);
  const [comparisonViewed, setComparisonViewed] = useState(false);
  const [decisionHelperUsed, setDecisionHelperUsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("mann-whitney");

  // ── Computed results for current dataset ─────────────────────────────────
  const currentDataset = useMemo(
    () => DATASETS.find((d) => d.id === selectedDataset)!,
    [selectedDataset]
  );

  const parametricResult: TestResult | null = useMemo(() => {
    if (!currentDataset.group1 || !currentDataset.group2) return null;
    return runIndependentTTest(currentDataset.group1, currentDataset.group2);
  }, [currentDataset]);

  const nonparametricResult: TestResult | null = useMemo(() => {
    if (!currentDataset.group1 || !currentDataset.group2) return null;
    return mannWhitneyU(currentDataset.group1, currentDataset.group2);
  }, [currentDataset]);

  // We track a "last checked normality" for the comparison panel
  const [isNormalForComparison, setIsNormalForComparison] = useState(false);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleDatasetSelect = (id: DatasetId) => {
    setSelectedDataset(id);
  };

  const handleAssumptionChecked = (violated: boolean) => {
    setAssumptionChecks((c) => c + 1);
    setIsNormalForComparison(!violated);
    if (violated) {
      setNormalityViolationIdentified(true);
    }
  };

  const handleReset = () => {
    setSelectedDataset("skewed");
    setAssumptionChecks(0);
    setNormalityViolationIdentified(false);
    setComparisonViewed(false);
    setDecisionHelperUsed(false);
    setActiveTab("mann-whitney");
    setIsNormalForComparison(false);
  };

  // ── Completion ──────────────────────────────────────────────────────────────
  const isComplete =
    assumptionChecks >= 2 &&
    normalityViolationIdentified &&
    comparisonViewed &&
    decisionHelperUsed;

  useEffect(() => {
    if (isComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "nonparametric-tests", score: 100 }),
      }).catch(() => {});
    }
  }, [isComplete, session?.user]);

  // ── Progress dots ────────────────────────────────────────────────────────
  const progressDots = [
    {
      label: `Assumption checks: ${assumptionChecks}/2`,
      done: assumptionChecks >= 2,
    },
    {
      label: "Normality violation identified",
      done: normalityViolationIdentified,
    },
    {
      label: "Comparison panel viewed",
      done: comparisonViewed,
    },
    {
      label: "Decision helper used",
      done: decisionHelperUsed,
    },
  ];

  // Data used for assumption checker (group1 if available, else values)
  const checkerData = currentDataset.group1 ?? currentDataset.values;

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="nonparametric-tests" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Nonparametric Tests</span>
        </nav>

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[10px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              STATISTICS
            </span>
            <span className="text-[10px] text-[#475569]">·</span>
            <span className="text-[10px] font-semibold uppercase tracking-[2px] text-[#475569]">
              UNIT 8: COMPARING GROUPS
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Nonparametric Tests:{" "}
            <span className="text-[var(--color-accent)]">When Assumptions Fail</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[680px]">
            Use rank-based methods when your data violates normality or when you have ordinal
            outcomes. Explore Mann-Whitney U, Wilcoxon signed-rank, and Kruskal-Wallis tests.
          </p>
        </motion.section>

        {/* Progress tracker */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progressDots.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors duration-300"
                style={{ background: done ? "#3bb4a4" : "#1e293b" }}
              />
              <span className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}>
                {label}
              </span>
            </div>
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link
                href="/auth/sign-in"
                className="underline underline-offset-2 hover:text-[#94a3b8]"
              >
                Sign in
              </Link>{" "}
              to track progress
            </p>
          )}
          <AnimatePresence>
            {isComplete && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-auto text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Main 2-col grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left column */}
          <div className="space-y-5">
            <DataLoader
              selectedDataset={selectedDataset}
              onSelect={handleDatasetSelect}
            />
            <AssumptionChecker
              data={checkerData}
              title="Assumption Check"
              onChecked={handleAssumptionChecked}
            />
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <ComparisonPanel
              parametricResult={parametricResult}
              nonparametricResult={nonparametricResult}
              isNormal={isNormalForComparison}
              onViewed={() => setComparisonViewed(true)}
            />
            <DecisionHelper onUsed={() => setDecisionHelperUsed(true)} />
            <ResultsComparison
              currentData={currentDataset}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>
        </div>

        {/* Completion card */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              variants={card}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="mt-8 rounded-2xl border border-white/[0.08] bg-[#0f172a] overflow-hidden"
            >
              <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-px bg-[var(--color-accent)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[2px] text-[var(--color-accent)]">
                    Guide Complete
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  You Know When Ranks Beat Means
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You checked assumptions instead of assuming them, caught a
                  normality violation, and compared what the t-test and
                  Mann-Whitney U say about the same data.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Assumption checks run
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {assumptionChecks}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      normality violation identified
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Last dataset checked
                    </p>
                    <p className="text-[14px] font-mono font-bold text-white">
                      {currentDataset.label}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      {isNormalForComparison
                        ? "passed the normality check"
                        : "failed the normality check"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      t-test vs Mann-Whitney U (p-values)
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {parametricResult && nonparametricResult
                        ? `${parametricResult.pValue.toFixed(4)} vs ${nonparametricResult.pValue.toFixed(4)}`
                        : "n/a"}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      same data, two verdicts
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Parametric tests buy power by assuming a shape for
                    your data; when skew, outliers, or ordinal scales break that
                    shape, rank-based tests trade a little power for
                    conclusions you can actually trust.&quot;
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3">
                <Link
                  href="/visual-guides"
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
                >
                  ← All Guides
                </Link>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
                  >
                    Try Again
                  </button>
                  <Link
                    href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
                  >
                    Next Guide →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer nav (pre-completion) */}
        {!isComplete && (
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/anova-comparing-groups"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← ANOVA: Comparing Many Groups
          </Link>
          <Link
            href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Correlation &amp; Covariance →
          </Link>
        </div>
        )}
      </div>
    </div>
  );
}
