"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";

const NUM_POINTS = 10;

// Deterministic seeded PRNG (mulberry32) so the same points are sampled for a
// given dimension on every render. No Math.random in render scope.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Sample n points uniformly from the unit hypercube [0,1]^d
function samplePoints(n: number, d: number): number[][] {
  const rand = mulberry32(1234 + d * 7919);
  return Array.from({ length: n }, () =>
    Array.from({ length: d }, () => rand())
  );
}

function gammaHalf(n: number): number {
  // Gamma(n/2 + 1) for volume formula
  // n here is dimension d; we need Gamma(d/2 + 1)
  const x = n / 2 + 1;
  if (Math.abs(x - Math.round(x)) < 1e-9) {
    // Integer: Gamma(k) = (k-1)!
    let r = 1;
    for (let i = 1; i < Math.round(x); i++) r *= i;
    return r;
  } else {
    // Half-integer: use recurrence from Gamma(1/2) = sqrt(pi)
    // Gamma(k + 1/2) = (2k)! / (4^k * k!) * sqrt(pi)
    const k = Math.round(x - 0.5); // x = k + 0.5
    const sqrtPi = Math.sqrt(Math.PI);
    let num = 1;
    for (let i = 1; i <= 2 * k; i++) num *= i;
    let denom = Math.pow(4, k);
    let kFact = 1;
    for (let i = 1; i <= k; i++) kFact *= i;
    denom *= kFact;
    return (num / denom) * sqrtPi;
  }
}

function unitBallVolume(d: number): number {
  if (d === 0) return 1;
  if (d === 1) return 2;
  // V(d) = pi^(d/2) / Gamma(d/2 + 1)
  const logV = (d / 2) * Math.log(Math.PI) - Math.log(gammaHalf(d));
  return Math.exp(logV);
}

