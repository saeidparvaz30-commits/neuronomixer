"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  SCENARIOS,
  FITTED_MODELS,
  type ScenarioId,
  poissonMean,
  linearMean,
  poissonPMF,
  computeOverdispersion,
} from "./types";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Colour palette ────────────────────────────────────────────────────────────
const COL_GOLD   = "#d4af37";
const COL_BLUE   = "#1e5d8a";
const COL_TEAL   = "#3bb4a4";
const COL_RED    = "#ef4444";
const COL_PURPLE = "#8b5cf6";
const COL_MUTED  = "#94a3b8";

// ── SVG canvas helpers ────────────────────────────────────────────────────────
const W = 520, H = 300;
const PAD = { l: 52, r: 16, t: 16, b: 44 };
const IW = W - PAD.l - PAD.r;
const IH = H - PAD.t - PAD.b;

function ScatterWithModels({ scenarioId, showModel }: { scenarioId: ScenarioId; showModel: "linear" | "poisson" | "negbinom" | "all" }) {
  const scenario = SCENARIOS[scenarioId];
  const fit = FITTED_MODELS[scenarioId];
  const data = scenario.data;

  const xMin = Math.min(...data.map(d => d.x));
  const xMax = Math.max(...data.map(d => d.x));
  const yMin = 0;
  const yMax = Math.max(...data.map(d => d.count)) * 1.15;

  function px(x: number) { return PAD.l + ((x - xMin) / (xMax - xMin)) * IW; }
  function py(y: number) { return PAD.t + IH - ((y - yMin) / (yMax - yMin)) * IH; }

  // Curve paths (100 samples)
  const xs = Array.from({ length: 100 }, (_, i) => xMin + (i / 99) * (xMax - xMin));

  function linPath() {
    const pts = xs.map((x, i) => {
      const y = Math.max(0, linearMean(x, fit.simpleLinear.slope, fit.simpleLinear.intercept));
      return `${i === 0 ? "M" : "L"} ${px(x).toFixed(1)} ${py(y).toFixed(1)}`;
    });
    return pts.join(" ");
  }

  function poissonPath() {
    const pts = xs.map((x, i) => {
      const y = poissonMean(x, fit.poisson);
      return `${i === 0 ? "M" : "L"} ${px(x).toFixed(1)} ${py(y).toFixed(1)}`;
    });
    return pts.join(" ");
  }

  function nbPath() {
    const pts = xs.map((x, i) => {
      const y = poissonMean(x, fit.negativeBinomial);
      return `${i === 0 ? "M" : "L"} ${px(x).toFixed(1)} ${py(y).toFixed(1)}`;
    });
    return pts.join(" ");
  }

  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((yMax / 4) * i));
  const xTicks = Array.from({ length: 5 }, (_, i) => Math.round(xMin + ((xMax - xMin) / 4) * i));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[520px]">
      {/* Grid lines */}
      {yTicks.map(v => (
        <line key={v} x1={PAD.l} x2={W - PAD.r} y1={py(v)} y2={py(v)} stroke="#1e293b" strokeWidth={1} />
      ))}

      {/* Data points */}
      {data.map(d => (
        <circle key={d.id} cx={px(d.x)} cy={py(d.count)} r={3.5} fill={COL_TEAL} fillOpacity={0.75} stroke="#0f172a" strokeWidth={0.5} />
      ))}

      {/* Linear regression curve */}
      {(showModel === "linear" || showModel === "all") && (
        <motion.path
          d={linPath()}
          stroke={COL_RED}
          strokeWidth={2}
          fill="none"
          strokeDasharray="6 3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7 }}
        />
      )}

      {/* Poisson GLM curve */}
      {(showModel === "poisson" || showModel === "all") && (
        <motion.path
          d={poissonPath()}
          stroke={COL_GOLD}
          strokeWidth={2.5}
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        />
      )}

      {/* Negative binomial curve */}
      {(showModel === "negbinom" || showModel === "all") && (
        <motion.path
          d={nbPath()}
          stroke={COL_PURPLE}
          strokeWidth={2}
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        />
      )}

      {/* Y axis */}
      <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} stroke="#334155" strokeWidth={1} />
      {yTicks.map(v => (
        <g key={v}>
          <line x1={PAD.l - 4} x2={PAD.l} y1={py(v)} y2={py(v)} stroke="#475569" strokeWidth={1} />
          <text x={PAD.l - 6} y={py(v) + 4} textAnchor="end" fontSize="9" fill={COL_MUTED}>{v}</text>
        </g>
      ))}

      {/* X axis */}
      <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="#334155" strokeWidth={1} />
      {xTicks.map(v => (
        <g key={v}>
          <line x1={px(v)} x2={px(v)} y1={H - PAD.b} y2={H - PAD.b + 4} stroke="#475569" strokeWidth={1} />
          <text x={px(v)} y={H - PAD.b + 14} textAnchor="middle" fontSize="9" fill={COL_MUTED}>{v}</text>
        </g>
      ))}

      {/* Axis labels */}
      <text x={PAD.l + IW / 2} y={H - 4} textAnchor="middle" fontSize="10" fill={COL_MUTED}>{scenario.xLabel}</text>
      <text x={12} y={PAD.t + IH / 2} textAnchor="middle" fontSize="10" fill={COL_MUTED} transform={`rotate(-90, 12, ${PAD.t + IH / 2})`}>{scenario.countLabel}</text>
    </svg>
  );
}

