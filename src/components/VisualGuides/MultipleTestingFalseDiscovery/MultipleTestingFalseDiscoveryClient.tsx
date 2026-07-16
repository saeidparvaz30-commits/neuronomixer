"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";

import {
  MultipleTestingState,
  TestResult,
  simulateTests,
  applyBonferroni,
  applyFDR,
  applyHolm,
} from "./types";

import JellyBeanSimulator from "./JellyBeanSimulator";
import TestResultsGrid from "./TestResultsGrid";
import FalseDiscoveryVisualization from "./FalseDiscoveryVisualization";
import MultipleComparisonCorrectionPanel from "./MultipleComparisonCorrectionPanel";
import CorrectionComparison from "./CorrectionComparison";
import AssumptionChecklistPanel from "./AssumptionChecklistPanel";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Initial state ──────────────────────────────────────────────────────────────

const INITIAL_STATE: MultipleTestingState = {
  numberOfTests: 20,
  sampleSizePerTest: 100,
  testResults: [],
  falsePositiveCount: 0,
  bonferroniApplied: false,
  fdrApplied: false,
  holmApplied: false,
  simulationRun: false,
  correctionsApplied: new Set<string>(),
  assumptionsChecked: new Set<string>(),
  testsAdjusted: false,
};

// ── Main component ─────────────────────────────────────────────────────────────

const NEXT_GUIDE_SLUG = "t-tests-proportion-tests";

export default function MultipleTestingFalseDiscoveryClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();

  const [state, setState] = useState<MultipleTestingState>(INITIAL_STATE);
  const [isRunning, setIsRunning] = useState(false);
  const completionFired = useRef(false);

  // ── Completion check ─────────────────────────────────────────────────────────

  const allComplete =
    state.simulationRun &&
    state.correctionsApplied.size >= 2 &&
    state.assumptionsChecked.size === 4 &&
    state.testsAdjusted;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideSlug: "multiple-testing-false-discovery",
          score: 100,
        }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  // ── Simulation ───────────────────────────────────────────────────────────────

  const handleRun = useCallback(() => {
    setIsRunning(true);
    setTimeout(() => {
      const results = simulateTests(state.numberOfTests, state.sampleSizePerTest);
      setState(prev => ({
        ...prev,
        testResults: results,
        falsePositiveCount: results.filter(r => r.significant).length,
        simulationRun: true,
        // Reset corrections since we have new data
        bonferroniApplied: false,
        fdrApplied: false,
        holmApplied: false,
        correctionsApplied: new Set<string>(),
      }));
      setIsRunning(false);
    }, 50);
  }, [state.numberOfTests, state.sampleSizePerTest]);

  // ── Correction handlers ──────────────────────────────────────────────────────

  // The M used by corrections and displays MUST be the number of tests actually
  // simulated (testResults.length), not the live slider value, which the user may
  // have changed without re-running. Falls back to the slider before any run.
  const testsRun =
    state.testResults.length > 0 ? state.testResults.length : state.numberOfTests;

  const handleApplyBonferroni = useCallback(() => {
    if (state.testResults.length === 0) return;
    const adjusted = applyBonferroni(state.testResults, state.testResults.length);
    setState(prev => {
      const newSet = new Set(prev.correctionsApplied);
      newSet.add("Bonferroni");
      return {
        ...prev,
        testResults: adjusted,
        bonferroniApplied: true,
        fdrApplied: false,
        holmApplied: false,
        correctionsApplied: newSet,
      };
    });
  }, [state.testResults]);

  const handleApplyFDR = useCallback(() => {
    if (state.testResults.length === 0) return;
    const adjusted = applyFDR(state.testResults, state.testResults.length);
    setState(prev => {
      const newSet = new Set(prev.correctionsApplied);
      newSet.add("FDR");
      return {
        ...prev,
        testResults: adjusted,
        bonferroniApplied: false,
        fdrApplied: true,
        holmApplied: false,
        correctionsApplied: newSet,
      };
    });
  }, [state.testResults]);

  const handleApplyHolm = useCallback(() => {
    if (state.testResults.length === 0) return;
    const adjusted = applyHolm(state.testResults, state.testResults.length);
    setState(prev => {
      const newSet = new Set(prev.correctionsApplied);
      newSet.add("Holm");
      return {
        ...prev,
        testResults: adjusted,
        bonferroniApplied: false,
        fdrApplied: false,
        holmApplied: true,
        correctionsApplied: newSet,
      };
    });
  }, [state.testResults]);

  // ── Config handlers ──────────────────────────────────────────────────────────

  const handleNumberOfTestsChange = useCallback(
    (n: 5 | 10 | 15 | 20 | 50) => {
      setState(prev => ({ ...prev, numberOfTests: n }));
    },
    []
  );

  const handleSampleSizeChange = useCallback((n: number) => {
    setState(prev => ({ ...prev, sampleSizePerTest: n }));
  }, []);

  const handleTestsChanged = useCallback(() => {
    setState(prev => ({ ...prev, testsAdjusted: true }));
  }, []);

  // ── Reset ────────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setState({
      ...INITIAL_STATE,
      correctionsApplied: new Set<string>(),
      assumptionsChecked: new Set<string>(),
    });
    setIsRunning(false);
  }, []);

  // ── Assumption handler ───────────────────────────────────────────────────────

  const handleAssumptionCheck = useCallback((key: string, checked: boolean) => {
    setState(prev => {
      const newSet = new Set(prev.assumptionsChecked);
      if (checked) {
        newSet.add(key);
      } else {
        newSet.delete(key);
      }
      return { ...prev, assumptionsChecked: newSet };
    });
  }, []);

  // ── Progress dots ────────────────────────────────────────────────────────────

  const progressItems = [
    { label: "Simulation run", done: state.simulationRun },
    { label: `Corrections applied: ${state.correctionsApplied.size}/2`, done: state.correctionsApplied.size >= 2 },
    { label: `Assumptions checked: ${state.assumptionsChecked.size}/4`, done: state.assumptionsChecked.size === 4 },
    { label: "Tests count adjusted", done: state.testsAdjusted },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allComplete} guideSlug="multiple-testing-false-discovery" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Multiple Testing &amp; False Discovery</span>
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
            Multiple Testing &amp;{" "}
            <span className="text-[var(--color-accent)]">False Discovery</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            Run 20 jelly bean tests on pure noise. Watch false positives appear at α=0.05.
            Apply corrections to control them.
          </p>
        </motion.section>

        {/* Progress tracker */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progressItems.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full transition-colors ${
                  done ? "bg-[#3bb4a4]" : "bg-[#1e293b]"
                }`}
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
            {allComplete && (
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

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left column */}
          <div className="space-y-5">
            <JellyBeanSimulator
              numberOfTests={state.numberOfTests}
              sampleSizePerTest={state.sampleSizePerTest}
              isRunning={isRunning}
              onNumberOfTestsChange={handleNumberOfTestsChange}
              onSampleSizeChange={handleSampleSizeChange}
              onRun={handleRun}
              onTestsChanged={handleTestsChanged}
            />

            <TestResultsGrid
              testResults={state.testResults}
              bonferroniApplied={state.bonferroniApplied}
              fdrApplied={state.fdrApplied}
              holmApplied={state.holmApplied}
            />

            <FalseDiscoveryVisualization
              testResults={state.testResults}
              numberOfTests={testsRun}
            />
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <MultipleComparisonCorrectionPanel
              testResults={state.testResults}
              numberOfTests={testsRun}
              bonferroniApplied={state.bonferroniApplied}
              fdrApplied={state.fdrApplied}
              holmApplied={state.holmApplied}
              onApplyBonferroni={handleApplyBonferroni}
              onApplyFDR={handleApplyFDR}
              onApplyHolm={handleApplyHolm}
            />

            <CorrectionComparison
              testResults={state.testResults}
              numberOfTests={testsRun}
              bonferroniApplied={state.bonferroniApplied}
              fdrApplied={state.fdrApplied}
              holmApplied={state.holmApplied}
            />

            <AssumptionChecklistPanel
              checkedSet={state.assumptionsChecked}
              onCheck={handleAssumptionCheck}
            />

            {/* Key insight cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  title: "Family-Wise Error Rate",
                  body: "FWER is the probability of making at least one false positive across all tests. Bonferroni and Holm control FWER at α.",
                  color: "var(--color-accent)",
                },
                {
                  title: "False Discovery Rate",
                  body: "FDR is the expected proportion of false positives among all significant results. BH controls FDR at α (more lenient).",
                  color: "#3bb4a4",
                },
                {
                  title: "p-Hacking",
                  body: "Running many tests without correction and reporting only significant ones inflates the false positive rate. Pre-registration helps.",
                  color: "#ef4444",
                },
              ].map(({ title, body, color }) => (
                <div key={title} className="rounded-xl border border-[#1e293b] p-4">
                  <p className="text-[11px] font-semibold mb-2" style={{ color }}>
                    {title}
                  </p>
                  <p className="text-[11px] text-[#94a3b8] leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
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
                  You Caught the False Discoveries
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You tested pure noise, watched significance appear anyway, and
                  applied corrections that put the error rate back under
                  control.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Tests simulated on pure noise
                    </p>
                    <p className="text-[14px] font-mono font-bold text-white">
                      {testsRun}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      n = {state.sampleSizePerTest} per test
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      False positives at α = 0.05
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {state.falsePositiveCount}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      before any correction
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Still significant after correction
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {state.testResults.filter((r) => r.significant).length}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      {[...state.correctionsApplied].join(", ")} applied
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Assumptions checked
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {state.assumptionsChecked.size} of 4
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      before trusting a result
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Run enough tests and noise will hand you significance
                    for free, so every extra comparison must be paid for with a
                    correction, whether that is Bonferroni&apos;s strictness or
                    FDR&apos;s calibrated tolerance.&quot;
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
            href="/visual-guides/statistical-power-effect-size"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← Statistical Power &amp; Effect Size
          </Link>
          <Link
            href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            t-Tests &amp; Proportion Tests →
          </Link>
        </div>
        )}
      </div>
    </div>
  );
}
