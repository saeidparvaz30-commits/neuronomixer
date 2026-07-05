"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

const GUIDE_TITLE = "Gradient Descent: Rolling Down the Hill";
const NEXT_GUIDE_SLUG = "overfitting-underfitting";

// ── Loss landscape functions ───────────────────────────────────────────────────
type LandscapeId = "bowl" | "ravine" | "plateau" | "multimodal";

interface Landscape {
  id: LandscapeId;
  label: string;
  desc: string;
  loss: (w: number, b: number) => number;
  gradW: (w: number, b: number) => number;
  gradB: (w: number, b: number) => number;
  minW: number; minB: number; // global min location
}

const LANDSCAPES: Record<LandscapeId, Landscape> = {
  bowl: {
    id: "bowl", label: "Simple Bowl", desc: "Convex: one global minimum, GD always converges",
    loss: (w, b) => 0.5 * w * w + 0.5 * b * b,
    gradW: (w, _b) => w, gradB: (_w, b) => b,
    minW: 0, minB: 0,
  },
  ravine: {
    id: "ravine", label: "Ravine", desc: "Elongated valley: slow along one direction, oscillates across",
    loss: (w, b) => 0.05 * w * w + 5 * b * b,
    gradW: (w, _b) => 0.1 * w, gradB: (_w, b) => 10 * b,
    minW: 0, minB: 0,
  },
  plateau: {
    id: "plateau", label: "Plateau", desc: "Near-zero gradient region: GD stalls before reaching minimum",
    loss: (w, b) => {
      const r = Math.sqrt(w * w + b * b);
      return 1 / (1 + Math.exp(-r + 3)) + 0.05;
    },
    gradW: (w, b) => {
      const r = Math.sqrt(w * w + b * b) + 1e-8;
      const sig = 1 / (1 + Math.exp(-r + 3));
      return sig * (1 - sig) * (w / r);
    },
    gradB: (w, b) => {
      const r = Math.sqrt(w * w + b * b) + 1e-8;
      const sig = 1 / (1 + Math.exp(-r + 3));
      return sig * (1 - sig) * (b / r);
    },
    minW: 0, minB: 0,
  },
  multimodal: {
    id: "multimodal", label: "Multiple Minima", desc: "Non-convex: GD may get stuck in a local minimum",
    loss: (w, b) => {
      return 2 - Math.cos(w * 1.5) - Math.cos(b * 1.5) + 0.1 * (w * w + b * b) * 0.05;
    },
    gradW: (w, _b) => 1.5 * Math.sin(w * 1.5) + 0.1 * w * 0.05,
    gradB: (_w, b) => 1.5 * Math.sin(b * 1.5) + 0.1 * b * 0.05,
    minW: 0, minB: 0,
  },
};

// ── Contour map generation ─────────────────────────────────────────────────────
const RANGE = 4; // w and b range from -RANGE to +RANGE
const GRID_RES = 50;

function buildContourGrid(landscape: Landscape) {
  const grid: number[][] = [];
  let minVal = Infinity, maxVal = -Infinity;
  for (let row = 0; row < GRID_RES; row++) {
    grid.push([]);
    for (let col = 0; col < GRID_RES; col++) {
      const w = -RANGE + (col / (GRID_RES - 1)) * 2 * RANGE;
      const b = -RANGE + (row / (GRID_RES - 1)) * 2 * RANGE;
      const v = landscape.loss(w, b);
      grid[row].push(v);
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }
  }
  return { grid, minVal, maxVal };
}

// Gradient descent step
interface GDState { w: number; b: number; loss: number; step: number }

// ── SVG layout ─────────────────────────────────────────────────────────────────
const CW = 420; const CH = 380;
const PAD = 30;

function toSVG_contour(val: number): number {
  return PAD + ((val + RANGE) / (2 * RANGE)) * (CW - 2 * PAD);
}
function toSVG_contourY(val: number): number {
  return PAD + ((RANGE - val) / (2 * RANGE)) * (CH - 2 * PAD);
}

