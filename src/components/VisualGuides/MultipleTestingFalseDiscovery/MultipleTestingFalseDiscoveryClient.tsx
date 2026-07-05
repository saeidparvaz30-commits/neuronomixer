"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

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

export default function MultipleTestingFalseDiscoveryClient() {
  const { data: session } = useSession();

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
          score: 7,
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
      <GuideCompletion isComplete={allComplete} guideSlug="multiple-testing-false-discovery" score={7} />
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
            <span className="w-6 h-px bg-[#d4af37]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#d4af37]">
              Statistics
            </span>
            <span className="w-6 h-px bg-[#d4af37]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Multiple Testing &amp;{" "}
            <span className="text-[#d4af37]">False Discovery</span>
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
                  color: "#d4af37",
                },
                {
                  title: "False Discovery Rate",
                  body: "FDR is the expected proportion of false positives among all significant results. BH controls FDR at α — more lenient.",
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

        {/* Footer navigation */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/statistical-power-effect-size"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← Statistical Power &amp; Effect Size
          </Link>
          <Link
            href="/visual-guides/t-tests-proportion-tests"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            t-Tests &amp; Proportion Tests →
          </Link>
        </div>
      </div>
    </div>
  );
}
