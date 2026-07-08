"use client";

import React from "react";
import {
  LeakPoint,
  LEAK_K_MIN,
  LEAK_K_MAX,
  LEAK_N,
  LEAK_BASE,
  LEAK_NOISE,
  LEAK_SEED,
} from "./types";

interface Props {
  curve: LeakPoint[];
  k: number;
  onChange: (k: number) => void;
}

const W = 560;
const H = 300;
const M = { top: 18, right: 16, bottom: 44, left: 52 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

const Y_MIN = -1;
const Y_MAX = 1;

function xPos(k: number) {
  return M.left + ((k - LEAK_K_MIN) / (LEAK_K_MAX - LEAK_K_MIN)) * PW;
}
function yPos(r2: number) {
  const clamped = Math.max(Y_MIN, Math.min(Y_MAX, r2));
  return M.top + (1 - (clamped - Y_MIN) / (Y_MAX - Y_MIN)) * PH;
}

function polyline(curve: LeakPoint[], pick: (p: LeakPoint) => number): string {
  return curve.map((p) => `${xPos(p.k)},${yPos(pick(p))}`).join(" ");
}

function TargetLeakageInner({ curve, k, onChange }: Props) {
  const current = curve[k - LEAK_K_MIN];

  const summary =
    `Train versus held-out R squared for target encoding as the number of categories grows ` +
    `from ${LEAK_K_MIN} to ${LEAK_K_MAX} on ${LEAK_N} rows of pure noise. ` +
    `At k = ${k}: train R squared ${current.trainR2.toFixed(3)}, ` +
    `held-out R squared ${current.holdoutR2.toFixed(3)}. ` +
    `Train fit keeps improving while held-out fit gets worse.`;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <label htmlFor="leak-k-slider" className="text-[12px] text-[#94a3b8] shrink-0">
          Categories carved into the {LEAK_N} rows (k)
        </label>
        <input
          id="leak-k-slider"
          type="range"
          min={LEAK_K_MIN}
          max={LEAK_K_MAX}
          step={1}
          value={k}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 cursor-pointer"
          style={{ accentColor: "var(--color-accent)" }}
        />
        <span className="text-[13px] font-mono font-bold text-white w-10 text-right shrink-0">
          {k}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={summary}>
        {/* Gridlines */}
        {[-1, -0.5, 0, 0.5, 1].map((t) => (
          <g key={t}>
            <line
              x1={M.left}
              y1={yPos(t)}
              x2={W - M.right}
              y2={yPos(t)}
              stroke={t === 0 ? "#334155" : "#1e293b"}
              strokeWidth={t === 0 ? 1.5 : 1}
            />
            <text x={M.left - 8} y={yPos(t) + 4} textAnchor="end" fontSize={10} fill="#475569">
              {t.toFixed(1)}
            </text>
          </g>
        ))}
        {[5, 10, 15, 20, 25, 30].map((tick) => (
          <text
            key={tick}
            x={xPos(tick)}
            y={H - M.bottom + 16}
            textAnchor="middle"
            fontSize={10}
            fill="#475569"
          >
            {tick}
          </text>
        ))}

        {/* Current-k marker */}
        <line
          x1={xPos(k)}
          y1={M.top}
          x2={xPos(k)}
          y2={M.top + PH}
          stroke="var(--color-accent)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />

        {/* Curves, computed live from the seeded sample */}
        <polyline
          points={polyline(curve, (p) => p.trainR2)}
          fill="none"
          stroke="#3bb4a4"
          strokeWidth={2}
        />
        <polyline
          points={polyline(curve, (p) => p.holdoutR2)}
          fill="none"
          stroke="#ef4444"
          strokeWidth={2}
        />
        <circle cx={xPos(k)} cy={yPos(current.trainR2)} r={4.5} fill="#3bb4a4" />
        <circle cx={xPos(k)} cy={yPos(current.holdoutR2)} r={4.5} fill="#ef4444" />

        {/* Axes */}
        <line x1={M.left} y1={M.top + PH} x2={W - M.right} y2={M.top + PH} stroke="#334155" strokeWidth={1} />
        <line x1={M.left} y1={M.top} x2={M.left} y2={M.top + PH} stroke="#334155" strokeWidth={1} />
        <text x={M.left + PW / 2} y={H - 6} textAnchor="middle" fontSize={11} fill="#94a3b8">
          Number of categories (k)
        </text>
        <text
          x={14}
          y={M.top + PH / 2}
          textAnchor="middle"
          fontSize={11}
          fill="#94a3b8"
          transform={`rotate(-90 14 ${M.top + PH / 2})`}
        >
          R² (display clamped to [-1, 1])
        </text>
      </svg>

      {/* Legend: shape plus text, never color alone */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 mb-4">
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <svg width="18" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="18" y2="4" stroke="#3bb4a4" strokeWidth="2" />
          </svg>
          Train R² (memorization)
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <svg width="18" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="18" y2="4" stroke="#ef4444" strokeWidth="2" />
          </svg>
          Held-out R² (the truth)
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <svg width="18" height="8" aria-hidden="true">
            <line x1="9" y1="0" x2="9" y2="8" stroke="var(--color-accent)" strokeWidth="1.5" strokeDasharray="3 2" />
          </svg>
          Current k
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] mb-1">Train R² at k = {k}</p>
          <p className="text-xl font-black font-mono text-[#3bb4a4]">
            {current.trainR2.toFixed(3)}
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] mb-1">Held-out R² at k = {k}</p>
          <p className="text-xl font-black font-mono text-[#ef4444]">
            {current.holdoutR2.toFixed(3)}
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] mb-1">Avg train rows per category</p>
          <p className="text-xl font-black font-mono text-[#f1f5f9]">
            {current.avgTrainRows.toFixed(1)}
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] mb-1">Smallest category (train rows)</p>
          <p className="text-xl font-black font-mono text-[#f1f5f9]">{current.minTrainRows}</p>
        </div>
      </div>

      <p className="text-[11px] text-[#475569] leading-relaxed">
        How this stays honest: the {LEAK_N} prices are {LEAK_BASE} plus uniform noise of ±
        {LEAK_NOISE}, drawn once from a seeded generator (seed {LEAK_SEED}), and the
        category has zero real effect on price. Rows with index mod 3 equal to 2 are held
        out (20 of {LEAK_N}). Each category is encoded with its train-only mean price, a
        line is fit by exact least squares on the train slice, and both R² values are
        recomputed live for every k.
      </p>
    </div>
  );
}

const TargetLeakage = React.memo(TargetLeakageInner);
export default TargetLeakage;