// ── PMF bar chart ─────────────────────────────────────────────────────────────
function PoissonPMFChart({ lambda }: { lambda: number }) {
  const kMax = Math.min(Math.round(lambda * 3) + 5, 40);
  const probs = Array.from({ length: kMax + 1 }, (_, k) => ({ k, p: poissonPMF(k, lambda) }));
  const maxP = Math.max(...probs.map(d => d.p), 0.01);

  const bW = 560;
  const bH = 180;
  const barW = Math.max(6, Math.floor((bW - 40) / probs.length) - 2);

  return (
    <svg viewBox={`0 0 ${bW} ${bH}`} className="w-full max-w-[560px]">
      {probs.map(({ k, p }) => {
        const barH = Math.max(1, (p / maxP) * (bH - 48));
        const x = 24 + k * (barW + 2);
        const y = bH - 28 - barH;
        const isMode = p === maxP;
        return (
          <g key={k}>
            <motion.rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={2}
              fill={isMode ? COL_GOLD : COL_BLUE}
              fillOpacity={isMode ? 1 : 0.75}
              initial={{ height: 0, y: bH - 28 }}
              animate={{ height: barH, y }}
              transition={{ duration: 0.4, delay: k * 0.015 }}
            />
            {barW >= 10 && (
              <text x={x + barW / 2} y={bH - 14} textAnchor="middle" fontSize="8" fill={COL_MUTED}>{k}</text>
            )}
          </g>
        );
      })}
      <line x1={24} x2={bW - 16} y1={bH - 28} y2={bH - 28} stroke="#334155" strokeWidth={1} />
      <text x={bW / 2} y={bH - 2} textAnchor="middle" fontSize="10" fill={COL_MUTED}>k (count)</text>
      <text x={10} y={bH / 2} textAnchor="middle" fontSize="10" fill={COL_MUTED} transform={`rotate(-90, 10, ${bH / 2})`}>P(Y=k)</text>
    </svg>
  );
}

