"use client";

import React from "react";
import { motion } from "framer-motion";
import type { MisleadingId } from "./types";

interface Props {
  id: MisleadingId;
}

// ── 1: Truncated Y-Axis ────────────────────────────────────────────────────
function TruncatedDeceptive() {
  return (
    <svg viewBox="0 0 200 160" className="w-full max-h-[160px]" aria-label="Deceptive truncated axis bar chart">
      {/* Y gridlines & labels — starts at 990 */}
      {[990, 993, 996, 999, 1000].map((v, i) => {
        const y = 16 + (1 - (v - 990) / 10) * 120;
        return (
          <g key={v}>
            <line x1={44} y1={y} x2={180} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={40} y={y + 4} textAnchor="end" fontSize="10" fill="#475569">${v}M</text>
          </g>
        );
      })}
      <line x1={44} y1={16} x2={44} y2={136} stroke="#334155" strokeWidth="1.5" />
      <line x1={44} y1={136} x2={180} y2={136} stroke="#334155" strokeWidth="1.5" />
      {/* bars */}
      <rect x={60} y={16 + (1 - (995 - 990) / 10) * 120} width={42} height={(5 / 10) * 120} rx="3" fill="#3bb4a4" opacity="0.8" />
      <rect x={118} y={16} width={42} height={120} rx="3" fill="var(--color-accent)" opacity="0.8" />
      <text x={81} y={148} textAnchor="middle" fontSize="10" fill="#94a3b8">2023</text>
      <text x={139} y={148} textAnchor="middle" fontSize="10" fill="#94a3b8">2024</text>
      {/* zigzag break indicator */}
      <polyline points="44,140 50,143 44,146 50,149" fill="none" stroke="#ef4444" strokeWidth="1.5" />
    </svg>
  );
}

function TruncatedHonest() {
  return (
    <svg viewBox="0 0 200 160" className="w-full max-h-[160px]" aria-label="Honest full-axis bar chart">
      {[0, 250, 500, 750, 1000].map((v) => {
        const y = 16 + (1 - v / 1000) * 120;
        return (
          <g key={v}>
            <line x1={44} y1={y} x2={180} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={40} y={y + 4} textAnchor="end" fontSize="10" fill="#475569">${v}M</text>
          </g>
        );
      })}
      <line x1={44} y1={16} x2={44} y2={136} stroke="#334155" strokeWidth="1.5" />
      <line x1={44} y1={136} x2={180} y2={136} stroke="#334155" strokeWidth="1.5" />
      <rect x={60} y={16 + (1 - 995 / 1000) * 120} width={42} height={(995 / 1000) * 120} rx="3" fill="#3bb4a4" opacity="0.8" />
      <rect x={118} y={16 + (1 - 1000 / 1000) * 120} width={42} height={(1000 / 1000) * 120} rx="3" fill="var(--color-accent)" opacity="0.8" />
      <text x={81} y={148} textAnchor="middle" fontSize="10" fill="#94a3b8">2023</text>
      <text x={139} y={148} textAnchor="middle" fontSize="10" fill="#94a3b8">2024</text>
    </svg>
  );
}

// ── 2: Cherry-Picked Time Range ────────────────────────────────────────────
const FULL_YEAR = [100, 90, 80, 68, 55, 50, 55, 62, 70, 78, 84, 90, 95];
const MONTHS_FULL = ["Jan", "", "Mar", "", "May", "Jun", "", "Aug", "", "Oct", "", "Dec", ""];

