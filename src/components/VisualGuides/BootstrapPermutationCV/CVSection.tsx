"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CVFold } from "./types";

// Fixed dataset: 50 points, y = 2x + noise
const DATASET: { x: number; y: number }[] = [
  { x: 0.1, y: 0.42 }, { x: 0.3, y: 0.88 }, { x: 0.5, y: 1.21 }, { x: 0.7, y: 1.65 }, { x: 0.9, y: 2.08 },
  { x: 1.1, y: 2.39 }, { x: 1.3, y: 2.82 }, { x: 1.5, y: 3.17 }, { x: 1.7, y: 3.51 }, { x: 1.9, y: 3.89 },
  { x: 2.1, y: 4.28 }, { x: 2.3, y: 4.63 }, { x: 2.5, y: 5.02 }, { x: 2.7, y: 5.37 }, { x: 2.9, y: 5.79 },
  { x: 3.1, y: 6.12 }, { x: 3.3, y: 6.58 }, { x: 3.5, y: 6.93 }, { x: 3.7, y: 7.31 }, { x: 3.9, y: 7.74 },
  { x: 4.1, y: 8.18 }, { x: 4.3, y: 8.47 }, { x: 4.5, y: 8.93 }, { x: 4.7, y: 9.28 }, { x: 4.9, y: 9.66 },
  { x: 0.2, y: 0.61 }, { x: 0.4, y: 1.05 }, { x: 0.6, y: 1.38 }, { x: 0.8, y: 1.79 }, { x: 1.0, y: 2.14 },
  { x: 1.2, y: 2.57 }, { x: 1.4, y: 2.97 }, { x: 1.6, y: 3.34 }, { x: 1.8, y: 3.68 }, { x: 2.0, y: 4.05 },
  { x: 2.2, y: 4.41 }, { x: 2.4, y: 4.84 }, { x: 2.6, y: 5.19 }, { x: 2.8, y: 5.56 }, { x: 3.0, y: 5.98 },
  { x: 3.2, y: 6.37 }, { x: 3.4, y: 6.72 }, { x: 3.6, y: 7.14 }, { x: 3.8, y: 7.47 }, { x: 4.0, y: 7.93 },
  { x: 4.2, y: 8.34 }, { x: 4.4, y: 8.69 }, { x: 4.6, y: 9.06 }, { x: 4.8, y: 9.48 }, { x: 5.0, y: 9.87 },
];

function linearRegression(pts: { x: number; y: number }[]) {
  const n = pts.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  const sumX = pts.reduce((s, p) => s + p.x, 0);
  const sumY = pts.reduce((s, p) => s + p.y, 0);
  const sumXY = pts.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = pts.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function computeMSE(pts: { x: number; y: number }[], slope: number, intercept: number) {
  if (pts.length === 0) return 0;
  return pts.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0) / pts.length;
}

