"use client";

import React from "react";
import type { DatasetType, ChartOptionId } from "./types";

interface Props {
  dataset: DatasetType;
  chartId: ChartOptionId;
}

// ── Test Scores data ─────────────────────────────────────────────────────────
function TestScoresBarChart() {
  const data = [
    { label: "Class A", value: 78 },
    { label: "Class B", value: 82 },
    { label: "Class C", value: 75 },
  ];
  const maxVal = 100;
  const chartH = 160;
  const barW = 60;
  const gap = 40;
  const leftPad = 48;
  const bottomPad = 36;
  const topPad = 16;
  const totalW = leftPad + data.length * (barW + gap) + 20;

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + bottomPad + topPad}`} className="w-full max-h-[220px]" aria-label="Bar chart of test scores by class">
      {/* Y-axis gridlines */}
      {[0, 25, 50, 75, 100].map((v) => {
        const y = topPad + chartH - (v / maxVal) * chartH;
        return (
          <g key={v}>
            <line x1={leftPad} y1={y} x2={totalW - 10} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={leftPad - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#475569">{v}</text>
          </g>
        );
      })}
      {/* Axis lines */}
      <line x1={leftPad} y1={topPad} x2={leftPad} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      <line x1={leftPad} y1={topPad + chartH} x2={totalW - 10} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      {/* Bars */}
      {data.map((d, i) => {
        const barH = (d.value / maxVal) * chartH;
        const x = leftPad + i * (barW + gap) + gap / 2;
        const y = topPad + chartH - barH;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barW} height={barH} rx="4" fill="#3bb4a4" opacity="0.85" />
            <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize="11" fontWeight="600" fill="#f1f5f9">{d.value}</text>
            <text x={x + barW / 2} y={topPad + chartH + 18} textAnchor="middle" fontSize="11" fill="#94a3b8">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function TestScoresHistogram() {
  const bins = [
    { label: "70–74", count: 2 },
    { label: "75–79", count: 5 },
    { label: "80–84", count: 6 },
    { label: "85–89", count: 3 },
  ];
  const maxCount = 7;
  const chartH = 160;
  const barW = 52;
  const leftPad = 40;
  const bottomPad = 36;
  const topPad = 16;
  const totalW = leftPad + bins.length * (barW + 2) + 20;

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + bottomPad + topPad}`} className="w-full max-h-[220px]" aria-label="Histogram of test score distribution">
      {[0, 2, 4, 6].map((v) => {
        const y = topPad + chartH - (v / maxCount) * chartH;
        return (
          <g key={v}>
            <line x1={leftPad} y1={y} x2={totalW - 10} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={leftPad - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#475569">{v}</text>
          </g>
        );
      })}
      <line x1={leftPad} y1={topPad} x2={leftPad} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      <line x1={leftPad} y1={topPad + chartH} x2={totalW - 10} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      {bins.map((b, i) => {
        const barH = (b.count / maxCount) * chartH;
        const x = leftPad + i * (barW + 2);
        const y = topPad + chartH - barH;
        return (
          <g key={b.label}>
            <rect x={x} y={y} width={barW} height={barH} fill="#3bb4a4" opacity="0.75" />
            <text x={x + barW / 2} y={topPad + chartH + 18} textAnchor="middle" fontSize="9" fill="#94a3b8">{b.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function TestScoresBoxPlot() {
  const classes = [
    { label: "Class A", min: 68, q1: 74, med: 78, q3: 82, max: 90 },
    { label: "Class B", min: 72, q1: 78, med: 82, q3: 86, max: 94 },
    { label: "Class C", min: 65, q1: 71, med: 75, q3: 80, max: 87 },
  ];
  const minVal = 60, maxVal = 100;
  const chartH = 160;
  const leftPad = 60;
  const boxW = 40;
  const gap = 50;
  const topPad = 16;
  const bottomPad = 36;
  const totalW = leftPad + classes.length * (boxW + gap) + 20;

  function toY(v: number) {
    return topPad + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;
  }

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + bottomPad + topPad}`} className="w-full max-h-[220px]" aria-label="Box plot of test scores by class">
      {[60, 70, 80, 90, 100].map((v) => {
        const y = toY(v);
        return (
          <g key={v}>
            <line x1={leftPad} y1={y} x2={totalW - 10} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={leftPad - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#475569">{v}</text>
          </g>
        );
      })}
      <line x1={leftPad} y1={topPad} x2={leftPad} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      <line x1={leftPad} y1={topPad + chartH} x2={totalW - 10} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      {classes.map((c, i) => {
        const cx = leftPad + i * (boxW + gap) + gap / 2;
        return (
          <g key={c.label}>
            <line x1={cx + boxW / 2} y1={toY(c.min)} x2={cx + boxW / 2} y2={toY(c.max)} stroke="#3bb4a4" strokeWidth="1.5" strokeDasharray="3,2" />
            <line x1={cx + boxW / 2 - 8} y1={toY(c.min)} x2={cx + boxW / 2 + 8} y2={toY(c.min)} stroke="#3bb4a4" strokeWidth="1.5" />
            <line x1={cx + boxW / 2 - 8} y1={toY(c.max)} x2={cx + boxW / 2 + 8} y2={toY(c.max)} stroke="#3bb4a4" strokeWidth="1.5" />
            <rect x={cx} y={toY(c.q3)} width={boxW} height={toY(c.q1) - toY(c.q3)} rx="2" fill="none" stroke="#3bb4a4" strokeWidth="2" />
            <line x1={cx} y1={toY(c.med)} x2={cx + boxW} y2={toY(c.med)} stroke="var(--color-accent)" strokeWidth="2.5" />
            <text x={cx + boxW / 2} y={topPad + chartH + 18} textAnchor="middle" fontSize="11" fill="#94a3b8">{c.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function TestScoresLineChart() {
  const data = [78, 82, 75];
  const labels = ["Class A", "Class B", "Class C"];
  const chartH = 160;
  const leftPad = 48;
  const bottomPad = 36;
  const topPad = 16;
  const totalW = 280;
  const minVal = 60;
  const maxVal = 100;
  const xs = data.map((_, i) => leftPad + i * 90 + 30);

  function toY(v: number) {
    return topPad + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;
  }

  const pts = xs.map((x, i) => `${x},${toY(data[i])}`).join(" ");

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + bottomPad + topPad}`} className="w-full max-h-[220px]" aria-label="Line chart of test scores by class (not recommended)">
      {[60, 70, 80, 90, 100].map((v) => {
        const y = toY(v);
        return (
          <g key={v}>
            <line x1={leftPad} y1={y} x2={totalW - 10} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={leftPad - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#475569">{v}</text>
          </g>
        );
      })}
      <line x1={leftPad} y1={topPad} x2={leftPad} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      <line x1={leftPad} y1={topPad + chartH} x2={totalW - 10} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      <polyline points={pts} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" strokeDasharray="4,2" />
      {xs.map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={toY(data[i])} r="4" fill="#ef4444" />
          <text x={x} y={topPad + chartH + 18} textAnchor="middle" fontSize="11" fill="#94a3b8">{labels[i]}</text>
          <text x={x} y={toY(data[i]) - 8} textAnchor="middle" fontSize="10" fill="#f1f5f9">{data[i]}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Monthly Sales data ────────────────────────────────────────────────────────
const SALES_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SALES_VALUES = [42, 45, 41, 48, 52, 55, 58, 61, 59, 64, 68, 72];

function SalesLineChart() {
  const chartH = 160;
  const leftPad = 44;
  const bottomPad = 36;
  const topPad = 16;
  const totalW = 360;
  const minVal = 35;
  const maxVal = 80;
  const xs = SALES_VALUES.map((_, i) => leftPad + i * ((totalW - leftPad - 16) / (SALES_VALUES.length - 1)));

  function toY(v: number) {
    return topPad + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;
  }

  const pts = xs.map((x, i) => `${x},${toY(SALES_VALUES[i])}`).join(" ");

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + bottomPad + topPad}`} className="w-full max-h-[220px]" aria-label="Line chart of monthly sales">
      {[40, 50, 60, 70, 80].map((v) => {
        const y = toY(v);
        return (
          <g key={v}>
            <line x1={leftPad} y1={y} x2={totalW - 10} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={leftPad - 5} y={y + 4} textAnchor="end" fontSize="9" fill="#475569">{v}k</text>
          </g>
        );
      })}
      <line x1={leftPad} y1={topPad} x2={leftPad} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      <line x1={leftPad} y1={topPad + chartH} x2={totalW - 10} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      <polyline points={pts} fill="none" stroke="#3bb4a4" strokeWidth="2.5" strokeLinejoin="round" />
      {xs.map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={toY(SALES_VALUES[i])} r="3" fill="#3bb4a4" />
          {i % 2 === 0 && (
            <text x={x} y={topPad + chartH + 18} textAnchor="middle" fontSize="9" fill="#94a3b8">{SALES_MONTHS[i]}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

function SalesAreaChart() {
  const chartH = 160;
  const leftPad = 44;
  const bottomPad = 36;
  const topPad = 16;
  const totalW = 360;
  const minVal = 35;
  const maxVal = 80;
  const xs = SALES_VALUES.map((_, i) => leftPad + i * ((totalW - leftPad - 16) / (SALES_VALUES.length - 1)));

  function toY(v: number) {
    return topPad + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;
  }

  const linePts = xs.map((x, i) => `${x},${toY(SALES_VALUES[i])}`).join(" ");
  const areaPts = `${xs[0]},${topPad + chartH} ${linePts} ${xs[xs.length - 1]},${topPad + chartH}`;

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + bottomPad + topPad}`} className="w-full max-h-[220px]" aria-label="Area chart of monthly sales">
      {[40, 50, 60, 70, 80].map((v) => {
        const y = toY(v);
        return (
          <g key={v}>
            <line x1={leftPad} y1={y} x2={totalW - 10} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={leftPad - 5} y={y + 4} textAnchor="end" fontSize="9" fill="#475569">{v}k</text>
          </g>
        );
      })}
      <line x1={leftPad} y1={topPad} x2={leftPad} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      <line x1={leftPad} y1={topPad + chartH} x2={totalW - 10} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      <polygon points={areaPts} fill="#3bb4a4" opacity="0.2" />
      <polyline points={linePts} fill="none" stroke="#3bb4a4" strokeWidth="2.5" strokeLinejoin="round" />
      {xs.filter((_, i) => i % 2 === 0).map((x, i) => (
        <text key={i} x={x} y={topPad + chartH + 18} textAnchor="middle" fontSize="9" fill="#94a3b8">{SALES_MONTHS[i * 2]}</text>
      ))}
    </svg>
  );
}

function SalesBarChart() {
  const chartH = 160;
  const leftPad = 44;
  const bottomPad = 36;
  const topPad = 16;
  const totalW = 360;
  const minVal = 0;
  const maxVal = 80;
  const barW = (totalW - leftPad - 16) / SALES_VALUES.length - 2;

  function toH(v: number) {
    return ((v - minVal) / (maxVal - minVal)) * chartH;
  }

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + bottomPad + topPad}`} className="w-full max-h-[220px]" aria-label="Bar chart of monthly sales">
      {[0, 20, 40, 60, 80].map((v) => {
        const y = topPad + chartH - (v / maxVal) * chartH;
        return (
          <g key={v}>
            <line x1={leftPad} y1={y} x2={totalW - 10} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={leftPad - 5} y={y + 4} textAnchor="end" fontSize="9" fill="#475569">{v}k</text>
          </g>
        );
      })}
      <line x1={leftPad} y1={topPad} x2={leftPad} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      <line x1={leftPad} y1={topPad + chartH} x2={totalW - 10} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      {SALES_VALUES.map((v, i) => {
        const bH = toH(v);
        const x = leftPad + i * (barW + 2) + 2;
        return (
          <g key={i}>
            <rect x={x} y={topPad + chartH - bH} width={barW} height={bH} rx="2" fill="#3bb4a4" opacity="0.8" />
            {i % 2 === 0 && (
              <text x={x + barW / 2} y={topPad + chartH + 18} textAnchor="middle" fontSize="8.5" fill="#94a3b8">{SALES_MONTHS[i]}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function SalesScatterPlot() {
  const chartH = 160;
  const leftPad = 44;
  const bottomPad = 36;
  const topPad = 16;
  const totalW = 360;
  const minVal = 35;
  const maxVal = 80;
  const xs = SALES_VALUES.map((_, i) => leftPad + i * ((totalW - leftPad - 16) / (SALES_VALUES.length - 1)));

  function toY(v: number) {
    return topPad + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;
  }

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + bottomPad + topPad}`} className="w-full max-h-[220px]" aria-label="Scatter plot of monthly sales">
      {[40, 50, 60, 70, 80].map((v) => {
        const y = toY(v);
        return (
          <g key={v}>
            <line x1={leftPad} y1={y} x2={totalW - 10} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={leftPad - 5} y={y + 4} textAnchor="end" fontSize="9" fill="#475569">{v}k</text>
          </g>
        );
      })}
      <line x1={leftPad} y1={topPad} x2={leftPad} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      <line x1={leftPad} y1={topPad + chartH} x2={totalW - 10} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      {xs.map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={toY(SALES_VALUES[i])} r="4.5" fill="#3bb4a4" opacity="0.7" />
          {i % 2 === 0 && (
            <text x={x} y={topPad + chartH + 18} textAnchor="middle" fontSize="9" fill="#94a3b8">{SALES_MONTHS[i]}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

// ── Life Expectancy data ──────────────────────────────────────────────────────
const LIFE_DATA = [
  { country: "Japan", value: 84 }, { country: "Switzerland", value: 83 },
  { country: "Australia", value: 83 }, { country: "Spain", value: 82 },
  { country: "Italy", value: 82 }, { country: "Sweden", value: 82 },
  { country: "Norway", value: 82 }, { country: "France", value: 82 },
  { country: "Canada", value: 81 }, { country: "UK", value: 81 },
  { country: "Germany", value: 80 }, { country: "Brazil", value: 75 },
  { country: "China", value: 77 }, { country: "Mexico", value: 75 },
  { country: "Egypt", value: 72 }, { country: "India", value: 70 },
  { country: "Pakistan", value: 68 }, { country: "Nigeria", value: 65 },
  { country: "Chad", value: 62 }, { country: "CAR", value: 60 },
].sort((a, b) => b.value - a.value);

function LifeExpSortedBar() {
  const chartH = 200;
  const leftPad = 80;
  const bottomPad = 20;
  const topPad = 16;
  const minVal = 55;
  const maxVal = 90;
  const barH = 8;
  const gap = 2;
  const totalH = LIFE_DATA.length * (barH + gap) + topPad + bottomPad;
  const totalW = 340;

  function toX(v: number) {
    return leftPad + ((v - minVal) / (maxVal - minVal)) * (totalW - leftPad - 20);
  }

  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} className="w-full max-h-[280px]" aria-label="Sorted bar chart of life expectancy by country">
      {[60, 70, 80, 90].map((v) => {
        const x = toX(v);
        return (
          <g key={v}>
            <line x1={x} y1={topPad} x2={x} y2={totalH - bottomPad} stroke="#1e293b" strokeWidth="1" />
            <text x={x} y={totalH - 6} textAnchor="middle" fontSize="9" fill="#475569">{v}</text>
          </g>
        );
      })}
      <line x1={leftPad} y1={topPad} x2={leftPad} y2={totalH - bottomPad} stroke="#334155" strokeWidth="1.5" />
      {LIFE_DATA.map((d, i) => {
        const y = topPad + i * (barH + gap);
        const barWidth = toX(d.value) - leftPad;
        const opacity = 0.95 - i * 0.025;
        return (
          <g key={d.country}>
            <rect x={leftPad} y={y} width={barWidth} height={barH} rx="1.5" fill="#3bb4a4" opacity={opacity} />
            <text x={leftPad - 4} y={y + barH - 1} textAnchor="end" fontSize="8.5" fill="#94a3b8">{d.country}</text>
            <text x={toX(d.value) + 3} y={y + barH - 1} textAnchor="start" fontSize="8.5" fill="#f1f5f9">{d.value}</text>
          </g>
        );
      })}
    </svg>
  );
}

function LifeExpBoxPlot() {
  const chartH = 160;
  const leftPad = 44;
  const bottomPad = 36;
  const topPad = 16;
  const totalW = 240;

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + bottomPad + topPad}`} className="w-full max-h-[220px]" aria-label="Box plot (poor choice for ranking)">
      {[60, 70, 80, 90].map((v) => {
        const y = topPad + chartH - ((v - 55) / 40) * chartH;
        return (
          <g key={v}>
            <line x1={leftPad} y1={y} x2={totalW - 20} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={leftPad - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#475569">{v}</text>
          </g>
        );
      })}
      <line x1={leftPad} y1={topPad} x2={leftPad} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      <line x1={leftPad} y1={topPad + chartH} x2={totalW - 20} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      {/* Single box plot showing overall distribution */}
      {(() => {
        const cx = totalW / 2;
        const minY = topPad + chartH - ((84 - 55) / 40) * chartH;
        const maxY = topPad + chartH - ((60 - 55) / 40) * chartH;
        const q1Y = topPad + chartH - ((70 - 55) / 40) * chartH;
        const q3Y = topPad + chartH - ((82 - 55) / 40) * chartH;
        const medY = topPad + chartH - ((77 - 55) / 40) * chartH;
        return (
          <g>
            <line x1={cx} y1={minY} x2={cx} y2={maxY} stroke="#3bb4a4" strokeWidth="1.5" strokeDasharray="3,2" />
            <line x1={cx - 10} y1={minY} x2={cx + 10} y2={minY} stroke="#3bb4a4" strokeWidth="1.5" />
            <line x1={cx - 10} y1={maxY} x2={cx + 10} y2={maxY} stroke="#3bb4a4" strokeWidth="1.5" />
            <rect x={cx - 25} y={q3Y} width={50} height={q1Y - q3Y} rx="2" fill="none" stroke="#3bb4a4" strokeWidth="2" />
            <line x1={cx - 25} y1={medY} x2={cx + 25} y2={medY} stroke="var(--color-accent)" strokeWidth="2.5" />
            <text x={cx} y={topPad + chartH + 18} textAnchor="middle" fontSize="11" fill="#94a3b8">All Countries</text>
            <text x={cx + 36} y={medY + 3} textAnchor="start" fontSize="9" fill="var(--color-accent)">median</text>
          </g>
        );
      })()}
    </svg>
  );
}

function LifeExpHistogram() {
  const bins = [
    { label: "60–64", count: 2 },
    { label: "65–69", count: 1 },
    { label: "70–74", count: 2 },
    { label: "75–79", count: 3 },
    { label: "80–84", count: 9 },
    { label: "85+", count: 3 },
  ];
  const maxCount = 10;
  const chartH = 160;
  const barW = 44;
  const leftPad = 36;
  const bottomPad = 36;
  const topPad = 16;
  const totalW = leftPad + bins.length * (barW + 2) + 20;

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + bottomPad + topPad}`} className="w-full max-h-[220px]" aria-label="Histogram of life expectancy distribution">
      {[0, 5, 10].map((v) => {
        const y = topPad + chartH - (v / maxCount) * chartH;
        return (
          <g key={v}>
            <line x1={leftPad} y1={y} x2={totalW - 10} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={leftPad - 5} y={y + 4} textAnchor="end" fontSize="10" fill="#475569">{v}</text>
          </g>
        );
      })}
      <line x1={leftPad} y1={topPad} x2={leftPad} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      <line x1={leftPad} y1={topPad + chartH} x2={totalW - 10} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      {bins.map((b, i) => {
        const bH = (b.count / maxCount) * chartH;
        const x = leftPad + i * (barW + 2);
        return (
          <g key={b.label}>
            <rect x={x} y={topPad + chartH - bH} width={barW} height={bH} fill="#3bb4a4" opacity="0.75" />
            <text x={x + barW / 2} y={topPad + chartH + 18} textAnchor="middle" fontSize="8.5" fill="#94a3b8">{b.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function LifeExpScatter() {
  const chartH = 160;
  const leftPad = 44;
  const bottomPad = 36;
  const topPad = 16;
  const totalW = 300;

  const pts = LIFE_DATA.map((d, i) => ({
    x: leftPad + i * ((totalW - leftPad - 20) / (LIFE_DATA.length - 1)),
    y: topPad + chartH - ((d.value - 55) / 35) * chartH,
  }));

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + bottomPad + topPad}`} className="w-full max-h-[220px]" aria-label="Scatter plot (poor for ranking)">
      {[60, 70, 80].map((v) => {
        const y = topPad + chartH - ((v - 55) / 35) * chartH;
        return (
          <g key={v}>
            <line x1={leftPad} y1={y} x2={totalW - 10} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={leftPad - 5} y={y + 4} textAnchor="end" fontSize="9" fill="#475569">{v}</text>
          </g>
        );
      })}
      <line x1={leftPad} y1={topPad} x2={leftPad} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      <line x1={leftPad} y1={topPad + chartH} x2={totalW - 10} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#3bb4a4" opacity="0.7" />
      ))}
      <text x={totalW / 2} y={topPad + chartH + 20} textAnchor="middle" fontSize="9" fill="#94a3b8">Country index (unsorted)</text>
    </svg>
  );
}

// ── Traffic data ──────────────────────────────────────────────────────────────
const TRAFFIC_PAGES = ["Home", "Blog", "About", "Pricing", "Contact"];
const TRAFFIC_MONTHS = ["Jan", "Feb", "Mar"];
const TRAFFIC_DATA = [
  [12000, 13500, 15200],
  [8500, 9200, 8800],
  [4200, 4100, 4400],
  [3100, 3800, 4100],
  [1800, 1900, 2100],
];
const PAGE_COLORS = ["#3bb4a4", "var(--color-accent)", "#a855f7", "#ef4444", "var(--color-warning)"];

function TrafficMultiLine() {
  const chartH = 180;
  const leftPad = 60;
  const bottomPad = 36;
  const topPad = 16;
  const totalW = 360;
  const maxVal = 16000;
  const xs = [0, 1, 2].map((i) => leftPad + i * ((totalW - leftPad - 20) / 2));

  function toY(v: number) {
    return topPad + chartH - (v / maxVal) * chartH;
  }

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + bottomPad + topPad}`} className="w-full max-h-[240px]" aria-label="Multi-line chart of website traffic">
      {[0, 5000, 10000, 15000].map((v) => {
        const y = toY(v);
        return (
          <g key={v}>
            <line x1={leftPad} y1={y} x2={totalW - 10} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={leftPad - 5} y={y + 4} textAnchor="end" fontSize="9" fill="#475569">{v / 1000}k</text>
          </g>
        );
      })}
      <line x1={leftPad} y1={topPad} x2={leftPad} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      <line x1={leftPad} y1={topPad + chartH} x2={totalW - 10} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      {TRAFFIC_DATA.map((series, si) => {
        const pts = xs.map((x, i) => `${x},${toY(series[i])}`).join(" ");
        return (
          <g key={si}>
            <polyline points={pts} fill="none" stroke={PAGE_COLORS[si]} strokeWidth="2" strokeLinejoin="round" />
            {xs.map((x, i) => (
              <circle key={i} cx={x} cy={toY(series[i])} r="3.5" fill={PAGE_COLORS[si]} />
            ))}
            <text x={xs[xs.length - 1] + 5} y={toY(series[series.length - 1]) + 4} textAnchor="start" fontSize="8.5" fill={PAGE_COLORS[si]}>{TRAFFIC_PAGES[si]}</text>
          </g>
        );
      })}
      {xs.map((x, i) => (
        <text key={i} x={x} y={topPad + chartH + 18} textAnchor="middle" fontSize="10" fill="#94a3b8">{TRAFFIC_MONTHS[i]}</text>
      ))}
    </svg>
  );
}

function TrafficGroupedBar() {
  const chartH = 180;
  const leftPad = 54;
  const bottomPad = 36;
  const topPad = 16;
  const totalW = 360;
  const maxVal = 16000;
  const groupW = 80;
  const barW = 13;
  const groupGap = (totalW - leftPad - 20 - 3 * groupW) / 2;

  function toH(v: number) {
    return (v / maxVal) * chartH;
  }

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + bottomPad + topPad}`} className="w-full max-h-[240px]" aria-label="Grouped bar chart of website traffic">
      {[0, 5000, 10000, 15000].map((v) => {
        const y = topPad + chartH - (v / maxVal) * chartH;
        return (
          <g key={v}>
            <line x1={leftPad} y1={y} x2={totalW - 10} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={leftPad - 5} y={y + 4} textAnchor="end" fontSize="9" fill="#475569">{v / 1000}k</text>
          </g>
        );
      })}
      <line x1={leftPad} y1={topPad} x2={leftPad} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      <line x1={leftPad} y1={topPad + chartH} x2={totalW - 10} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      {TRAFFIC_MONTHS.map((month, mi) => {
        const gx = leftPad + mi * (groupW + groupGap);
        return (
          <g key={month}>
            {TRAFFIC_DATA.map((series, si) => {
              const h = toH(series[mi]);
              const x = gx + si * (barW + 1);
              return (
                <rect key={si} x={x} y={topPad + chartH - h} width={barW} height={h} rx="1" fill={PAGE_COLORS[si]} opacity="0.8" />
              );
            })}
            <text x={gx + (5 * (barW + 1)) / 2} y={topPad + chartH + 18} textAnchor="middle" fontSize="10" fill="#94a3b8">{month}</text>
          </g>
        );
      })}
    </svg>
  );
}

function TrafficStackedArea() {
  const chartH = 180;
  const leftPad = 60;
  const bottomPad = 36;
  const topPad = 16;
  const totalW = 360;
  const maxVal = TRAFFIC_DATA.reduce((acc, series) => Math.max(acc, series.reduce((a, b) => a + b, 0)), 0);
  const xs = [0, 1, 2].map((i) => leftPad + i * ((totalW - leftPad - 20) / 2));

  // Compute cumulative stacks
  const stacked: number[][] = TRAFFIC_DATA.map(() => [0, 0, 0]);
  for (let i = 0; i < 3; i++) {
    let cum = 0;
    for (let s = 0; s < TRAFFIC_DATA.length; s++) {
      stacked[s][i] = cum + TRAFFIC_DATA[s][i];
      cum = stacked[s][i];
    }
  }

  function toY(v: number) {
    return topPad + chartH - (v / maxVal) * chartH;
  }

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + bottomPad + topPad}`} className="w-full max-h-[240px]" aria-label="Stacked area chart of website traffic">
      {[0, 10000, 20000, 30000].map((v) => {
        const y = toY(v);
        return (
          <g key={v}>
            <line x1={leftPad} y1={y} x2={totalW - 10} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={leftPad - 5} y={y + 4} textAnchor="end" fontSize="9" fill="#475569">{v / 1000}k</text>
          </g>
        );
      })}
      <line x1={leftPad} y1={topPad} x2={leftPad} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      <line x1={leftPad} y1={topPad + chartH} x2={totalW - 10} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      {TRAFFIC_DATA.map((_, si) => {
        const topPts = xs.map((x, i) => `${x},${toY(stacked[si][i])}`).join(" ");
        const botPts =
          si === 0
            ? xs.map((x) => `${x},${topPad + chartH}`).join(" ")
            : xs.map((x, i) => `${x},${toY(stacked[si - 1][i])}`).join(" ");
        const area = `${xs[0]},${si === 0 ? topPad + chartH : toY(stacked[si - 1][0])} ${topPts} ${xs[xs.length - 1]},${si === 0 ? topPad + chartH : toY(stacked[si - 1][xs.length - 1])} ${botPts.split(" ").reverse().join(" ")}`;
        return (
          <polygon key={si} points={area} fill={PAGE_COLORS[si]} opacity="0.35" />
        );
      })}
      {xs.map((x, i) => (
        <text key={i} x={x} y={topPad + chartH + 18} textAnchor="middle" fontSize="10" fill="#94a3b8">{TRAFFIC_MONTHS[i]}</text>
      ))}
    </svg>
  );
}

function TrafficBoxPlot() {
  const chartH = 180;
  const leftPad = 60;
  const bottomPad = 36;
  const topPad = 16;
  const totalW = 360;
  const maxVal = 16000;

  const boxes = TRAFFIC_PAGES.map((page, pi) => {
    const vals = TRAFFIC_DATA[pi];
    const sorted = [...vals].sort((a, b) => a - b);
    return {
      page,
      min: sorted[0],
      q1: sorted[0] + (sorted[1] - sorted[0]) * 0.25,
      med: sorted[1],
      q3: sorted[1] + (sorted[2] - sorted[1]) * 0.75,
      max: sorted[2],
    };
  });

  const boxW = 36;
  const gap = 20;
  const totalBoxW = boxes.length * (boxW + gap);

  function toY(v: number) {
    return topPad + chartH - (v / maxVal) * chartH;
  }

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + bottomPad + topPad}`} className="w-full max-h-[240px]" aria-label="Box plot (poor for trend comparison)">
      {[0, 5000, 10000, 15000].map((v) => {
        const y = toY(v);
        return (
          <g key={v}>
            <line x1={leftPad} y1={y} x2={totalW - 10} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={leftPad - 5} y={y + 4} textAnchor="end" fontSize="9" fill="#475569">{v / 1000}k</text>
          </g>
        );
      })}
      <line x1={leftPad} y1={topPad} x2={leftPad} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      <line x1={leftPad} y1={topPad + chartH} x2={totalW - 10} y2={topPad + chartH} stroke="#334155" strokeWidth="1.5" />
      {boxes.map((b, i) => {
        const cx = leftPad + 20 + i * (boxW + gap) + boxW / 2;
        return (
          <g key={b.page}>
            <line x1={cx} y1={toY(b.min)} x2={cx} y2={toY(b.max)} stroke={PAGE_COLORS[i]} strokeWidth="1.5" />
            <rect x={cx - boxW / 2} y={toY(b.q3)} width={boxW} height={toY(b.q1) - toY(b.q3)} rx="2" fill="none" stroke={PAGE_COLORS[i]} strokeWidth="1.5" />
            <line x1={cx - boxW / 2} y1={toY(b.med)} x2={cx + boxW / 2} y2={toY(b.med)} stroke={PAGE_COLORS[i]} strokeWidth="2" />
            <text x={cx} y={topPad + chartH + 18} textAnchor="middle" fontSize="8.5" fill="#94a3b8">{b.page}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Chart map ─────────────────────────────────────────────────────────────────
const CHART_MAP: Partial<Record<DatasetType, Partial<Record<ChartOptionId, React.ReactNode>>>> = {
  test_scores: {
    bar: <TestScoresBarChart />,
    histogram: <TestScoresHistogram />,
    box_plot: <TestScoresBoxPlot />,
    line: <TestScoresLineChart />,
  },
  monthly_sales: {
    line: <SalesLineChart />,
    area: <SalesAreaChart />,
    bar: <SalesBarChart />,
    scatter: <SalesScatterPlot />,
  },
  life_expectancy: {
    sorted_bar: <LifeExpSortedBar />,
    box_plot: <LifeExpBoxPlot />,
    histogram: <LifeExpHistogram />,
    scatter: <LifeExpScatter />,
  },
  traffic: {
    multi_line: <TrafficMultiLine />,
    grouped_bar: <TrafficGroupedBar />,
    stacked_area: <TrafficStackedArea />,
    box_plot: <TrafficBoxPlot />,
  },
};

export default function ChartRenderer({ dataset, chartId }: Props) {
  const chart = CHART_MAP[dataset]?.[chartId];
  if (!chart) return null;
  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4">
      {chart}
    </div>
  );
}