// ── Metric badge ──────────────────────────────────────────────────────────────
function MetricBadge({ label, value, best, fmt }: { label: string; value: number; best: boolean; fmt?: (v: number) => string }) {
  const display = fmt ? fmt(value) : value.toFixed(1);
  return (
    <div className={`rounded-lg px-3 py-2 border text-center ${best ? "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10" : "border-white/5 bg-white/[0.02]"}`}>
      <div className={`text-xs font-mono font-semibold ${best ? "text-[var(--color-accent)]" : "text-gray-300"}`}>{display}</div>
      <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
      {best && <div className="text-[9px] text-[var(--color-accent)] mt-0.5 font-semibold">best fit</div>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CountModelsPoissonClient() {
  const [scenario, setScenario] = useState<ScenarioId>("complaints");
  const [showModel, setShowModel] = useState<"linear" | "poisson" | "negbinom" | "all">("all");
  const [lambda, setLambda] = useState(8);

  // Completion gates: genuine engagement with the three interactive controls
  const [scenariosExplored, setScenariosExplored] = useState<Set<ScenarioId>>(
    () => new Set<ScenarioId>(["complaints"])
  );
  const [modelViewChanged, setModelViewChanged] = useState(false);
  const [lambdaAdjusted, setLambdaAdjusted] = useState(false);
  const isComplete =
    scenariosExplored.size >= 2 && modelViewChanged && lambdaAdjusted;

  const sc = SCENARIOS[scenario];
  const fit = FITTED_MODELS[scenario];
  const overdispersion = useMemo(() => computeOverdispersion(scenario), [scenario]);

  const scenarios: { id: ScenarioId; label: string; emoji: string }[] = [
    { id: "complaints", label: "Customer Complaints", emoji: "🛒" },
    { id: "accidents",  label: "Traffic Accidents",   emoji: "🚗" },
    { id: "website",    label: "Website Visits",      emoji: "📊" },
  ];

  const models = [
    { key: "linear",   label: "Linear OLS",         color: COL_RED,    aic: fit.simpleLinear.rSquared, showAIC: false },
    { key: "poisson",  label: "Poisson GLM",         color: COL_GOLD,   aic: fit.poisson.aic,           showAIC: true  },
    { key: "negbinom", label: "Negative Binomial",   color: COL_PURPLE, aic: fit.negativeBinomial.aic,  showAIC: true  },
  ] as const;

  const bestAIC = Math.min(fit.poisson.aic, fit.negativeBinomial.aic);

  return (
    <div className="space-y-10 text-white">
      <GuideCompletion
        isComplete={isComplete}
        guideSlug="count-models-poisson"
        score={100}
      />

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)] mb-2 block">
          Generalized Linear Models
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Count Models: Poisson &amp; Negative Binomial
        </h1>
        <p className="text-[var(--color-text-muted)] text-base max-w-2xl">
          Linear regression predicts real numbers, but counts can&apos;t be negative or fractional.
          GLMs with a <strong className="text-white">log link</strong> fix this and model count
          distributions correctly.
        </p>
      </motion.div>

      {/* ── Section 1: The Problem with Linear Regression ── */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="space-y-4">
        <h2 className="text-xl font-bold text-white">Why Linear Regression Fails for Counts</h2>
        <p className="text-sm text-[var(--color-text-muted)] max-w-2xl">
          Linear regression can predict <em>negative</em> values and ignores the discrete,
          non-negative nature of counts. A Poisson GLM uses the log link
          <code className="bg-white/5 px-1.5 py-0.5 rounded text-xs mx-1 text-[var(--color-accent)]">E[Y] = exp(β₀ + β₁x)</code>
          so predictions are always positive.
        </p>

        {/* Scenario selector */}
        <div className="flex flex-wrap gap-2">
          {scenarios.map(s => (
            <button
              key={s.id}
              onClick={() => {
                setScenario(s.id);
                setScenariosExplored(prev => {
                  const next = new Set(prev);
                  next.add(s.id);
                  return next;
                });
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${scenario === s.id ? "bg-[var(--color-accent)]/20 border-[var(--color-accent)]/50 text-[var(--color-accent)]" : "bg-white/[0.02] border-white/10 text-gray-400 hover:text-white"}`}
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>

        {/* Model toggle */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-500 mr-1">Show:</span>
          {(["all", "linear", "poisson", "negbinom"] as const).map(m => (
            <button
              key={m}
              onClick={() => {
                if (m !== showModel) setModelViewChanged(true);
                setShowModel(m);
              }}
              className={`px-2.5 py-1 rounded text-xs font-medium border transition-all ${showModel === m ? "border-[var(--color-accent)]/50 bg-[var(--color-accent)]/10 text-[var(--color-accent)]" : "border-white/10 text-gray-400 hover:text-white"}`}
            >
              {m === "all" ? "All models" : m === "linear" ? "Linear only" : m === "poisson" ? "Poisson only" : "Neg. Binomial only"}
            </button>
          ))}
        </div>

        {/* Scatter plot */}
        <div className="bg-[#0a0e1a] rounded-xl border border-white/5 p-4 overflow-x-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={scenario + showModel}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ScatterWithModels scenarioId={scenario} showModel={showModel} />
            </motion.div>
          </AnimatePresence>
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-3 justify-center">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#3bb4a4] opacity-75" /><span className="text-xs text-gray-400">Data points</span></div>
            {(showModel === "linear"   || showModel === "all") && <div className="flex items-center gap-1.5"><div className="w-6 border-t-2 border-dashed border-[#ef4444]" /><span className="text-xs text-gray-400">Linear OLS</span></div>}
            {(showModel === "poisson"  || showModel === "all") && <div className="flex items-center gap-1.5"><div className="w-6 border-t-2 border-[#d4af37]" /><span className="text-xs text-gray-400">Poisson GLM</span></div>}
            {(showModel === "negbinom" || showModel === "all") && <div className="flex items-center gap-1.5"><div className="w-6 border-t-2 border-[#8b5cf6]" /><span className="text-xs text-gray-400">Neg. Binomial</span></div>}
          </div>
        </div>

        {/* Scenario description */}
        <p className="text-xs text-[var(--color-text-muted)] italic">{sc.description}</p>
      </motion.section>

      {/* ── Section 2: Overdispersion ── */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="space-y-4">
        <h2 className="text-xl font-bold text-white">Overdispersion: When Poisson Isn&apos;t Enough</h2>
        <p className="text-sm text-[var(--color-text-muted)] max-w-2xl">
          Poisson assumes <strong className="text-white">Var(Y) = E[Y]</strong>{" "}
          <em>conditional on the predictors</em>. The raw
          <code className="bg-white/5 px-1.5 py-0.5 rounded text-xs mx-1 text-[var(--color-accent)]">Var/Mean</code>
          ratio of the counts only tests this when the mean is flat: any trend in the data
          inflates the marginal variance, which is why every scenario here shows Var/Mean above 1.
          With a fitted model, the honest diagnostic is the Pearson statistic
          <code className="bg-white/5 px-1.5 py-0.5 rounded text-xs mx-1 text-[var(--color-accent)]">X²/df</code>:
          values well above 1 signal true overdispersion.
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={scenario}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
          >
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
              <div className="text-2xl font-bold text-[var(--color-secondary)]">{sc.mean.toFixed(1)}</div>
              <div className="text-xs text-gray-400 mt-1">Mean of counts</div>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
              <div className="text-2xl font-bold text-[var(--color-secondary)]">{sc.variance.toFixed(1)}</div>
              <div className="text-xs text-gray-400 mt-1">Variance of counts</div>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
              <div className="text-2xl font-bold text-gray-300">
                {overdispersion.marginalDispersion.toFixed(2)}
              </div>
              <div className="text-xs text-gray-400 mt-1">Var/Mean (marginal)</div>
              <div className="text-[9px] text-gray-500 mt-0.5">inflated by the trend</div>
            </div>
            <div className={`rounded-xl border p-4 text-center ${overdispersion.isOverdispersed ? "border-amber-400/30 bg-amber-400/5" : "border-emerald-400/30 bg-emerald-400/5"}`}>
              <div className={`text-2xl font-bold ${overdispersion.isOverdispersed ? "text-amber-400" : "text-emerald-400"}`}>
                {overdispersion.phi.toFixed(2)}
              </div>
              <div className="text-xs text-gray-400 mt-1">Pearson X²/df (model)</div>
              <div className="text-[9px] text-gray-500 mt-0.5">from the Poisson fit</div>
            </div>
            <div className={`rounded-xl border p-4 text-center ${overdispersion.isOverdispersed ? "border-amber-400/30 bg-amber-400/5" : "border-emerald-400/30 bg-emerald-400/5"}`}>
              <div className={`text-lg font-bold ${overdispersion.isOverdispersed ? "text-amber-400" : "text-emerald-400"}`}>
                {overdispersion.isOverdispersed ? "⚠ Overdispersed" : "✓ No overdispersion"}
              </div>
              <div className="text-xs text-gray-400 mt-1">Verdict (by X²/df)</div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Marginal vs model-based dispersion bars */}
        <div className="bg-[#0a0e1a] rounded-xl border border-white/5 p-4 space-y-2">
          <div className="text-xs text-gray-400 mb-3">
            Marginal check: variance vs. mean of the raw counts. A trend in the data stretches
            the variance bar even when the counts are perfectly Poisson around that trend.
          </div>
          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Mean</span><span>{sc.mean.toFixed(1)}</span>
              </div>
              <div className="h-4 bg-[#0f172a] rounded overflow-hidden">
                <motion.div
                  className="h-full rounded"
                  style={{ background: COL_TEAL }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (sc.mean / Math.max(sc.mean, sc.variance)) * 100)}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Variance</span><span>{sc.variance.toFixed(1)}</span>
              </div>
              <div className="h-4 bg-[#0f172a] rounded overflow-hidden">
                <motion.div
                  className="h-full rounded"
                  style={{ background: sc.variance > sc.mean ? COL_RED : COL_TEAL }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (sc.variance / Math.max(sc.mean, sc.variance)) * 100)}%` }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                />
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-400 mb-3 pt-4">
            Model-based check: Pearson X² vs. residual degrees of freedom for the fitted
            Poisson model. Poisson expects X² ≈ df; X² far beyond df means overdispersion.
          </div>
          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>df (n − 2)</span><span>{overdispersion.df}</span>
              </div>
              <div className="h-4 bg-[#0f172a] rounded overflow-hidden">
                <motion.div
                  className="h-full rounded"
                  style={{ background: COL_TEAL }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (overdispersion.df / Math.max(overdispersion.df, overdispersion.pearsonX2)) * 100)}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Pearson X²</span><span>{overdispersion.pearsonX2.toFixed(1)}</span>
              </div>
              <div className="h-4 bg-[#0f172a] rounded overflow-hidden">
                <motion.div
                  className="h-full rounded"
                  style={{ background: overdispersion.isOverdispersed ? COL_RED : COL_TEAL }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (overdispersion.pearsonX2 / Math.max(overdispersion.df, overdispersion.pearsonX2)) * 100)}%` }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Section 3: Model Comparison ── */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="space-y-4">
        <h2 className="text-xl font-bold text-white">Model Comparison</h2>
        <p className="text-sm text-[var(--color-text-muted)] max-w-2xl">
          Lower <strong className="text-white">AIC</strong> and{" "}
          <strong className="text-white">deviance</strong> indicate a better fit.
          Higher log-likelihood is better. Use AIC to compare non-nested models.
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={scenario}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="overflow-x-auto"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="py-2 pr-4 text-xs text-gray-500 font-medium">Model</th>
                  <th className="py-2 pr-4 text-xs text-gray-500 font-medium text-right">AIC ↓</th>
                  <th className="py-2 pr-4 text-xs text-gray-500 font-medium text-right">Deviance ↓</th>
                  <th className="py-2 text-xs text-gray-500 font-medium text-right">Log-Lik ↑</th>
                </tr>
              </thead>
              <tbody>
                {/* Linear */}
                <tr className="border-b border-white/[0.03]">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-0.5 bg-[#ef4444]" />
                      <span className="text-gray-300">Linear OLS</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right text-gray-500 text-xs italic">—</td>
                  <td className="py-3 pr-4 text-right text-gray-500 text-xs italic">—</td>
                  <td className="py-3 text-right">
                    <span className="text-xs bg-white/5 px-2 py-0.5 rounded font-mono">R²={fit.simpleLinear.rSquared.toFixed(3)}</span>
                  </td>
                </tr>
                {/* Poisson */}
                <tr className={`border-b border-white/[0.03] ${fit.poisson.aic === bestAIC ? "bg-[var(--color-accent)]/5" : ""}`}>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-0.5 bg-[#d4af37]" />
                      <span className="text-gray-200 font-medium">Poisson GLM</span>
                      {fit.poisson.aic === bestAIC && <span className="text-[9px] bg-[var(--color-accent)]/20 text-[var(--color-accent)] px-1.5 py-0.5 rounded font-semibold">BEST</span>}
                    </div>
                  </td>
                  <td className={`py-3 pr-4 text-right font-mono text-sm ${fit.poisson.aic === bestAIC ? "text-[var(--color-accent)]" : "text-gray-300"}`}>{fit.poisson.aic.toFixed(1)}</td>
                  <td className={`py-3 pr-4 text-right font-mono text-sm ${fit.poisson.deviance < fit.negativeBinomial.deviance ? "text-emerald-400" : "text-gray-400"}`}>{fit.poisson.deviance.toFixed(1)}</td>
                  <td className="py-3 text-right font-mono text-sm text-gray-300">{fit.poisson.logLikelihood.toFixed(1)}</td>
                </tr>
                {/* Negative Binomial */}
                <tr className={fit.negativeBinomial.aic === bestAIC ? "bg-[var(--color-accent)]/5" : ""}>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-0.5 bg-[#8b5cf6]" />
                      <span className="text-gray-200 font-medium">Neg. Binomial</span>
                      {fit.negativeBinomial.aic === bestAIC && <span className="text-[9px] bg-[var(--color-accent)]/20 text-[var(--color-accent)] px-1.5 py-0.5 rounded font-semibold">BEST</span>}
                    </div>
                  </td>
                  <td className={`py-3 pr-4 text-right font-mono text-sm ${fit.negativeBinomial.aic === bestAIC ? "text-[var(--color-accent)]" : "text-gray-300"}`}>{fit.negativeBinomial.aic.toFixed(1)}</td>
                  <td className={`py-3 pr-4 text-right font-mono text-sm ${fit.negativeBinomial.deviance < fit.poisson.deviance ? "text-emerald-400" : "text-gray-400"}`}>{fit.negativeBinomial.deviance.toFixed(1)}</td>
                  <td className="py-3 text-right font-mono text-sm text-gray-300">{fit.negativeBinomial.logLikelihood.toFixed(1)}</td>
                </tr>
              </tbody>
            </table>
          </motion.div>
        </AnimatePresence>

        <p className="text-xs text-gray-500">
          {fit.negativeBinomial.thetaAtBound ? (
            <>
              The negative binomial size parameter θ (from Var(Y) = μ + μ²/θ) grows without
              bound on this dataset: with no overdispersion left once the trend is fitted,
              the NB collapses into the Poisson model and its extra parameter only costs AIC.
            </>
          ) : (
            <>
              Negative binomial size parameter θ ={" "}
              <span className="font-mono text-[var(--color-accent)]">{fit.negativeBinomial.theta.toFixed(1)}</span>{" "}
              (from Var(Y) = μ + μ²/θ). Small θ means strong overdispersion; as θ grows,
              the NB approaches the Poisson model. Note the direction: θ is the inverse of
              how overdispersed the data is, unlike the X²/df ratio above.
            </>
          )}
        </p>
      </motion.section>

      {/* ── Section 4: Poisson PMF ── */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25 }} className="space-y-4">
        <h2 className="text-xl font-bold text-white">The Poisson Distribution</h2>
        <p className="text-sm text-[var(--color-text-muted)] max-w-2xl">
          The Poisson PMF is{" "}
          <code className="bg-white/5 px-1.5 py-0.5 rounded text-[var(--color-accent)]">P(Y=k) = e⁻λ · λᵏ / k!</code>.
          A single parameter λ controls both the mean <em>and</em> variance.
          Drag the slider to see how the distribution shifts.
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-400 whitespace-nowrap">λ = <span className="text-white font-bold font-mono">{lambda}</span></label>
            <input
              type="range"
              min={1}
              max={30}
              step={1}
              value={lambda}
              onChange={e => {
                setLambda(Number(e.target.value));
                setLambdaAdjusted(true);
              }}
              className="flex-1 accent-[var(--color-accent)]"
            />
          </div>

          <div className="bg-[#0a0e1a] rounded-xl border border-white/5 p-4 overflow-x-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={lambda}
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0.6 }}
              >
                <PoissonPMFChart lambda={lambda} />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="bg-white/[0.02] border border-white/5 rounded-lg py-2">
              <div className="font-bold text-[var(--color-secondary)]">{lambda}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">Mean = λ</div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-lg py-2">
              <div className="font-bold text-[var(--color-secondary)]">{lambda}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">Variance = λ</div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-lg py-2">
              <div className="font-bold text-[var(--color-secondary)]">{(1 / Math.sqrt(lambda)).toFixed(2)}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">CV = 1/√λ</div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Section 5: Decision Guide ── */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="space-y-4">
        <h2 className="text-xl font-bold text-white">Model Selection Guide</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              title: "Linear OLS",
              color: COL_RED,
              badge: "❌ Avoid",
              badgeColor: "text-red-400 bg-red-400/10",
              points: ["Predicts negative counts", "Violates non-negativity", "Use only as baseline"],
            },
            {
              title: "Poisson GLM",
              color: COL_GOLD,
              badge: "✓ Default start",
              badgeColor: "text-emerald-400 bg-emerald-400/10",
              points: ["Pearson X²/df ≈ 1", "Count data, no excess zeros", "Interpretable: exp(β) = rate ratio"],
            },
            {
              title: "Negative Binomial",
              color: COL_PURPLE,
              badge: "✓ When overdispersed",
              badgeColor: "text-purple-400 bg-purple-400/10",
              points: ["Pearson X²/df well above 1", "High-variance counts", "Adds a size parameter θ (Var = μ + μ²/θ)"],
            },
          ].map(card => (
            <div key={card.title} className="bg-[#0a0e1a] rounded-xl border border-white/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">{card.title}</h3>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${card.badgeColor}`}>{card.badge}</span>
              </div>
              <ul className="space-y-1.5">
                {card.points.map(p => (
                  <li key={p} className="flex items-start gap-1.5 text-xs text-gray-400">
                    <span style={{ color: card.color }} className="mt-0.5 shrink-0">▸</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── Key Takeaways ── */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }} className="bg-[#0a0e1a] rounded-2xl border border-[var(--color-accent)]/20 p-6 space-y-3">
        <h2 className="text-lg font-bold text-[var(--color-accent)]">Key Takeaways</h2>
        <ul className="space-y-2 text-sm text-[var(--color-text-muted)]">
          <li className="flex gap-2"><span className="text-[var(--color-accent)] font-bold shrink-0">1.</span>Use <strong className="text-white">Poisson GLM</strong> (log link) instead of linear regression for count outcomes.</li>
          <li className="flex gap-2"><span className="text-[var(--color-accent)] font-bold shrink-0">2.</span>Poisson requires <strong className="text-white">Var = Mean conditional on the predictors</strong>. Raw Var/Mean of the counts is only a valid check when there is no trend; with a fitted model, check Pearson X²/df instead.</li>
          <li className="flex gap-2"><span className="text-[var(--color-accent)] font-bold shrink-0">3.</span>Switch to <strong className="text-white">Negative Binomial</strong> when overdispersion is confirmed via AIC or Pearson χ² test.</li>
          <li className="flex gap-2"><span className="text-[var(--color-accent)] font-bold shrink-0">4.</span>Coefficients from Poisson/NB GLMs are on the <strong className="text-white">log scale</strong>: exp(β) gives the multiplicative rate ratio.</li>
        </ul>
      </motion.section>

      {/* ── Navigation ── */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <Link
          href="/visual-guides/logistic-regression"
          className="text-sm text-[var(--color-text-muted)] hover:text-white transition-colors"
        >
          ← Logistic Regression
        </Link>
        <Link
          href="/visual-guides/ab-testing-workflow"
          className="text-sm px-4 py-2 rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/20 transition-colors"
        >
          Next: A/B Testing: The Complete Workflow →
        </Link>
      </div>
    </div>
  );
}