function arrMean(arr: number[]) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}
function arrStd(arr: number[]) {
  if (arr.length < 2) return 0;
  const m = arrMean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

const FOLD_COLORS = [
  "#3bb4a4", "#d4af37", "#1e5d8a", "#a78bfa", "#f97316",
  "#ec4899", "#22d3ee", "#4ade80", "#fb923c", "#818cf8",
];

interface CVSectionProps {
  onCvDone: () => void;
}

export default function CVSection({ onCvDone }: CVSectionProps) {
  const [k, setK] = useState(5);
  const [currentFold, setCurrentFold] = useState(-1);
  const [completedFolds, setCompletedFolds] = useState<CVFold[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [doneFired, setDoneFired] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopAnimation = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsAnimating(false);
  }, []);

  const runFold = useCallback(
    (foldIdx: number, prevFolds: CVFold[], totalK: number) => {
      setCurrentFold(foldIdx);

      const testPts = DATASET.filter((_, i) => i % totalK === foldIdx);
      const trainPts = DATASET.filter((_, i) => i % totalK !== foldIdx);
      const { slope, intercept } = linearRegression(trainPts);
      const trainError = computeMSE(trainPts, slope, intercept);
      const testError = computeMSE(testPts, slope, intercept);

      const newFold: CVFold = { foldIndex: foldIdx, trainError, testError };
      const updatedFolds = [...prevFolds, newFold];
      setCompletedFolds(updatedFolds);

      if (foldIdx + 1 < totalK) {
        timeoutRef.current = setTimeout(() => {
          runFold(foldIdx + 1, updatedFolds, totalK);
        }, 800);
      } else {
        setCurrentFold(-1);
        setIsAnimating(false);
        setDoneFired(true);
      }
    },
    []
  );

  const handleRun = useCallback(() => {
    if (isAnimating) return;
    stopAnimation();
    setCompletedFolds([]);
    setCurrentFold(-1);
    setDoneFired(false);
    setIsAnimating(true);
    timeoutRef.current = setTimeout(() => {
      runFold(0, [], k);
    }, 200);
  }, [isAnimating, stopAnimation, runFold, k]);

  const handleReset = useCallback(() => {
    stopAnimation();
    setCompletedFolds([]);
    setCurrentFold(-1);
    setDoneFired(false);
  }, [stopAnimation]);

  useEffect(() => {
    if (doneFired) {
      onCvDone();
    }
  }, [doneFired, onCvDone]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Reset when k changes
  useEffect(() => {
    handleReset();
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps

  const isDone = completedFolds.length === k && !isAnimating;

  const avgTestError = useMemo(
    () => (completedFolds.length > 0 ? arrMean(completedFolds.map((f) => f.testError)) : 0),
    [completedFolds]
  );
  const stdTestError = useMemo(
    () => (completedFolds.length > 1 ? arrStd(completedFolds.map((f) => f.testError)) : 0),
    [completedFolds]
  );
  const avgTrainError = useMemo(
    () => (completedFolds.length > 0 ? arrMean(completedFolds.map((f) => f.trainError)) : 0),
    [completedFolds]
  );

  // Scatter plot dimensions
  const SW = 380;
  const SH = 200;
  const SP = { l: 28, r: 12, t: 12, b: 28 };
  const xMin = 0;
  const xMax = 5.2;
  const yMin = 0;
  const yMax = 11;

  function scx(x: number) {
    return SP.l + ((x - xMin) / (xMax - xMin)) * (SW - SP.l - SP.r);
  }
  function scy(y: number) {
    return SP.t + (1 - (y - yMin) / (yMax - yMin)) * (SH - SP.t - SP.b);
  }

  // Regression line for active fold
  const activeLine = useMemo(() => {
    if (currentFold < 0 && completedFolds.length === 0) return null;
    const foldToShow = currentFold >= 0 ? currentFold : completedFolds[completedFolds.length - 1].foldIndex;
    const trainPts = DATASET.filter((_, i) => i % k !== foldToShow);
    return linearRegression(trainPts);
  }, [currentFold, completedFolds, k]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#1e5d8a]/20 border border-[#1e5d8a]/40 rounded-full px-3 py-1 mb-2">
            <span className="text-xs font-semibold text-[#3bb4a4] uppercase tracking-wider">Section 3</span>
          </div>
          <h2 className="text-xl font-bold text-white">K-Fold Cross-Validation</h2>
          <p className="text-sm text-[#94a3b8] mt-1">
            Watch how each fold serves as the test set in turn, building a robust error estimate.
          </p>
        </div>
        {isDone && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 text-xs text-[#3bb4a4] font-semibold bg-[#3bb4a4]/10 border border-[#3bb4a4]/30 rounded-full px-3 py-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Complete
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left: visualization */}
        <div className="flex flex-col gap-4">
          {/* K slider */}
          <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-white">Number of Folds (K)</span>
              <span className="text-lg font-black text-[#d4af37]">{k}</span>
            </div>
            <input
              type="range"
              min="2"
              max="10"
              step="1"
              value={k}
              onChange={(e) => setK(parseInt(e.target.value))}
              className="w-full accent-[#d4af37]"
              disabled={isAnimating}
            />
            <div className="flex justify-between text-xs text-[#475569] mt-1">
              <span>2</span>
              <span>10</span>
            </div>
          </div>

          {/* Fold strip visualization */}
          <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-4">
            <span className="text-xs font-semibold text-[#94a3b8] block mb-3">
              Data Split — {k} Folds ({DATASET.length} points)
              {currentFold >= 0 && (
                <span className="ml-2 text-[#d4af37]">
                  → Testing fold {currentFold + 1}
                </span>
              )}
            </span>
            <div className="flex gap-0.5 rounded-lg overflow-hidden h-8">
              {Array.from({ length: k }, (_, fi) => {
                const isTest = fi === currentFold;
                const isDoneF = completedFolds.some((f) => f.foldIndex === fi);
                return (
                  <div
                    key={fi}
                    className="flex-1 flex items-center justify-center text-[10px] font-bold transition-all duration-300"
                    style={{
                      backgroundColor: isTest
                        ? FOLD_COLORS[fi % FOLD_COLORS.length]
                        : isDoneF
                        ? `${FOLD_COLORS[fi % FOLD_COLORS.length]}40`
                        : "#1e293b",
                      color: isTest ? "#0a0e1a" : isDoneF ? FOLD_COLORS[fi % FOLD_COLORS.length] : "#475569",
                    }}
                  >
                    {fi + 1}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-2 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded" style={{ backgroundColor: FOLD_COLORS[0] }}></span>
                <span className="text-[#94a3b8]">Current test fold</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-[#1e293b]"></span>
                <span className="text-[#475569]">Pending</span>
              </span>
            </div>
          </div>

          {/* Scatter plot */}
          <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] overflow-hidden">
            <div className="px-3 py-2 border-b border-[#1e293b] text-xs text-[#94a3b8]">
              <span className="text-white font-semibold">Data & Fit</span>
              {currentFold >= 0 && (
                <span>
                  {" "}— fold{" "}
                  <span style={{ color: FOLD_COLORS[currentFold % FOLD_COLORS.length] }}>
                    {currentFold + 1}
                  </span>{" "}
                  = test set
                </span>
              )}
            </div>
            <svg viewBox={`0 0 ${SW} ${SH}`} className="w-full">
              {/* Grid */}
              {[2, 4, 6, 8, 10].map((v) => (
                <line
                  key={v}
                  x1={SP.l}
                  y1={scy(v)}
                  x2={SW - SP.r}
                  y2={scy(v)}
                  stroke="#1e293b"
                  strokeWidth="1"
                />
              ))}
              {[1, 2, 3, 4, 5].map((v) => (
                <line
                  key={v}
                  x1={scx(v)}
                  y1={SP.t}
                  x2={scx(v)}
                  y2={SH - SP.b}
                  stroke="#1e293b"
                  strokeWidth="1"
                />
              ))}

              {/* Regression line */}
              {activeLine && (() => {
                const x1 = xMin;
                const x2 = xMax;
                const y1 = activeLine.slope * x1 + activeLine.intercept;
                const y2 = activeLine.slope * x2 + activeLine.intercept;
                return (
                  <line
                    x1={scx(x1)}
                    y1={scy(Math.max(yMin, Math.min(yMax, y1)))}
                    x2={scx(x2)}
                    y2={scy(Math.max(yMin, Math.min(yMax, y2)))}
                    stroke="white"
                    strokeWidth="2"
                    opacity={0.7}
                  />
                );
              })()}

              {/* Data points */}
              {DATASET.map((pt, i) => {
                const fi = i % k;
                const isTest = fi === currentFold;
                const isDoneF = currentFold < 0 && completedFolds.some((f) => f.foldIndex === fi);
                return (
                  <circle
                    key={i}
                    cx={scx(pt.x)}
                    cy={scy(pt.y)}
                    r={isTest ? 5 : 3.5}
                    fill={FOLD_COLORS[fi % FOLD_COLORS.length]}
                    opacity={
                      currentFold < 0
                        ? 0.7
                        : isTest
                        ? 1
                        : 0.25
                    }
                    stroke={isTest ? "white" : "none"}
                    strokeWidth="1"
                  />
                );
              })}

              {/* Axes */}
              <line x1={SP.l} y1={SH - SP.b} x2={SW - SP.r} y2={SH - SP.b} stroke="#334155" strokeWidth="1" />
              <line x1={SP.l} y1={SP.t} x2={SP.l} y2={SH - SP.b} stroke="#334155" strokeWidth="1" />
              {[0, 1, 2, 3, 4, 5].map((v) => (
                <text key={v} x={scx(v)} y={SH - 4} fill="#64748b" fontSize="8" textAnchor="middle">
                  {v}
                </text>
              ))}
              {[0, 5, 10].map((v) => (
                <text key={v} x={SP.l - 4} y={scy(v)} fill="#64748b" fontSize="8" textAnchor="end" dominantBaseline="middle">
                  {v}
                </text>
              ))}
            </svg>
          </div>
        </div>

        {/* Right: controls + fold table */}
        <div className="flex flex-col gap-4">
          {/* Controls */}
          <div className="flex gap-2">
            <button
              onClick={handleRun}
              disabled={isAnimating}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isAnimating
                  ? "bg-[#1e293b] text-[#475569] cursor-not-allowed"
                  : "bg-[#d4af37] text-[#0a0e1a] hover:opacity-90"
              }`}
            >
              {isAnimating
                ? `Running fold ${currentFold + 1}/${k}...`
                : isDone
                ? "Re-run CV"
                : `Run ${k}-Fold CV`}
            </button>
            <button
              onClick={handleReset}
              disabled={isAnimating}
              className="px-4 py-2.5 rounded-xl text-sm border border-[#334155] text-[#94a3b8] hover:border-[#475569] transition-colors disabled:opacity-40"
            >
              Reset
            </button>
          </div>

          {/* Fold results table */}
          <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] overflow-hidden">
            <div className="grid grid-cols-3 gap-px bg-[#1e293b] text-xs">
              <div className="bg-[#0a0e1a] px-3 py-2 font-semibold text-[#94a3b8]">Fold</div>
              <div className="bg-[#0a0e1a] px-3 py-2 font-semibold text-[#94a3b8]">Train MSE</div>
              <div className="bg-[#0a0e1a] px-3 py-2 font-semibold text-[#94a3b8]">Test MSE</div>
            </div>
            <div className="divide-y divide-[#1e293b]">
              {Array.from({ length: k }, (_, fi) => {
                const fold = completedFolds.find((f) => f.foldIndex === fi);
                const isActive = fi === currentFold;
                return (
                  <div
                    key={fi}
                    className={`grid grid-cols-3 gap-px text-xs transition-all duration-300 ${
                      isActive ? "bg-[#1e293b]/60" : ""
                    }`}
                  >
                    <div className="px-3 py-2 font-semibold" style={{ color: FOLD_COLORS[fi % FOLD_COLORS.length] }}>
                      {fi + 1}
                      {isActive && <span className="ml-1 text-[10px] text-[#d4af37]">●</span>}
                    </div>
                    <div className="px-3 py-2 font-mono text-[#94a3b8]">
                      {fold ? fold.trainError.toFixed(4) : isActive ? "…" : "—"}
                    </div>
                    <div className="px-3 py-2 font-mono" style={{ color: fold ? "#3bb4a4" : "#475569" }}>
                      {fold ? fold.testError.toFixed(4) : isActive ? "…" : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          {completedFolds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-4"
            >
              <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wide mb-3">Summary</h3>
              <div className="space-y-2">
                {[
                  { label: "Avg Train MSE", value: avgTrainError.toFixed(4), color: "#d4af37" },
                  {
                    label: "Avg Test MSE",
                    value: `${avgTestError.toFixed(4)} ± ${stdTestError.toFixed(4)}`,
                    color: "#3bb4a4",
                  },
                  { label: "Folds completed", value: `${completedFolds.length} / ${k}`, color: "white" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-[#94a3b8]">{label}</span>
                    <span className="text-xs font-mono font-semibold" style={{ color }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Insight */}
          <div className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-4">
            <h3 className="text-xs font-semibold text-[#d4af37] uppercase tracking-wide mb-2">Key Insight</h3>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              Every point appears in the test set exactly once. The average test MSE ± std gives a
              reliable, low-variance estimate of generalization error.
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
