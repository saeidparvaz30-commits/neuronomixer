"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";
import { Point, computeRegression, generateInitialPoints, DATASETS, generateDataset } from "./types";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Scatter with draggable points ─────────────────────────────────────────────
function RegressionScatter({
  points,
  onPointMove,
  onAddPoint,
  showResiduals,
  showCI,
  reg,
}: {
  points: Point[];
  onPointMove: (id: number, x: number, y: number) => void;
  onAddPoint: (x: number, y: number) => void;
  showResiduals: boolean;
  showCI: boolean;
  reg: ReturnType<typeof computeRegression>;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef<number | null>(null);
  const W = 500, H = 380, PAD = { l: 44, r: 16, t: 16, b: 44 };
  const IW = W - PAD.l - PAD.r, IH = H - PAD.t - PAD.b;

  const tx = (v: number) => PAD.l + (v / 100) * IW;
  const ty = (v: number) => PAD.t + IH - (v / 100) * IH;

  function svgCoords(e: React.MouseEvent | MouseEvent) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width * W;
    const py = (e.clientY - rect.top) / rect.height * H;
    const x = Math.max(0, Math.min(100, ((px - PAD.l) / IW) * 100));
    const y = Math.max(0, Math.min(100, (1 - (py - PAD.t) / IH) * 100));
    return { x, y };
  }

  function handleMouseDown(e: React.MouseEvent, id: number) {
    e.preventDefault();
    draggingRef.current = id;
    const move = (ev: MouseEvent) => {
      if (draggingRef.current === null) return;
      const { x, y } = svgCoords(ev);
      onPointMove(draggingRef.current, x, y);
    };
    const up = () => { draggingRef.current = null; window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  function handleSvgClick(e: React.MouseEvent) {
    if ((e.target as SVGElement).tagName === "circle") return;
    const { x, y } = svgCoords(e);
    onAddPoint(x, y);
  }

  const ticks = [0, 25, 50, 75, 100];
  const lineY0 = reg.slope * 0 + reg.intercept;
  const lineY100 = reg.slope * 100 + reg.intercept;

  // ~95% prediction band: yhat ± 2·s·sqrt(1 + 1/n + (x − x̄)² / Sxx),
  // with s² = SSE/(n−2). It flares at the edges, where predictions are less certain.
  const n = points.length;
  const xbar = n > 0 ? points.reduce((a, p) => a + p.x, 0) / n : 0;
  const sxx = points.reduce((a, p) => a + (p.x - xbar) ** 2, 0);
  const s = n > 2 ? Math.sqrt((reg.mse * n) / (n - 2)) : Math.sqrt(reg.mse);
  const ciPts = Array.from({ length: 20 }, (_, i) => {
    const x = i * (100 / 19);
    const yhat = reg.slope * x + reg.intercept;
    const half = 2 * s * Math.sqrt(1 + 1 / Math.max(n, 1) + (sxx > 0 ? (x - xbar) ** 2 / sxx : 0));
    return { x, upper: Math.min(100, yhat + half), lower: Math.max(0, yhat - half) };
  });
  const upperPath = ciPts.map((p, i) => `${i === 0 ? "M" : "L"} ${tx(p.x).toFixed(1)} ${ty(p.upper).toFixed(1)}`).join(" ");
  const lowerPath = [...ciPts].reverse().map((p, i) => `${i === 0 ? "L" : "L"} ${tx(p.x).toFixed(1)} ${ty(p.lower).toFixed(1)}`).join(" ");

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%"
      onClick={handleSvgClick} style={{ cursor: "crosshair" }}>
      {/* Grid */}
      {ticks.map(t => (
        <g key={t}>
          <line x1={tx(t)} y1={PAD.t} x2={tx(t)} y2={PAD.t + IH} stroke="#1e293b" strokeWidth="1" />
          <line x1={PAD.l} y1={ty(t)} x2={PAD.l + IW} y2={ty(t)} stroke="#1e293b" strokeWidth="1" />
          <text x={tx(t)} y={PAD.t + IH + 18} textAnchor="middle" fill="#475569" fontSize="16">{t}</text>
          <text x={PAD.l - 6} y={ty(t) + 5} textAnchor="end" fill="#475569" fontSize="16">{t}</text>
        </g>
      ))}

      {/* CI band */}
      {showCI && points.length >= 2 && (
        <path d={`${upperPath} ${lowerPath} Z`} fill="#3bb4a4" opacity="0.1" />
      )}

      {/* Residuals */}
      {showResiduals && points.length >= 2 && points.map(p => {
        const yhat = reg.slope * p.x + reg.intercept;
        return (
          <line key={p.id}
            x1={tx(p.x)} y1={ty(p.y)}
            x2={tx(p.x)} y2={ty(yhat)}
            stroke="var(--color-accent)" strokeWidth="1.5" opacity="0.6" strokeDasharray="2,1"
          />
        );
      })}

      {/* Regression line */}
      {points.length >= 2 && (
        <motion.line
          x1={tx(0)} y1={ty(lineY0)}
          x2={tx(100)} y2={ty(lineY100)}
          stroke="#3bb4a4" strokeWidth="2.5"
          animate={{ x1: tx(0), y1: ty(lineY0), x2: tx(100), y2: ty(lineY100) }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Points */}
      {points.map(p => (
        <motion.circle
          key={p.id}
          cx={tx(p.x)} cy={ty(p.y)}
          r="7"
          fill="var(--color-accent)" stroke="#0f172a" strokeWidth="1.5"
          animate={{ cx: tx(p.x), cy: ty(p.y) }}
          transition={{ duration: 0.15 }}
          onMouseDown={e => handleMouseDown(e, p.id)}
          style={{ cursor: "grab" }}
        />
      ))}

      {/* Axes labels */}
      <text x={PAD.l + IW / 2} y={H - 4} textAnchor="middle" fill="#475569" fontSize="16">X (Feature)</text>
      <text x={10} y={PAD.t + IH / 2} textAnchor="middle" fill="#475569" fontSize="16"
        transform={`rotate(-90, 10, ${PAD.t + IH / 2})`}>Y (Target)</text>
      {points.length < 2 && (
        <text x={PAD.l + IW / 2} y={PAD.t + IH / 2} textAnchor="middle" fill="#334155" fontSize="17">
          Click to add points
        </text>
      )}
    </svg>
  );
}

// ── Loss landscape (parabola) ─────────────────────────────────────────────────
function LossCurve({ reg }: { reg: ReturnType<typeof computeRegression> }) {
  const W = 300, H = 120, PAD = { l: 32, r: 8, t: 10, b: 28 };
  const IW = W - PAD.l - PAD.r, IH = H - PAD.t - PAD.b;

  // Show MSE as function of slope offset
  const center = reg.slope;
  const xs = Array.from({ length: 60 }, (_, i) => center - 1.5 + i * (3 / 59));
  const mseVals = xs.map(s => {
    const int = reg.intercept + (reg.slope - s) * 50; // adjust intercept to keep mean
    return { s, mse: 0 }; // simplified: just show parabola shape
  });

  // Parabola shape: mse = base + k*(slope - optimal)^2
  const baseMse = reg.mse;
  const curvePts = Array.from({ length: 60 }, (_, i) => {
    const s = center - 1.5 + i * (3 / 59);
    const mse = baseMse + 2 * (s - center) ** 2;
    return { s, mse };
  });
  const minMse = baseMse;
  const maxMse = Math.max(...curvePts.map(p => p.mse));

  const tx = (s: number) => PAD.l + ((s - (center - 1.5)) / 3) * IW;
  const ty = (mse: number) => PAD.t + IH - ((mse - minMse) / ((maxMse - minMse) || 1)) * IH;

  const path = curvePts.map((p, i) => `${i === 0 ? "M" : "L"} ${tx(p.s).toFixed(1)} ${ty(p.mse).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      <path d={path} fill="none" stroke="#3bb4a4" strokeWidth="1.5" />
      {/* Current slope */}
      <motion.circle cx={tx(center)} cy={ty(baseMse)} r="5"
        fill="var(--color-accent)" stroke="#0f172a" strokeWidth="1"
        animate={{ cx: tx(center), cy: ty(baseMse) }}
        transition={{ duration: 0.3 }}
      />
      <line x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
      <text x={PAD.l + IW / 2} y={H - 4} textAnchor="middle" fill="#475569" fontSize="10">Slope</text>
      <text x={8} y={PAD.t + IH / 2} textAnchor="middle" fill="#475569" fontSize="10"
        transform={`rotate(-90, 8, ${PAD.t + IH / 2})`}>MSE</text>
      <text x={tx(center) + 8} y={ty(baseMse) - 4} fill="var(--color-accent)" fontSize="10">optimal</text>
    </svg>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LinearRegressionClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const [points, setPoints] = useState<Point[]>(() => generateInitialPoints());
  const [showResiduals, setShowResiduals] = useState(false);
  const [showCI, setShowCI] = useState(false);
  const nextId = useRef(100);

  // Progress
  const [pointsMoved, setPointsMoved] = useState(0);
  const [datasetsLoaded, setDatasetsLoaded] = useState(0);
  const completionFired = useRef(false);
  const allComplete = pointsMoved >= 5 && datasetsLoaded >= 2;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "linear-regression", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  const reg = computeRegression(points);

  const handlePointMove = useCallback((id: number, x: number, y: number) => {
    setPoints(prev => prev.map(p => p.id === id ? { ...p, x, y } : p));
    setPointsMoved(prev => prev + 1);
  }, []);

  const handleAddPoint = useCallback((x: number, y: number) => {
    const id = nextId.current++;
    setPoints(prev => [...prev, { id, x, y }]);
  }, []);

  function loadDataset(key: keyof typeof DATASETS) {
    setPoints(generateDataset(DATASETS[key]));
    setDatasetsLoaded(prev => prev + 1);
  }

  function clearPoints() {
    setPoints([]);
  }

  function handleReset() {
    setPoints(generateInitialPoints());
    setShowResiduals(false);
    setShowCI(false);
    setPointsMoved(0);
    setDatasetsLoaded(0);
  }

  const progress = [
    { label: `Points dragged: ${Math.min(pointsMoved, 5)}/5`, done: pointsMoved >= 5 },
    { label: `Datasets loaded: ${Math.min(datasetsLoaded, 2)}/2`, done: datasetsLoaded >= 2 },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allComplete} guideSlug="linear-regression" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Linear Regression</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">Machine Learning</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Linear Regression: <span className="text-[var(--color-accent)]">Draw the Best Fit</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            Drag data points and watch the regression line, residuals, loss function, and R² update live.
            Click anywhere on the chart to add new points.
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

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Left panel */}
          <div className="space-y-5">
            {/* Stats */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">Model Metrics</p>
              <div className="space-y-3">
                {[
                  { label: "Slope (β₁)", value: reg.slope.toFixed(3), color: "#3bb4a4" },
                  { label: "Intercept (β₀)", value: reg.intercept.toFixed(3), color: "var(--color-accent)" },
                  { label: "R²", value: reg.r2.toFixed(4), color: "#a855f7", desc: reg.r2 >= 0.7 ? "Strong fit" : reg.r2 >= 0.3 ? "Moderate fit" : "Weak fit" },
                  { label: "Pearson r", value: reg.pearsonR.toFixed(4), color: "#3bb4a4" },
                  { label: "MSE", value: reg.mse.toFixed(3), color: "#ef4444" },
                  { label: "N points", value: String(points.length), color: "#475569" },
                ].map(({ label, value, color, desc }) => (
                  <div key={label} className="flex justify-between items-baseline">
                    <div>
                      <span className="text-[11px] text-[#475569]">{label}</span>
                      {desc && <span className="text-[9px] text-[#475569] ml-1">({desc})</span>}
                    </div>
                    <motion.span
                      className="text-[12px] font-mono font-bold"
                      style={{ color }}
                      animate={{ opacity: [0.6, 1] }}
                      key={value}
                    >
                      {value}
                    </motion.span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-[#1e293b]">
                <p className="text-[10px] text-[#475569] mb-1">Equation</p>
                <p className="text-[12px] font-mono text-white">
                  ŷ = {reg.slope.toFixed(2)}x + {reg.intercept.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Display toggles */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">Display</p>
              <div className="space-y-2">
                {[
                  { label: "Show residuals", value: showResiduals, set: setShowResiduals, color: "var(--color-accent)" },
                  { label: "Show ~95% prediction band", value: showCI, set: setShowCI, color: "#3bb4a4" },
                ].map(({ label, value, set, color }) => (
                  <button key={label}
                    onClick={() => set(!value)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-colors"
                    style={{ borderColor: value ? color : "#1e293b", background: value ? `color-mix(in srgb, ${color} 6%, transparent)` : "transparent" }}>
                    <span className="text-[11px]" style={{ color: value ? color : "#94a3b8" }}>{label}</span>
                    <div className={`w-8 h-4 rounded-full transition-colors relative ${value ? "bg-[currentColor]" : "bg-[#1e293b]"}`}
                      style={{ color: value ? color : undefined }}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Datasets */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">Load Dataset</p>
              <div className="space-y-2">
                {Object.entries(DATASETS).map(([key, ds]) => (
                  <button key={key}
                    onClick={() => loadDataset(key as keyof typeof DATASETS)}
                    className="w-full px-3 py-2 rounded-lg border border-[#1e293b] text-left text-[11px] text-[#94a3b8] hover:border-[#334155] hover:text-white transition-colors">
                    {ds.label}
                  </button>
                ))}
                <button onClick={clearPoints}
                  className="w-full px-3 py-2 rounded-lg border border-[#1e293b] text-left text-[11px] text-[#475569] hover:border-[#ef4444]/50 hover:text-[#ef4444] transition-colors">
                  Clear all points
                </button>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="space-y-5">
            {/* Main scatter */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
                  Interactive Scatter Plot
                </p>
                <div className="flex items-center gap-3 text-[10px] text-[#475569]">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-4 h-0.5 bg-[#3bb4a4]" /> regression line
                  </span>
                  {showResiduals && (
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-4 border-t border-dashed border-[var(--color-accent)]" /> residuals
                    </span>
                  )}
                </div>
              </div>
              <RegressionScatter
                points={points}
                onPointMove={handlePointMove}
                onAddPoint={handleAddPoint}
                showResiduals={showResiduals}
                showCI={showCI}
                reg={reg}
              />
              <p className="text-[10px] text-[#334155] mt-2 text-center">
                Drag gold dots to move · Click empty area to add point
              </p>
            </div>

            {/* Loss curve + insights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">Loss Landscape (MSE)</p>
                <LossCurve reg={reg} />
                <p className="text-[10px] text-[#475569] mt-2 leading-relaxed">
                  The gold dot is always at the minimum: ordinary least squares finds the exact optimal slope analytically.
                </p>
              </div>

              <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">R² Gauge</p>
                <div className="relative h-6 rounded-full bg-[#1e293b] overflow-hidden mb-3">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #ef4444, var(--color-accent), #3bb4a4)" }}
                    animate={{ width: `${Math.max(0, reg.r2 * 100)}%` }}
                    transition={{ duration: 0.4 }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[11px] font-bold text-white drop-shadow">
                      R² = {reg.r2.toFixed(3)}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-[#ef4444]">0: No fit</span>
                    <span className="text-[var(--color-accent)]">0.5: Moderate</span>
                    <span className="text-[#3bb4a4]">1: Perfect</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[#1e293b]">
                  <p className="text-[10px] text-[#475569] leading-relaxed">
                    R² = fraction of variance in Y explained by X.
                    Drag an outlier far from the line to watch R² drop.
                  </p>
                </div>
              </div>
            </div>

            {/* Key concepts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { title: "Ordinary Least Squares", body: "Finds the line that minimizes the sum of squared residuals (vertical distances from points to line).", color: "#3bb4a4" },
                { title: "Residuals", body: "The difference between actual y and predicted ŷ. Ideally: small, random, no pattern.", color: "var(--color-accent)" },
                { title: "Assumptions", body: "Linearity, independence, homoscedasticity, normality of residuals. Violations hurt inference.", color: "#a855f7" },
              ].map(({ title, body, color }) => (
                <div key={title} className="rounded-xl border border-[#1e293b] p-4">
                  <p className="text-[11px] font-semibold mb-2" style={{ color }}>{title}</p>
                  <p className="text-[11px] text-[#94a3b8] leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
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
                  You Found the Best-Fit Line
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You dragged points, loaded fresh datasets, and watched slope,
                  residuals, and R² chase the least-squares optimum in real time.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Points dragged</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {pointsMoved}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      each one refit the line
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Datasets loaded</p>
                    <p className="text-[14px] font-mono font-bold text-[#3bb4a4]">
                      {datasetsLoaded}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      different point patterns
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Current fit (R²)</p>
                    <p className="text-[14px] font-mono font-bold text-[#a855f7]">
                      {reg.r2.toFixed(3)}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      ŷ = {reg.slope.toFixed(2)}x + {reg.intercept.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;The regression line is not drawn, it is computed: least
                    squares picks the one line that minimizes squared residuals,
                    and R² tells you how much of the story that line actually
                    explains.&quot;
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
                    href="/visual-guides/decision-trees"
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
                  >
                    Next Guide →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nav */}
        {!allComplete && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link href="/visual-guides/what-is-ml"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors">
              ← Previous Guide
            </Link>
            <Link href="/visual-guides/decision-trees"
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
              Next Guide →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
