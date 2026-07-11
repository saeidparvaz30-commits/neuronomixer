"use client";

import React from "react";
import {
  WIDTHS,
  DATA_SIZES,
  NUM_SIZES,
  NUM_WIDTHS,
  paramCount,
  meanBaselineVal,
  log10,
  type RunResult,
} from "./scalingMath";

type Props = {
  /** Complete result list (all 16), only rendered once the experiment is done. */
  results: readonly RunResult[];
  bestPerBudget: readonly number[];
};

const W = 560;
const H = 340;
const M = { top: 18, right: 96, bottom: 46, left: 58 } as const;
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;

/** Fixed log10 domains so the chart never jumps between runs. */
const X_LO = log10(paramCount(WIDTHS[0])) - 0.12;
const X_HI = log10(paramCount(WIDTHS[NUM_WIDTHS - 1])) + 0.12;
const Y_LO = log10(0.008);
const Y_HI = log10(3);

function xPos(params: number): number {
  return M.left + ((log10(params) - X_LO) / (X_HI - X_LO)) * PLOT_W;
}

function yPos(loss: number): number {
  const v = Math.min(Y_HI, Math.max(Y_LO, log10(loss)));
  return M.top + (1 - (v - Y_LO) / (Y_HI - Y_LO)) * PLOT_H;
}

const Y_TICKS = [0.01, 0.03, 0.1, 0.3, 1, 3];

export const BUDGET_COLORS: readonly string[] = [
  "#ef4444",
  "var(--color-warning)",
  "#a855f7",
  "#3bb4a4",
];

type Shape = "circle" | "square" | "triangle" | "diamond";
export const BUDGET_SHAPES: readonly Shape[] = [
  "circle",
  "square",
  "triangle",
  "diamond",
];

function Marker({
  x,
  y,
  shape,
  color,
}: {
  x: number;
  y: number;
  shape: Shape;
  color: string;
}) {
  const xs = x.toFixed(1);
  const ys = y.toFixed(1);
  if (shape === "circle") return <circle cx={xs} cy={ys} r="4" fill={color} />;
  if (shape === "square")
    return (
      <rect x={(x - 3.5).toFixed(1)} y={(y - 3.5).toFixed(1)} width="7" height="7" fill={color} />
    );
  if (shape === "triangle")
    return (
      <path
        d={`M ${xs} ${(y - 4.5).toFixed(1)} L ${(x + 4.2).toFixed(1)} ${(y + 3.5).toFixed(1)} L ${(x - 4.2).toFixed(1)} ${(y + 3.5).toFixed(1)} Z`}
        fill={color}
      />
    );
  return (
    <path
      d={`M ${xs} ${(y - 5).toFixed(1)} L ${(x + 5).toFixed(1)} ${ys} L ${xs} ${(y + 5).toFixed(1)} L ${(x - 5).toFixed(1)} ${ys} Z`}
      fill={color}
    />
  );
}