// ── Loss curve ─────────────────────────────────────────────────────────────────
function LossCurve({ history }: { history: GDState[] }) {
  if (history.length < 2) return null;
  const maxLoss = Math.max(...history.map(h => h.loss));
  const LCW = 360; const LCH = 120;
  const lp = 40; const rp = 10; const tp = 10; const bp = 25;

  function x(i: number) { return lp + (i / (history.length - 1)) * (LCW - lp - rp); }
  function y(loss: number) { return tp + (1 - loss / (maxLoss + 0.01)) * (LCH - tp - bp); }

  const pathD = history.map((h, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(h.loss)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${LCW} ${LCH}`} className="w-full">
      <text x={lp - 5} y={tp + 4} fill="#94a3b8" fontSize="9" textAnchor="end">Loss</text>
      <text x={LCW - rp} y={LCH - 4} fill="#94a3b8" fontSize="9" textAnchor="end">Step</text>
      <line x1={lp} y1={tp} x2={lp} y2={LCH - bp} stroke="#334155" strokeWidth="1" />
      <line x1={lp} y1={LCH - bp} x2={LCW - rp} y2={LCH - bp} stroke="#334155" strokeWidth="1" />
      <path d={pathD} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(history.length - 1)} cy={y(history[history.length - 1].loss)} r={3} fill="var(--color-accent)" />
      <text x={lp} y={LCH - bp + 12} fill="#94a3b8" fontSize="8">0</text>
      <text x={LCW - rp} y={LCH - bp + 12} fill="#94a3b8" fontSize="8" textAnchor="end">{history.length - 1}</text>
    </svg>
  );
}

// ── Color for loss value ───────────────────────────────────────────────────────
function lossColor(normalized: number): string {
  // Cool (blue) = low, warm (orange-red) = high
  const r = Math.round(30 + normalized * 200);
  const g = Math.round(100 - normalized * 80);
  const b = Math.round(180 - normalized * 150);
  return `rgb(${r},${g},${b})`;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function GradientDescentClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();
  const [landscapeId, setLandscapeId] = useState<LandscapeId>("bowl");
  const [lr, setLr] = useState(0.1);
  const [history, setHistory] = useState<GDState[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startPos, setStartPos] = useState<{ w: number; b: number } | null>(null);
  const [landscapesExplored, setLandscapesExplored] = useState<Set<LandscapeId>>(new Set());
  const [runsCompleted, setRunsCompleted] = useState(0);
  const completionFired = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const landscape = LANDSCAPES[landscapeId];
  const { grid: contourGrid, minVal, maxVal } = useMemo(() => buildContourGrid(landscape), [landscape]);

  // Completion: explored 3+ landscapes AND 5+ runs
  const isComplete = landscapesExplored.size >= 3 && runsCompleted >= 5;

  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "gradient-descent", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  // Play/pause GD
  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setHistory(prev => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        if (prev.length > 500) { setIsPlaying(false); return prev; }
        const gw = landscape.gradW(last.w, last.b);
        const gb = landscape.gradB(last.w, last.b);
        const nw = last.w - lr * gw;
        const nb = last.b - lr * gb;
        const newLoss = landscape.loss(nw, nb);
        // Stop if converged
        if (Math.abs(gw) < 1e-5 && Math.abs(gb) < 1e-5) {
          setIsPlaying(false);
          return prev;
        }
        return [...prev, { w: nw, b: nb, loss: newLoss, step: last.step + 1 }];
      });
    }, 60);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, landscape, lr]);

  function handleSVGClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = (e.clientX - rect.left) * (CW / rect.width);
    const sy = (e.clientY - rect.top) * (CH / rect.height);
    const w = -RANGE + ((sx - PAD) / (CW - 2 * PAD)) * 2 * RANGE;
    const b = RANGE - ((sy - PAD) / (CH - 2 * PAD)) * 2 * RANGE;
    if (w < -RANGE || w > RANGE || b < -RANGE || b > RANGE) return;
    const initLoss = landscape.loss(w, b);
    setStartPos({ w, b });
    setHistory([{ w, b, loss: initLoss, step: 0 }]);
    setIsPlaying(false);
    setLandscapesExplored(prev => new Set([...prev, landscapeId]));
  }

  function togglePlay() {
    if (history.length === 0) return;
    if (isPlaying) { setIsPlaying(false); return; }
    setIsPlaying(true);
    setRunsCompleted(prev => prev + 1);
  }

  function stepOnce() {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    const gw = landscape.gradW(last.w, last.b);
    const gb = landscape.gradB(last.w, last.b);
    const nw = last.w - lr * gw;
    const nb = last.b - lr * gb;
    setHistory(prev => [...prev, { w: nw, b: nb, loss: landscape.loss(nw, nb), step: last.step + 1 }]);
    setRunsCompleted(prev => prev + 1);
  }

  function reset() {
    setIsPlaying(false);
    setHistory([]);
    setStartPos(null);
  }

  function handleResetGuide() {
    reset();
    setLandscapeId("bowl");
    setLr(0.1);
    setLandscapesExplored(new Set());
    setRunsCompleted(0);
    completionFired.current = false;
  }

  const current = history[history.length - 1];

  const cellW = (CW - 2 * PAD) / GRID_RES;
  const cellH = (CH - 2 * PAD) / GRID_RES;

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="gradient-descent" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">{GUIDE_TITLE}</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Machine Learning
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3"
          >
            Gradient Descent:{" "}
            <span className="text-[var(--color-accent)]">Rolling Down the Hill</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Click anywhere on the loss landscape to drop a ball, then watch it roll toward the minimum.
            Experiment with different learning rates and landscapes to see convergence, oscillation, and getting stuck.
          </motion.p>
        </section>

        {/* Progress */}
        <div className="mb-8 bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#94a3b8]">Exploration Progress</span>
            <span className="text-sm font-semibold text-white">
              {landscapesExplored.size}/3 landscapes · {Math.min(runsCompleted, 5)}/5 runs
            </span>
          </div>
          <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#1e5d8a] to-[#3bb4a4] rounded-full"
              animate={{ width: `${Math.min(landscapesExplored.size, 3) / 3 * 50 + Math.min(runsCompleted, 5) / 5 * 50}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          {isComplete && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-xs text-[#3bb4a4] font-semibold">
              Guide complete!
            </motion.div>
          )}
          {!session?.user && (
            <p className="mt-2 text-xs text-[#94a3b8]">
              <Link href="/auth/sign-in" className="text-[var(--color-accent)] hover:underline">Sign in</Link> to save your progress.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
          {/* Canvas + loss curve */}
          <div className="flex flex-col gap-4">
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl overflow-hidden">
              <div className="p-3 border-b border-[#1e293b] flex items-center gap-2 text-xs text-[#94a3b8]">
                <span className="text-white font-semibold">Loss landscape</span>
                <span>(click to set starting position)</span>
                {current && (
                  <span className="ml-auto text-[var(--color-accent)] font-semibold">
                    Loss: {current.loss.toFixed(4)} · Step: {current.step}
                  </span>
                )}
              </div>
              <svg
                ref={svgRef}
                viewBox={`0 0 ${CW} ${CH}`}
                className="w-full cursor-crosshair"
                onClick={handleSVGClick}
              >
                {/* Contour heatmap */}
                {contourGrid.map((row, ri) =>
                  row.map((val, ci) => {
                    const norm = (val - minVal) / (maxVal - minVal + 0.001);
                    return (
                      <rect
                        key={`${ri}-${ci}`}
                        x={PAD + ci * cellW} y={PAD + (GRID_RES - 1 - ri) * cellH}
                        width={cellW + 0.5} height={cellH + 0.5}
                        fill={lossColor(norm)}
                        opacity={0.85}
                      />
                    );
                  })
                )}

                {/* Axis labels */}
                <text x={CW / 2} y={CH - 6} fill="#94a3b8" fontSize="10" textAnchor="middle">w (weight)</text>
                <text x={10} y={CH / 2} fill="#94a3b8" fontSize="10" textAnchor="middle" transform={`rotate(-90, 10, ${CH / 2})`}>b (bias)</text>

                {/* GD path */}
                {history.length >= 2 && (
                  <polyline
                    points={history.map(h => `${toSVG_contour(h.w)},${toSVG_contourY(h.b)}`).join(" ")}
                    fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    opacity={0.8}
                  />
                )}

                {/* Start marker */}
                {startPos && (
                  <circle cx={toSVG_contour(startPos.w)} cy={toSVG_contourY(startPos.b)} r={5}
                    fill="none" stroke="white" strokeWidth="1.5" opacity={0.6} />
                )}

                {/* Current position ball */}
                {current && (
                  <motion.circle
                    cx={toSVG_contour(current.w)} cy={toSVG_contourY(current.b)} r={7}
                    fill="var(--color-accent)" stroke="white" strokeWidth="2"
                    animate={{ cx: toSVG_contour(current.w), cy: toSVG_contourY(current.b) }}
                    transition={{ duration: 0.05 }}
                  />
                )}

                {/* Global minimum star */}
                <circle
                  cx={toSVG_contour(landscape.minW)} cy={toSVG_contourY(landscape.minB)}
                  r={5} fill="none" stroke="#3bb4a4" strokeWidth="1.5" strokeDasharray="3 2" opacity={0.8}
                />
                <text x={toSVG_contour(landscape.minW) + 7} y={toSVG_contourY(landscape.minB) + 4}
                  fill="#3bb4a4" fontSize="9" opacity={0.8}>min</text>
              </svg>
            </div>

            {/* Loss curve */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Loss over Steps</h3>
              {history.length >= 2 ? (
                <LossCurve history={history} />
              ) : (
                <p className="text-xs text-[#94a3b8] text-center py-6">Click on the landscape to start</p>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-4">
            {/* Landscape selector */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Landscape</h3>
              <div className="flex flex-col gap-2" role="radiogroup" aria-label="Loss landscape">
                {(Object.values(LANDSCAPES) as Landscape[]).map(ls => (
                  <button
                    key={ls.id}
                    role="radio"
                    aria-checked={landscapeId === ls.id}
                    onClick={() => { setLandscapeId(ls.id); reset(); setLandscapesExplored(prev => new Set([...prev, ls.id])); }}
                    className={`px-3 py-2 rounded-lg text-xs font-medium text-left border transition-all ${landscapeId === ls.id ? "bg-[#1e5d8a]/20 border-[#1e5d8a]/60 text-white" : "border-[#334155] text-[#94a3b8] hover:border-[#475569]"}`}
                  >
                    <div className="font-semibold">{ls.label}</div>
                    <div className="text-[10px] mt-0.5 opacity-70">{ls.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Learning rate */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-white">Learning Rate α</h3>
                <span className="text-sm font-bold text-[var(--color-accent)]">{lr.toFixed(3)}</span>
              </div>
              <p className="text-xs text-[#94a3b8] mb-3">
                Too small → slow. Too large → oscillates or diverges.
              </p>
              <input
                type="range" min="0.001" max="0.8" step="0.001" value={lr}
                aria-label="Learning rate"
                onChange={e => setLr(parseFloat(e.target.value))}
                className="w-full accent-[var(--color-accent)]"
              />
              <div className="flex gap-2 mt-3 flex-wrap" role="radiogroup" aria-label="Preset learning rates">
                {[0.01, 0.1, 0.3, 0.7].map(val => (
                  <button key={val} onClick={() => setLr(val)}
                    role="radio"
                    aria-checked={Math.abs(lr - val) < 0.005}
                    className={`px-2.5 py-1 rounded text-xs border transition-all ${Math.abs(lr - val) < 0.005 ? "bg-[#d4af37]/20 border-[#d4af37]/60 text-[var(--color-accent)]" : "border-[#334155] text-[#94a3b8]"}`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Controls</h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={togglePlay}
                  disabled={history.length === 0}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#1e5d8a] hover:bg-[#1e5d8a]/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isPlaying ? "⏸ Pause" : "▶ Play"}
                </button>
                <button
                  onClick={stepOnce}
                  disabled={history.length === 0 || isPlaying}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border border-[#334155] hover:border-[#475569] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Step Once
                </button>
                <button onClick={reset}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border border-[#334155] text-[#94a3b8] hover:border-[#475569] transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Current stats */}
            {current && (
              <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Current State</h3>
                <div className="space-y-2">
                  {[
                    { label: "w", value: current.w.toFixed(4) },
                    { label: "b", value: current.b.toFixed(4) },
                    { label: "Loss", value: current.loss.toFixed(4) },
                    { label: "Step", value: current.step },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between text-xs">
                      <span className="text-[#94a3b8]">{label}</span>
                      <span className="font-mono text-white">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key insight */}
            <div className="bg-[#1e293b]/60 border border-[#d4af37]/20 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-2">Key Insight</h3>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                The gradient points <span className="text-white">uphill</span>, so subtracting it moves downhill.
                The learning rate controls step size: too large and you overshoot the valley.
              </p>
            </div>
          </div>
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
                  Gradient Descent Explored!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You dropped the ball on multiple landscapes and watched learning rate decide between convergence, oscillation, and getting stuck.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Landscapes explored</p>
                    <p className="text-[14px] font-mono font-bold text-[#3bb4a4]">
                      {landscapesExplored.size} / 4
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Descent runs</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">{runsCompleted}</p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Current α</p>
                    <p className="text-[14px] font-mono font-bold text-white">{lr.toFixed(3)}</p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Gradient descent only ever sees the slope under its feet. The learning rate decides whether that local information becomes steady progress, wild oscillation, or a permanent stall.&quot;
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
                    onClick={handleResetGuide}
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
              href="/visual-guides"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            >
              ← All Guides
            </Link>
            <Link
              href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
            >
              Next Guide →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
