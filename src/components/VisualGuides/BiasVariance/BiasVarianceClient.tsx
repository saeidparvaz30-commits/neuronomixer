"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

function gaussRand() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

interface Dart { x: number; y: number; id: number }

function generateDarts(bias: number, variance: number, n: number): Dart[] {
  return Array.from({ length: n }, (_, i) => ({
    x: bias * Math.cos(Math.PI / 4) + gaussRand() * variance,
    y: bias * Math.sin(Math.PI / 4) + gaussRand() * variance,
    id: i,
  }));
}

// ── Bullseye ──────────────────────────────────────────────────────────────────
function Bullseye({
  darts, bias, variance,
}: { darts: Dart[]; bias: number; variance: number }) {
  const SIZE = 300, C = SIZE / 2, R = SIZE / 2 - 10;
  // scale: dart coords in [-1, 1] map to radius R
  const scale = R / (1 + 0.5);

  const tx = (x: number) => C + x * scale;
  const ty = (y: number) => C - y * scale;

  const rings = [1.0, 0.75, 0.5, 0.25];
  const ringColors = ["#1e293b", "#1e3a5f", "#1e5d8a", "#1d7a6e"];
  const ringLabels = ["10", "20", "30", "50"];

  // Centroid
  const cx = darts.length > 0 ? darts.reduce((a, d) => a + d.x, 0) / darts.length : 0;
  const cy = darts.length > 0 ? darts.reduce((a, d) => a + d.y, 0) / darts.length : 0;

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="100%">
      {/* Rings */}
      {rings.map((r, i) => (
        <circle key={r} cx={C} cy={C} r={r * R}
          fill={ringColors[i]} stroke="#334155" strokeWidth="1" />
      ))}
      {/* Bullseye center */}
      <circle cx={C} cy={C} r={R * 0.1} fill="#d4af37" opacity="0.9" />

      {/* Crosshairs */}
      <line x1={C - R * 0.08} y1={C} x2={C + R * 0.08} y2={C} stroke="white" strokeWidth="1" opacity="0.6" />
      <line x1={C} y1={C - R * 0.08} x2={C} y2={C + R * 0.08} stroke="white" strokeWidth="1" opacity="0.6" />

      {/* Ring score labels */}
      {rings.map((r, i) => (
        <text key={r} x={C + r * R + 4} y={C + 8} fill="#475569" fontSize="8">{ringLabels[i]}</text>
      ))}

      {/* Darts */}
      {darts.map((d, i) => (
        <motion.circle
          key={d.id}
          cx={tx(d.x)} cy={ty(d.y)}
          r="5"
          fill="#3bb4a4"
          stroke="#0f172a" strokeWidth="1"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.85 }}
          transition={{ delay: i * 0.02, type: "spring", stiffness: 400, damping: 25 }}
        />
      ))}

      {/* Centroid */}
      {darts.length > 0 && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <circle cx={tx(cx)} cy={ty(cy)} r="8"
            fill="none" stroke="#d4af37" strokeWidth="2" strokeDasharray="3,2" />
          <circle cx={tx(cx)} cy={ty(cy)} r="2" fill="#d4af37" />
        </motion.g>
      )}
    </svg>
  );
}

