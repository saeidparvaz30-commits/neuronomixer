"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

type ScenarioId = "medical" | "spam" | "fairness";

interface Scenario {
  label: string;
  desc: string;
  baseRate: number;
  sensitivity: number;
  specificity: number;
  conditionName: string;
  testName: string;
}

const SCENARIOS: Record<ScenarioId, Scenario> = {
  medical: {
    label: "Medical Test",
    desc: "A rare disease affects 1 in 1000 people. A test has 95% sensitivity and specificity. You test positive.",
    baseRate: 0.001,
    sensitivity: 0.95,
    specificity: 0.95,
    conditionName: "Has Disease",
    testName: "Tests Positive",
  },
  spam: {
    label: "Email Spam",
    desc: "About 20% of emails are spam. A spam filter catches 90% of spam and has a 5% false positive rate.",
    baseRate: 0.20,
    sensitivity: 0.90,
    specificity: 0.95,
    conditionName: "Is Spam",
    testName: "Flagged as Spam",
  },
  fairness: {
    label: "Coin Fairness",
    desc: "You suspect a coin is biased. 1% of coins are unfair. A fair test catches biased coins 80% of the time with 10% false positives.",
    baseRate: 0.01,
    sensitivity: 0.80,
    specificity: 0.90,
    conditionName: "Biased Coin",
    testName: "Test Flags Biased",
  },
};

function computePosterior(baseRate: number, sensitivity: number, specificity: number): number {
  const tp = baseRate * sensitivity;
  const fp = (1 - baseRate) * (1 - specificity);
  if (tp + fp === 0) return 0;
  return tp / (tp + fp);
}

// Population of 10000 for the block grid
function computeCounts(baseRate: number, sensitivity: number, specificity: number) {
  const N = 10000;
  const withCondition = Math.round(N * baseRate);
  const withoutCondition = N - withCondition;
  const tp = Math.round(withCondition * sensitivity);
  const fn = withCondition - tp;
  const fp = Math.round(withoutCondition * (1 - specificity));
  const tn = withoutCondition - fp;
  return { N, withCondition, withoutCondition, tp, fn, fp, tn };
}

