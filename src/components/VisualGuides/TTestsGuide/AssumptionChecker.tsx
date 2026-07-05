"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { mean, stdDev } from "./types";

// ── Normal inverse CDF for Q-Q plot ──────────────────────────────────────────
function normalInvCDF(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [2.515517, 0.802853, 0.010328];
  const b = [1.432788, 0.189269, 0.001308];
  const t = p < 0.5
    ? Math.sqrt(-2 * Math.log(p))
    : Math.sqrt(-2 * Math.log(1 - p));
  const x = t - (a[0] + t * (a[1] + t * a[2])) / (1 + t * (b[0] + t * (b[1] + t * b[2])));
  return p < 0.5 ? -x : x;
}

// ── Q-Q correlation normality check ──────────────────────────────────────────
// Squared Pearson correlation between the sorted data and the expected normal
// quantiles. This measures how straight the Q-Q plot is. It is a descriptive
// check, NOT the formal Shapiro-Wilk test, and it produces no p-value.
function qqCorrelationSquared(data: number[]): number {
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  const m = mean(sorted);
  // Expected normal quantiles
  const quantiles = sorted.map((_, i) => normalInvCDF((i + 1) / (n + 1)));
  const qMean = mean(quantiles);
  // Pearson correlation between sorted data and expected quantiles
  let num = 0, dSorted = 0, dQuant = 0;
  for (let i = 0; i < n; i++) {
    num += (sorted[i] - m) * (quantiles[i] - qMean);
    dSorted += (sorted[i] - m) ** 2;
    dQuant += (quantiles[i] - qMean) ** 2;
  }
  const denom = Math.sqrt(dSorted * dQuant);
  return denom === 0 ? 1 : Math.min(1, (num / denom) ** 2);
}

interface Props {
  data: number[];
  title: string;
  onChecked: () => void;
}

