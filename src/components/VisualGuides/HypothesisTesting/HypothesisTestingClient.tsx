"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  generateGroup, computePValue, runSimulation, runNullSimulation,
  computeHistogram, GroupConfig,
} from "./types";

// ── P-value histogram ─────────────────────────────────────────────────────────
function PValueHistogram({
  pValues, alpha, title, color,
}: { pValues: number[]; alpha: number; title: string; color: string }) {
  if (pValues.length === 0) return null;
  const bins = computeHistogram(pValues, 20);
  const maxCount = Math.max(...bins.map(b => b.count), 1);
  const W = 400, H = 160, PAD = { l: 30, r: 8, t: 8, b: 24 };
  const IW = W - PAD.l - PAD.r, IH = H - PAD.t - PAD.b;

  const rejected = pValues.filter(p => p < alpha).length;
  const rate = ((rejected / pValues.length) * 100).toFixed(1);

  return (
    <div className="rounded-xl border border-[#1e293b] p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-white">{title}</p>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md" style={{ background: color + "20", color }}>
          {rate}% rejected
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%">
        <line x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />

        {/* Alpha cutoff */}
        {(() => {
          const ax = PAD.l + alpha * IW;
          return (
            <g>
              <line x1={ax} y1={PAD.t} x2={ax} y2={PAD.t + IH} stroke="#d4af37" strokeWidth="1" strokeDasharray="3,2" />
              <text x={ax + 2} y={PAD.t + 8} fill="#d4af37" fontSize="7">α={alpha}</text>
            </g>
          );
        })()}

        {bins.map((b, i) => {
          const bw = IW / bins.length - 1;
          const bh = (b.count / maxCount) * IH;
          const bx = PAD.l + (i / bins.length) * IW;
          const inRejection = b.x < alpha;
          return (
            <motion.rect
              key={i}
              x={bx} width={bw}
              animate={{ height: bh, y: PAD.t + IH - bh }}
              transition={{ duration: 0.4 }}
              fill={inRejection ? color : "#334155"}
              opacity="0.85" rx="1"
            />
          );
        })}

        {[0, 0.25, 0.5, 0.75, 1.0].map(t => (
          <text key={t} x={PAD.l + t * IW} y={PAD.t + IH + 12} textAnchor="middle" fill="#475569" fontSize="7">
            {t.toFixed(2)}
          </text>
        ))}
        <text x={PAD.l + IW / 2} y={H - 2} textAnchor="middle" fill="#475569" fontSize="7">p-value</text>
      </svg>
    </div>
  );
}