function CherryDeceptive() {
  // Only Jul-Dec (indices 6-12)
  const subset = FULL_YEAR.slice(6);
  const minV = Math.min(...subset) - 5;
  const maxV = Math.max(...subset) + 5;
  const chartH = 110;
  const leftPad = 36;
  const topPad = 14;
  const totalW = 190;
  const xs = subset.map((_, i) => leftPad + i * ((totalW - leftPad - 10) / (subset.length - 1)));

  function toY(v: number) {
    return topPad + chartH - ((v - minV) / (maxV - minV)) * chartH;
  }

  const pts = xs.map((x, i) => `${x},${toY(subset[i])}`).join(" ");

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + 36}`} className="w-full max-h-[160px]" aria-label="Cherry-picked line chart showing only the last 7 points (55 to 95)">
      <line x1={leftPad} y1={topPad} x2={leftPad} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      <line x1={leftPad} y1={topPad + chartH} x2={totalW - 5} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      <polyline points={pts} fill="none" stroke="#3bb4a4" strokeWidth="2.5" strokeLinejoin="round" />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={toY(subset[i])} r="3" fill="#3bb4a4" />
      ))}
      {["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", ""].map((m, i) => (
        m && <text key={i} x={xs[i]} y={topPad + chartH + 16} textAnchor="middle" fontSize="10" fill="#94a3b8">{m}</text>
      ))}
    </svg>
  );
}

function CherryHonest() {
  const minV = Math.min(...FULL_YEAR) - 5;
  const maxV = Math.max(...FULL_YEAR) + 5;
  const chartH = 110;
  const leftPad = 36;
  const topPad = 14;
  const totalW = 190;
  const xs = FULL_YEAR.map((_, i) => leftPad + i * ((totalW - leftPad - 10) / (FULL_YEAR.length - 1)));

  function toY(v: number) {
    return topPad + chartH - ((v - minV) / (maxV - minV)) * chartH;
  }

  const pts = xs.map((x, i) => `${x},${toY(FULL_YEAR[i])}`).join(" ");

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + 36}`} className="w-full max-h-[160px]" aria-label="Full-year line chart showing crash and recovery">
      <line x1={leftPad} y1={topPad} x2={leftPad} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      <line x1={leftPad} y1={topPad + chartH} x2={totalW - 5} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      {/* Shade the hidden crash region */}
      <rect x={xs[0]} y={topPad} width={xs[5] - xs[0]} height={chartH} fill="#ef4444" opacity="0.08" />
      <polyline points={pts} fill="none" stroke="#3bb4a4" strokeWidth="2" strokeLinejoin="round" />
      {xs.slice(6).map((x, i) => (
        <circle key={i} cx={x} cy={toY(FULL_YEAR[i + 6])} r="2" fill="#3bb4a4" />
      ))}
      {/* Mark the cherry-picked range */}
      <line x1={xs[6]} y1={topPad + 2} x2={xs[6]} y2={topPad + chartH} stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="3,2" />
      <text x={xs[6] + 2} y={topPad + 10} fontSize="10" fill="var(--color-accent)">shown →</text>
      {["J", "", "M", "", "M", "", "J", "", "S", "", "N", "", ""].map((m, i) => (
        m && <text key={i} x={xs[i]} y={topPad + chartH + 16} textAnchor="middle" fontSize="10" fill="#94a3b8">{m}</text>
      ))}
    </svg>
  );
}

// ── 3: Dual Y-Axes ─────────────────────────────────────────────────────────
const DUAL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
const CASES = [200, 800, 1500, 2100, 3200, 4100, 3600, 2800, 1900];
const TEMPS = [2, 4, 8, 14, 18, 22, 25, 24, 19];

