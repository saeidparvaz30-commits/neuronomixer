"use client";

import React from "react";
import type { ChartOption, ChartOptionId } from "./types";

interface Props {
  options: ChartOption[];
  selected: ChartOptionId | null;
  onSelect: (id: ChartOptionId) => void;
  datasetCorrected: boolean;
}

function MiniBarChart() {
  const bars = [40, 52, 34, 46];
  return (
    <svg viewBox="0 0 80 60" className="w-full h-full" aria-hidden="true">
      <line x1="8" y1="52" x2="74" y2="52" stroke="#334155" strokeWidth="1" />
      <line x1="8" y1="52" x2="8" y2="8" stroke="#334155" strokeWidth="1" />
      {bars.map((h, i) => (
        <rect key={i} x={12 + i * 16} y={52 - h} width="11" height={h} rx="1" fill="#3bb4a4" opacity="0.8" />
      ))}
    </svg>
  );
}

function MiniLineChart() {
  const pts = [48, 42, 46, 36, 32, 28, 24, 20, 22, 16, 12, 10];
  const xs = pts.map((_, i) => 8 + i * 6);
  const ys = pts.map((p) => p);
  const polyline = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
  return (
    <svg viewBox="0 0 80 60" className="w-full h-full" aria-hidden="true">
      <line x1="8" y1="52" x2="74" y2="52" stroke="#334155" strokeWidth="1" />
      <line x1="8" y1="52" x2="8" y2="8" stroke="#334155" strokeWidth="1" />
      <polyline points={polyline} fill="none" stroke="#3bb4a4" strokeWidth="2" strokeLinejoin="round" />
      {xs.filter((_, i) => i % 3 === 0).map((x, i) => (
        <circle key={i} cx={x} cy={ys[i * 3]} r="2" fill="#3bb4a4" />
      ))}
    </svg>
  );
}

function MiniHistogram() {
  const bars = [6, 14, 28, 36, 24, 16, 8];
  const maxH = 36;
  return (
    <svg viewBox="0 0 80 60" className="w-full h-full" aria-hidden="true">
      <line x1="8" y1="52" x2="74" y2="52" stroke="#334155" strokeWidth="1" />
      <line x1="8" y1="52" x2="8" y2="8" stroke="#334155" strokeWidth="1" />
      {bars.map((h, i) => {
        const barH = (h / 36) * maxH;
        return (
          <rect key={i} x={10 + i * 9} y={52 - barH} width="8" height={barH} fill="#3bb4a4" opacity="0.8" />
        );
      })}
    </svg>
  );
}