// ── Dot plot for one experiment ───────────────────────────────────────────────
function GroupDots({ ctrl, treat }: { ctrl: number[]; treat: number[] }) {
  const all = [...ctrl, ...treat];
  const mn = Math.min(...all), mx = Math.max(...all);
  const W = 400, H = 90, PAD = 32;
  const tx = (v: number) => PAD + ((v - mn) / (mx - mn || 1)) * (W - 2 * PAD);

  function jitter(i: number) { return (((i * 1234567) % 7) - 3) * 2; }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="#1e293b" strokeWidth="1" />
      {ctrl.map((v, i) => (
        <motion.circle key={`c${i}`} cx={tx(v)} cy={H / 2 - 12 + jitter(i)}
          r="3" fill="#3bb4a4" opacity="0.6"
          initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ delay: i * 0.01 }} />
      ))}
      {treat.map((v, i) => (
        <motion.circle key={`t${i}`} cx={tx(v)} cy={H / 2 + 12 + jitter(i + 1000)}
          r="3" fill="#d4af37" opacity="0.6"
          initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ delay: i * 0.01 }} />
      ))}
      {/* means */}
      <line x1={tx(ctrl.reduce((a,b)=>a+b,0)/ctrl.length)} y1={H/2-20}
        x2={tx(ctrl.reduce((a,b)=>a+b,0)/ctrl.length)} y2={H/2-4}
        stroke="#3bb4a4" strokeWidth="2" />
      <line x1={tx(treat.reduce((a,b)=>a+b,0)/treat.length)} y1={H/2+4}
        x2={tx(treat.reduce((a,b)=>a+b,0)/treat.length)} y2={H/2+20}
        stroke="#d4af37" strokeWidth="2" />
      <text x={PAD - 4} y={H/2 - 10} textAnchor="end" fill="#3bb4a4" fontSize="7">Control</text>
      <text x={PAD - 4} y={H/2 + 14} textAnchor="end" fill="#d4af37" fontSize="7">Treatment</text>
    </svg>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HypothesisTestingClient() {
  const { data: session } = useSession();

  // Experiment config
  const [alpha, setAlpha] = useState(0.05);
  const [n, setN] = useState(30);
  const [effectSize, setEffectSize] = useState(0.5);   // 0 = no effect
  const [std, setStd] = useState(1.0);

  // Live experiment
  const [ctrl, setCtrl] = useState<number[]>([]);
  const [treat, setTreat] = useState<number[]>([]);
  const [pValue, setPValue] = useState<number | null>(null);

  // Simulation
  const [simMode, setSimMode] = useState<"alternative" | "null">("alternative");
  const [simResults, setSimResults] = useState<{ pValue: number; rejected: boolean }[]>([]);
  const [nullResults, setNullResults] = useState<{ pValue: number; rejected: boolean }[]>([]);
  const [running, setRunning] = useState(false);

  // Progress
  const [experimentsRun, setExperimentsRun] = useState(0);
  const [simsRun, setSimsRun] = useState(0);
  const completionFired = useRef(false);

  const allComplete = experimentsRun >= 5 && simsRun >= 200;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "hypothesis-testing", score: 8 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  const runExperiment = useCallback(() => {
    const controlCfg: GroupConfig = { n, mean: 0, std };
    const treatCfg: GroupConfig = { n, mean: effectSize * std, std };
    const c = generateGroup(controlCfg);
    const t = generateGroup(treatCfg);
    setCtrl(c);
    setTreat(t);
    setPValue(computePValue(c, t));
    setExperimentsRun(prev => prev + 1);
  }, [n, effectSize, std]);

  const runSims = useCallback((count: number) => {
    if (running) return;
    setRunning(true);
    const controlCfg: GroupConfig = { n, mean: 0, std };
    const treatCfg: GroupConfig = { n, mean: effectSize * std, std };

    const results = runSimulation(controlCfg, treatCfg, alpha, count);
    const nullRes = runNullSimulation(n, std, alpha, count);

    setSimResults(prev => [...prev, ...results].slice(-1000));
    setNullResults(prev => [...prev, ...nullRes].slice(-1000));
    setSimsRun(prev => prev + count);
    setRunning(false);
  }, [running, n, effectSize, std, alpha]);

  const reset = () => {
    setSimResults([]);
    setNullResults([]);
    setCtrl([]);
    setTreat([]);
    setPValue(null);
    setSimsRun(0);
  };

  const progress = [
    { label: `Experiments run: ${experimentsRun}/5`, done: experimentsRun >= 5 },
    { label: `Simulations run: ${simsRun}/200`, done: simsRun >= 200 },
  ];

  const power = simResults.length > 0
    ? ((simResults.filter(r => r.rejected).length / simResults.length) * 100).toFixed(1)
    : "—";
  const typeI = nullResults.length > 0
    ? ((nullResults.filter(r => r.rejected).length / nullResults.length) * 100).toFixed(1)
    : "—";

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Hypothesis Testing</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">Statistics</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Hypothesis Testing: <span className="text-[var(--color-accent)]">A Visual Experiment</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            Design an A/B experiment, run it once, then simulate 1000 replications. See statistical power,
            Type I error, and the meaning of α play out visually.
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

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Controls */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-4">Experiment Design</p>

              {[
                { label: "Sample size (n)", value: n, min: 10, max: 200, step: 5, set: setN, fmt: (v: number) => String(v) },
                { label: "Effect size (Cohen's d)", value: effectSize, min: 0, max: 2, step: 0.05, set: setEffectSize, fmt: (v: number) => v.toFixed(2) },
                { label: "Std deviation (σ)", value: std, min: 0.5, max: 3, step: 0.1, set: setStd, fmt: (v: number) => v.toFixed(1) },
                { label: "Significance level (α)", value: alpha, min: 0.01, max: 0.20, step: 0.01, set: setAlpha, fmt: (v: number) => v.toFixed(2) },
              ].map(({ label, value, min, max, step, set, fmt }) => (
                <div key={label} className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px] text-white">{label}</span>
                    <span className="text-[11px] font-mono text-[#d4af37]">{fmt(value)}</span>
                  </div>
                  <input type="range" min={min} max={max} step={step} value={value}
                    onChange={e => set(Number(e.target.value))}
                    className="w-full" style={{ accentColor: "#d4af37" }} />
                </div>
              ))}

              <div className="mt-1 rounded-lg border border-[#1e293b] p-3 text-[11px] text-[#94a3b8] space-y-1">
                <div className="flex justify-between">
                  <span>H₀: μ₁ = μ₂ (no effect)</span>
                </div>
                <div className="flex justify-between">
                  <span>H₁: μ₁ ≠ μ₂ (two-tailed)</span>
                </div>
                <div className="flex justify-between">
                  <span>True diff:</span>
                  <span className="font-mono text-white">{(effectSize * std).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Summary stats */}
            {simResults.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">Simulation Results</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Statistical Power", value: power + "%", color: "#3bb4a4", desc: "True H₁ rejected" },
                    { label: "Type I Error Rate", value: typeI + "%", color: "#ef4444", desc: "False positive rate" },
                    { label: "Replications", value: simResults.length.toLocaleString(), color: "#d4af37", desc: "under H₁" },
                    { label: "α (target)", value: (alpha * 100).toFixed(0) + "%", color: "#94a3b8", desc: "significance level" },
                  ].map(({ label, value, color, desc }) => (
                    <div key={label} className="rounded-lg border border-[#1e293b] p-3">
                      <p className="text-[8px] text-[#475569] mb-0.5">{label}</p>
                      <p className="text-[16px] font-bold font-mono" style={{ color }}>{value}</p>
                      <p className="text-[8px] text-[#334155]">{desc}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right panel */}
          <div className="space-y-5">
            {/* Single experiment */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">Single Experiment</p>
                <motion.button
                  onClick={runExperiment}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="px-4 py-1.5 rounded-lg text-[12px] font-semibold text-[#0a0e1a] bg-[#d4af37] hover:opacity-90 transition-opacity"
                >
                  Run Experiment
                </motion.button>
              </div>

              <AnimatePresence>
                {ctrl.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <GroupDots ctrl={ctrl} treat={treat} />
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#3bb4a4]" />
                        <span className="text-[11px] text-[#94a3b8]">Control (n={n})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#d4af37]" />
                        <span className="text-[11px] text-[#94a3b8]">Treatment (n={n})</span>
                      </div>
                      {pValue !== null && (
                        <div className={`ml-auto px-3 py-1 rounded-lg text-[12px] font-bold border ${
                          pValue < alpha
                            ? "border-[#3bb4a4]/40 bg-[#3bb4a4]/10 text-[#3bb4a4]"
                            : "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#ef4444]"
                        }`}>
                          p = {pValue.toFixed(4)} → {pValue < alpha ? "Reject H₀" : "Fail to reject H₀"}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
                {ctrl.length === 0 && (
                  <div className="text-center py-10 text-[#334155] text-[13px]">
                    Click "Run Experiment" to draw samples
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Simulation */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">Monte Carlo Simulation</p>
                <div className="flex items-center gap-2">
                  {simResults.length > 0 && (
                    <button onClick={reset} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-[#1e293b] text-[#94a3b8] hover:text-white transition-colors">
                      Reset
                    </button>
                  )}
                  {[100, 500].map(cnt => (
                    <motion.button key={cnt}
                      onClick={() => runSims(cnt)}
                      disabled={running}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#1e293b] text-white hover:bg-[#334155] transition-colors disabled:opacity-50"
                    >
                      +{cnt} runs
                    </motion.button>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-[#475569] mb-4">
                Each run draws new samples and tests H₀. Red bars = p &lt; α (rejected).
                Run both scenarios to compare power vs Type I error.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PValueHistogram
                  pValues={simResults.map(r => r.pValue)}
                  alpha={alpha}
                  title="Under H₁ (effect exists)"
                  color="#3bb4a4"
                />
                <PValueHistogram
                  pValues={nullResults.map(r => r.pValue)}
                  alpha={alpha}
                  title="Under H₀ (no effect)"
                  color="#ef4444"
                />
              </div>

              {simResults.length === 0 && (
                <div className="text-center py-8 text-[#334155] text-[13px]">
                  Click "+100 runs" to simulate repeated experiments
                </div>
              )}
            </div>

            {/* Insight cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  title: "Statistical Power",
                  body: "Probability of correctly rejecting a false H₀. Higher effect size, larger n → more power.",
                  color: "#3bb4a4",
                },
                {
                  title: "Type I Error (α)",
                  body: "False positive rate. Under H₀, p-values are uniform — exactly α% will be below the threshold.",
                  color: "#ef4444",
                },
                {
                  title: "Type II Error (β)",
                  body: "False negative rate = 1 − Power. Missed real effects due to too few observations.",
                  color: "#d4af37",
                },
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
          <Link href="/visual-guides/probability-distributions"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
            ← Previous Guide
          </Link>
          <Link href="/visual-guides/regression-to-mean"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
            Next Guide →
          </Link>
        </div>
      </div>
    </div>
  );
}