function DualDeceptive() {
  const chartH = 110;
  const leftPad = 36;
  const rightPad = 36;
  const topPad = 14;
  const totalW = 210;
  const xs = CASES.map((_, i) => leftPad + i * ((totalW - leftPad - rightPad) / (CASES.length - 1)));

  const maxCases = Math.max(...CASES);
  const maxTemps = Math.max(...TEMPS);

  function toYCases(v: number) { return topPad + chartH - (v / maxCases) * chartH; }
  function toYTemps(v: number) { return topPad + chartH - (v / maxTemps) * chartH; }

  const casePts = xs.map((x, i) => `${x},${toYCases(CASES[i])}`).join(" ");
  const tempPts = xs.map((x, i) => `${x},${toYTemps(TEMPS[i])}`).join(" ");

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + 36}`} className="w-full max-h-[160px]" aria-label="Deceptive dual-axis chart making unrelated data look correlated">
      <line x1={leftPad} y1={topPad} x2={leftPad} y2={topPad + chartH} stroke="#3bb4a4" strokeWidth="1.5" />
      <line x1={totalW - rightPad} y1={topPad} x2={totalW - rightPad} y2={topPad + chartH} stroke="#ef4444" strokeWidth="1.5" />
      <line x1={leftPad} y1={topPad + chartH} x2={totalW - rightPad} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      <polyline points={casePts} fill="none" stroke="#3bb4a4" strokeWidth="2" strokeLinejoin="round" />
      <polyline points={tempPts} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" strokeDasharray="4,2" />
      <text x={8} y={topPad + 10} fontSize="10" fill="#3bb4a4">Cases</text>
      <text x={totalW - rightPad + 2} y={topPad + 10} fontSize="10" fill="#ef4444">Temp</text>
      {xs.filter((_, i) => i % 2 === 0).map((x, i) => (
        <text key={i} x={x} y={topPad + chartH + 16} textAnchor="middle" fontSize="10" fill="#94a3b8">{DUAL_MONTHS[i * 2]}</text>
      ))}
    </svg>
  );
}

function DualHonest() {
  const chartH = 50;
  const leftPad = 36;
  const topPad = 10;
  const totalW = 210;
  const xs = CASES.map((_, i) => leftPad + i * ((totalW - leftPad - 10) / (CASES.length - 1)));

  const maxCases = Math.max(...CASES);
  const maxTemps = Math.max(...TEMPS);

  function toYCases(v: number) { return topPad + chartH - (v / maxCases) * chartH; }
  function toYTemps(v: number) { return topPad + chartH - (v / maxTemps) * chartH; }

  const casePts = xs.map((x, i) => `${x},${toYCases(CASES[i])}`).join(" ");
  const tempPts = xs.map((x, i) => `${x},${toYTemps(TEMPS[i])}`).join(" ");

  const totalH = (topPad + chartH) * 2 + 30;

  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} className="w-full max-h-[160px]" aria-label="Honest separate charts showing no correlation">
      {/* Top: cases */}
      <text x={leftPad} y={topPad - 2} fontSize="10" fill="#3bb4a4">COVID Cases</text>
      <line x1={leftPad} y1={topPad} x2={leftPad} y2={topPad + chartH} stroke="#334155" strokeWidth="1" />
      <line x1={leftPad} y1={topPad + chartH} x2={totalW - 10} y2={topPad + chartH} stroke="#334155" strokeWidth="1" />
      <polyline points={casePts} fill="none" stroke="#3bb4a4" strokeWidth="2" strokeLinejoin="round" />
      {/* Bottom: temps */}
      <text x={leftPad} y={topPad + chartH + 20} fontSize="10" fill="#ef4444">Temperature (°C)</text>
      <line x1={leftPad} y1={topPad + chartH + 28} x2={leftPad} y2={topPad + chartH * 2 + 28} stroke="#334155" strokeWidth="1" />
      <line x1={leftPad} y1={topPad + chartH * 2 + 28} x2={totalW - 10} y2={topPad + chartH * 2 + 28} stroke="#334155" strokeWidth="1" />
      <polyline points={xs.map((x, i) => `${x},${topPad + chartH + 28 + chartH - (TEMPS[i] / maxTemps) * chartH}`).join(" ")} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" strokeDasharray="4,2" />
    </svg>
  );
}

// ── 4: 3D Pie Chart ────────────────────────────────────────────────────────
function PieDeceptive() {
  // A=30%, B=35%, C=35% but rendered with perspective tilt making A look huge
  const cx = 95, cy = 70;
  const rx = 70, ry = 28; // flat ellipse bottom
  const r = 55;

  // Compute flat pie angles (degrees)
  const slices = [
    { pct: 0.30, color: "var(--color-accent)", label: "A 30%" },
    { pct: 0.35, color: "#3bb4a4", label: "B 35%" },
    { pct: 0.35, color: "#a855f7", label: "C 35%" },
  ];

  let cumAngle = -Math.PI / 2;
  const paths: { d: string; color: string; label: string; midAngle: number }[] = [];

  for (const slice of slices) {
    const startAngle = cumAngle;
    const endAngle = cumAngle + slice.pct * 2 * Math.PI;
    const midAngle = (startAngle + endAngle) / 2;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle) * 0.45; // perspective squish
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle) * 0.45;
    const largeArc = slice.pct > 0.5 ? 1 : 0;

    // The first slice (A=30%) gets a slight 3D extrusion forward (lower y)
    const extrudeY = midAngle > 0 ? 6 : 0; // extrude bottom-facing slices

    const d = `M ${cx} ${cy + extrudeY} L ${x1} ${y1 + extrudeY} A ${r} ${r * 0.45} 0 ${largeArc} 1 ${x2} ${y2 + extrudeY} Z`;
    paths.push({ d, color: slice.color, label: slice.label, midAngle });
    cumAngle = endAngle;
  }

  return (
    <svg viewBox="0 0 190 140" className="w-full max-h-[140px]" aria-label="Deceptive 3D pie chart distorting proportions">
      {/* Shadow/depth effect */}
      <ellipse cx={cx} cy={cy + 12} rx={r} ry={r * 0.38} fill="#0a0e1a" opacity="0.4" />
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} opacity="0.85" stroke="#0f172a" strokeWidth="0.5" />
      ))}
      {/* Labels */}
      {paths.map((p, i) => {
        const lx = cx + (r * 0.7) * Math.cos(p.midAngle) + 18;
        const ly = cy + (r * 0.7) * Math.sin(p.midAngle) * 0.45 + 8;
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" fontSize="10" fill="#f1f5f9" fontWeight="600">{p.label}</text>
        );
      })}
    </svg>
  );
}

function PieHonest() {
  const data = [
    { pct: 0.30, color: "var(--color-accent)", label: "A", value: "30%" },
    { pct: 0.35, color: "#3bb4a4", label: "B", value: "35%" },
    { pct: 0.35, color: "#a855f7", label: "C", value: "35%" },
  ];
  const totalW = 190;
  const chartH = 120;
  const leftPad = 30;
  const barH = 24;
  const maxW = totalW - leftPad - 40;

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH}`} className="w-full max-h-[140px]" aria-label="Honest flat bar chart of proportions">
      <text x={leftPad} y={14} fontSize="10" fill="#94a3b8">Honest: flat bar chart</text>
      {data.map((d, i) => {
        const bW = d.pct * maxW;
        const y = 24 + i * (barH + 8);
        return (
          <g key={i}>
            <rect x={leftPad} y={y} width={bW} height={barH} rx="3" fill={d.color} opacity="0.8" />
            <text x={leftPad - 4} y={y + barH / 2 + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{d.label}</text>
            <text x={leftPad + bW + 4} y={y + barH / 2 + 4} textAnchor="start" fontSize="10" fill="#f1f5f9" fontWeight="600">{d.value}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── 5: Stacked Area Chart ──────────────────────────────────────────────────
const STACKED_MONTHS = ["Jan", "Mar", "May", "Jul", "Sep", "Nov"];
const STACKED_S1 = [10, 11, 10, 12, 11, 13];
const STACKED_S2 = [5, 14, 22, 14, 6, 5]; // appears to bulge due to stacking
const STACKED_S3 = [8, 9, 8, 10, 9, 10];

function StackedDeceptive() {
  const chartH = 110;
  const leftPad = 36;
  const topPad = 14;
  const totalW = 200;
  const xs = STACKED_S1.map((_, i) => leftPad + i * ((totalW - leftPad - 10) / (STACKED_S1.length - 1)));
  const maxVal = Math.max(...STACKED_S1.map((v, i) => v + STACKED_S2[i] + STACKED_S3[i])) + 5;

  function toY(v: number) { return topPad + chartH - (v / maxVal) * chartH; }

  const cum1 = STACKED_S1.map((v) => v);
  const cum2 = STACKED_S1.map((v, i) => v + STACKED_S2[i]);
  const cum3 = STACKED_S1.map((v, i) => v + STACKED_S2[i] + STACKED_S3[i]);

  const area1Pts = `${xs[0]},${topPad + chartH} ${xs.map((x, i) => `${x},${toY(cum1[i])}`).join(" ")} ${xs[xs.length - 1]},${topPad + chartH}`;
  const area2Top = xs.map((x, i) => `${x},${toY(cum2[i])}`).join(" ");
  const area2Bot = xs.map((x, i) => `${x},${toY(cum1[i])}`).reverse().join(" ");
  const area3Top = xs.map((x, i) => `${x},${toY(cum3[i])}`).join(" ");
  const area3Bot = xs.map((x, i) => `${x},${toY(cum2[i])}`).reverse().join(" ");

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + 36}`} className="w-full max-h-[160px]" aria-label="Deceptive stacked area chart where middle series appears to bulge">
      <line x1={leftPad} y1={topPad} x2={leftPad} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      <line x1={leftPad} y1={topPad + chartH} x2={totalW - 5} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      <polygon points={area1Pts} fill="#3bb4a4" opacity="0.6" />
      <polygon points={`${xs[0]},${toY(cum1[0])} ${area2Top} ${xs[xs.length-1]},${toY(cum1[xs.length-1])} ${area2Bot}`} fill="var(--color-accent)" opacity="0.6" />
      <polygon points={`${xs[0]},${toY(cum2[0])} ${area3Top} ${xs[xs.length-1]},${toY(cum2[xs.length-1])} ${area3Bot}`} fill="#a855f7" opacity="0.6" />
      {xs.filter((_, i) => i % 2 === 0).map((x, i) => (
        <text key={i} x={x} y={topPad + chartH + 16} textAnchor="middle" fontSize="10" fill="#94a3b8">{STACKED_MONTHS[i * 2]}</text>
      ))}
    </svg>
  );
}

function StackedHonest() {
  const chartH = 46;
  const leftPad = 36;
  const topPad = 10;
  const totalW = 200;
  const xs = STACKED_S1.map((_, i) => leftPad + i * ((totalW - leftPad - 10) / (STACKED_S1.length - 1)));
  const maxVal = Math.max(...STACKED_S1, ...STACKED_S2, ...STACKED_S3) + 5;
  const colors = ["#3bb4a4", "var(--color-accent)", "#a855f7"];
  const series = [STACKED_S1, STACKED_S2, STACKED_S3];
  const labels = ["Series 1", "Series 2", "Series 3"];
  const totalH = series.length * (chartH + 20) + topPad;

  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} className="w-full max-h-[160px]" aria-label="Honest small multiples showing actual trends per series">
      {series.map((s, si) => {
        const yOff = topPad + si * (chartH + 20);
        function toY(v: number) { return yOff + chartH - (v / maxVal) * chartH; }
        const pts = xs.map((x, i) => `${x},${toY(s[i])}`).join(" ");
        return (
          <g key={si}>
            <text x={leftPad} y={yOff - 2} fontSize="10" fill={colors[si]}>{labels[si]}</text>
            <line x1={leftPad} y1={yOff} x2={leftPad} y2={yOff + chartH} stroke="#1e293b" strokeWidth="1" />
            <line x1={leftPad} y1={yOff + chartH} x2={totalW - 5} y2={yOff + chartH} stroke="#1e293b" strokeWidth="1" />
            <polyline points={pts} fill="none" stroke={colors[si]} strokeWidth="2" strokeLinejoin="round" />
          </g>
        );
      })}
    </svg>
  );
}

const PANEL_MAP: Record<MisleadingId, { deceptive: React.ReactNode; honest: React.ReactNode }> = {
  truncated_axis: { deceptive: <TruncatedDeceptive />, honest: <TruncatedHonest /> },
  cherry_picked: { deceptive: <CherryDeceptive />, honest: <CherryHonest /> },
  dual_axes: { deceptive: <DualDeceptive />, honest: <DualHonest /> },
  "3d_pie": { deceptive: <PieDeceptive />, honest: <PieHonest /> },
  stacked_area: { deceptive: <StackedDeceptive />, honest: <StackedHonest /> },
};

export default function HonestComparisonPanel({ id }: Props) {
  const panels = PANEL_MAP[id];
  if (!panels) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4"
      aria-live="polite"
    >
      <div className="rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/5 p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#ef4444] mb-2">Deceptive version</p>
        {panels.deceptive}
      </div>
      <div className="rounded-xl border border-[#3bb4a4]/30 bg-[#3bb4a4]/5 p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#3bb4a4] mb-2">Honest version</p>
        {panels.honest}
      </div>
    </motion.div>
  );
}