function MiniBoxPlot() {
  const boxes = [
    { x: 18, q1: 32, med: 22, q3: 14, min: 44, max: 8 },
    { x: 40, q1: 30, med: 18, q3: 10, min: 42, max: 6 },
    { x: 62, q1: 35, med: 26, q3: 16, min: 45, max: 9 },
  ];
  return (
    <svg viewBox="0 0 80 60" className="w-full h-full" aria-hidden="true">
      <line x1="8" y1="52" x2="74" y2="52" stroke="#334155" strokeWidth="1" />
      {boxes.map((b, i) => (
        <g key={i}>
          <line x1={b.x} y1={b.min} x2={b.x} y2={b.max} stroke="#3bb4a4" strokeWidth="1" strokeDasharray="2,1" />
          <rect x={b.x - 6} y={b.q3} width="12" height={b.q1 - b.q3} fill="none" stroke="#3bb4a4" strokeWidth="1.5" rx="1" />
          <line x1={b.x - 6} y1={b.med} x2={b.x + 6} y2={b.med} stroke="var(--color-accent)" strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  );
}

function MiniAreaChart() {
  const pts = [48, 42, 46, 36, 32, 28, 24, 20, 22, 16, 12, 10];
  const xs = pts.map((_, i) => 8 + i * 6);
  const ys = pts;
  const polyline = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
  const area = `${xs[0]},52 ${polyline} ${xs[xs.length - 1]},52`;
  return (
    <svg viewBox="0 0 80 60" className="w-full h-full" aria-hidden="true">
      <line x1="8" y1="52" x2="74" y2="52" stroke="#334155" strokeWidth="1" />
      <line x1="8" y1="52" x2="8" y2="8" stroke="#334155" strokeWidth="1" />
      <polygon points={area} fill="#3bb4a4" opacity="0.2" />
      <polyline points={polyline} fill="none" stroke="#3bb4a4" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function MiniScatterPlot() {
  const pts = [
    { x: 14, y: 44 }, { x: 22, y: 38 }, { x: 30, y: 20 }, { x: 38, y: 32 },
    { x: 46, y: 14 }, { x: 54, y: 28 }, { x: 62, y: 10 }, { x: 70, y: 18 },
    { x: 18, y: 26 }, { x: 58, y: 42 },
  ];
  return (
    <svg viewBox="0 0 80 60" className="w-full h-full" aria-hidden="true">
      <line x1="8" y1="52" x2="74" y2="52" stroke="#334155" strokeWidth="1" />
      <line x1="8" y1="52" x2="8" y2="8" stroke="#334155" strokeWidth="1" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#3bb4a4" opacity="0.7" />
      ))}
    </svg>
  );
}

function MiniGroupedBar() {
  const groups = [
    [38, 28, 20],
    [44, 32, 26],
    [36, 30, 22],
  ];
  const colors = ["#3bb4a4", "var(--color-accent)", "#a855f7"];
  return (
    <svg viewBox="0 0 80 60" className="w-full h-full" aria-hidden="true">
      <line x1="8" y1="52" x2="74" y2="52" stroke="#334155" strokeWidth="1" />
      <line x1="8" y1="52" x2="8" y2="8" stroke="#334155" strokeWidth="1" />
      {groups.map((g, gi) =>
        g.map((h, bi) => (
          <rect
            key={`${gi}-${bi}`}
            x={12 + gi * 22 + bi * 7}
            y={52 - h}
            width="6"
            height={h}
            rx="0.5"
            fill={colors[bi]}
            opacity="0.8"
          />
        ))
      )}
    </svg>
  );
}

function MiniStackedArea() {
  const bottom = [44, 40, 36, 32, 28, 24];
  const mid = [34, 30, 24, 20, 16, 12];
  const top = [24, 20, 14, 10, 8, 4];
  const xs = bottom.map((_, i) => 8 + i * 13);
  const bPts = xs.map((x, i) => `${x},${bottom[i]}`).join(" ");
  const mPts = xs.map((x, i) => `${x},${mid[i]}`).join(" ");
  const tPts = xs.map((x, i) => `${x},${top[i]}`).join(" ");
  const bArea = `${xs[0]},52 ${bPts} ${xs[xs.length - 1]},52`;
  const mArea = `${xs[0]},${bottom[0]} ${mPts} ${xs[xs.length - 1]},${bottom[bottom.length - 1]}`;
  return (
    <svg viewBox="0 0 80 60" className="w-full h-full" aria-hidden="true">
      <line x1="8" y1="52" x2="74" y2="52" stroke="#334155" strokeWidth="1" />
      <polygon points={bArea} fill="#3bb4a4" opacity="0.4" />
      <polygon points={mArea} fill="var(--color-accent)" opacity="0.4" />
      <polyline points={tPts} fill="none" stroke="#a855f7" strokeWidth="1.5" opacity="0.7" />
    </svg>
  );
}

function MiniMultiLine() {
  const series = [
    [48, 44, 40, 36, 30, 26],
    [42, 46, 50, 48, 44, 40],
    [36, 32, 28, 24, 20, 16],
    [52, 50, 46, 42, 38, 34],
    [40, 38, 34, 30, 26, 22],
  ];
  const colors = ["#3bb4a4", "var(--color-accent)", "#a855f7", "#ef4444", "var(--color-warning)"];
  const xs = series[0].map((_, i) => 8 + i * 13);
  return (
    <svg viewBox="0 0 80 60" className="w-full h-full" aria-hidden="true">
      <line x1="8" y1="52" x2="74" y2="52" stroke="#334155" strokeWidth="1" />
      <line x1="8" y1="52" x2="8" y2="8" stroke="#334155" strokeWidth="1" />
      {series.map((s, si) => {
        const pts = xs.map((x, i) => `${x},${s[i]}`).join(" ");
        return (
          <polyline
            key={si}
            points={pts}
            fill="none"
            stroke={colors[si]}
            strokeWidth="1.5"
            strokeLinejoin="round"
            opacity="0.85"
          />
        );
      })}
    </svg>
  );
}

function MiniSortedBar() {
  const bars = [52, 48, 44, 40, 36, 32, 28, 24, 20, 16].map((h) => h - 4);
  return (
    <svg viewBox="0 0 80 60" className="w-full h-full" aria-hidden="true">
      <line x1="8" y1="52" x2="74" y2="52" stroke="#334155" strokeWidth="1" />
      <line x1="8" y1="52" x2="8" y2="8" stroke="#334155" strokeWidth="1" />
      {bars.map((h, i) => (
        <rect key={i} x={10 + i * 6.5} y={52 - h} width="5.5" height={h} rx="0.5" fill="#3bb4a4" opacity={0.9 - i * 0.06} />
      ))}
    </svg>
  );
}

const MINI_CHART_MAP: Record<string, React.ReactNode> = {
  bar: <MiniBarChart />,
  line: <MiniLineChart />,
  histogram: <MiniHistogram />,
  box_plot: <MiniBoxPlot />,
  area: <MiniAreaChart />,
  scatter: <MiniScatterPlot />,
  grouped_bar: <MiniGroupedBar />,
  stacked_area: <MiniStackedArea />,
  multi_line: <MiniMultiLine />,
  sorted_bar: <MiniSortedBar />,
};

const QUALITY_COLORS: Record<ChartOption["quality"], string> = {
  best: "#3bb4a4",
  good: "#d4af37",
  works: "#94a3b8",
  poor: "#ef4444",
};

const QUALITY_LABELS: Record<ChartOption["quality"], string> = {
  best: "Best",
  good: "Good",
  works: "Works",
  poor: "Poor",
};

export default function ChartOptionButtons({ options, selected, onSelect, datasetCorrected }: Props) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-3">
        Which chart type best answers the question?
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="radiogroup" aria-label="Chart type options">
        {options.map((opt) => {
          const isSelected = selected === opt.id;
          const isBest = opt.quality === "best";
          const isRevealed = isSelected;

          let borderClass = "border-[#1e293b] hover:border-[#334155]";
          if (isSelected && isBest && datasetCorrected) {
            borderClass = "border-[#3bb4a4]/70 bg-[#3bb4a4]/5";
          } else if (isSelected && !isBest) {
            borderClass = "border-[#ef4444]/40 bg-[#ef4444]/5";
          } else if (isSelected) {
            borderClass = "border-[#d4af37]/60 bg-[#d4af37]/5";
          }

          return (
            <button
              key={opt.id}
              role="radio"
              onClick={() => onSelect(opt.id)}
              className={`group relative flex flex-col rounded-xl border p-3 transition-all text-left ${borderClass}`}
              aria-checked={isSelected}
            >
              {/* Quality badge shown after selection */}
              {isRevealed && (
                <span
                  className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                  style={{
                    background: QUALITY_COLORS[opt.quality] + "22",
                    color: QUALITY_COLORS[opt.quality],
                  }}
                >
                  {QUALITY_LABELS[opt.quality]}
                </span>
              )}

              {/* Mini preview */}
              <div className="w-full aspect-[4/3] mb-2 opacity-80 group-hover:opacity-100 transition-opacity">
                {MINI_CHART_MAP[opt.id] ?? <svg viewBox="0 0 80 60" aria-hidden="true" />}
              </div>

              <span className="text-[12px] font-semibold text-white leading-tight">{opt.label}</span>

              {/* Note shown only after selection */}
              {isRevealed && (
                <p className="text-[10px] text-[#94a3b8] mt-1.5 leading-snug">{opt.note}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
