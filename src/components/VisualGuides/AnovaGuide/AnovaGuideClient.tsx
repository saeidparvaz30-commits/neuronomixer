"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

import {
  GroupData,
  AnovaStatistics,
  PairwiseComparison,
  computeANOVA,
  computeTukeyHSD,
  getDefaultGroups,
} from "./types";
import DataBuilder from "./DataBuilder";
import BoxPlotVisualizer from "./BoxPlotVisualizer";
import VarianceDecomposer from "./VarianceDecomposer";
import PostHocComparison from "./PostHocComparison";
import RepeatedMeasuresToggle from "./RepeatedMeasuresToggle";
import ResultsSummary from "./ResultsSummary";

interface CompletionState {
  anovaRun: boolean;
  decompositionCompleted: boolean;
  postHocViewed: boolean;
  repeatedToggled: boolean;
  correctInterpretation: boolean;
}

const INITIAL_COMPLETION: CompletionState = {
  anovaRun: false,
  decompositionCompleted: false,
  postHocViewed: false,
  repeatedToggled: false,
  correctInterpretation: false,
};

export default function AnovaGuideClient() {
  const { data: session } = useSession();
  const completionFired = useRef(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const [groups, setGroups] = useState<GroupData[]>(() => getDefaultGroups());
  const [statistics, setStatistics] = useState<AnovaStatistics | null>(null);
  const [pairwiseComparisons, setPairwiseComparisons] = useState<PairwiseComparison[] | null>(null);
  const [decompositionStep, setDecompositionStep] = useState(0);
  const [isRepeated, setIsRepeated] = useState(false);
  const [completion, setCompletion] = useState<CompletionState>(INITIAL_COMPLETION);

  // ── Run ANOVA ──────────────────────────────────────────────────────────────

  const runAnova = useCallback((currentGroups: GroupData[]) => {
    const stats = computeANOVA(currentGroups);
    const pairs = computeTukeyHSD(currentGroups, stats);
    setStatistics(stats);
    setPairwiseComparisons(pairs);
    setCompletion(prev => ({ ...prev, anovaRun: true }));
  }, []);

  // Auto-run when groups change
  useEffect(() => {
    runAnova(groups);
  }, [groups, runAnova]);

  // ── Completion logic ───────────────────────────────────────────────────────

  const isComplete =
    completion.anovaRun &&
    completion.decompositionCompleted &&
    completion.postHocViewed &&
    completion.repeatedToggled &&
    completion.correctInterpretation;

  useEffect(() => {
    if (isComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "anova-comparing-groups", score: 8 }),
      }).catch(() => {});
    }
  }, [isComplete, session?.user]);

  // Mark correctInterpretation when summary is scrolled into view
  useEffect(() => {
    if (!summaryRef.current || completion.correctInterpretation) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && statistics) {
          setCompletion(prev => ({ ...prev, correctInterpretation: true }));
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(summaryRef.current);
    return () => observer.disconnect();
  }, [completion.correctInterpretation, statistics]);

  // ── Progress dots ─────────────────────────────────────────────────────────

  const progressSteps = [
    { label: "ANOVA run", done: completion.anovaRun },
    { label: "Decomposition completed", done: completion.decompositionCompleted },
    { label: "Post-hoc viewed", done: completion.postHocViewed },
    { label: "Repeated measures toggled", done: completion.repeatedToggled },
    { label: "Interpretation viewed", done: completion.correctInterpretation },
  ];

  const grandMean = statistics?.grandMean ?? 0;

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white">ANOVA: Comparing Many Groups</span>
        </nav>

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#d4af37]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#d4af37]">
              STATISTICS
            </span>
            <span className="w-6 h-px bg-[#d4af37]" />
            <span className="text-[11px] text-[#475569] uppercase tracking-[1.5px]">
              UNIT 8: COMPARING GROUPS
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            ANOVA:{" "}
            <span className="text-[#d4af37]">Comparing Many Groups</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[680px]">
            Analyze whether means differ across groups. Decompose variance into between-group
            and within-group components. Run post-hoc pairwise comparisons with Tukey HSD.
          </p>
        </motion.section>

        {/* Progress tracker */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progressSteps.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors"
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

        {/* Row 1: DataBuilder + BoxPlot */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <DataBuilder
            groups={groups}
            onGroupsChange={newGroups => {
              setGroups(newGroups);
              setDecompositionStep(0);
            }}
          />
          <BoxPlotVisualizer groups={groups} grandMean={grandMean} />
        </div>

        {/* Run ANOVA button */}
        <div className="flex items-center gap-3 mb-5">
          <motion.button
            onClick={() => runAnova(groups)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Run ANOVA
          </motion.button>
          {statistics && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-[12px] font-mono"
              aria-live="polite"
              style={{ color: statistics.pValue < 0.05 ? "#4ade80" : "#f87171" }}
            >
              F({statistics.dfBetween}, {statistics.dfWithin}) = {statistics.fStatistic.toFixed(2)},
              p = {statistics.pValue < 0.001 ? "< 0.001" : statistics.pValue.toFixed(3)}
              {statistics.pValue < 0.05 ? " ✓ Significant" : " — Not significant"}
            </motion.span>
          )}
        </div>

        {/* Row 2: Variance Decomposer (full width) */}
        <div className="mb-5">
          <VarianceDecomposer
            groups={groups}
            statistics={statistics}
            currentStep={decompositionStep}
            onStepChange={setDecompositionStep}
            onDecompositionComplete={() =>
              setCompletion(prev => ({ ...prev, decompositionCompleted: true }))
            }
          />
        </div>

        {/* Row 3: Post-hoc (left) + Repeated measures (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          {pairwiseComparisons && statistics?.pValue != null && statistics.pValue < 0.05 ? (
            <PostHocComparison
              comparisons={pairwiseComparisons}
              onViewed={() =>
                setCompletion(prev => ({ ...prev, postHocViewed: true }))
              }
            />
          ) : (
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 flex items-center justify-center">
              <p className="text-[12px] text-[#475569] text-center max-w-[260px]">
                Post-hoc comparisons appear when ANOVA is significant (p &lt; 0.05).
                {statistics && statistics.pValue >= 0.05 && (
                  <span className="block mt-1 text-[#94a3b8]">
                    Current p = {statistics.pValue.toFixed(3)} — try the "Strong Differences" preset.
                  </span>
                )}
              </p>
            </div>
          )}

          <RepeatedMeasuresToggle
            isRepeated={isRepeated}
            onToggle={setIsRepeated}
            onToggled={() =>
              setCompletion(prev => ({ ...prev, repeatedToggled: true }))
            }
          />
        </div>

        {/* Results Summary */}
        <div ref={summaryRef}>
          <ResultsSummary statistics={statistics} isComplete={isComplete} />
        </div>

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/t-tests-proportion-tests"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← t-Tests &amp; Proportion Tests
          </Link>
          <Link
            href="/visual-guides/nonparametric-tests"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Nonparametric Tests →
          </Link>
        </div>
      </div>
    </div>
  );
}
