"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { INITIAL_STATE, NormalDistributionState } from "./types";
import InteractiveCurve from "./InteractiveCurve";
import ZScoreCalculator from "./ZScoreCalculator";
import ComparisonTool from "./ComparisonTool";
import EmpiricalRuleDisplay from "./EmpiricalRuleDisplay";
import AreaCalculator from "./AreaCalculator";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Default markers moved tracking ───────────────────────────────────────────
const DEFAULT_X1 = INITIAL_STATE.markerX1;
const DEFAULT_X2 = INITIAL_STATE.markerX2;

export default function NormalDistributionZScoresClient() {
  const { data: session } = useSession();
  const completionFired = useRef(false);

  const [state, setState] = useState<NormalDistributionState>({ ...INITIAL_STATE });

  // ── Completion tracking ────────────────────────────────────────────────────
  const [markersMovedX1, setMarkersMovedX1] = useState(false);
  const [markersMovedX2, setMarkersMovedX2] = useState(false);
  const [calculatorUseCount, setCalculatorUseCount] = useState(0);
  const [comparisonUsed, setComparisonUsed] = useState(false);
  const [empiricalRuleViewed, setEmpiricalRuleViewed] = useState(false);

  const markersMoved = markersMovedX1 && markersMovedX2;
  const calculatorUsed = calculatorUseCount >= 2;

  const allComplete = markersMoved && calculatorUsed && comparisonUsed && empiricalRuleViewed;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "normal-distribution-z-scores", score: 6 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleMarkerChange(x1: number, x2: number) {
    setState(prev => ({ ...prev, markerX1: x1, markerX2: x2 }));
    if (Math.abs(x1 - DEFAULT_X1) > 1) setMarkersMovedX1(true);
    if (Math.abs(x2 - DEFAULT_X2) > 1) setMarkersMovedX2(true);
  }

  function handleCalculatorUsed() {
    setCalculatorUseCount(prev => prev + 1);
  }

  function handleComparisonUsed() {
    setComparisonUsed(true);
  }

  function handleEmpiricalViewed() {
    setEmpiricalRuleViewed(true);
  }

  function handleComparisonReset() {
    setState(prev => ({
      ...prev,
      testA_value: INITIAL_STATE.testA_value,
      testA_mean: INITIAL_STATE.testA_mean,
      testA_stdDev: INITIAL_STATE.testA_stdDev,
      testB_value: INITIAL_STATE.testB_value,
      testB_mean: INITIAL_STATE.testB_mean,
      testB_stdDev: INITIAL_STATE.testB_stdDev,
    }));
  }

  // ── Progress ──────────────────────────────────────────────────────────────
  const progress = [
    { label: "Markers moved", done: markersMoved },
    { label: `Calculator used (${Math.min(calculatorUseCount, 2)}/2)`, done: calculatorUsed },
    { label: "Comparison explored", done: comparisonUsed },
    { label: "Empirical rule viewed", done: empiricalRuleViewed },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allComplete} guideSlug="normal-distribution-z-scores" score={6} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white">The Normal Distribution &amp; Z-Scores</span>
        </nav>

        {/* Hero */}
        <motion.section
          className="mb-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#d4af37]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#d4af37]">
              STATISTICS
            </span>
            <span className="w-6 h-px bg-[#d4af37]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            The Normal Distribution &amp;{" "}
            <span className="text-[#d4af37]">Z-Scores</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[680px]">
            Explore the bell curve, drag markers to calculate probabilities, and learn how to convert
            any raw score into a standardized z-score. Master the empirical rule and compare scores
            across different scales.
          </p>
        </motion.section>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progress.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors"
                style={{ background: done ? "#3bb4a4" : "#1e293b" }}
              />
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

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">

          {/* Left column */}
          <div className="space-y-5">

            {/* Interactive Curve card */}
            <motion.div
              className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
            >
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <h2 className="text-[14px] font-bold text-[#3bb4a4]">
                  Interactive Normal Curve
                </h2>
                <span className="text-[10px] font-mono text-[#475569]">
                  N({state.mean}, {state.stdDev}²)
                </span>
              </div>
              <p className="text-[11px] text-[#475569] mb-4">
                Drag the gold and orange markers to select a range and see the probability
              </p>
              <InteractiveCurve
                mean={state.mean}
                stdDev={state.stdDev}
                markerX1={state.markerX1}
                markerX2={state.markerX2}
                onMarkerChange={handleMarkerChange}
              />

              {/* Curve controls */}
              <div className="mt-5 pt-4 border-t border-white/[0.06] grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#475569] block mb-2">
                    Mean (μ) — {state.mean}
                  </label>
                  <input
                    type="range"
                    min={50}
                    max={150}
                    step={1}
                    value={state.mean}
                    onChange={e => setState(prev => ({ ...prev, mean: parseFloat(e.target.value) }))}
                    className="w-full accent-[#1e5d8a]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#475569] block mb-2">
                    Std Dev (σ) — {state.stdDev}
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={30}
                    step={1}
                    value={state.stdDev}
                    onChange={e => setState(prev => ({ ...prev, stdDev: parseFloat(e.target.value) }))}
                    className="w-full accent-[#1e5d8a]"
                  />
                </div>
              </div>
            </motion.div>

            {/* Empirical Rule */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <EmpiricalRuleDisplay
                showStandardNormal={state.showStandardNormal}
                onToggle={v => setState(prev => ({ ...prev, showStandardNormal: v }))}
                onViewed={handleEmpiricalViewed}
              />
            </motion.div>

            {/* Area Calculator */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <AreaCalculator />
            </motion.div>
          </div>

          {/* Right column */}
          <div className="space-y-5">

            {/* Z-Score Calculator */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
            >
              <ZScoreCalculator
                rawValue={state.rawValue}
                mean={state.calculatorMean}
                stdDev={state.calculatorStdDev}
                onRawChange={v => setState(prev => ({ ...prev, rawValue: v }))}
                onMeanChange={v => setState(prev => ({ ...prev, calculatorMean: v }))}
                onStdDevChange={v => setState(prev => ({ ...prev, calculatorStdDev: v }))}
                onUsed={handleCalculatorUsed}
              />
            </motion.div>

            {/* Comparison Tool */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
            >
              <ComparisonTool
                testA_value={state.testA_value}
                testA_mean={state.testA_mean}
                testA_stdDev={state.testA_stdDev}
                testB_value={state.testB_value}
                testB_mean={state.testB_mean}
                testB_stdDev={state.testB_stdDev}
                onTestAValue={v => setState(prev => ({ ...prev, testA_value: v }))}
                onTestAMean={v => setState(prev => ({ ...prev, testA_mean: v }))}
                onTestAStdDev={v => setState(prev => ({ ...prev, testA_stdDev: v }))}
                onTestBValue={v => setState(prev => ({ ...prev, testB_value: v }))}
                onTestBMean={v => setState(prev => ({ ...prev, testB_mean: v }))}
                onTestBStdDev={v => setState(prev => ({ ...prev, testB_stdDev: v }))}
                onUsed={handleComparisonUsed}
                onReset={handleComparisonReset}
              />
            </motion.div>

            {/* Key concepts card */}
            <motion.div
              className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.16 }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-4">
                Key Concepts
              </p>
              <div className="space-y-3.5">
                {[
                  {
                    term: "Normal Distribution",
                    desc: "A symmetric, bell-shaped distribution defined entirely by its mean (μ) and standard deviation (σ).",
                    color: "#3bb4a4",
                  },
                  {
                    term: "Z-Score",
                    desc: "A standardized score: z = (x − μ) / σ. Tells you how many SDs a value is from the mean.",
                    color: "#d4af37",
                  },
                  {
                    term: "Standard Normal",
                    desc: "A normal distribution with μ = 0 and σ = 1. Any normal distribution can be transformed to this.",
                    color: "#1e5d8a",
                  },
                  {
                    term: "Empirical Rule",
                    desc: "68% of data lies within ±1σ, 95% within ±2σ, and 99.7% within ±3σ of the mean.",
                    color: "#f97316",
                  },
                ].map(({ term, desc, color }) => (
                  <div key={term} className="flex gap-3">
                    <div className="w-1 rounded-full flex-shrink-0 mt-1" style={{ background: color, minHeight: "14px" }} />
                    <div>
                      <p className="text-[11px] font-semibold text-white">{term}</p>
                      <p className="text-[10px] text-[#475569] leading-relaxed mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/data-distributions"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← Data Distributions
          </Link>
          <Link
            href="/visual-guides/hypothesis-testing"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Hypothesis Testing →
          </Link>
        </div>
      </div>
    </div>
  );
}
