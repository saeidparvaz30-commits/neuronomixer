"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { computeShapiroW, mean, AssumptionResult } from "./types";

interface Props {
  data: number[];
  title: string;
  onChecked: (violated: boolean) => void;
}

function Histogram({ data, isNormal }: { data: number[]; isNormal: boolean }) {
  const W = 280, H = 100, BINS = 10, PAD = { left: 28, bottom: 20, top: 8, right: 8 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const binWidth = range / BINS;
  const bins = Array.from({ length: BINS }, () => 0);
  data.forEach((v) => {
    const idx = Math.min(BINS - 1, Math.floor(((v - min) / range) * BINS));
    bins[idx]++;
  });
  const maxCount = Math.max(...bins, 1);
  const bw = plotW / BINS;

  // Density curve: sample 40 points across range
  const m = mean(data);
  const s = Math.sqrt(data.reduce((acc, v) => acc + (v - m) ** 2, 0) / data.length) || 1;
  const densityPts = Array.from({ length: 41 }, (_, i) => {
    const x = min + (i / 40) * range;
    const y = Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
    return { x, y };
  });
  const maxDensity = Math.max(...densityPts.map((p) => p.y), 0.001);
  // Scale density to match histogram
  const scale = (maxCount / (data.length * binWidth)) / maxDensity;
  const densityPath = densityPts
    .map((p, i) => {
      const px = PAD.left + ((p.x - min) / range) * plotW;
      const py = PAD.top + plotH - (p.y * scale * (maxCount / maxDensity) * plotH) / maxCount;
      return `${i === 0 ? "M" : "L"} ${px.toFixed(1)} ${Math.max(PAD.top, py).toFixed(1)}`;
    })
    .join(" ");

  // X-axis ticks
  const ticks = Array.from({ length: 5 }, (_, i) => {
    const val = min + (i / 4) * range;
    const x = PAD.left + (i / 4) * plotW;
    return { val, x };
  });

  const fillColor = isNormal ? "#10b981" : "#ec4899";

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Background shading */}
      <rect
        x={PAD.left}
        y={PAD.top}
        width={plotW}
        height={plotH}
        fill={fillColor}
        opacity={0.04}
        rx={2}
      />
      {/* Bars */}
      {bins.map((count, i) => {
        const bh = (count / maxCount) * plotH;
        return (
          <rect
            key={i}
            x={PAD.left + i * bw + 1}
            y={PAD.top + plotH - bh}
            width={bw - 2}
            height={bh}
            fill="#1e5d8a"
            opacity={0.85}
            rx={1}
          />
        );
      })}
      {/* Density curve */}
      <path d={densityPath} fill="none" stroke="#d4af37" strokeWidth={1.5} opacity={0.8} />
      {/* Axes */}
      <line x1={PAD.left} y1={PAD.top + plotH} x2={PAD.left + plotW} y2={PAD.top + plotH} stroke="#334155" strokeWidth={0.5} />
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH} stroke="#334155" strokeWidth={0.5} />
      {/* X ticks */}
      {ticks.map(({ val, x }) => (
        <g key={x}>
          <line x1={x} y1={PAD.top + plotH} x2={x} y2={PAD.top + plotH + 3} stroke="#475569" strokeWidth={0.5} />
          <text x={x} y={H - 3} textAnchor="middle" fontSize={7} fill="#475569">
            {val > 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(val < 10 ? 1 : 0)}
          </text>
        </g>
      ))}
    </svg>
  );
}

