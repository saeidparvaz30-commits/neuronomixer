"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  PointEstimatesState,
  EstimatorView,
  drawSample,
  computeMean,
  computeMedian,
} from "./types";
import HiddenPopulationDisplay from "./HiddenPopulationDisplay";
import SampleSizeControl from "./SampleSizeControl";
import DrawSampleButton from "./DrawSampleButton";
import SampleMeanPlotter from "./SampleMeanPlotter";
import StandardErrorVisualizer from "./StandardErrorVisualizer";
import EstimatorPropertiesPanel from "./EstimatorPropertiesPanel";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

const POP_MEAN = 100;
const POP_SD = 20;

const INITIAL_STATE: PointEstimatesState = {
  populationMean: POP_MEAN,
  populationSD: POP_SD,
  sampleSize: 20,
  sampleMeans: [],
  sampleMedians: [],
  populationMeanRevealed: false,
  currentEstimatorView: "bias",
  sizeChanged: false,
  panelsViewed: new Set<EstimatorView>(["bias"]),
};

export default function StandardErrorPointEstimatesClient() {
  const { data: session } = useSession();
  const completionFired = useRef(false);

  const [state, setState] = useState<PointEstimatesState>(() => ({
    ...INITIAL_STATE,
    panelsViewed: new Set<EstimatorView>(["bias"]),
  }));

  // ── Derived completion ────────────────────────────────────────────────────

  const allComplete =
    state.sizeChanged &&
    state.sampleMeans.length >= 20 &&
    state.populationMeanRevealed &&
    state.panelsViewed.size === 3;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideSlug: "standard-error-point-estimates",
          score: 6,
        }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleDraw = useCallback(() => {
    const s = drawSample(state.sampleSize, POP_MEAN, POP_SD);
    const m = computeMean(s);
    const med = computeMedian(s);
    setState((prev) => ({
      ...prev,
      sampleMeans: [...prev.sampleMeans, m],
      sampleMedians: [...prev.sampleMedians, med],
    }));
  }, [state.sampleSize]);

  const handleDrawMany = useCallback(() => {
    const newMeans: number[] = [];
    const newMeds: number[] = [];
    for (let i = 0; i < 10; i++) {
      const s = drawSample(state.sampleSize, POP_MEAN, POP_SD);
      newMeans.push(computeMean(s));
      newMeds.push(computeMedian(s));
    }
    setState((prev) => ({
      ...prev,
      sampleMeans: [...prev.sampleMeans, ...newMeans],
      sampleMedians: [...prev.sampleMedians, ...newMeds],
    }));
  }, [state.sampleSize]);

  const handleClear = useCallback(() => {
    setState((prev) => ({
      ...prev,
      sampleMeans: [],
      sampleMedians: [],
      populationMeanRevealed: false,
    }));
  }, []);

  const handleSizeChange = useCallback((n: number) => {
    setState((prev) => ({
      ...prev,
      sampleSize: n,
      sizeChanged: true,
      sampleMeans: [],
      sampleMedians: [],
    }));
  }, []);

  const handleReveal = useCallback(() => {
    setState((prev) => ({ ...prev, populationMeanRevealed: true }));
  }, []);

  const handlePanelView = useCallback((view: EstimatorView) => {
    setState((prev) => {
      const next = new Set(prev.panelsViewed);
      next.add(view);
      return { ...prev, panelsViewed: next, currentEstimatorView: view };
    });
  }, []);

  // ── Progress items ────────────────────────────────────────────────────────

  const progress = [
    { label: "Changed sample size", done: state.sizeChanged },
    {
      label: `Drew ≥ 20 samples (${state.sampleMeans.length})`,
      done: state.sampleMeans.length >= 20,
    },
    { label: "Revealed true mean", done: state.populationMeanRevealed },
    {
      label: `Explored all 3 tabs (${state.panelsViewed.size}/3)`,
      done: state.panelsViewed.size === 3,
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allComplete} guideSlug="standard-error-point-estimates" score={6} />
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
          <span className="text-white">Standard Error &amp; Point Estimates</span>
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
            Standard Error &amp;{" "}
            <span className="text-[#d4af37]">Point Estimates</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[680px]">
            Draw repeated samples from a hidden population and watch the sample
            means cluster. Discover how standard error measures that spread, and
            explore the core properties that make a good estimator — bias,
            consistency, and efficiency.
          </p>
        </motion.section>

        {/* Progress row */}
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

        {/* Two-column main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 mb-6">

          {/* Left column: controls */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <HiddenPopulationDisplay
              populationMeanRevealed={state.populationMeanRevealed}
              canReveal={state.sampleMeans.length >= 1}
              onReveal={handleReveal}
            />
            <SampleSizeControl
              sampleSize={state.sampleSize}
              onChange={handleSizeChange}
            />
            <DrawSampleButton
              onDraw={handleDraw}
              onDrawMany={handleDrawMany}
              onClear={handleClear}
              samplesCount={state.sampleMeans.length}
              sampleSize={state.sampleSize}
            />
          </motion.div>

          {/* Right column: plots */}
          <motion.div
            className="space-y-5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <SampleMeanPlotter
              sampleMeans={state.sampleMeans}
              sampleMedians={state.sampleMedians}
              populationMean={state.populationMean}
              populationMeanRevealed={state.populationMeanRevealed}
              sampleSize={state.sampleSize}
            />
            <StandardErrorVisualizer
              sampleMeans={state.sampleMeans}
              sampleSize={state.sampleSize}
              populationSD={state.populationSD}
              populationMean={state.populationMean}
            />
          </motion.div>
        </div>

        {/* Full-width estimator properties panel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <EstimatorPropertiesPanel
            sampleSize={state.sampleSize}
            sampleMeans={state.sampleMeans}
            sampleMedians={state.sampleMedians}
            onPanelView={handlePanelView}
            panelsViewed={state.panelsViewed}
          />
        </motion.div>

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/descriptive-statistics"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← Descriptive Statistics
          </Link>
          <Link
            href="/visual-guides/probability-fundamentals"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Probability Fundamentals →
          </Link>
        </div>
      </div>
    </div>
  );
}