export default function LossChart({ results, bestPerBudget }: Props) {
  const series = DATA_SIZES.map((n, d) => {
    const pts = results
      .filter((r) => r.dataIdx === d)
      .sort((a, b) => a.widthIdx - b.widthIdx)
      .map((r) => ({
        widthIdx: r.widthIdx,
        x: xPos(paramCount(WIDTHS[r.widthIdx])),
        y: yPos(r.val),
        val: r.val,
      }));
    return { n, d, pts };
  });

  const baseline = meanBaselineVal(NUM_SIZES - 1);
  const baselineY = yPos(baseline).toFixed(1);

  const summary = series
    .map(
      (s) =>
        `${s.n} points: best width ${WIDTHS[bestPerBudget[s.d]]} with validation loss ${s.pts[bestPerBudget[s.d]].val.toFixed(3)}.`
    )
    .join(" ");

  return (
    <div>
      <p className="sr-only">
        Log-log chart of validation loss versus parameter count, one line per
        data budget. {summary} The same numbers are available in the results
        table above.
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Validation loss versus parameter count on log-log axes, one line per data budget, with the lowest point of each line ringed in gold."
      >
        {/* Y gridlines + labels */}
        {Y_TICKS.map((t) => (
          <g key={t}>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={yPos(t).toFixed(1)}
              y2={yPos(t).toFixed(1)}
              stroke="#1e293b"
              strokeWidth="1"
            />
            <text
              x={M.left - 8}
              y={(yPos(t) + 3.5).toFixed(1)}
              textAnchor="end"
              fontSize="10"
              fill="#475569"
            >
              {t}
            </text>
          </g>
        ))}
        {/* X ticks at the four real parameter counts */}
        {WIDTHS.map((w) => (
          <g key={w}>
            <line
              x1={xPos(paramCount(w)).toFixed(1)}
              x2={xPos(paramCount(w)).toFixed(1)}
              y1={M.top}
              y2={H - M.bottom}
              stroke="#1e293b"
              strokeWidth="1"
            />
            <text
              x={xPos(paramCount(w)).toFixed(1)}
              y={H - M.bottom + 16}
              textAnchor="middle"
              fontSize="10"
              fill="#475569"
            >
              {paramCount(w)}
            </text>
          </g>
        ))}
        <text
          x={M.left + PLOT_W / 2}
          y={H - 8}
          textAnchor="middle"
          fontSize="10"
          fill="#94a3b8"
        >
          parameters (log scale)
        </text>
        <text
          x={M.left - 44}
          y={M.top + PLOT_H / 2}
          textAnchor="middle"
          fontSize="10"
          fill="#94a3b8"
          transform={`rotate(-90 ${M.left - 44} ${M.top + PLOT_H / 2})`}
        >
          validation loss (log)
        </text>

        {/* Predict-the-mean baseline */}
        <line
          x1={M.left}
          x2={W - M.right}
          y1={baselineY}
          y2={baselineY}
          stroke="#475569"
          strokeWidth="1"
          strokeDasharray="5 4"
        />
        <text
          x={M.left + 4}
          y={(yPos(baseline) - 5).toFixed(1)}
          fontSize="9"
          fill="#475569"
        >
          predict the training mean ({baseline.toFixed(2)})
        </text>

        {/* Series */}
        {series.map((s) => (
          <g key={s.n}>
            <polyline
              points={s.pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
              fill="none"
              stroke={BUDGET_COLORS[s.d]}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {s.pts.map((p) => (
              <g key={p.widthIdx}>
                {bestPerBudget[s.d] === p.widthIdx && (
                  <circle
                    cx={p.x.toFixed(1)}
                    cy={p.y.toFixed(1)}
                    r="8"
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="2"
                  />
                )}
                <Marker x={p.x} y={p.y} shape={BUDGET_SHAPES[s.d]} color={BUDGET_COLORS[s.d]} />
              </g>
            ))}
            <text
              x={(s.pts[s.pts.length - 1].x + 12).toFixed(1)}
              y={(s.pts[s.pts.length - 1].y + 3.5).toFixed(1)}
              fontSize="10"
              fontWeight="600"
              fill={BUDGET_COLORS[s.d]}
            >
              {s.n} points
            </text>
          </g>
        ))}
      </svg>

      {/* Legend: shape + color + label, so color is never the sole cue */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
        {DATA_SIZES.map((n, d) => (
          <span key={n} className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
            <svg viewBox="0 0 14 14" className="w-3.5 h-3.5" aria-hidden="true">
              <Marker x={7} y={7} shape={BUDGET_SHAPES[d]} color={BUDGET_COLORS[d]} />
            </svg>
            {n} training points
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <svg viewBox="0 0 14 14" className="w-3.5 h-3.5" aria-hidden="true">
            <circle cx="7" cy="7" r="5" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
          </svg>
          sweet spot (lowest loss on that budget)
        </span>
      </div>
    </div>
  );
}