// ── Area Diagram ─────────────────────────────────────────────────────────────
function BayesAreaDiagram({
  baseRate, sensitivity, specificity,
}: { baseRate: number; sensitivity: number; specificity: number }) {
  const W = 500, H = 200;
  const counts = computeCounts(baseRate, sensitivity, specificity);
  const { N, withCondition, tp, fn, fp, tn } = counts;

  // Proportional widths
  const condW = (withCondition / N) * W;
  const noCondW = ((N - withCondition) / N) * W;

  // Heights within each group
  const tpH = withCondition > 0 ? (tp / withCondition) * H : 0;
  const fnH = H - tpH;
  const fpH = (N - withCondition) > 0 ? (fp / (N - withCondition)) * H : 0;
  const tnH = H - fpH;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ borderRadius: 8, overflow: "hidden" }}>
        {/* Left side: with condition */}
        {/* TP */}
        <motion.rect x={0} y={0} width={condW} initial={{ height: 0, y: 0 }} animate={{ height: tpH }}
          transition={{ duration: 0.7 }} fill="#3bb4a4" />
        {/* FN */}
        <motion.rect x={0} initial={{ y: H, height: 0 }} animate={{ y: tpH, height: fnH }}
          transition={{ duration: 0.7 }} fill="#3bb4a4" opacity="0.3" />
        {condW > 20 && (
          <text x={condW / 2} y={10} textAnchor="middle" fill="white" fontSize="8" fontWeight="600">
            Has condition
          </text>
        )}

        {/* Right side: without condition */}
        {/* FP */}
        <motion.rect x={condW} y={0} width={noCondW} initial={{ height: 0 }} animate={{ height: fpH }}
          transition={{ duration: 0.7 }} fill="#ef4444" opacity="0.6" />
        {/* TN */}
        <motion.rect x={condW} initial={{ y: H, height: 0 }} animate={{ y: fpH, height: tnH }}
          transition={{ duration: 0.7 }} fill="#1e293b" />
        <text x={condW + noCondW / 2} y={10} textAnchor="middle" fill="white" fontSize="8" fontWeight="600">
          No condition
        </text>

        {/* Divider */}
        <line x1={condW} y1={0} x2={condW} y2={H} stroke="#334155" strokeWidth="1" />

        {/* Labels */}
        {tpH > 20 && (
          <text x={condW / 2} y={tpH / 2 + 4} textAnchor="middle" fill="white" fontSize="7">
            TP: {tp}
          </text>
        )}
        {fpH > 20 && (
          <text x={condW + noCondW / 2} y={fpH / 2 + 4} textAnchor="middle" fill="white" fontSize="7">
            FP: {fp}
          </text>
        )}
      </svg>
      <div className="flex gap-3 mt-2 flex-wrap">
        {[
          { color: "#3bb4a4", label: `True Positive (TP): ${counts.tp}` },
          { color: "#3bb4a4", opacity: "0.3", label: `False Negative (FN): ${counts.fn}` },
          { color: "#ef4444", label: `False Positive (FP): ${counts.fp}` },
          { color: "#1e293b", label: `True Negative (TN): ${counts.tn}`, border: "#334155" },
        ].map(({ color, opacity, label, border }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: color, opacity: opacity ?? 1, border: border ? `1px solid ${border}` : undefined }} />
            <span className="text-[9px] text-[#94a3b8]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Block Grid ────────────────────────────────────────────────────────────────
function BlockGrid({ posterior }: { posterior: number }) {
  const blocks = 100;
  const truePositiveBlocks = Math.round(posterior * blocks);
  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: blocks }, (_, i) => (
          <motion.div key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.005, duration: 0.2 }}
            className="w-4 h-4 rounded-sm"
            style={{ background: i < truePositiveBlocks ? "#3bb4a4" : "#ef4444" }}
          />
        ))}
      </div>
      <div className="flex gap-4 mt-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-[#3bb4a4]" />
          <span className="text-[10px] text-[#94a3b8]">Has condition ({truePositiveBlocks}%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-[#ef4444]" />
          <span className="text-[10px] text-[#94a3b8]">False alarm ({100 - truePositiveBlocks}%)</span>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BayesTheoremClient() {
  const { data: session } = useSession();
  const [scenario, setScenario] = useState<ScenarioId>("medical");
  const [baseRate, setBaseRate] = useState(SCENARIOS.medical.baseRate);
  const [sensitivity, setSensitivity] = useState(SCENARIOS.medical.sensitivity);
  const [specificity, setSpecificity] = useState(SCENARIOS.medical.specificity);
  const [intuition, setIntuition] = useState(95);
  const [sliderAdjustments, setSliderAdjustments] = useState(0);
  const completionFired = useRef(false);

  const allComplete = sliderAdjustments >= 5;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "bayes-theorem", score: 7 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  function handleScenario(s: ScenarioId) {
    setScenario(s);
    const sc = SCENARIOS[s];
    setBaseRate(sc.baseRate);
    setSensitivity(sc.sensitivity);
    setSpecificity(sc.specificity);
  }

  function adjust<T>(setter: (v: T) => void, val: T) {
    setter(val);
    setSliderAdjustments(prev => prev + 1);
  }

  const posterior = computePosterior(baseRate, sensitivity, specificity);
  const pct = (posterior * 100).toFixed(2);
  const intDiff = Math.abs(intuition - parseFloat(pct));
  const sc = SCENARIOS[scenario];
  const counts = computeCounts(baseRate, sensitivity, specificity);

  const posteriorColor = posterior > 0.5 ? "#ef4444" : posterior > 0.1 ? "#f97316" : "#d4af37";

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Bayes Theorem</span>
        </nav>

        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">Statistics</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Bayes Theorem:{" "}
            <span className="text-[var(--color-accent)]">Update Your Beliefs</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            A test is 95% accurate. You test positive. What's the probability you have the disease?
            Adjust base rates and test accuracy to see how beliefs update.
          </p>
        </section>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full transition-colors ${sliderAdjustments >= 5 ? "bg-[#3bb4a4]" : "bg-[#1e293b]"}`} />
            <span className={`text-[11px] ${sliderAdjustments >= 5 ? "text-white" : "text-[#475569]"}`}>
              Sliders adjusted: {sliderAdjustments}/5
            </span>
          </div>
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link href="/auth/sign-in" className="underline underline-offset-2 hover:text-[#94a3b8]">Sign in</Link>{" "}to track progress
            </p>
          )}
          <AnimatePresence>
            {allComplete && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="ml-auto text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-4">
            {/* Scenario */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">Choose Scenario</p>
              <div className="flex gap-2 mb-3 flex-wrap">
                {(Object.entries(SCENARIOS) as [ScenarioId, Scenario][]).map(([id, s]) => (
                  <button key={id} onClick={() => handleScenario(id)}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-colors"
                    style={{
                      borderColor: scenario === id ? "#3bb4a4" : "#1e293b",
                      color: scenario === id ? "#3bb4a4" : "#475569",
                      background: scenario === id ? "#3bb4a420" : "transparent",
                    }}>
                    {s.label}
                  </button>
                ))}
              </div>
              <p className="text-[12px] text-[#94a3b8]">{sc.desc}</p>
            </div>

            {/* Controls */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">Parameters</p>
              {[
                { label: "Base Rate (Prior)", val: baseRate, min: 0.001, max: 0.1, step: 0.001, fmt: (v: number) => `${(v * 100).toFixed(1)}%`, set: (v: number) => adjust(setBaseRate, v) },
                { label: "Sensitivity (True Positive Rate)", val: sensitivity, min: 0.5, max: 1, step: 0.01, fmt: (v: number) => `${(v * 100).toFixed(0)}%`, set: (v: number) => adjust(setSensitivity, v) },
                { label: "Specificity (True Negative Rate)", val: specificity, min: 0.5, max: 1, step: 0.01, fmt: (v: number) => `${(v * 100).toFixed(0)}%`, set: (v: number) => adjust(setSpecificity, v) },
              ].map(({ label, val, min, max, step, fmt, set }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px] text-white font-medium">{label}</span>
                    <span className="text-[11px] font-mono text-[#d4af37]">{fmt(val)}</span>
                  </div>
                  <input type="range" min={min} max={max} step={step} value={val}
                    onChange={e => set(Number(e.target.value))}
                    className="w-full" style={{ accentColor: "#d4af37" }} />
                </div>
              ))}
              <p className="text-[9px] text-[#334155]">
                False Positive Rate = {((1 - specificity) * 100).toFixed(0)}% | False Negative Rate = {((1 - sensitivity) * 100).toFixed(0)}%
              </p>
            </div>

            {/* Bayesian diagram */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[12px] font-bold text-white mb-1">Among 10,000 People Who Test Positive</p>
              <p className="text-[10px] text-[#475569] mb-3">
                Out of {counts.tp + counts.fp} who test positive: {counts.tp} actually have the condition, {counts.fp} are false alarms.
              </p>
              <BayesAreaDiagram baseRate={baseRate} sensitivity={sensitivity} specificity={specificity} />
            </div>

            {/* Block grid */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[12px] font-bold text-white mb-3">Of 100 people with a positive test result…</p>
              <BlockGrid posterior={posterior} />
            </div>
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* Intuition vs calculation */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">Intuition Check</p>
              <p className="text-[11px] text-[#94a3b8] mb-3">If you test positive, what's your chance of having the condition?</p>
              <div className="flex justify-between mb-1">
                <span className="text-[11px] text-white">Your guess</span>
                <span className="text-[11px] font-mono text-white">{intuition}%</span>
              </div>
              <input type="range" min={0} max={100} value={intuition}
                onChange={e => setIntuition(Number(e.target.value))}
                className="w-full mb-4" style={{ accentColor: "#8b5cf6" }} />

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#1e293b] p-3 text-center">
                  <p className="text-[9px] text-[#475569] uppercase mb-1">Your Intuition</p>
                  <p className="text-[24px] font-black text-[#8b5cf6]">{intuition}%</p>
                </div>
                <div className="rounded-xl border border-[#d4af37]/30 p-3 text-center" style={{ background: "#d4af3710" }}>
                  <p className="text-[9px] text-[#475569] uppercase mb-1">The Calculation</p>
                  <p className="text-[24px] font-black" style={{ color: posteriorColor }}>{pct}%</p>
                </div>
              </div>

              {intDiff > 2 && (
                <p className="text-[10px] text-[#94a3b8] mt-3">
                  {intDiff > 30 ? "Surprisingly different!" : "Off by " + intDiff.toFixed(1) + " percentage points."}{" "}
                  This is the base rate effect — rare conditions have low PPV even with accurate tests.
                </p>
              )}
              {intDiff <= 2 && (
                <p className="text-[10px] text-[#3bb4a4] mt-3">Great intuition! You're within 2% of the calculated value.</p>
              )}
            </div>

            {/* Posterior result */}
            <div className="rounded-2xl border bg-[#0f172a] p-5" style={{ borderColor: posteriorColor + "40" }}>
              <p className="text-[11px] text-[#475569] uppercase tracking-[1px] mb-1">Posterior Probability</p>
              <p className="text-[40px] font-black" style={{ color: posteriorColor }}>{pct}%</p>
              <p className="text-[11px] text-white mt-1">
                P({sc.conditionName} | {sc.testName})
              </p>
              <p className="text-[11px] text-[#94a3b8] mt-3 leading-relaxed">
                {posterior > 0.5
                  ? "This test is quite informative — a positive result suggests a real risk."
                  : posterior > 0.1
                  ? "Even positive, the risk is lower than the test accuracy suggests."
                  : `Surprising! The condition is so rare that a positive result is mostly a false alarm. Follow-up testing needed.`}
              </p>
            </div>

            {/* Formula */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#d4af37] mb-2">Bayes Formula</p>
              <p className="text-[11px] text-[#94a3b8] font-mono leading-relaxed">
                P(C|+) = P(+|C) × P(C)<br />
                {'           '} / [P(+|C)×P(C) + P(+|¬C)×P(¬C)]<br />
                <br />
                = {sensitivity.toFixed(2)} × {baseRate.toFixed(4)}<br />
                {'  '} / [{sensitivity.toFixed(2)}×{baseRate.toFixed(4)} + {(1-specificity).toFixed(2)}×{(1-baseRate).toFixed(4)}]<br />
                <br />
                = <strong className="text-white">{posterior.toFixed(4)}</strong> ({pct}%)
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link href="/visual-guides/confidence-intervals"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
            ← Previous Guide
          </Link>
          <Link href="/visual-guides"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
            All Guides →
          </Link>
        </div>
      </div>
    </div>
  );
}