function euclidean(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

const W = 340;
const H = 260;
const PAD = { l: 28, r: 16, t: 16, b: 28 };

function toSvgX(x: number) {
  return PAD.l + x * (W - PAD.l - PAD.r);
}
function toSvgY(y: number) {
  return PAD.t + (1 - y) * (H - PAD.t - PAD.b);
}

interface Props {
  onHighDimExplored: () => void;
}

export default function CurseOfDimensionality({ onHighDimExplored }: Props) {
  const [dim, setDim] = useState(2);
  const [exploredTriggered, setExploredTriggered] = useState(false);

  function handleDimChange(e: React.ChangeEvent<HTMLInputElement>) {
    const d = Number(e.target.value);
    setDim(d);
    if (d >= 50 && !exploredTriggered) {
      setExploredTriggered(true);
      onHighDimExplored();
    }
  }

  const metrics = useMemo(() => {
    // Sample 10 points uniformly from [0,1]^dim and compute BOTH displayed
    // distance metrics directly from that sample.
    const points = samplePoints(NUM_POINTS, dim);

    let minD = Infinity;
    let maxD = 0;
    let nnSum = 0;
    for (let i = 0; i < points.length; i++) {
      let nearest = Infinity;
      for (let j = 0; j < points.length; j++) {
        if (i === j) continue;
        const d = euclidean(points[i], points[j]);
        if (d < nearest) nearest = d;
        if (j > i) {
          if (d < minD) minD = d;
          if (d > maxD) maxD = d;
        }
      }
      nnSum += nearest;
    }
    // Mean nearest-neighbor distance of the sampled points
    const avgDist = nnSum / points.length;
    // Distance concentration: max/min pairwise distance. In high dimensions
    // this ratio approaches 1 (all points become nearly equidistant).
    const distanceRatio = minD > 0 ? maxD / minD : Infinity;

    // Unit ball volume
    const ballVol = unitBallVolume(dim);
    const ballVolDisplay = ballVol < 1e-10 ? "≈ 0" : ballVol < 0.001 ? ballVol.toExponential(2) : ballVol.toFixed(4);

    return { points, avgDist, ballVolDisplay, distanceRatio, ballVol };
  }, [dim]);

  // Show the first 2 coordinates of the ACTUAL sampled points (re-sampled per
  // dimension), so the scatter reflects the data the metrics are computed from.
  const projectedPoints = useMemo(() => {
    return metrics.points.map((p) => ({
      x: p[0],
      y: dim >= 2 ? p[1] : 0.5,
    }));
  }, [metrics.points, dim]);

  const avgDistSeverity =
    metrics.avgDist < 0.5 ? "green" : metrics.avgDist < 1.5 ? "orange" : "red";
  // Large ratio = distances informative (good); ratio near 1 = concentration (bad).
  const ratioSeverity =
    metrics.distanceRatio > 4 ? "green" : metrics.distanceRatio > 2 ? "orange" : "red";
  const ballVolSeverity =
    metrics.ballVol > 0.5 ? "green" : metrics.ballVol > 0.01 ? "orange" : "red";

  const severityColor = (s: string) =>
    s === "green" ? "#3bb4a4" : s === "orange" ? "#f59e0b" : "#ef4444";
  const severityBg = (s: string) =>
    s === "green" ? "#3bb4a4/10" : s === "orange" ? "#f59e0b/10" : "#ef4444/10";

  const dimLabel =
    dim <= 3 ? "Low-dim: clustered" : dim <= 30 ? "Mid-dim: spreading" : "High-dim: sparse, nearly equidistant";
  const dimLabelColor = dim <= 3 ? "#3bb4a4" : dim <= 30 ? "#f59e0b" : "#ef4444";

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
      <h2 className="text-xl font-bold text-white mb-1">
        Curse of Dimensionality
      </h2>
      <p className="text-sm text-[#94a3b8] mb-5 leading-relaxed">
        Move the slider to increase dimensions from 1 to 100. Watch how distances become meaningless
        and data grows impossibly sparse.
      </p>

      {/* Slider */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-white">
            Dimensions: <span className="text-[#d4af37]">{dim}</span>
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ color: dimLabelColor, background: `${dimLabelColor}18` }}>
            {dimLabel}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={100}
          value={dim}
          onChange={handleDimChange}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #1e5d8a ${(dim - 1) / 99 * 100}%, #1e293b ${(dim - 1) / 99 * 100}%)`,
          }}
        />
        <div className="flex justify-between text-[10px] text-[#475569] mt-1">
          <span>1</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
      </div>

      {/* SVG Scatter */}
      <div className="rounded-xl border border-[#1e293b] bg-[#0a0f1e] p-3 mb-5 overflow-hidden">
        <p className="text-[11px] text-[#475569] mb-2">
          First 2 coordinates of the 10 sampled points (re-sampled at each dimension)
        </p>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ maxHeight: 240 }}
        >
          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}>
              <line
                x1={toSvgX(v)} y1={PAD.t}
                x2={toSvgX(v)} y2={H - PAD.b}
                stroke="#1e293b" strokeWidth={1}
              />
              <line
                x1={PAD.l} y1={toSvgY(v)}
                x2={W - PAD.r} y2={toSvgY(v)}
                stroke="#1e293b" strokeWidth={1}
              />
            </g>
          ))}
          {/* Axes */}
          <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="#334155" strokeWidth={1} />
          <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="#334155" strokeWidth={1} />

          {/* Points */}
          {projectedPoints.map((pt, i) => (
            <motion.circle
              key={i}
              cx={toSvgX(pt.x)}
              cy={toSvgY(pt.y)}
              r={5}
              fill="#3bb4a4"
              fillOpacity={0.85}
              stroke="#0f172a"
              strokeWidth={1.5}
              initial={false}
              animate={{ cx: toSvgX(pt.x), cy: toSvgY(pt.y) }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            />
          ))}

          {/* Axis labels */}
          <text x={toSvgX(0.5)} y={H - 4} textAnchor="middle" fill="#475569" fontSize={10}>
            Feature 1 (dim 1)
          </text>
          <text
            x={10}
            y={toSvgY(0.5)}
            textAnchor="middle"
            fill="#475569"
            fontSize={10}
            transform={`rotate(-90, 10, ${toSvgY(0.5)})`}
          >
            Feature 2 (dim 2)
          </text>
        </svg>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Avg NN Distance */}
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: `${severityColor(avgDistSeverity)}30`, background: `${severityColor(avgDistSeverity)}08` }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">Avg NN Distance</span>
            <span className="w-2 h-2 rounded-full" style={{ background: severityColor(avgDistSeverity) }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: severityColor(avgDistSeverity) }}>
            {metrics.avgDist.toFixed(3)}
          </p>
          <p className="text-[11px] text-[#475569] mt-1">
            {avgDistSeverity === "green" ? "Neighbors are close" : avgDistSeverity === "orange" ? "Neighbors drifting apart" : "Nearest neighbor is far away"}
          </p>
        </div>

        {/* Unit Ball Volume */}
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: `${severityColor(ballVolSeverity)}30`, background: `${severityColor(ballVolSeverity)}08` }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">Unit Ball Volume</span>
            <span className="w-2 h-2 rounded-full" style={{ background: severityColor(ballVolSeverity) }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: severityColor(ballVolSeverity) }}>
            {metrics.ballVolDisplay}
          </p>
          <p className="text-[11px] text-[#475569] mt-1">
            {ballVolSeverity === "green" ? "Volume still significant" : ballVolSeverity === "orange" ? "Rapidly shrinking" : "Volume collapses to zero"}
          </p>
        </div>

        {/* Distance concentration ratio */}
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: `${severityColor(ratioSeverity)}30`, background: `${severityColor(ratioSeverity)}08` }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">Max/Min Distance Ratio</span>
            <span className="w-2 h-2 rounded-full" style={{ background: severityColor(ratioSeverity) }} />
          </div>
          <p className="text-2xl font-bold" style={{ color: severityColor(ratioSeverity) }}>
            {metrics.distanceRatio > 99 ? ">99" : metrics.distanceRatio.toFixed(2)}
          </p>
          <p className="text-[11px] text-[#475569] mt-1">
            {ratioSeverity === "green" ? "Large ratio: distances informative" : ratioSeverity === "orange" ? "Ratio shrinking toward 1" : "Ratio near 1: nearly equidistant"}
          </p>
        </div>
      </div>

      {dim >= 50 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/5 p-3"
        >
          <p className="text-sm text-[#ef4444] font-semibold">
            High-dimensional territory reached!
          </p>
          <p className="text-[12px] text-[#94a3b8] mt-0.5">
            At {dim} dimensions, your 10 data points occupy an astronomically large space.
            Every point is nearly equidistant from every other — distance metrics lose their meaning.
          </p>
        </motion.div>
      )}

      <div className="mt-4 text-[11px] text-[#475569]">
        Drag to dim &ge; 50 to unlock next section
        {exploredTriggered && (
          <span className="ml-2 text-[#3bb4a4] font-semibold">Unlocked!</span>
        )}
      </div>
    </div>
  );
}
