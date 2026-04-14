"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { normalCDF, normalInvCDF } from "./types";

interface Props {
  cohensD: number;
  alpha: number;
  twoTailed: boolean;
  sampleSizePerGroup: number;
  computedPower: number;
}

const W = 500;
const H = 200;
const PAD = { l: 10, r: 10, t: 12, b: 40 };
const IW = W - PAD.l - PAD.r;
const IH = H - PAD.t - PAD.b;

/** Map a standardized value to SVG x-coordinate */
function xToSvg(x: number, xMin: number, xMax: number): number {
  return PAD.l + ((x - xMin) / (xMax - xMin)) * IW;
}

/** Gaussian PDF value */
function gaussPdf(x: number, mu: number): number {
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * (x - mu) ** 2);
}

/** Build an SVG path for a Gaussian curve */
function buildCurvePath(
  mu: number,
  xMin: number,
  xMax: number,
  scale: number,
  steps = 120
): string {
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = xMin + (i / steps) * (xMax - xMin);
    const y = PAD.t + IH - gaussPdf(x, mu) * scale;
    pts.push(`${i === 0 ? "M" : "L"} ${xToSvg(x, xMin, xMax).toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

/** Build filled area path for region to the RIGHT of cutoff (or left for negative tail) */
function buildFillRight(
  mu: number,
  cutoff: number,
  xMin: number,
  xMax: number,
  scale: number,
  steps = 80
): string {
  const start = Math.max(cutoff, xMin);
  const end = xMax;
  if (start >= end) return "";
  const pts: string[] = [];
  const x0 = xToSvg(start, xMin, xMax);
  const baseline = PAD.t + IH;
  pts.push(`M ${x0.toFixed(1)},${baseline.toFixed(1)}`);
  for (let i = 0; i <= steps; i++) {
    const x = start + (i / steps) * (end - start);
    const svgY = PAD.t + IH - gaussPdf(x, mu) * scale;
    pts.push(`L ${xToSvg(x, xMin, xMax).toFixed(1)},${svgY.toFixed(1)}`);
  }
  const x1 = xToSvg(end, xMin, xMax);
  pts.push(`L ${x1.toFixed(1)},${baseline.toFixed(1)} Z`);
  return pts.join(" ");
}

/** Build filled area path for region to the LEFT of cutoff */
function buildFillLeft(
  mu: number,
  cutoff: number,
  xMin: number,
  xMax: number,
  scale: number,
  steps = 80
): string {
  const start = xMin;
  const end = Math.min(cutoff, xMax);
  if (start >= end) return "";
  const pts: string[] = [];
  const x0 = xToSvg(start, xMin, xMax);
  const baseline = PAD.t + IH;
  pts.push(`M ${x0.toFixed(1)},${baseline.toFixed(1)}`);
  for (let i = 0; i <= steps; i++) {
    const x = start + (i / steps) * (end - start);
    const svgY = PAD.t + IH - gaussPdf(x, mu) * scale;
    pts.push(`L ${xToSvg(x, xMin, xMax).toFixed(1)},${svgY.toFixed(1)}`);
  }
  const x1 = xToSvg(end, xMin, xMax);
  pts.push(`L ${x1.toFixed(1)},${baseline.toFixed(1)} Z`);
  return pts.join(" ");
}

export default function PowerVisualization({
  cohensD,
  alpha,
  twoTailed,
  computedPower,
}: Props) {
  const paths = useMemo(() => {
    const d = Math.max(0.01, cohensD);
    const xMin = -4;
    const xMax = d + 4;
    const range = xMax - xMin;

    // Scale so peak height fills ~70% of IH
    const peakPdf = gaussPdf(0, 0);
    const scale = (IH * 0.72) / peakPdf;

    const zAlpha = normalInvCDF(twoTailed ? 1 - alpha / 2 : 1 - alpha);
    const critRight = zAlpha;
    const critLeft = twoTailed ? -zAlpha : -99;

    // Curves
    const nullCurve = buildCurvePath(0, xMin, xMax, scale);
    const altCurve = buildCurvePath(d, xMin, xMax, scale);

    // Alpha region: right tail of null (and left tail if two-tailed)
    const alphaFillRight = buildFillRight(0, critRight, xMin, xMax, scale);
    const alphaFillLeft = twoTailed ? buildFillLeft(0, critLeft, xMin, xMax, scale) : "";

    // Power region: right tail of alternative (beyond critRight)
    const powerFill = buildFillRight(d, critRight, xMin, xMax, scale);

    // Beta region: left body of alternative (below critRight)
    const betaFill = buildFillLeft(d, critRight, xMin, xMax, scale);

    // Critical value lines
    const critRightX = xToSvg(critRight, xMin, xMax);
    const critLeftX = twoTailed ? xToSvg(critLeft, xMin, xMax) : null;

    // X-axis tick marks
    const ticks: { x: number; label: string }[] = [];
    for (let v = Math.ceil(xMin); v <= Math.floor(xMax); v++) {
      ticks.push({ x: xToSvg(v, xMin, xMax), label: String(v) });
    }

    return {
      nullCurve,
      altCurve,
      alphaFillRight,
      alphaFillLeft,
      powerFill,
      betaFill,
      critRightX,
      critLeftX,
      ticks,
      range,
      xMin,
      xMax,
      d,
    };
  }, [cohensD, alpha, twoTailed]);

  const beta = 1 - computedPower;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
          Power Visualization
        </p>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 rounded-sm bg-[#ef4444]/60" />
            <span className="text-[#94a3b8]">α</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 rounded-sm bg-[#3bb4a4]/60" />
            <span className="text-[#94a3b8]">Power</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 rounded-sm bg-[#475569]/60" />
            <span className="text-[#94a3b8]">β</span>
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="overflow-visible">
        {/* Baseline */}
        <line
          x1={PAD.l} y1={PAD.t + IH}
          x2={PAD.l + IW} y2={PAD.t + IH}
          stroke="#334155" strokeWidth="1"
        />

        {/* Beta fill (gray) — alternative curve below critical */}
        <motion.path
          d={paths.betaFill}
          fill="#475569"
          fillOpacity="0.35"
          animate={{ d: paths.betaFill }}
          transition={{ duration: 0.35 }}
        />

        {/* Power fill (green) — alternative curve above critical */}
        <motion.path
          d={paths.powerFill}
          fill="#3bb4a4"
          fillOpacity="0.45"
          animate={{ d: paths.powerFill }}
          transition={{ duration: 0.35 }}
        />

        {/* Alpha fill right (red) — null curve right tail */}
        <motion.path
          d={paths.alphaFillRight}
          fill="#ef4444"
          fillOpacity="0.45"
          animate={{ d: paths.alphaFillRight }}
          transition={{ duration: 0.35 }}
        />

        {/* Alpha fill left (red) — null curve left tail if two-tailed */}
        {paths.alphaFillLeft && (
          <motion.path
            d={paths.alphaFillLeft}
            fill="#ef4444"
            fillOpacity="0.45"
            animate={{ d: paths.alphaFillLeft }}
            transition={{ duration: 0.35 }}
          />
        )}

        {/* Null curve (white outline) */}
        <motion.path
          d={paths.nullCurve}
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1.5"
          animate={{ d: paths.nullCurve }}
          transition={{ duration: 0.35 }}
        />

        {/* Alternative curve (gold outline) */}
        <motion.path
          d={paths.altCurve}
          fill="none"
          stroke="#d4af37"
          strokeWidth="1.5"
          animate={{ d: paths.altCurve }}
          transition={{ duration: 0.35 }}
        />

        {/* Critical value line(s) */}
        <motion.line
          x1={paths.critRightX} y1={PAD.t}
          x2={paths.critRightX} y2={PAD.t + IH}
          stroke="#d4af37" strokeWidth="1" strokeDasharray="4,3"
          animate={{ x1: paths.critRightX, x2: paths.critRightX }}
          transition={{ duration: 0.35 }}
        />
        {paths.critLeftX !== null && (
          <motion.line
            x1={paths.critLeftX} y1={PAD.t}
            x2={paths.critLeftX} y2={PAD.t + IH}
            stroke="#d4af37" strokeWidth="1" strokeDasharray="4,3"
            animate={{ x1: paths.critLeftX, x2: paths.critLeftX }}
            transition={{ duration: 0.35 }}
          />
        )}

        {/* Tick marks and labels */}
        {paths.ticks.map(({ x, label }) => (
          <g key={label}>
            <line x1={x} y1={PAD.t + IH} x2={x} y2={PAD.t + IH + 4} stroke="#334155" strokeWidth="1" />
            <text x={x} y={PAD.t + IH + 13} textAnchor="middle" fill="#475569" fontSize="7">
              {label}
            </text>
          </g>
        ))}

        {/* Curve labels */}
        <text
          x={xToSvg(0, paths.xMin, paths.xMax)}
          y={PAD.t + 9}
          textAnchor="middle"
          fill="rgba(255,255,255,0.6)"
          fontSize="7.5"
          fontWeight="600"
        >
          H₀ (μ=0)
        </text>
        <text
          x={Math.min(xToSvg(paths.d, paths.xMin, paths.xMax), W - 36)}
          y={PAD.t + 9}
          textAnchor="middle"
          fill="#d4af37"
          fontSize="7.5"
          fontWeight="600"
        >
          H₁ (μ=d)
        </text>

        {/* Numeric labels below axis */}
        <text x={PAD.l + IW * 0.15} y={H - 4} fill="#ef4444" fontSize="7" textAnchor="middle">
          α={alpha.toFixed(3)}
        </text>
        <text x={PAD.l + IW * 0.5} y={H - 4} fill="#475569" fontSize="7" textAnchor="middle">
          β={beta.toFixed(2)}
        </text>
        <text x={PAD.l + IW * 0.85} y={H - 4} fill="#3bb4a4" fontSize="7" textAnchor="middle">
          Power={computedPower.toFixed(2)}
        </text>
      </svg>

      {/* Insight badge */}
      <div className="mt-2 rounded-lg bg-[#1e293b] px-3 py-2 text-[10px] text-[#94a3b8]">
        Larger d or larger n pushes the curves apart → more power (green area grows, gray area shrinks)
      </div>
    </div>
  );
}