export default function AssumptionChecker({ data, title, onChecked }: Props) {
  const [checked, setChecked] = useState(false);
  const [W, setW] = useState<number | null>(null);

  const runCheck = () => {
    const w = qqCorrelationSquared(data);
    setW(w);
    setChecked(true);
    onChecked();
  };

  // ── Histogram ──────────────────────────────────────────────────────────────
  const HistogramSVG = () => {
    const n = data.length;
    if (n === 0) return null;
    const mn = Math.min(...data), mx = Math.max(...data);
    const binCount = 9;
    const binWidth = (mx - mn) / binCount || 1;
    const bins = Array.from({ length: binCount }, (_, i) => ({
      x: mn + i * binWidth,
      count: 0,
    }));
    data.forEach(v => {
      const idx = Math.min(Math.floor((v - mn) / binWidth), binCount - 1);
      bins[idx].count++;
    });
    const maxCount = Math.max(...bins.map(b => b.count), 1);
    const W_SVG = 280, H_SVG = 100;
    const PAD = { l: 24, r: 8, t: 8, b: 20 };
    const IW = W_SVG - PAD.l - PAD.r;
    const IH = H_SVG - PAD.t - PAD.b;

    // Normal curve overlay
    const m = mean(data);
    const s = stdDev(data);
    const normalY = (x: number) => {
      const px = (1 / (s * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - m) / s) ** 2);
      const scaleFactor = (IH / (maxCount / n / binWidth));
      return PAD.t + IH - px * scaleFactor * n * binWidth;
    };
    const curvePoints = Array.from({ length: 60 }, (_, i) => {
      const x = mn + (i / 59) * (mx - mn);
      const px = PAD.l + ((x - mn) / (mx - mn || 1)) * IW;
      const py = normalY(x);
      return `${px},${Math.max(PAD.t, Math.min(PAD.t + IH, py))}`;
    }).join(" ");

    return (
      <div>
        <p className="text-[10px] text-[#94a3b8] mb-1 font-semibold">Histogram</p>
        <svg viewBox={`0 0 ${W_SVG} ${H_SVG}`} width="100%">
          <line x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
          <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
          {bins.map((b, i) => {
            const bw = (IW / binCount) - 1;
            const bh = (b.count / maxCount) * IH;
            const bx = PAD.l + (i / binCount) * IW;
            return (
              <rect key={i} x={bx} y={PAD.t + IH - bh} width={bw} height={bh}
                fill="#1e5d8a" opacity="0.85" rx="1" />
            );
          })}
          {/* Normal curve */}
          <polyline points={curvePoints} fill="none" stroke="#d4af37" strokeWidth="1.5" />
          {/* Axis labels */}
          <text x={PAD.l} y={H_SVG - 4} textAnchor="middle" fill="#475569" fontSize="7">
            {mn.toFixed(0)}
          </text>
          <text x={PAD.l + IW} y={H_SVG - 4} textAnchor="middle" fill="#475569" fontSize="7">
            {mx.toFixed(0)}
          </text>
        </svg>
      </div>
    );
  };

  // ── Q-Q Plot ───────────────────────────────────────────────────────────────
  const QQPlot = () => {
    const n = data.length;
    const sorted = [...data].sort((a, b) => a - b);
    const m = mean(sorted);
    const s = stdDev(sorted) || 1;
    // Standardize
    const standardized = sorted.map(v => (v - m) / s);
    // Theoretical quantiles
    const theoretical = sorted.map((_, i) => normalInvCDF((i + 1) / (n + 1)));
    const allQ = [...theoretical.filter(isFinite)];
    const minQ = Math.min(...allQ), maxQ = Math.max(...allQ);
    const minD = Math.min(...standardized), maxD = Math.max(...standardized);

    const W_SVG = 200, H_SVG = 150;
    const PAD = { l: 24, r: 8, t: 8, b: 20 };
    const IW = W_SVG - PAD.l - PAD.r;
    const IH = H_SVG - PAD.t - PAD.b;

    const tx = (v: number) => PAD.l + ((v - minQ) / (maxQ - minQ || 1)) * IW;
    const ty = (v: number) => PAD.t + IH - ((v - minD) / (maxD - minD || 1)) * IH;

    // Reference line: y = x (standardized)
    const refStart = { x: tx(minQ), y: ty(minQ) };
    const refEnd = { x: tx(maxQ), y: ty(maxQ) };

    return (
      <div>
        <p className="text-[10px] text-[#94a3b8] mb-1 font-semibold">Q-Q Plot</p>
        <svg viewBox={`0 0 ${W_SVG} ${H_SVG}`} width="100%">
          <line x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
          <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
          {/* Reference line */}
          <line x1={refStart.x} y1={refStart.y} x2={refEnd.x} y2={refEnd.y}
            stroke="#d4af37" strokeWidth="1" strokeDasharray="3,2" />
          {/* Points */}
          {standardized.map((d, i) => {
            const q = theoretical[i];
            if (!isFinite(q)) return null;
            return (
              <circle key={i} cx={tx(q)} cy={ty(d)} r="2" fill="white" opacity="0.7" />
            );
          })}
          <text x={PAD.l + IW / 2} y={H_SVG - 4} textAnchor="middle" fill="#475569" fontSize="6">
            Theoretical quantiles
          </text>
          <text x={PAD.l - 4} y={PAD.t + IH / 2} textAnchor="middle" fill="#475569" fontSize="6"
            transform={`rotate(-90, ${PAD.l - 12}, ${PAD.t + IH / 2})`}>
            Observed
          </text>
        </svg>
      </div>
    );
  };

  // ── Q-Q correlation badge ──────────────────────────────────────────────────
  const NormalityBadge = ({ w }: { w: number }) => {
    let color = "#ef4444", label = "Clear departure from the line";
    if (w > 0.95) { color = "#3bb4a4"; label = "Points hug the reference line"; }
    else if (w > 0.90) { color = "#d4af37"; label = "Some departure from the line"; }
    return (
      <div>
        <p className="text-[10px] text-[#94a3b8] mb-1 font-semibold">Q-Q Correlation (normality check)</p>
        <div className="rounded-lg border p-3 text-center" style={{ borderColor: color + "40", background: color + "10" }}>
          <p className="text-[18px] font-black font-mono" style={{ color }}>r&sup2; = {w.toFixed(4)}</p>
          <p className="text-[10px] font-semibold mt-0.5" style={{ color }}>{label}</p>
        </div>
        <p className="text-[9px] text-[#475569] leading-relaxed mt-1.5">
          Descriptive check only: r&sup2; measures how straight the Q-Q plot is, and the
          color bands are rules of thumb. A formal test such as Shapiro-Wilk computes a
          p-value whose critical value depends on the sample size.
        </p>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
            Assumption Check
          </p>
          <p className="text-[13px] text-white mt-0.5">{title}</p>
        </div>
        {!checked && (
          <motion.button
            onClick={runCheck}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="px-4 py-1.5 rounded-xl text-[12px] font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            Run Assumption Check
          </motion.button>
        )}
        {checked && (
          <span className="text-[11px] text-[#3bb4a4] font-semibold flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Checked
          </span>
        )}
      </div>

      <AnimatePresence>
        {checked && W !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            <HistogramSVG />
            <QQPlot />
            <NormalityBadge w={W} />
          </motion.div>
        )}
      </AnimatePresence>

      {!checked && (
        <p className="text-[12px] text-[#475569] text-center py-4">
          Click "Run Assumption Check" to verify normality before running the test.
        </p>
      )}
    </div>
  );
}
