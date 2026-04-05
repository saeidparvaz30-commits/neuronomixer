"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  TestType, generateGroups, computeTStat, computePValue,
  mean, runPermutation, gaussRand,
} from "./types";
import DistributionCurve from "./DistributionCurve";

// ── Mini scatter for two groups ──────────────────────────────────────────────
const GW = 240, GH = 180, GPAD = { l: 28, r: 8, t: 8, b: 28 };
const GIW = GW - GPAD.l - GPAD.r;
const GIH = GH - GPAD.t - GPAD.b;

function GroupScatter({ values, color, label }: { values: number[]; color: string; label: string }) {
  if (values.length === 0) return (
    <div className="flex items-center justify-center" style={{ width: GW, height: GH }}>
      <p className="text-[10px] text-[#475569]">No data yet</p>
    </div>
  );
  const minV = Math.min(...values) - 5, maxV = Math.max(...values) + 5;
  const range = maxV - minV || 1;
  const ty = (v: number) => GPAD.t + (1 - (v - minV) / range) * GIH;
  const meanV = mean(values);
  // jitter X
  const jitters = values.map((_, i) => Math.sin(i * 7.3 + 1.2) * 14);

  return (
    <svg viewBox={`0 0 ${GW} ${GH}`} width={GW} height={GH}>
      <line x1={GPAD.l} y1={GPAD.t} x2={GPAD.l} y2={GPAD.t + GIH} stroke="#334155" strokeWidth="1" />
      <line x1={GPAD.l} y1={GPAD.t + GIH} x2={GW - GPAD.r} y2={GPAD.t + GIH} stroke="#334155" strokeWidth="1" />
      {values.map((v, i) => (
        <circle key={i}
          cx={GPAD.l + GIW / 2 + jitters[i]}
          cy={ty(v)} r={3.5}
          fill={color} opacity="0.75"
        />
      ))}
      {/* Mean line */}
      <line
        x1={GPAD.l + 4} y1={ty(meanV)}
        x2={GW - GPAD.r - 4} y2={ty(meanV)}
        stroke="#d4af37" strokeWidth="2"
      />
      <text x={GW - GPAD.r} y={ty(meanV) - 3} textAnchor="end" fill="#d4af37" fontSize="8" fontWeight="600">
        {meanV.toFixed(1)}
      </text>
      <text x={GPAD.l + GIW / 2} y={GPAD.t + GIH + 14} textAnchor="middle" fill="white" fontSize="10" fontWeight="600">
        {label}
      </text>
    </svg>
  );
}

