"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";

import {
  StatisticalPowerState,
  INITIAL_STATE,
  computePower,
  computeSampleSize,
  computeCohensD,
} from "./types";
import PowerVisualization from "./PowerVisualization";
import EffectSizeSlider from "./EffectSizeSlider";
import SampleSizeControl from "./SampleSizeControl";
import AlphaControl from "./AlphaControl";
import EffectSizeCalculator from "./EffectSizeCalculator";
import PowerResultsPanel from "./PowerResultsPanel";
import SampleSizePlanner from "./SampleSizePlanner";
import EffectSizeMeasures from "./EffectSizeMeasures";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

const NEXT_GUIDE_SLUG = "multiple-testing-false-discovery";

export default function StatisticalPowerEffectSizeClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();

  // ── Core state ──────────────────────────────────────────────────────────────
  const [state, setState] = useState<StatisticalPowerState>(() => {
    const init = { ...INITIAL_STATE };
    init.calculatedD = computeCohensD(init.group1Mean, init.group2Mean, init.pooledSD);
    init.plannedN = computeSampleSize(init.plannedD, init.targetPower, init.plannedAlpha, true);
    return init;
  });

  // ── Computed power (live) ────────────────────────────────────────────────────
  const computedPower = useMemo(
    () => computePower(state.cohensD, state.sampleSizePerGroup, state.alpha, state.twoTailed),
    [state.cohensD, state.sampleSizePerGroup, state.alpha, state.twoTailed]
  );

  // ── Progress tracking ────────────────────────────────────────────────────────
  const [effectAdjusted, setEffectAdjusted] = useState(false);
  const [sampleAdjusted, setSampleAdjusted] = useState(false);
  const [alphaChanged, setAlphaChanged] = useState(false);
  const [calculatorUsed, setCalculatorUsed] = useState(false);
  const [plannerUsed, setPlannerUsed] = useState(false);
  const completionFired = useRef(false);

  const allComplete =
    effectAdjusted && sampleAdjusted && alphaChanged && calculatorUsed && plannerUsed;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "statistical-power-effect-size", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  // ── Updaters ──────────────────────────────────────────────────────────────────
  function setCohensD(d: number) {
    setState((s) => ({ ...s, cohensD: d }));
    if (d !== INITIAL_STATE.cohensD) setEffectAdjusted(true);
  }

  function setSampleSize(n: number) {
    setState((s) => ({ ...s, sampleSizePerGroup: n }));
    if (n !== INITIAL_STATE.sampleSizePerGroup) setSampleAdjusted(true);
  }

  function setAlpha(a: 0.05 | 0.01 | 0.001) {
    setState((s) => ({ ...s, alpha: a }));
    if (a !== INITIAL_STATE.alpha) setAlphaChanged(true);
  }

  function setTwoTailed(v: boolean) {
    setState((s) => ({ ...s, twoTailed: v }));
    if (v !== INITIAL_STATE.twoTailed) setAlphaChanged(true);
  }

  function setGroup1Mean(v: number) {
    setState((s) => {
      const d = computeCohensD(v, s.group2Mean, s.pooledSD);
      return { ...s, group1Mean: v, calculatedD: d };
    });
  }

  function setGroup2Mean(v: number) {
    setState((s) => {
      const d = computeCohensD(s.group1Mean, v, s.pooledSD);
      return { ...s, group2Mean: v, calculatedD: d };
    });
  }

  function setPooledSD(v: number) {
    setState((s) => {
      const d = computeCohensD(s.group1Mean, s.group2Mean, v);
      return { ...s, pooledSD: v, calculatedD: d };
    });
  }

  function applyCalculatedD(d: number) {
    setCohensD(Math.min(2.0, Math.max(0.1, parseFloat(d.toFixed(1)))));
  }

  function setTargetPower(v: 0.70 | 0.80 | 0.90) {
    setState((s) => {
      const n = computeSampleSize(s.plannedD, v, s.plannedAlpha, true);
      return { ...s, targetPower: v, plannedN: n };
    });
  }

  function setPlannedD(v: number) {
    setState((s) => {
      const d = Math.max(0.01, v);
      const n = computeSampleSize(d, s.targetPower, s.plannedAlpha, true);
      return { ...s, plannedD: d, plannedN: n };
    });
  }

  function setPlannedAlpha(v: 0.05 | 0.01) {
    setState((s) => {
      const n = computeSampleSize(s.plannedD, s.targetPower, v, true);
      return { ...s, plannedAlpha: v, plannedN: n };
    });
  }

  function handleReset() {
    const init = { ...INITIAL_STATE };
    init.calculatedD = computeCohensD(init.group1Mean, init.group2Mean, init.pooledSD);
    init.plannedN = computeSampleSize(init.plannedD, init.targetPower, init.plannedAlpha, true);
    setState(init);
    setEffectAdjusted(false);
    setSampleAdjusted(false);
    setAlphaChanged(false);
    setCalculatorUsed(false);
    setPlannerUsed(false);
  }

  // ── Progress dots ──────────────────────────────────────────────────────────
  const progress = [
    { label: "Effect size adjusted", done: effectAdjusted },
    { label: "Sample size adjusted", done: sampleAdjusted },
    { label: "Alpha changed", done: alphaChanged },
    { label: "Calculator used", done: calculatorUsed },
    { label: "Planner used", done: plannerUsed },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allComplete} guideSlug="statistical-power-effect-size" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Statistical Power &amp; Effect Size</span>
        </nav>

        {/* Hero */}
        <motion.section
          className="mb-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Statistics
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Statistical Power &amp;{" "}
            <span className="text-[var(--color-accent)]">Effect Size</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            Discover how effect size, sample size, and significance threshold jointly determine
            whether your study can detect a true signal. Tune the parameters and watch the
            overlapping distributions shift in real time.
          </p>
        </motion.section>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progress.map(({ label, done }) => (
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

        {/* Main 2-col grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-5">
            <PowerVisualization
              cohensD={state.cohensD}
              alpha={state.alpha}
              twoTailed={state.twoTailed}
              sampleSizePerGroup={state.sampleSizePerGroup}
              computedPower={computedPower}
            />

            <EffectSizeSlider value={state.cohensD} onChange={setCohensD} />

            <SampleSizeControl
              value={state.sampleSizePerGroup}
              computedPower={computedPower}
              onChange={setSampleSize}
            />

            <AlphaControl
              value={state.alpha}
              twoTailed={state.twoTailed}
              onChange={setAlpha}
              onTwoTailedChange={setTwoTailed}
            />
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <PowerResultsPanel
              computedPower={computedPower}
              alpha={state.alpha}
              cohensD={state.cohensD}
              sampleSizePerGroup={state.sampleSizePerGroup}
            />

            <EffectSizeCalculator
              group1Mean={state.group1Mean}
              group2Mean={state.group2Mean}
              pooledSD={state.pooledSD}
              onGroup1Change={setGroup1Mean}
              onGroup2Change={setGroup2Mean}
              onSDChange={setPooledSD}
              onApply={applyCalculatedD}
              isVisible={true}
              onUsed={() => setCalculatorUsed(true)}
            />

            <SampleSizePlanner
              targetPower={state.targetPower}
              plannedD={state.plannedD}
              plannedAlpha={state.plannedAlpha}
              plannedN={state.plannedN}
              onTargetPowerChange={setTargetPower}
              onPlannedDChange={setPlannedD}
              onPlannedAlphaChange={setPlannedAlpha}
              onUsed={() => setPlannerUsed(true)}
            />

            <EffectSizeMeasures />
          </div>
        </div>

        {/* Concept insight cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          {[
            {
              title: "Type I Error (α)",
              body: "The probability of rejecting a true null hypothesis: a false positive. You control this directly by choosing α.",
              color: "#ef4444",
            },
            {
              title: "Type II Error (β)",
              body: "The probability of failing to reject a false null hypothesis: a false negative. β = 1 − Power.",
              color: "var(--color-accent)",
            },
            {
              title: "Power = 1 − β",
              body: "The probability of correctly detecting a real effect. Power ≥ 0.80 is the standard convention for confirmatory research.",
              color: "#3bb4a4",
            },
          ].map(({ title, body, color }) => (
            <div key={title} className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4">
              <p className="text-[11px] font-semibold mb-2" style={{ color }}>
                {title}
              </p>
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
                  You Tuned Every Lever of Power
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You shifted effect size, sample size, and alpha, computed a
                  Cohen&apos;s d from raw group numbers, and planned the sample a
                  future study would need.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Power at your final settings
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {(computedPower * 100).toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      d = {state.cohensD.toFixed(1)}, n = {state.sampleSizePerGroup}/group, α = {state.alpha}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Effect size you calculated
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      d = {state.calculatedD.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      from means {state.group1Mean} vs {state.group2Mean}, SD {state.pooledSD}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Planned sample size
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {state.plannedN}/group
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      for {(state.targetPower * 100).toFixed(0)}% power at d = {state.plannedD.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Power is a negotiation between effect size, sample
                    size, and alpha. Decide the smallest effect you care about
                    and plan the sample before the data arrive, because an
                    underpowered study cannot tell a null result from a missed
                    signal.&quot;
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
        {!allComplete && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link
              href="/visual-guides/p-values"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            >
              ← P-Values Demystified
            </Link>
            <Link
              href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
            >
              Multiple Testing &amp; False Discovery →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
