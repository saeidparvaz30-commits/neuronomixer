"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";
import {
  SimulationState, INITIAL_STATE, TestType,
  generateGroups, computeTStatistic, computePValue,
} from "./types";
import ExperimentSetup from "./ExperimentSetup";
import DataDisplay from "./DataDisplay";
import DistributionCurve from "./DistributionCurve";
import TestTypeToggle from "./TestTypeToggle";
import PermutationCounter from "./PermutationCounter";
import MetricsPanel from "./MetricsPanel";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

const NEXT_GUIDE_SLUG = "statistical-power-effect-size";

export default function PValuesClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();

  const [state, setState] = useState<SimulationState>(INITIAL_STATE);
  const [isRunning, setIsRunning] = useState(false);
  const completionFired = useRef(false);

  const allComplete = state.experimentsRun >= 10 && state.permutationCount >= 100;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "p-values", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  const handleRun = useCallback(() => {
    setIsRunning(true);
    const [groupA, groupB] = generateGroups(state.effectSize, state.sampleSize);
    const df = 2 * state.sampleSize - 2;
    const tStatistic = computeTStatistic(groupA, groupB);
    const pValue = computePValue(tStatistic, df, state.testType);
    setState(prev => ({
      ...prev,
      groupA,
      groupB,
      tStatistic,
      pValue,
      permutationResults: [],
      significantPermutations: 0,
      permutationCount: 0,
      experimentsRun: prev.experimentsRun + 1,
    }));
    setIsRunning(false);
  }, [state.effectSize, state.sampleSize, state.testType]);

  // Switching the test type invalidates any p-value computed under the old
  // test type, so clear the run results (the generated data can stay) and
  // require a re-run before showing a verdict again.
  const handleTestTypeChange = useCallback((v: TestType) => {
    setState(prev => ({
      ...prev,
      testType: v,
      tStatistic: null,
      pValue: null,
      permutationResults: [],
      significantPermutations: 0,
    }));
  }, []);

  const handlePermutationsComplete = useCallback((newResults: number[], sigCount: number) => {
    setState(prev => ({
      ...prev,
      permutationResults: [...prev.permutationResults, ...newResults],
      significantPermutations: sigCount,
      permutationCount: prev.permutationCount + newResults.length,
    }));
  }, []);

  const handleReset = useCallback(() => {
    setState({ ...INITIAL_STATE });
    setIsRunning(false);
  }, []);

  const df = 2 * state.sampleSize - 2;

  const progress = [
    { label: `Experiments run: ${state.experimentsRun}/10`, done: state.experimentsRun >= 10 },
    { label: `Permutation shuffles: ${state.permutationCount}/100`, done: state.permutationCount >= 100 },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allComplete} guideSlug="p-values" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">P-Values Demystified</span>
        </nav>

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Statistics
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            P-Values <span className="text-[var(--color-accent)]">Demystified</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            Run a simulated experiment with two groups. Watch the p-value shift as you change
            effect size and sample size. Use permutation tests to build genuine intuition for what
            p-values really measure, and what they don&apos;t.
          </p>
        </motion.section>

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
              <Link href="/auth/sign-in" className="underline underline-offset-2 hover:text-[#94a3b8]">
                Sign in
              </Link>{" "}
              to track progress
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

        {/* Main 2-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

          {/* Left column: setup + data */}
          <div className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
            >
              <ExperimentSetup
                effectSize={state.effectSize}
                sampleSize={state.sampleSize}
                alpha={state.alpha}
                testType={state.testType}
                isRunning={isRunning}
                onEffectSizeChange={v => setState(prev => ({ ...prev, effectSize: v }))}
                onSampleSizeChange={v => setState(prev => ({ ...prev, sampleSize: v }))}
                onAlphaChange={v => setState(prev => ({ ...prev, alpha: v }))}
                onTestTypeChange={handleTestTypeChange}
                onRun={handleRun}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <DataDisplay
                groupA={state.groupA}
                groupB={state.groupB}
                pValue={state.pValue}
                alpha={state.alpha}
                effectSize={state.effectSize}
              />
            </motion.div>
          </div>

          {/* Right column: toggle + curve + permutation + metrics */}
          <div className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
            >
              <TestTypeToggle
                testType={state.testType}
                onChange={handleTestTypeChange}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
              className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5"
            >
              <p className="text-[12px] font-bold text-white mb-1">Null Hypothesis Distribution</p>
              <p className="text-[10px] text-[#475569] mb-3">
                {state.pValue !== null
                  ? `If the null hypothesis were true (no real difference), a result at least this extreme would occur in ${(state.pValue * 100).toFixed(1)}% of experiments.`
                  : "Run an experiment to see the t-distribution."}
              </p>
              <DistributionCurve
                df={df}
                tStat={state.tStatistic}
                alpha={state.alpha}
                testType={state.testType}
                hasResult={state.tStatistic !== null}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.16 }}
            >
              <PermutationCounter
                groupA={state.groupA}
                groupB={state.groupB}
                tStatistic={state.tStatistic}
                testType={state.testType}
                alpha={state.alpha}
                permutationResults={state.permutationResults}
                significantPermutations={state.significantPermutations}
                onPermutationsComplete={handlePermutationsComplete}
              />
            </motion.div>

            <MetricsPanel
              groupA={state.groupA}
              groupB={state.groupB}
              tStatistic={state.tStatistic}
              pValue={state.pValue}
              alpha={state.alpha}
            />
          </div>
        </div>

        {/* Insight cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              title: "What p-value means",
              body: "P(data this extreme | H₀ true). It is NOT the probability the null is true, nor the probability your result is due to chance alone.",
              color: "#3bb4a4",
            },
            {
              title: "Significance ≠ importance",
              body: "With large samples, tiny and practically irrelevant differences become highly significant. Always consider effect size alongside p-values.",
              color: "var(--color-accent)",
            },
            {
              title: "Permutation tests",
              body: "Shuffling group labels repeatedly shows the null distribution empirically. No distributional assumptions required.",
              color: "#1e5d8a",
            },
          ].map(({ title, body, color }) => (
            <div key={title} className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold mb-2" style={{ color }}>{title}</p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* Completion card */}
        <AnimatePresence>
          {allComplete && (
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
                  You Demystified the P-Value
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You ran experiments until the pattern showed itself, then
                  rebuilt the null distribution by hand with permutation
                  shuffles.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Experiments run
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {state.experimentsRun}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      effect size {state.effectSize}, n = {state.sampleSize} per group
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Permutation shuffles
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {state.permutationCount}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      {state.significantPermutations} beat your observed t
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Last result
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {state.pValue !== null ? `p = ${state.pValue.toFixed(4)}` : "cleared"}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      {state.tStatistic !== null
                        ? `t = ${state.tStatistic.toFixed(2)}, α = ${state.alpha}`
                        : `α = ${state.alpha}, awaiting a re-run`}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;A p-value answers one narrow question, how often pure
                    chance would produce a result at least this extreme if
                    nothing were going on; it says nothing about how likely
                    your hypothesis is or how much the difference matters.&quot;
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

        {/* Footer navigation (pre-completion) */}
        {!allComplete && (
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/hypothesis-testing"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← Hypothesis Testing
          </Link>
          <Link
            href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Statistical Power &amp; Effect Size →
          </Link>
        </div>
        )}
      </div>
    </div>
  );
}