// ── Permutation histogram ────────────────────────────────────────────────────
function PermHistogram({ permStats, observedT }: { permStats: number[]; observedT: number | null }) {
  if (permStats.length === 0) return null;
  const BINS = 20, PW = 400, PH = 120, PP = { l: 24, r: 12, t: 8, b: 24 };
  const vals = permStats;
  const min = Math.min(...vals), max = Math.max(...vals);
  const width = (max - min) / BINS || 1;
  const counts = Array.from({ length: BINS }, (_, i) => {
    const lo = min + i * width, hi = lo + width;
    return vals.filter(v => v >= lo && (i === BINS - 1 ? v <= hi : v < hi)).length;
  });
  const maxC = Math.max(...counts, 1);
  const IW = PW - PP.l - PP.r, IH = PH - PP.t - PP.b;
  const tx = (v: number) => PP.l + ((v - min) / (max - min || 1)) * IW;

  return (
    <svg viewBox={`0 0 ${PW} ${PH}`} width="100%">
      <line x1={PP.l} y1={PP.t + IH} x2={PW - PP.r} y2={PP.t + IH} stroke="#334155" strokeWidth="1" />
      {counts.map((c, i) => {
        const x = PP.l + (i / BINS) * IW;
        const bw = IW / BINS - 0.5;
        const bh = (c / maxC) * IH;
        return <rect key={i} x={x} y={PP.t + IH - bh} width={bw} height={bh} fill="#3bb4a4" opacity="0.65" />;
      })}
      {observedT !== null && (
        <>
          <line
            x1={tx(observedT)} y1={PP.t}
            x2={tx(observedT)} y2={PP.t + IH}
            stroke="#d4af37" strokeWidth="2"
          />
          <line
            x1={tx(-Math.abs(observedT))} y1={PP.t}
            x2={tx(-Math.abs(observedT))} y2={PP.t + IH}
            stroke="#d4af37" strokeWidth="2" strokeDasharray="3 2"
          />
        </>
      )}
    </svg>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function PValuesClient() {
  const { data: session } = useSession();

  const [effectSize, setEffectSize] = useState(0.5);
  const [sampleSize, setSampleSize] = useState(30);
  const [alpha, setAlpha] = useState(0.05);
  const [testType, setTestType] = useState<TestType>("two-tailed");

  const [groupA, setGroupA] = useState<number[]>([]);
  const [groupB, setGroupB] = useState<number[]>([]);
  const [tStat, setTStat] = useState<number | null>(null);
  const [pValue, setPValue] = useState<number | null>(null);
  const [hasResult, setHasResult] = useState(false);

  const [permStats, setPermStats] = useState<number[]>([]);
  const [permCount, setPermCount] = useState(0);
  const [isPermRunning, setIsPermRunning] = useState(false);

  const [experimentsRun, setExperimentsRun] = useState(0);
  const completionFired = useRef(false);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allComplete = experimentsRun >= 10 && permCount >= 100;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "p-values", score: 8 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  function runExperiment() {
    const [a, b] = generateGroups(effectSize, sampleSize);
    const df = 2 * sampleSize - 2;
    const t = computeTStat(a, b);
    const p = computePValue(t, df, testType);
    setGroupA(a);
    setGroupB(b);
    setTStat(t);
    setPValue(p);
    setHasResult(true);
    setPermStats([]);
    setPermCount(0);
    setExperimentsRun(prev => prev + 1);
  }

  function shuffleData(n: number) {
    if (groupA.length === 0) return;
    setIsPermRunning(true);
    let done = 0;
    const newStats: number[] = [];

    function tick() {
      const batch = Math.min(20, n - done);
      for (let i = 0; i < batch; i++) {
        newStats.push(runPermutation(groupA, groupB));
      }
      done += batch;
      setPermStats(prev => [...prev, ...newStats.splice(0)]);
      setPermCount(prev => prev + batch);
      if (done < n) {
        animRef.current = setTimeout(tick, 50);
      } else {
        setIsPermRunning(false);
      }
    }
    tick();
  }

  const df = 2 * sampleSize - 2;
  const sigPermutations = tStat !== null
    ? permStats.filter(s => Math.abs(s) >= Math.abs(tStat)).length
    : 0;
  const permPct = permStats.length > 0 ? (sigPermutations / permStats.length * 100).toFixed(1) : null;
  const isSignificant = pValue !== null && pValue < alpha;

  const progress = [
    { label: `Experiments run: ${experimentsRun}/10`, done: experimentsRun >= 10 },
    { label: `Permutations: ${permCount}/100`, done: permCount >= 100 },
  ];

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">P-Values Demystified</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">Statistics</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            P-Values <span className="text-[var(--color-accent)]">Demystified</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[620px]">
            Run a simulated experiment with two groups. Watch the p-value shift as you change effect size and sample size.
            Run permutation tests to see how often random chance produces your result.
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

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

          {/* Left: controls + scatter */}
          <div className="space-y-4">
            {/* Controls */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-4">Experiment Design</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                {[
                  { label: "Effect Size", val: effectSize, min: 0, max: 2, step: 0.1, set: setEffectSize, note: "Difference between groups" },
                  { label: "Sample Size (n)", val: sampleSize, min: 10, max: 200, step: 10, set: setSampleSize, note: "Per group" },
                  { label: "Alpha (α)", val: alpha, min: 0.01, max: 0.20, step: 0.01, set: setAlpha, note: "Significance threshold" },
                ].map(({ label, val, min, max, step, set, note }) => (
                  <div key={label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[11px] text-white font-medium">{label}</span>
                      <span className="text-[11px] font-mono text-[#d4af37]">{val}</span>
                    </div>
                    <input type="range" min={min} max={max} step={step} value={val}
                      onChange={e => set(Number(e.target.value))}
                      className="w-full" style={{ accentColor: "#d4af37" }} />
                    <p className="text-[9px] text-[#334155] mt-0.5">{note}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 items-center flex-wrap">
                <button onClick={runExperiment}
                  className="px-5 py-2.5 rounded-xl text-[12px] font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity">
                  Run Experiment
                </button>
                {/* Test type toggle */}
                <div className="flex gap-1.5">
                  {(["two-tailed", "one-tailed"] as TestType[]).map(t => (
                    <button key={t} onClick={() => setTestType(t)}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-colors"
                      style={{
                        borderColor: testType === t ? "#3bb4a4" : "#1e293b",
                        color: testType === t ? "#3bb4a4" : "#475569",
                        background: testType === t ? "#3bb4a420" : "transparent",
                      }}>
                      {t === "two-tailed" ? "Two-tailed" : "One-tailed"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Data scatter */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">Group Data</p>
              <div className="flex gap-4 items-start justify-center flex-wrap">
                <GroupScatter values={groupA} color="#3bb4a4" label="Group A" />
                <div className="flex flex-col items-center justify-center gap-1 py-8">
                  {hasResult && tStat !== null && pValue !== null && (
                    <>
                      <p className="text-[11px] text-[#475569]">Δ = {(mean(groupB) - mean(groupA)).toFixed(1)}</p>
                      <p className="text-[10px] text-[#475569]">t = {tStat.toFixed(3)}</p>
                      <p className="text-[14px] font-black"
                        style={{ color: isSignificant ? "#3bb4a4" : "#ef4444" }}>
                        p = {pValue < 0.001 ? "<0.001" : pValue.toFixed(3)}
                      </p>
                      <p className="text-[10px] font-semibold"
                        style={{ color: isSignificant ? "#3bb4a4" : "#ef4444" }}>
                        {isSignificant ? "✓ Significant" : "✗ Not significant"}
                      </p>
                    </>
                  )}
                  {!hasResult && <p className="text-[10px] text-[#334155]">Run experiment</p>}
                </div>
                <GroupScatter values={groupB} color="#1e5d8a" label="Group B" />
              </div>
            </div>
          </div>

          {/* Right: distribution + permutation */}
          <div className="space-y-4">
            {/* Distribution curve */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[12px] font-bold text-white mb-1">Null Hypothesis Distribution</p>
              <p className="text-[10px] text-[#475569] mb-3">
                {hasResult && pValue !== null
                  ? `You would observe this result by chance ${(pValue * 100).toFixed(1)}% of the time.`
                  : "Run an experiment to see results."}
              </p>
              <DistributionCurve
                df={df} tStat={tStat} alpha={alpha}
                testType={testType} hasResult={hasResult}
              />
            </div>

            {/* Permutation testing */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[12px] font-bold text-white mb-1">Permutation Test</p>
              <p className="text-[10px] text-[#475569] mb-3">
                How often does random chance produce a result this extreme?
              </p>
              <div className="flex gap-2 mb-3 flex-wrap">
                {[100, 1000].map(n => (
                  <button key={n} onClick={() => shuffleData(n)}
                    disabled={isPermRunning || !hasResult}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors disabled:opacity-30">
                    Shuffle {n}×
                  </button>
                ))}
              </div>

              {permCount > 0 && tStat !== null && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#94a3b8]">Extreme permutations</span>
                    <span className="text-[13px] font-black" style={{ color: permPct && parseFloat(permPct) < alpha * 100 ? "#d4af37" : "#ef4444" }}>
                      {sigPermutations} / {permCount} ({permPct}%)
                    </span>
                  </div>
                  {pValue !== null && (
                    <p className="text-[10px] text-[#475569] leading-relaxed">
                      Permutation p ≈ {permPct}% | Theoretical p = {(pValue * 100).toFixed(1)}%
                      {" "}— they should be close!
                    </p>
                  )}
                  <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#475569] mt-2">
                    Permutation t-statistics
                  </p>
                  <PermHistogram permStats={permStats} observedT={tStat} />
                </div>
              )}

              {!hasResult && (
                <p className="text-[11px] text-[#334155]">Run an experiment first.</p>
              )}
            </div>

            {/* Metrics */}
            {hasResult && tStat !== null && pValue !== null && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 space-y-2">
                {[
                  ["Sample size (each group)", String(sampleSize)],
                  ["Group A mean", mean(groupA).toFixed(2)],
                  ["Group B mean", mean(groupB).toFixed(2)],
                  ["Difference", (mean(groupB) - mean(groupA)).toFixed(2)],
                  ["t-statistic", tStat.toFixed(4)],
                  ["Degrees of freedom", String(df)],
                  ["p-value", pValue < 0.001 ? "<0.001" : pValue.toFixed(4)],
                  ["Significant at α=" + alpha, isSignificant ? "YES" : "NO"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center">
                    <span className="text-[10px] text-[#475569]">{k}</span>
                    <span className="text-[11px] font-mono font-semibold text-white">{v}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link href="/visual-guides/central-limit-theorem"
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