// ── Quadrant diagram ──────────────────────────────────────────────────────────
function QuadrantDiagram({ bias, variance }: { bias: number; variance: number }) {
  const highBias = bias > 0.5;
  const highVar = variance > 0.5;

  const quadrants = [
    { label: "Low Bias\nLow Variance", desc: "Accurate & consistent", pos: "top-left", color: "#3bb4a4", ideal: true },
    { label: "Low Bias\nHigh Variance", desc: "Accurate but inconsistent", pos: "top-right", color: "#d4af37", ideal: false },
    { label: "High Bias\nLow Variance", desc: "Consistent but wrong", pos: "bottom-left", color: "#f59e0b", ideal: false },
    { label: "High Bias\nHigh Variance", desc: "Worst of both worlds", pos: "bottom-right", color: "#ef4444", ideal: false },
  ];

  const activeIdx = (!highBias && !highVar) ? 0 : (!highBias && highVar) ? 1 : (highBias && !highVar) ? 2 : 3;

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {quadrants.map((q, i) => (
        <motion.div
          key={q.pos}
          animate={{ opacity: i === activeIdx ? 1 : 0.35, scale: i === activeIdx ? 1.02 : 1 }}
          className="rounded-xl border p-3"
          style={{ borderColor: i === activeIdx ? q.color : "#1e293b", background: i === activeIdx ? q.color + "10" : "#0f172a" }}
        >
          <p className="text-[11px] font-bold whitespace-pre-line leading-tight mb-1" style={{ color: q.color }}>
            {q.label}
          </p>
          <p className="text-[9px] text-[#475569] leading-tight">{q.desc}</p>
          {q.ideal && <span className="text-[8px] font-semibold text-[#3bb4a4]">← Ideal</span>}
        </motion.div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function BiasVarianceClient() {
  const { data: session } = useSession();
  const [bias, setBias] = useState(0.0);
  const [variance, setVariance] = useState(0.2);
  const [darts, setDarts] = useState<Dart[]>([]);
  const [autoThrow, setAutoThrow] = useState(false);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Progress
  const [dartSets, setDartSets] = useState(0);
  const [quadrantsExplored, setQuadrantsExplored] = useState<Set<string>>(new Set());
  const completionFired = useRef(false);
  const allComplete = dartSets >= 5 && quadrantsExplored.size >= 3;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "bias-variance", score: 6 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  const throwDarts = useCallback((count: number = 20) => {
    const newDarts = generateDarts(bias, variance, count);
    setDarts(newDarts);
    setDartSets(prev => prev + 1);
    const highBias = bias > 0.5, highVar = variance > 0.5;
    const key = `${highBias ? "H" : "L"}B${highVar ? "H" : "L"}V`;
    setQuadrantsExplored(prev => new Set([...prev, key]));
  }, [bias, variance]);

  useEffect(() => {
    throwDarts(20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (autoThrow) {
      autoRef.current = setInterval(() => throwDarts(20), 800);
    } else {
      if (autoRef.current) clearInterval(autoRef.current);
    }
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [autoThrow, throwDarts]);

  // The "variance" slider sets the per-axis standard deviation (sigma) of the
  // dart scatter. Darts land in 2D, so the expected squared distance from the
  // bullseye is bias^2 + 2*sigma^2.
  const biasSq = bias ** 2;
  const varianceContribution = 2 * variance ** 2;
  const expectedSqError = biasSq + varianceContribution;
  // Observed mean squared distance of the darts currently on the board
  const observedMSE =
    darts.length > 0
      ? darts.reduce((s, d) => s + d.x ** 2 + d.y ** 2, 0) / darts.length
      : 0;

  const progress = [
    { label: `Dart sets thrown: ${Math.min(dartSets, 5)}/5`, done: dartSets >= 5 },
    { label: `Quadrants explored: ${quadrantsExplored.size}/3`, done: quadrantsExplored.size >= 3 },
  ];

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Bias vs Variance</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">Statistics</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Bias vs Variance: <span className="text-[var(--color-accent)]">The Bullseye</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            Throw darts at a target while adjusting bias and variance. Watch how they
            trade off and understand why the ideal model is both accurate and consistent.
          </p>
        </section>

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

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* Controls */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-4">Dart Settings</p>

              {[
                { label: "Bias (systematic offset)", value: bias, min: 0, max: 1.2, step: 0.05, set: (v: number) => setBias(v), color: "#ef4444" },
                { label: "Spread σ (per-axis std. dev.)", value: variance, min: 0.05, max: 1.2, step: 0.05, set: (v: number) => setVariance(v), color: "#3bb4a4" },
              ].map(({ label, value, min, max, step, set, color }) => (
                <div key={label} className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px] text-white">{label}</span>
                    <span className="text-[11px] font-mono" style={{ color }}>{value.toFixed(2)}</span>
                  </div>
                  <input type="range" min={min} max={max} step={step} value={value}
                    onChange={e => set(Number(e.target.value))}
                    className="w-full" style={{ accentColor: color }} />
                </div>
              ))}

              <div className="rounded-lg border border-[#1e293b] p-3 mb-4">
                <div className="flex justify-between text-[11px] mb-1.5">
                  <span className="text-[#475569]">Expected sq. error (bias² + 2σ²)</span>
                  <span className="font-mono text-[#d4af37]">{expectedSqError.toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-[11px] mb-1.5">
                  <span className="text-[#475569]">Bias² component</span>
                  <span className="font-mono text-[#ef4444]">{biasSq.toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-[11px] mb-1.5">
                  <span className="text-[#475569]">Variance component (2σ², both axes)</span>
                  <span className="font-mono text-[#3bb4a4]">{varianceContribution.toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-[11px] pt-1.5 border-t border-[#1e293b]">
                  <span className="text-[#475569]">Observed on this board</span>
                  <span className="font-mono text-white">{observedMSE.toFixed(3)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <motion.button onClick={() => throwDarts(20)}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  className="flex-1 py-2 rounded-lg text-[12px] font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity">
                  Throw 20 darts
                </motion.button>
                <button
                  onClick={() => setAutoThrow(!autoThrow)}
                  className={`px-3 py-2 rounded-lg text-[12px] font-semibold border transition-colors ${
                    autoThrow ? "border-[#3bb4a4] text-[#3bb4a4] bg-[#3bb4a4]/10" : "border-[#1e293b] text-[#475569]"
                  }`}
                >
                  {autoThrow ? "Stop" : "Auto"}
                </button>
              </div>
            </div>

            {/* Quick presets */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">Quick Presets</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Ideal", bias: 0, variance: 0.15, color: "#3bb4a4" },
                  { label: "Overfit", bias: 0, variance: 0.9, color: "#d4af37" },
                  { label: "Underfit", bias: 1.0, variance: 0.15, color: "#f59e0b" },
                  { label: "Both bad", bias: 0.8, variance: 0.8, color: "#ef4444" },
                ].map(({ label, bias: pb, variance: pv, color }) => (
                  <button key={label}
                    onClick={() => { setBias(pb); setVariance(pv); }}
                    className="py-2 rounded-lg text-[11px] font-semibold border border-[#1e293b] hover:border-current transition-colors"
                    style={{ color }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Bullseye */}
              <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">Dart Board</p>
                <div className="aspect-square max-w-[280px] mx-auto">
                  <Bullseye darts={darts} bias={bias} variance={variance} />
                </div>
                <p className="text-[10px] text-[#94a3b8] leading-relaxed mt-3">
                  How to read this: each dart is one model trained on a different
                  random sample of data, and the bullseye is the true value it
                  should predict. Bias = how far the centroid (average model) sits
                  from the bullseye. Variance = how scattered the darts are around
                  their own centroid.
                </p>
                <div className="flex items-center gap-4 mt-3 justify-center">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#3bb4a4]" />
                    <span className="text-[10px] text-[#94a3b8]">Dart</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#d4af37]" />
                    <span className="text-[10px] text-[#94a3b8]">Centre (gold)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-[#d4af37]" />
                    <span className="text-[10px] text-[#94a3b8]">Centroid</span>
                  </div>
                </div>
              </div>

              {/* Quadrant */}
              <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">Current Regime</p>
                <QuadrantDiagram bias={bias} variance={variance} />
                <div className="mt-4 rounded-lg border border-[#1e293b] p-3">
                  <p className="text-[10px] text-[#475569] leading-relaxed">
                    The <strong className="text-white">bias-variance tradeoff</strong> means reducing one often increases the other.
                    Complex models have low bias but high variance; simple models the opposite.
                  </p>
                </div>
              </div>
            </div>

            {/* MSE decomposition visual */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">
                MSE = Bias² + Variance + Irreducible Noise
              </p>
              <div className="space-y-3">
                {[
                  { label: "Bias²", value: biasSq, max: 2.88, color: "#ef4444" },
                  { label: "Variance (2σ²)", value: varianceContribution, max: 2.88, color: "#3bb4a4" },
                  { label: "Irreducible noise (illustrative constant, not simulated on the board)", value: 0.05, max: 2.88, color: "#475569" },
                ].map(({ label, value, max, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span style={{ color }}>{label}</span>
                      <span className="font-mono text-white">{value.toFixed(3)}</span>
                    </div>
                    <div className="h-3 rounded-full bg-[#1e293b] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: color }}
                        animate={{ width: `${(value / max) * 100}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                  </div>
                ))}
                <div className="flex justify-between text-[11px] font-semibold pt-2 border-t border-[#1e293b]">
                  <span className="text-[#d4af37]">Total MSE</span>
                  <span className="font-mono text-[#d4af37]">{(expectedSqError + 0.05).toFixed(3)}</span>
                </div>
              </div>
            </div>

            {/* ML connection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { title: "High Bias (Underfitting)", body: "Model is too simple. Misses patterns in training data. High training AND test error.", color: "#f59e0b" },
                { title: "High Variance (Overfitting)", body: "Model memorizes training data. Works perfectly on training but fails on new data.", color: "#a855f7" },
                { title: "Sweet Spot", body: "Regularization, cross-validation, and the right model complexity minimize total error.", color: "#3bb4a4" },
              ].map(({ title, body, color }) => (
                <div key={title} className="rounded-xl border border-[#1e293b] p-4">
                  <p className="text-[11px] font-semibold mb-2" style={{ color }}>{title}</p>
                  <p className="text-[11px] text-[#94a3b8] leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link href="/visual-guides/regression-to-mean"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
            ← Previous Guide
          </Link>
          <Link href="/visual-guides/what-is-ml"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
            Next Guide →
          </Link>
        </div>

        <GuideCompletion isComplete={allComplete} guideSlug="bias-variance" score={6} />
      </div>
    </div>
  );
}
