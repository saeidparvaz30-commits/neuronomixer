"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";

import type { DatasetType, StepType, State } from "./types";
import { DATASETS, calcStats, STEP_LABELS } from "./types";
import StepIndicator from "./StepIndicator";
import BoxPlotBuilder from "./BoxPlotBuilder";
import DataPointsVisualization from "./DataPointsVisualization";
import PercentileFinderTool from "./PercentileFinderTool";
import ZScoreOverlay from "./ZScoreOverlay";
import DescriptiveStats from "./DescriptiveStats";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Step navigation labels ────────────────────────────────────────────────────
const NEXT_LABELS: Record<StepType, string> = {
  1: "Next: Find the Median",
  2: "Next: Find Quartiles",
  3: "Next: Add Whiskers",
  4: "Next: Z-Score Overlay",
  5: "",
};

// ── Initial state ─────────────────────────────────────────────────────────────
const initialState: State = {
  selectedDataset: "test_scores",
  currentStep: 1,
  showZScores: false,
  selectedPointIds: new Set(),
  percentilePointsClicked: new Set(),
  reachedFinalStep: false,
  toggledZScores: false,
};

const NEXT_GUIDE_SLUG = "data-distributions";

export default function PercentilesQuartilesBoxPlotsClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const completionFired = useRef(false);
  const [state, setState] = useState<State>(initialState);

  const datasetInfo = useMemo(
    () => DATASETS.find((d) => d.id === state.selectedDataset)!,
    [state.selectedDataset]
  );
  const stats = useMemo(() => calcStats(datasetInfo.data), [datasetInfo]);

  // ── Completion tracking ───────────────────────────────────────────────────
  const isComplete =
    state.reachedFinalStep &&
    state.percentilePointsClicked.size >= 3 &&
    state.toggledZScores;

  useEffect(() => {
    if (isComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideSlug: "percentiles-quartiles-box-plots",
          score: 100,
        }),
      }).catch(() => {});
    }
  }, [isComplete, session?.user]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleDatasetChange = useCallback((ds: DatasetType) => {
    setState((prev) => ({
      ...prev,
      selectedDataset: ds,
      selectedPointIds: new Set(),
    }));
  }, []);

  const handleNextStep = useCallback(() => {
    setState((prev) => {
      if (prev.currentStep >= 5) return prev;
      const next = (prev.currentStep + 1) as StepType;
      return {
        ...prev,
        currentStep: next,
        reachedFinalStep: prev.reachedFinalStep || next === 5,
      };
    });
  }, []);

  const handleStepClick = useCallback((step: StepType) => {
    setState((prev) => ({
      ...prev,
      currentStep: step,
      reachedFinalStep: prev.reachedFinalStep || step === 5,
    }));
  }, []);

  const handlePointClick = useCallback((pointId: number, _value: number) => {
    setState((prev) => {
      const next = new Set(prev.selectedPointIds);
      const nextPercentile = new Set(prev.percentilePointsClicked);
      // Toggle selection
      if (next.has(pointId)) {
        next.delete(pointId);
      } else {
        next.add(pointId);
        nextPercentile.add(pointId);
      }
      return {
        ...prev,
        selectedPointIds: next,
        percentilePointsClicked: nextPercentile,
      };
    });
  }, []);

  const handleZScoreToggle = useCallback((v: boolean) => {
    setState((prev) => ({
      ...prev,
      showZScores: v,
      toggledZScores: prev.toggledZScores || v,
    }));
  }, []);

  const handleReset = useCallback(() => {
    setState({
      ...initialState,
      selectedPointIds: new Set(),
      percentilePointsClicked: new Set(),
    });
  }, []);

  // ── Progress indicators ───────────────────────────────────────────────────
  const progressItems = [
    {
      label: `Steps reached: ${state.reachedFinalStep ? "5/5" : `${state.currentStep}/5`}`,
      done: state.reachedFinalStep,
    },
    {
      label: `Points clicked: ${state.percentilePointsClicked.size}/3`,
      done: state.percentilePointsClicked.size >= 3,
    },
    { label: "Z-Scores toggled", done: state.toggledZScores },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="percentiles-quartiles-box-plots" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6" aria-label="Breadcrumb">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20" aria-hidden="true">/</span>
          <span className="text-white">Percentiles, Quartiles &amp; Box Plots</span>
        </nav>

        {/* Hero */}
        <section className="mb-10" aria-labelledby="guide-title">
          <div className="flex items-center gap-2 mb-4" aria-hidden="true">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Statistics
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1
            id="guide-title"
            className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3"
          >
            Percentiles, Quartiles &amp;{" "}
            <span className="text-[var(--color-accent)]">Box Plots</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[680px]">
            Transform raw data into a box plot step by step. Discover quartiles, percentiles, and the
            five-number summary that reveal data structure at a glance.
          </p>
        </section>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8 flex-wrap" aria-label="Progress">
          {progressItems.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full transition-colors ${
                  done ? "bg-[#3bb4a4]" : "bg-[#1e293b]"
                }`}
                aria-hidden="true"
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
                role="status"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Dataset selector */}
        <section className="mb-8 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5" aria-labelledby="dataset-heading">
          <h2 id="dataset-heading" className="text-[11px] uppercase tracking-widest text-[var(--color-accent)] font-semibold mb-4">
            Choose Dataset
          </h2>
          <div className="flex flex-col sm:flex-row gap-3" role="radiogroup" aria-label="Dataset selection">
            {DATASETS.map((ds) => {
              const active = state.selectedDataset === ds.id;
              return (
                <button
                  key={ds.id}
                  role="radio"
                  aria-checked={active}
                  onClick={() => handleDatasetChange(ds.id)}
                  className={`flex-1 rounded-xl border px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] ${
                    active
                      ? "border-[var(--color-accent)] bg-[#d4af37]/10"
                      : "border-[#1e293b] hover:border-[#d4af37]/50"
                  }`}
                >
                  <span
                    className={`block text-[12px] font-semibold mb-0.5 ${
                      active ? "text-[var(--color-accent)]" : "text-white"
                    }`}
                  >
                    {ds.label}
                  </span>
                  <span className="block text-[11px] text-[#94a3b8]">{ds.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step indicator */}
        <StepIndicator currentStep={state.currentStep} onStepClick={handleStepClick} />

        {/* Main two-column layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          {/* Left column */}
          <div className="space-y-6">
            {/* Box Plot Builder */}
            <section aria-labelledby="boxplot-heading">
              <h2 id="boxplot-heading" className="text-[11px] uppercase tracking-widest text-[#94a3b8] font-semibold mb-3">
                Step {state.currentStep}: {STEP_LABELS[state.currentStep]}
              </h2>
              <BoxPlotBuilder
                currentStep={state.currentStep}
                stats={stats}
                showZScores={state.showZScores}
                selectedPointIds={state.selectedPointIds}
                onPointClick={handlePointClick}
                unit={datasetInfo.unit}
              />
            </section>

            {/* Next step button */}
            {state.currentStep < 5 && (
              <div className="flex justify-end">
                <button
                  onClick={handleNextStep}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
                  aria-label={NEXT_LABELS[state.currentStep]}
                >
                  {NEXT_LABELS[state.currentStep]} →
                </button>
              </div>
            )}

            {/* Z-Score overlay (step 5 only) */}
            {state.currentStep === 5 && (
              <ZScoreOverlay
                showZScores={state.showZScores}
                onToggle={handleZScoreToggle}
                mean={stats.mean}
                sd={stats.sd}
                unit={datasetInfo.unit}
              />
            )}

            {/* Data points visualization */}
            <DataPointsVisualization
              stats={stats}
              selectedPointIds={state.selectedPointIds}
              onPointClick={handlePointClick}
              unit={datasetInfo.unit}
              currentStep={state.currentStep}
            />

            {/* Percentile finder */}
            <PercentileFinderTool
              stats={stats}
              clickedPointIds={state.selectedPointIds}
              unit={datasetInfo.unit}
            />
          </div>

          {/* Right column — descriptive stats */}
          <aside aria-label="Descriptive statistics">
            <DescriptiveStats stats={stats} unit={datasetInfo.unit} />
          </aside>
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
                  You Built the Box Plot
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You walked raw data through all five construction steps,
                  inspected individual points for their percentiles, and layered
                  z-scores on top.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Build steps reached
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      5 of 5
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      raw data to z-score overlay
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Points you inspected
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {state.percentilePointsClicked.size}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      in {datasetInfo.label}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Five-number summary
                    </p>
                    <p className="text-[13px] font-mono font-bold text-white">
                      {stats.min} · {stats.q1} · {stats.median} · {stats.q3} · {stats.max}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      IQR = {stats.iqr} {datasetInfo.unit}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Five numbers, the minimum, Q1, median, Q3, and
                    maximum, compress an entire dataset into a picture you can
                    read at a glance: where the middle half lives, how skewed
                    the data is, and which points sit far enough out to
                    question.&quot;
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
            href="/visual-guides/descriptive-statistics"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← Descriptive Statistics
          </Link>
          <Link
            href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Next: Data Distributions →
          </Link>
        </div>
        )}
      </div>
    </div>
  );
}
