"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  DistributionType,
  DataDistributionsState,
  INITIAL_STATE,
  DIST_LABELS,
  getTheoreticalBins,
  getEmpiricalBins,
  getDistStats,
} from "./types";
import DistributionSelector, { DIST_COLORS } from "./DistributionSelector";
import ParameterSliders from "./ParameterSliders";
import InteractiveHistogram from "./InteractiveHistogram";
import StatAnnotations from "./StatAnnotations";
import SampleSimulator from "./SampleSimulator";
import OverlayToggle from "./OverlayToggle";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getParams(state: DataDistributionsState, dist: DistributionType) {
  switch (dist) {
    case "normal":      return state.normalParams;
    case "uniform":     return state.uniformParams;
    case "exponential": return state.exponentialParams;
    case "poisson":     return state.poissonParams;
  }
}

function getOverlayParams(state: DataDistributionsState, dist: DistributionType) {
  switch (dist) {
    case "normal":      return state.overlayNormalParams;
    case "uniform":     return state.overlayUniformParams;
    case "exponential": return state.overlayExponentialParams;
    case "poisson":     return state.overlayPoissonParams;
  }
}

const OVERLAY_COLOR = "var(--color-accent)";

// ── Component ─────────────────────────────────────────────────────────────────

export default function DataDistributionsClient() {
  const { data: session } = useSession();
  const completionFired = useRef(false);

  const [state, setState] = useState<DataDistributionsState>(() => ({
    ...INITIAL_STATE,
    exploredDistributions: new Set<DistributionType>(["normal"]),
  }));

  // ── Derived ────────────────────────────────────────────────────────────────

  const { selectedDistribution: dist } = state;
  const color = DIST_COLORS[dist];
  const params = getParams(state, dist);

  const theoreticalBins = useMemo(
    () => getTheoreticalBins(dist, params),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dist, JSON.stringify(params)]
  );

  const empiricalBins = useMemo(
    () =>
      state.sampleData.length > 0
        ? getEmpiricalBins(state.sampleData, dist, params)
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.sampleData, dist, JSON.stringify(params)]
  );

  const overlayBins = useMemo(
    () =>
      state.showOverlay
        ? getTheoreticalBins(state.overlayDistribution, getOverlayParams(state, state.overlayDistribution))
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.showOverlay, state.overlayDistribution, JSON.stringify(getOverlayParams(state, state.overlayDistribution))]
  );

  const distStats = useMemo(() => getDistStats(dist, params), [dist, params]);

  // ── Completion ─────────────────────────────────────────────────────────────

  const allComplete =
    state.exploredDistributions.size === 4 &&
    state.adjustedParameters &&
    state.drewSamples;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "data-distributions", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleDistChange(d: DistributionType) {
    setState(prev => ({
      ...prev,
      selectedDistribution: d,
      sampleData: [],
      empiricalVisible: false,
      exploredDistributions: new Set([...prev.exploredDistributions, d]),
    }));
  }

  function handleParamChange(updater: (prev: DataDistributionsState) => DataDistributionsState) {
    setState(prev => ({ ...updater(prev), adjustedParameters: true, sampleData: [], empiricalVisible: false }));
  }

  function handleSamplesDrawn(data: number[]) {
    setState(prev => ({ ...prev, sampleData: data, empiricalVisible: true, drewSamples: true }));
  }

  function handleSampleSizeChange(n: number) {
    setState(prev => ({ ...prev, sampleSize: n, sampleData: [], empiricalVisible: false }));
  }

  // ── Progress ───────────────────────────────────────────────────────────────

  const progress = [
    {
      label: `Distributions explored: ${state.exploredDistributions.size}/4`,
      done: state.exploredDistributions.size >= 4,
    },
    { label: "Parameters adjusted", done: state.adjustedParameters },
    { label: "Random samples drawn", done: state.drewSamples },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allComplete} guideSlug="data-distributions" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Data Distributions</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              DATA &amp; ANALYSIS
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Data Distributions:{" "}
            <span className="text-[var(--color-accent)]">Shape, Spread &amp; Skew</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[680px]">
            Most real-world data doesn&apos;t fall from the sky in perfect bell curves. Explore Normal,
            Uniform, Exponential, and Poisson distributions. Adjust parameters and watch the shape
            change in real time.
          </p>
        </section>

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

        {/* Distribution selector */}
        <div className="mb-6">
          <DistributionSelector current={dist} onChange={handleDistChange} label="Select distribution" />
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

          {/* Left column */}
          <div className="space-y-5">

            {/* Histogram card */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={dist}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                    <h2 className="text-[14px] font-bold" style={{ color }}>
                      {DIST_LABELS[dist]} Distribution
                    </h2>
                    <span className="text-[10px] font-mono text-[#475569]">{distStats.formula}</span>
                  </div>
                  <p className="text-[11px] text-[#475569] mb-4">Theoretical probability density</p>
                </motion.div>
              </AnimatePresence>

              <InteractiveHistogram
                bins={theoreticalBins}
                empiricalBins={empiricalBins}
                sampleSize={state.sampleData.length > 0 ? state.sampleData.length : undefined}
                color={color}
                overlayBins={overlayBins}
                overlayColor={OVERLAY_COLOR}
                distributionName={DIST_LABELS[dist]}
                showEmpirical={state.empiricalVisible}
              />
            </div>

            {/* Parameter sliders */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-4">
                Parameters
              </p>
              <ParameterSliders
                dist={dist}
                color={color}
                normalParams={state.normalParams}
                uniformParams={state.uniformParams}
                exponentialParams={state.exponentialParams}
                poissonParams={state.poissonParams}
                onNormal={p => handleParamChange(prev => ({ ...prev, normalParams: p }))}
                onUniform={p => handleParamChange(prev => ({ ...prev, uniformParams: p }))}
                onExponential={p => handleParamChange(prev => ({ ...prev, exponentialParams: p }))}
                onPoisson={p => handleParamChange(prev => ({ ...prev, poissonParams: p }))}
              />
            </div>

            {/* Sample simulator */}
            <SampleSimulator
              dist={dist}
              params={params}
              currentSampleSize={state.sampleSize}
              onSampleSizeChange={handleSampleSizeChange}
              onSamplesDrawn={handleSamplesDrawn}
              empiricalVisible={state.empiricalVisible}
              drewSamples={state.drewSamples}
            />

            {/* Compare overlay toggle */}
            <OverlayToggle
              showOverlay={state.showOverlay}
              overlayDistribution={state.overlayDistribution}
              overlayNormalParams={state.overlayNormalParams}
              overlayUniformParams={state.overlayUniformParams}
              overlayExponentialParams={state.overlayExponentialParams}
              overlayPoissonParams={state.overlayPoissonParams}
              onToggle={v => setState(prev => ({ ...prev, showOverlay: v }))}
              onOverlayDistChange={d =>
                setState(prev => ({ ...prev, overlayDistribution: d }))
              }
              onOverlayNormal={p =>
                setState(prev => ({ ...prev, overlayNormalParams: p }))
              }
              onOverlayUniform={p =>
                setState(prev => ({ ...prev, overlayUniformParams: p }))
              }
              onOverlayExponential={p =>
                setState(prev => ({ ...prev, overlayExponentialParams: p }))
              }
              onOverlayPoisson={p =>
                setState(prev => ({ ...prev, overlayPoissonParams: p }))
              }
              overlayColor={OVERLAY_COLOR}
            />
          </div>

          {/* Right panel — stats */}
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 self-start">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${dist}-${JSON.stringify(params)}`}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <StatAnnotations stats={distStats} color={color} />
              </motion.div>
            </AnimatePresence>

            {/* Explored tracker */}
            <div className="mt-5 pt-4 border-t border-white/[0.06]">
              <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#475569] mb-2">
                Distributions explored
              </p>
              <div className="space-y-1.5">
                {(["normal", "uniform", "exponential", "poisson"] as DistributionType[]).map(d => {
                  const explored = state.exploredDistributions.has(d);
                  return (
                    <div key={d} className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0 transition-colors"
                        style={{ background: explored ? DIST_COLORS[d] : "#1e293b" }}
                      />
                      <span
                        className="text-[10px] transition-colors"
                        style={{ color: explored ? "#f1f5f9" : "#334155" }}
                      >
                        {DIST_LABELS[d]}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[9px] text-[#334155] mt-2">
                Explore all 4, adjust sliders &amp; draw samples to complete
              </p>
            </div>
          </div>
        </div>

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/percentiles-quartiles-box-plots"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
          >
            ← Percentiles &amp; Box Plots
          </Link>
          <Link
            href="/visual-guides/visualizing-data-charts"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Visualizing Data →
          </Link>
        </div>
      </div>
    </div>
  );
}