function QQPlot({ data, isNormal }: { data: number[]; isNormal: boolean }) {
  const W = 200, H = 150, PAD = { left: 28, bottom: 24, top: 10, right: 10 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  // Normal quantiles
  const quantiles = sorted.map((_, i) => {
    const p = (i + 1) / (n + 1);
    if (p <= 0.001) return -3.09;
    if (p >= 0.999) return 3.09;
    const t = p < 0.5 ? Math.sqrt(-2 * Math.log(p)) : Math.sqrt(-2 * Math.log(1 - p));
    const a = [2.515517, 0.802853, 0.010328];
    const b = [1.432788, 0.189269, 0.001308];
    const x = t - (a[0] + t * (a[1] + t * a[2])) / (1 + t * (b[0] + t * (b[1] + t * b[2])));
    return p < 0.5 ? -x : x;
  });

  const minQ = Math.min(...quantiles);
  const maxQ = Math.max(...quantiles);
  const minD = Math.min(...sorted);
  const maxD = Math.max(...sorted);
  const rQ = maxQ - minQ || 1;
  const rD = maxD - minD || 1;

  const pts = sorted.map((v, i) => ({
    cx: PAD.left + ((quantiles[i] - minQ) / rQ) * plotW,
    cy: PAD.top + plotH - ((v - minD) / rD) * plotH,
  }));

  // Reference line: from (minQ, minD) to (maxQ, maxD)
  const refX1 = PAD.left;
  const refY1 = PAD.top + plotH;
  const refX2 = PAD.left + plotW;
  const refY2 = PAD.top;

  const dotColor = isNormal ? "#10b981" : "#ec4899";

  const qTicks = [-2, 0, 2];
  const dTickCount = 4;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Axes */}
      <line x1={PAD.left} y1={PAD.top + plotH} x2={PAD.left + plotW} y2={PAD.top + plotH} stroke="#334155" strokeWidth={0.5} />
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH} stroke="#334155" strokeWidth={0.5} />
      {/* Reference line */}
      <line x1={refX1} y1={refY1} x2={refX2} y2={refY2} stroke="#d4af37" strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />
      {/* Data points */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={2} fill={dotColor} opacity={0.5} />
      ))}
      {/* X axis label */}
      <text x={PAD.left + plotW / 2} y={H - 2} textAnchor="middle" fontSize={7} fill="#475569">
        Theoretical Quantiles
      </text>
      {/* X ticks */}
      {qTicks.map((q) => {
        const x = PAD.left + ((q - minQ) / rQ) * plotW;
        if (x < PAD.left || x > PAD.left + plotW) return null;
        return (
          <g key={q}>
            <line x1={x} y1={PAD.top + plotH} x2={x} y2={PAD.top + plotH + 3} stroke="#475569" strokeWidth={0.5} />
            <text x={x} y={PAD.top + plotH + 11} textAnchor="middle" fontSize={7} fill="#475569">{q}</text>
          </g>
        );
      })}
      {/* Y ticks */}
      {Array.from({ length: dTickCount }, (_, i) => {
        const val = minD + (i / (dTickCount - 1)) * rD;
        const y = PAD.top + plotH - (i / (dTickCount - 1)) * plotH;
        return (
          <g key={i}>
            <line x1={PAD.left - 3} y1={y} x2={PAD.left} y2={y} stroke="#475569" strokeWidth={0.5} />
            <text x={PAD.left - 5} y={y + 3} textAnchor="end" fontSize={6.5} fill="#475569">
              {val > 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AssumptionChecker({ data, title, onChecked }: Props) {
  const [result, setResult] = useState<AssumptionResult | null>(null);
  const [hasRun, setHasRun] = useState(false);

  // Reset when data changes
  const dataKey = useMemo(() => data.slice(0, 5).join(","), [data]);
  React.useEffect(() => {
    setResult(null);
    setHasRun(false);
  }, [dataKey]);

  const handleCheck = () => {
    const r = computeShapiroW(data);
    setResult(r);
    setHasRun(true);
    onChecked(!r.isNormal);
  };

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[13px] font-bold text-white">{title}</h3>
          <p className="text-[11px] text-[#94a3b8] mt-0.5">
            Check normality before choosing a test
          </p>
        </div>
        <motion.button
          onClick={handleCheck}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
        >
          Run Assumption Check
        </motion.button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-start">
        {/* Histogram */}
        <div>
          <p className="text-[10px] text-[#94a3b8] font-medium mb-1 uppercase tracking-wide">
            Distribution
          </p>
          <Histogram data={data} isNormal={result ? result.isNormal : true} />
        </div>

        {/* Q-Q Plot */}
        <div>
          <p className="text-[10px] text-[#94a3b8] font-medium mb-1 uppercase tracking-wide">
            Q-Q Plot
          </p>
          <QQPlot data={data} isNormal={result ? result.isNormal : true} />
        </div>
      </div>

      {/* Result */}
      {hasRun && result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-4 space-y-2"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-[#94a3b8] font-medium">Shapiro-Wilk</span>
            <span className="font-mono text-[12px] text-white font-bold">
              W = {result.shapiroW.toFixed(4)}
            </span>
            <span className="font-mono text-[11px] text-[#94a3b8]">
              skewness = {result.skewness.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {result.isNormal ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30">
                Normality met (W &gt; 0.90)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ec4899]/20 text-[#ec4899] border border-[#ec4899]/30">
                Normality violated (W ≤ 0.90)
              </span>
            )}
          </div>

          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
            {result.interpretation}.{" "}
            {result.isNormal
              ? "Parametric tests (e.g. t-test) are appropriate here."
              : "Consider nonparametric alternatives (e.g. Mann-Whitney U, Wilcoxon signed-rank) for more reliable results."}
          </p>
        </motion.div>
      )}

      {!hasRun && (
        <p className="mt-3 text-[10px] text-[#475569]">
          Click "Run Assumption Check" to test for normality using the Shapiro-Wilk statistic.
        </p>
      )}
    </div>
  );
}
