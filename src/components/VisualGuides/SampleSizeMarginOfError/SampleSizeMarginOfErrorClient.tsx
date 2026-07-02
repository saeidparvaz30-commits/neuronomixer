"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  SampleSizeState,
  ConfidenceLevel,
  WeightingRow,
  INITIAL_STATE,
  computeSampleSize,
  computeMOE,
  computeSE,
} from "./types";
import SampleSizeCalculator from "./SampleSizeCalculator";
import ResultsDisplay from "./ResultsDisplay";
import CostPrecisionCurve from "./CostPrecisionCurve";
import ComparisonTable from "./ComparisonTable";
import SurveyDesignSection from "./SurveyDesignSection";
import PollingCaseStudy from "./PollingCaseStudy";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

export default function SampleSizeMarginOfErrorClient() {
  const { data: session } = useSession();
  const completionFired = useRef(false);

  const [state, setState] = useState<SampleSizeState>(() => ({
    ...INITIAL_STATE,
    surveyCardsViewed: new Set<string>(),
  }));

  // ── Derived ─────────────────────────────────────────────────────────────────

  const sampleSize = useMemo(
    () =>
      computeSampleSize(
        state.marginOfError,
        state.confidenceLevel,
        state.estimatedProportion,
        state.useFinitePopulation ? state.populationSize : undefined
      ),
    [
      state.marginOfError,
      state.confidenceLevel,
      state.estimatedProportion,
      state.useFinitePopulation,
      state.populationSize,
    ]
  );

  const moe = state.marginOfError;

  const se = useMemo(
    () => computeSE(sampleSize, state.estimatedProportion),
    [sampleSize, state.estimatedProportion]
  );

  // ── Completion ───────────────────────────────────────────────────────────────

  const allComplete =
    state.moeAdjusted &&
    state.confidenceChanged &&
    state.proportionAdjusted &&
    state.surveyCardsViewed.size >= 3 &&
    state.caseStudyViewed;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideSlug: "sample-size-margin-of-error",
          score: 7,
        }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  // ── Progress ─────────────────────────────────────────────────────────────────

  const progress = [
    { label: "MOE adjusted", done: state.moeAdjusted },
    { label: "Confidence level changed", done: state.confidenceChanged },
    { label: "Proportion adjusted", done: state.proportionAdjusted },
    {
      label: `Survey cards: ${state.surveyCardsViewed.size}/3`,
      done: state.surveyCardsViewed.size >= 3,
    },
    { label: "Case study viewed", done: state.caseStudyViewed },
  ];

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleMOEChange(v: number) {
    setState((prev) => ({ ...prev, marginOfError: v, moeAdjusted: true }));
  }

  function handleConfidenceChange(v: ConfidenceLevel) {
    setState((prev) => ({
      ...prev,
      confidenceLevel: v,
      confidenceChanged: true,
    }));
  }

  function handleProportionChange(v: number) {
    setState((prev) => ({
      ...prev,
      estimatedProportion: v,
      proportionAdjusted: true,
    }));
  }

  function handleFinitePopulationToggle(v: boolean) {
    setState((prev) => ({ ...prev, useFinitePopulation: v }));
  }

  function handlePopulationSizeChange(v: number) {
    setState((prev) => ({ ...prev, populationSize: v }));
  }

  function handleNonResponseChange(v: number) {
    setState((prev) => ({ ...prev, nonResponseRate: v }));
  }

  function handleCostChange(v: number) {
    setState((prev) => ({ ...prev, costPerSurvey: v }));
  }

  // CostPrecisionCurve drag → update MOE state
  function handleCurveNChange(n: number) {
    const newMOE = computeMOE(
      n,
      state.confidenceLevel,
      state.estimatedProportion
    );
    setState((prev) => ({
      ...prev,
      marginOfError: Math.max(1, Math.min(10, parseFloat(newMOE.toFixed(1)))),
      moeAdjusted: true,
    }));
  }

  function handleCardView(id: string) {
    setState((prev) => ({
      ...prev,
      surveyCardsViewed: new Set([...prev.surveyCardsViewed, id]),
    }));
  }

  function handleWeightingChange(rows: WeightingRow[]) {
    setState((prev) => ({ ...prev, weightingRows: rows }));
  }

  function handleCaseStudyViewed() {
    setState((prev) => ({ ...prev, caseStudyViewed: true }));
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allComplete} guideSlug="sample-size-margin-of-error" score={7} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link
            href="/visual-guides"
            className="hover:text-white transition-colors"
          >
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white">
            Sample Size, Margin of Error &amp; Survey Design
          </span>
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
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Sample Size,{" "}
            <span className="text-[#d4af37]">Margin of Error</span>{" "}
            &amp; Survey Design
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[680px]">
            Calculate exactly how many people you need to survey for a given
            precision. Explore cost-precision tradeoffs and discover how
            polling organizations design surveys with stratification and
            weighting.
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
              <span
                className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}
              >
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* 2-col desktop layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Left column */}
          <div className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <SampleSizeCalculator
                state={state}
                onMOEChange={handleMOEChange}
                onConfidenceChange={handleConfidenceChange}
                onProportionChange={handleProportionChange}
                onFinitePopulationToggle={handleFinitePopulationToggle}
                onPopulationSizeChange={handlePopulationSizeChange}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <ResultsDisplay
                sampleSize={sampleSize}
                moe={moe}
                se={se}
                confidenceLevel={state.confidenceLevel}
                p={state.estimatedProportion}
                nonResponseRate={state.nonResponseRate}
                costPerSurvey={state.costPerSurvey}
                onNonResponseChange={handleNonResponseChange}
                onCostChange={handleCostChange}
              />
            </motion.div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <CostPrecisionCurve
                currentN={sampleSize}
                confidenceLevel={state.confidenceLevel}
                p={state.estimatedProportion}
                onNChange={handleCurveNChange}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <ComparisonTable
                confidenceLevel={state.confidenceLevel}
                p={state.estimatedProportion}
                currentMOE={state.marginOfError}
                costPerSurvey={state.costPerSurvey}
              />
            </motion.div>
          </div>
        </div>

        {/* Full-width sections */}
        <div className="space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <SurveyDesignSection
              surveyCardsViewed={state.surveyCardsViewed}
              weightingRows={state.weightingRows}
              onCardView={handleCardView}
              onWeightingChange={handleWeightingChange}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
          >
            <PollingCaseStudy onViewed={handleCaseStudyViewed} />
          </motion.div>
        </div>

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/bayes-theorem"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            &larr; Bayes&apos; Theorem
          </Link>
          <Link
            href="/visual-guides/hypothesis-testing"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Next: Hypothesis Testing &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
