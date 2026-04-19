"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Unscaled data: salary [0,1000], experience [0,10]
const RAW_POINTS = [
  { salary: 50, experience: 1 },
  { salary: 300, experience: 5 },
  { salary: 750, experience: 9 },
  { salary: 120, experience: 2 },
  { salary: 480, experience: 6 },
  { salary: 900, experience: 8 },
  { salary: 200, experience: 3 },
  { salary: 620, experience: 7 },
];

// Points of interest for distance demonstration (indices)
const PAIRS = [
  [0, 2], // very different
  [1, 4], // moderately different
  [3, 6], // close
];

function zScore(arr: number[]): { val: number; mean: number; std: number }[] {
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length;
  const s = Math.sqrt(variance);
  return arr.map((v) => ({ val: (v - m) / (s + 1e-10), mean: m, std: s }));
}

function euclidDist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

const W = 320;
const H = 260;
const PAD = { l: 48, r: 16, t: 16, b: 40 };

function sx(v: number, min: number, max: number) {
  return PAD.l + ((v - min) / (max - min)) * (W - PAD.l - PAD.r);
}
function sy(v: number, min: number, max: number) {
  return PAD.t + ((max - v) / (max - min)) * (H - PAD.t - PAD.b);
}

const POINT_COLORS = ["#d4af37", "#3bb4a4", "#ef4444", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899", "#84cc16"];

interface Props {
  onScalingExplored: () => void;
}

export default function FeatureScalingDemo({ onScalingExplored }: Props) {
  const [showDistances, setShowDistances] = useState(false);
  const [triggered, setTriggered] = useState(false);

  function handleToggle() {
    setShowDistances((v) => !v);
    if (!triggered) {
      setTriggered(true);
      onScalingExplored();
    }
  }

  const salaries = RAW_POINTS.map((p) => p.salary);
  const experiences = RAW_POINTS.map((p) => p.experience);

  const scaledSalaries = zScore(salaries);
  const scaledExperiences = zScore(experiences);

  const scaledPoints = RAW_POINTS.map((_, i) => ({
    x: scaledSalaries[i].val,
    y: scaledExperiences[i].val,
  }));

  // Bounds
  const rawXMin = 0, rawXMax = 1000;
  const rawYMin = 0, rawYMax = 10;
  const scXMin = Math.min(...scaledPoints.map((p) => p.x)) - 0.3;
  const scXMax = Math.max(...scaledPoints.map((p) => p.x)) + 0.3;
  const scYMin = Math.min(...scaledPoints.map((p) => p.y)) - 0.3;
  const scYMax = Math.max(...scaledPoints.map((p) => p.y)) + 0.3;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
      <h2 className="text-xl font-bold text-white mb-1">Feature Scaling Demo</h2>
      <p className="text-sm text-[#94a3b8] mb-4 leading-relaxed">
        When features have vastly different scales, distance-based algorithms are dominated by the
        largest-scale feature. Standardization (z-score) fixes this.
      </p>

      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={handleToggle}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${showDistances
            ? "bg-[#1e5d8a] border-[#1e5d8a] text-white"
            : "border-[#1e293b] text-[#94a3b8] hover:border-[#1e5d8a] hover:text-white"
            }`}
        >
          {showDistances ? "Hide distances" : "Show distances"}
        </button>
        {triggered && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] text-[#3bb4a4] font-semibold"
          >
            Scaling explored!
          </motion.span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Unscaled */}
        <div className="rounded-xl border border-[#1e293b] bg-[#0a0f1e] p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-[#94a3b8]">Unscaled Data</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20">
              Scale-biased
            </span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 240 }}>
            {/* Grid lines */}
            {[0, 250, 500, 750, 1000].map((v) => (
              <g key={v}>
                <line x1={sx(v, rawXMin, rawXMax)} y1={PAD.t} x2={sx(v, rawXMin, rawXMax)} y2={H - PAD.b} stroke="#1e293b" strokeWidth={0.8} />
                <text x={sx(v, rawXMin, rawXMax)} y={H - PAD.b + 14} textAnchor="middle" fill="#475569" fontSize={8}>{v}</text>
              </g>
            ))}
            {[0, 2.5, 5, 7.5, 10].map((v) => (
              <g key={v}>
                <line x1={PAD.l} y1={sy(v, rawYMin, rawYMax)} x2={W - PAD.r} y2={sy(v, rawYMin, rawYMax)} stroke="#1e293b" strokeWidth={0.8} />
                <text x={PAD.l - 4} y={sy(v, rawYMin, rawYMax) + 3} textAnchor="end" fill="#475569" fontSize={8}>{v}</text>
              </g>
            ))}
            {/* Axes */}
            <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="#334155" strokeWidth={1} />
            <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="#334155" strokeWidth={1} />

            {/* Distance lines */}
            <AnimatePresence>
              {showDistances && PAIRS.map(([a, b], pairIdx) => {
                const ax = sx(RAW_POINTS[a].salary, rawXMin, rawXMax);
                const ay = sy(RAW_POINTS[a].experience, rawYMin, rawYMax);
                const bx = sx(RAW_POINTS[b].salary, rawXMin, rawXMax);
                const by_ = sy(RAW_POINTS[b].experience, rawYMin, rawYMax);
                const dist = euclidDist(RAW_POINTS[a].salary, RAW_POINTS[a].experience, RAW_POINTS[b].salary, RAW_POINTS[b].experience);
                const colors = ["#f59e0b", "#8b5cf6", "#06b6d4"];
                return (
                  <g key={pairIdx}>
                    <motion.line
                      x1={ax} y1={ay} x2={bx} y2={by_}
                      stroke={colors[pairIdx]}
                      strokeWidth={1.5}
                      strokeDasharray="5,3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.7 }}
                      exit={{ opacity: 0 }}
                    />
                    <motion.text
                      x={(ax + bx) / 2 + 4}
                      y={(ay + by_) / 2 - 4}
                      fill={colors[pairIdx]}
                      fontSize={8}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {dist.toFixed(0)}
                    </motion.text>
                  </g>
                );
              })}
            </AnimatePresence>

            {/* Points */}
            {RAW_POINTS.map((pt, i) => (
              <circle
                key={i}
                cx={sx(pt.salary, rawXMin, rawXMax)}
                cy={sy(pt.experience, rawYMin, rawYMax)}
                r={5}
                fill={POINT_COLORS[i]}
                fillOpacity={0.8}
                stroke="#0f172a"
                strokeWidth={1.5}
              />
            ))}

            {/* Axis labels */}
            <text x={(PAD.l + W - PAD.r) / 2} y={H - 2} textAnchor="middle" fill="#94a3b8" fontSize={9}>Salary ($)</text>
            <text x={8} y={(PAD.t + H - PAD.b) / 2} textAnchor="middle" fill="#94a3b8" fontSize={9} transform={`rotate(-90, 8, ${(PAD.t + H - PAD.b) / 2})`}>Exp (yrs)</text>
          </svg>
        </div>

        {/* Standardized */}
        <div className="rounded-xl border border-[#1e293b] bg-[#0a0f1e] p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-[#94a3b8]">Standardized (z-score)</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#3bb4a4]/10 text-[#3bb4a4] border border-[#3bb4a4]/20">
              Scale-balanced
            </span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 240 }}>
            {/* Grid lines */}
            {[-2, -1, 0, 1, 2].map((v) => {
              if (v < scXMin || v > scXMax) return null;
              return (
                <g key={v}>
                  <line x1={sx(v, scXMin, scXMax)} y1={PAD.t} x2={sx(v, scXMin, scXMax)} y2={H - PAD.b} stroke="#1e293b" strokeWidth={0.8} />
                  <text x={sx(v, scXMin, scXMax)} y={H - PAD.b + 14} textAnchor="middle" fill="#475569" fontSize={8}>{v}σ</text>
                </g>
              );
            })}
            {[-2, -1, 0, 1, 2].map((v) => {
              if (v < scYMin || v > scYMax) return null;
              return (
                <g key={v}>
                  <line x1={PAD.l} y1={sy(v, scYMin, scYMax)} x2={W - PAD.r} y2={sy(v, scYMin, scYMax)} stroke="#1e293b" strokeWidth={0.8} />
                  <text x={PAD.l - 4} y={sy(v, scYMin, scYMax) + 3} textAnchor="end" fill="#475569" fontSize={8}>{v}</text>
                </g>
              );
            })}
            {/* Axes */}
            <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="#334155" strokeWidth={1} />
            <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="#334155" strokeWidth={1} />

            {/* Zero crossing */}
            {scXMin < 0 && scXMax > 0 && (
              <line x1={sx(0, scXMin, scXMax)} y1={PAD.t} x2={sx(0, scXMin, scXMax)} y2={H - PAD.b} stroke="#334155" strokeWidth={0.8} strokeDasharray="3,3" />
            )}
            {scYMin < 0 && scYMax > 0 && (
              <line x1={PAD.l} y1={sy(0, scYMin, scYMax)} x2={W - PAD.r} y2={sy(0, scYMin, scYMax)} stroke="#334155" strokeWidth={0.8} strokeDasharray="3,3" />
            )}

            {/* Distance lines */}
            <AnimatePresence>
              {showDistances && PAIRS.map(([a, b], pairIdx) => {
                const ax = sx(scaledPoints[a].x, scXMin, scXMax);
                const ay = sy(scaledPoints[a].y, scYMin, scYMax);
                const bx = sx(scaledPoints[b].x, scXMin, scXMax);
                const by_ = sy(scaledPoints[b].y, scYMin, scYMax);
                const dist = euclidDist(scaledPoints[a].x, scaledPoints[a].y, scaledPoints[b].x, scaledPoints[b].y);
                const colors = ["#f59e0b", "#8b5cf6", "#06b6d4"];
                return (
                  <g key={pairIdx}>
                    <motion.line
                      x1={ax} y1={ay} x2={bx} y2={by_}
                      stroke={colors[pairIdx]}
                      strokeWidth={1.5}
                      strokeDasharray="5,3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.7 }}
                      exit={{ opacity: 0 }}
                    />
                    <motion.text
                      x={(ax + bx) / 2 + 4}
                      y={(ay + by_) / 2 - 4}
                      fill={colors[pairIdx]}
                      fontSize={8}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {dist.toFixed(2)}
                    </motion.text>
                  </g>
                );
              })}
            </AnimatePresence>

            {/* Points */}
            {scaledPoints.map((pt, i) => (
              <circle
                key={i}
                cx={sx(pt.x, scXMin, scXMax)}
                cy={sy(pt.y, scYMin, scYMax)}
                r={5}
                fill={POINT_COLORS[i]}
                fillOpacity={0.8}
                stroke="#0f172a"
                strokeWidth={1.5}
              />
            ))}

            {/* Axis labels */}
            <text x={(PAD.l + W - PAD.r) / 2} y={H - 2} textAnchor="middle" fill="#94a3b8" fontSize={9}>Salary (z-score)</text>
            <text x={8} y={(PAD.t + H - PAD.b) / 2} textAnchor="middle" fill="#94a3b8" fontSize={9} transform={`rotate(-90, 8, ${(PAD.t + H - PAD.b) / 2})`}>Exp (z-score)</text>
          </svg>
        </div>
      </div>

      {/* Comparison table */}
      <AnimatePresence>
        {showDistances && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            <div className="rounded-xl border border-[#1e293b] bg-[#0a0f1e] p-4">
              <p className="text-[11px] font-semibold text-[#94a3b8] mb-3 uppercase tracking-wide">Distance Comparison</p>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-[#475569] border-b border-[#1e293b]">
                      <th className="text-left pb-2 pr-4">Point Pair</th>
                      <th className="text-right pb-2 pr-4">Unscaled Distance</th>
                      <th className="text-right pb-2">Scaled Distance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PAIRS.map(([a, b], i) => {
                      const colors = ["#f59e0b", "#8b5cf6", "#06b6d4"];
                      const rawDist = euclidDist(RAW_POINTS[a].salary, RAW_POINTS[a].experience, RAW_POINTS[b].salary, RAW_POINTS[b].experience);
                      const scaledDist = euclidDist(scaledPoints[a].x, scaledPoints[a].y, scaledPoints[b].x, scaledPoints[b].y);
                      return (
                        <tr key={i} className="border-b border-[#1e293b]/50">
                          <td className="py-2 pr-4">
                            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: colors[i] }} />
                            <span className="text-white">
                              ({RAW_POINTS[a].salary}, {RAW_POINTS[a].experience}) ↔ ({RAW_POINTS[b].salary}, {RAW_POINTS[b].experience})
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-right text-[#ef4444] font-mono">{rawDist.toFixed(1)}</td>
                          <td className="py-2 text-right text-[#3bb4a4] font-mono">{scaledDist.toFixed(3)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-[#475569] mt-3">
                Unscaled: Salary dominates (range 0–1000). Scaled: Both features contribute equally.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
        <div className="rounded-lg bg-[#1e293b]/40 p-3 border border-[#1e293b]">
          <p className="text-[#d4af37] font-semibold mb-0.5">Formula</p>
          <p className="text-[#94a3b8] font-mono">z = (x − μ) / σ</p>
        </div>
        <div className="rounded-lg bg-[#1e293b]/40 p-3 border border-[#1e293b]">
          <p className="text-[#d4af37] font-semibold mb-0.5">When to scale</p>
          <p className="text-[#94a3b8]">KNN, SVM, PCA, gradient descent</p>
        </div>
        <div className="rounded-lg bg-[#1e293b]/40 p-3 border border-[#1e293b]">
          <p className="text-[#d4af37] font-semibold mb-0.5">Scale-invariant</p>
          <p className="text-[#94a3b8]">Decision trees, Random Forests</p>
        </div>
      </div>
    </div>
  );
}
