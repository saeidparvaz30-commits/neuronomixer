"use client";

import React from "react";
import type { ErrorCurvePoint } from "./types";
import { LAMBDA_MAX_STEP, stepFromLambda, formatLambda } from "./types";

interface Props {
  curve: ErrorCurvePoint[];
  currentStep: number;
  color: string;
  modeLabel: string;
}

const W = 560;
const H = 270;
const PAD = { l: 48, r: 14, t: 16, b: 34 };

const X_TICKS: { lambda: number; label: string }[] = [
  { lambda: 1e-5, label: "1e-5" },
  { lambda: 1e-3, label: "1e-3" },
  { lambda: 0.1, label: "0.1" },
  { lambda: 10, label: "10" },
];

function ErrorCurveChartInner({ curve, currentStep, color, modeLabel }: Props) {
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const sx = (step: number) => PAD.l + (step / LAMBDA_MAX_STEP) * innerW;

  const allVals = curve.flatMap((c) => [c.trainMse, c.holdoutMse]);
  const lo = Math.log10(Math.min(...allVals)) - 0.08;
  const hi = Math.log10(Math.max(...allVals)) + 0.08;
  const sy = (v: number) => PAD.t + (1 - (Math.log10(v) - lo) / (hi - lo)) * innerH;

  const yTicks: number[] = [];
  for (let e = Math.ceil(lo); e <= Math.floor(hi); e++) yTicks.push(Math.pow(10, e));

  const toPath = (get: (c: ErrorCurvePoint) => number) =>
    curve
      .map((c, i) => `${i === 0 ? "M" : "L"}${sx(c.step).toFixed(1)},${sy(get(c)).toFixed(1)}`)
      .join(" ");

  const baseline = curve[0].holdoutMse;
  let best = curve[1];
  for (const c of curve) {
    if (c.step >= 1 && c.holdoutMse < best.holdoutMse) best = c;
  }
  const current = curve[currentStep];

  const summary =
    `Line chart of train and holdout mean squared error versus lambda on a log scale for ${modeLabel}. ` +
    `Train error rises steadily as lambda grows. Holdout error is U-shaped: it starts at ${baseline.toFixed(4)} with no regularization, ` +
    `dips to a minimum of ${best.holdoutMse.toFixed(4)} at lambda ${formatLambda(best.lambda)}, then rises again. ` +
    `Currently at lambda ${formatLambda(current.lambda)}: train ${current.trainMse.toFixed(4)}, holdout ${current.holdoutMse.toFixed(4)}.`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={summary}>
        {/* Y gridlines (log decades) */}
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={sy(v)} y2={sy(v)} stroke="#1e293b" strokeWidth={1} />
            <text x={PAD.l - 6} y={sy(v) + 3} textAnchor="end" fontSize={9} fill="#475569">
              {v >= 1 ? v.toFixed(0) : v.toString()}
            </text>
          </g>
        ))}

        {/* X ticks */}
        <text x={sx(0)} y={H - PAD.b + 14} textAnchor="middle" fontSize={9} fill="#475569">
          0
        </text>
        {X_TICKS.map((t) => (
          <g key={t.label}>
            <line
              x1={sx(stepFromLambda(t.lambda))}
              x2={sx(stepFromLambda(t.lambda))}
              y1={PAD.t}
              y2={H - PAD.b}
              stroke="#1e293b"
              strokeWidth={1}
            />
            <text
              x={sx(stepFromLambda(t.lambda))}
              y={H - PAD.b + 14}
              textAnchor="middle"
              fontSize={9}
              fill="#475569"
            >
              {t.label}
            </text>
          </g>
        ))}
        <text x={W - PAD.r} y={H - 6} textAnchor="end" fontSize={10} fill="#475569">
          λ (log scale)
        </text>
        <text x={12} y={PAD.t + 8} fontSize={10} fill="#475569">
          MSE
        </text>

        {/* Baseline: holdout error at lambda = 0 */}
        <line
          x1={PAD.l}
          x2={W - PAD.r}
          y1={sy(baseline)}
          y2={sy(baseline)}
          stroke="#94a3b8"
          strokeWidth={1}
          strokeDasharray="2 4"
        />

        {/* Train curve (dashed) */}
        <path d={toPath((c) => c.trainMse)} fill="none" stroke="#94a3b8" strokeWidth={1.8} strokeDasharray="5 4" />
        {/* Holdout curve (solid) */}
        <path
          d={toPath((c) => c.holdoutMse)}
          fill="none"
          strokeWidth={2.4}
          style={{ stroke: "var(--color-warning)" }}
        />

        {/* Best holdout marker */}
        <circle cx={sx(best.step)} cy={sy(best.holdoutMse)} r={5} style={{ fill: "var(--color-success)" }} stroke="#0f172a" strokeWidth={1.5} />

        {/* Current lambda marker */}
        <line x1={sx(currentStep)} x2={sx(currentStep)} y1={PAD.t} y2={H - PAD.b} stroke={color} strokeWidth={1.2} opacity={0.55} />
        <circle cx={sx(currentStep)} cy={sy(current.trainMse)} r={4} fill="#94a3b8" stroke="#0f172a" strokeWidth={1.2} />
        <circle cx={sx(currentStep)} cy={sy(current.holdoutMse)} r={4.5} style={{ fill: "var(--color-warning)" }} stroke="#0f172a" strokeWidth={1.2} />
      </svg>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-[11px] text-[#94a3b8]">
        <span className="flex items-center gap-1.5">
          <span className="w-5 border-t-2 border-dashed border-[#94a3b8] inline-block" />
          Train MSE
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 inline-block" style={{ background: "var(--color-warning)" }} />
          Holdout MSE
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "var(--color-success)" }} />
          Best holdout (λ = {formatLambda(best.lambda)})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 border-t border-dotted border-[#94a3b8] inline-block" />
          Holdout at λ = 0
        </span>
      </div>
    </div>
  );
}

const ErrorCurveChart = React.memo(ErrorCurveChartInner);
export default ErrorCurveChart;
