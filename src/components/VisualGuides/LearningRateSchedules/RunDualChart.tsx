"use client";

import {
  TOTAL_STEPS,
  CONVERGED_LOSS,
  baselineMse,
  type RunSummary,
} from "./scheduleMath";

/**
 * Synced dual chart: lr(t) on top, full-grid MSE (log scale) below,
 * sharing the step axis. Pure SVG. Every plotted value comes from
 * scheduleMath: planned curves via scheduleCurve(), run curves from the
 * recorded RunSummary arrays, live curves from the in-flight run state.
 */

const W = 680;
const L = 52;
const R = 14;
const LR_TOP = 12;
const LR_H = 96;
const GAP = 34;
const LOSS_H = 170;
const BOTTOM = 26;
const H = LR_TOP + LR_H + GAP + LOSS_H + BOTTOM;
const PLOT_W = W - L - R;
const LOSS_TOP = LR_TOP + LR_H + GAP;

/** Log-loss display domain: 10^LOG_MIN .. 10^LOG_MAX, values clamped. */
const LOG_MIN = -3;
const LOG_MAX = 2;

const BASELINE = baselineMse();

function xPos(step: number): number {
  return L + (step / TOTAL_STEPS) * PLOT_W;
}

function yLr(v: number, maxLr: number): number {
  return LR_TOP + (1 - v / maxLr) * LR_H;
}

function yLoss(v: number): number {
  const lg = Math.log10(Math.min(Math.max(v, Math.pow(10, LOG_MIN)), Math.pow(10, LOG_MAX)));
  return LOSS_TOP + ((LOG_MAX - lg) / (LOG_MAX - LOG_MIN)) * LOSS_H;
}

function lrPath(lrs: readonly number[], maxLr: number): string {
  const parts: string[] = [];
  for (let t = 0; t < lrs.length; t++) {
    parts.push(
      `${t === 0 ? "M" : "L"}${xPos(t).toFixed(2)},${yLr(lrs[t], maxLr).toFixed(2)}`
    );
  }
  return parts.join(" ");
}

/** losses[i] is the grid MSE after step i (losses[0] = init). Stops at non-finite values. */
function lossPath(losses: readonly number[]): string {
  const parts: string[] = [];
  for (let i = 0; i < losses.length; i++) {
    if (!Number.isFinite(losses[i])) break;
    parts.push(
      `${parts.length === 0 ? "M" : "L"}${xPos(i).toFixed(2)},${yLoss(losses[i]).toFixed(2)}`
    );
  }
  return parts.join(" ");
}

export interface ChartRun {
  key: string;
  label: string;
  color: string;
  summary: RunSummary;
}

interface Props {
  /** The currently selected schedule's planned lr curve (dashed preview). */
  plannedLrs: number[];
  runs: ChartRun[];
  /** In-flight run curves, drawn in accent gold, or null when idle. */
  live: { lrs: number[]; losses: number[] } | null;
}

export default function RunDualChart({ plannedLrs, runs, live }: Props) {
  let maxLr = 0;
  for (const v of plannedLrs) maxLr = Math.max(maxLr, v);
  for (const r of runs) for (const v of r.summary.lrs) maxLr = Math.max(maxLr, v);
  if (live) for (const v of live.lrs) maxLr = Math.max(maxLr, v);
  maxLr = Math.max(maxLr, 0.01) * 1.08;

  const lrTicks = [0, 0.5, 1].map((f) => f * maxLr);
  const lossDecades = [];
  for (let d = LOG_MIN; d <= LOG_MAX; d++) lossDecades.push(d);
  const xTicks = [0, 300, 600, 900, TOTAL_STEPS];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label={`Two synced charts over ${TOTAL_STEPS} training steps: learning rate per step on top and full-grid mean squared error on a log scale below. ${
        runs.length === 0
          ? "No completed runs yet; the dashed line previews the selected schedule."
          : `Completed runs: ${runs
              .map(
                (r) =>
                  `${r.label}, final loss ${
                    Number.isFinite(r.summary.finalLoss)
                      ? r.summary.finalLoss.toExponential(2)
                      : "not finite"
                  }, ${r.summary.status}`
              )
              .join("; ")}.`
      } Exact numbers appear in the run table below the chart.`}
    >
      {/* ── LR panel ── */}
      <text x={L} y={LR_TOP - 2} fontSize="10" fill="#94a3b8" fontWeight="600">
        learning rate lr(t)
      </text>
      {lrTicks.map((v) => (
        <g key={`lr-${v.toFixed(4)}`}>
          <line
            x1={L}
            y1={yLr(v, maxLr).toFixed(2)}
            x2={W - R}
            y2={yLr(v, maxLr).toFixed(2)}
            stroke="#1e293b"
            strokeWidth="1"
          />
          <text
            x={L - 6}
            y={(yLr(v, maxLr) + 3).toFixed(2)}
            textAnchor="end"
            fontSize="9"
            fill="#475569"
          >
            {v.toFixed(2)}
          </text>
        </g>
      ))}
      {/* planned curve for the current selection */}
      <path
        d={lrPath(plannedLrs, maxLr)}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
        strokeDasharray="5 4"
        opacity="0.55"
      />
      {runs.map((r) => (
        <path
          key={`lr-run-${r.key}`}
          d={lrPath(r.summary.lrs, maxLr)}
          fill="none"
          stroke={r.color}
          strokeWidth="1.5"
        />
      ))}
      {live && live.lrs.length > 1 && (
        <path
          d={lrPath(live.lrs, maxLr)}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
        />
      )}

      {/* ── Loss panel ── */}
      <text x={L} y={LOSS_TOP - 6} fontSize="10" fill="#94a3b8" fontWeight="600">
        full-grid MSE (log scale)
      </text>
      {lossDecades.map((d) => (
        <g key={`dec-${d}`}>
          <line
            x1={L}
            y1={yLoss(Math.pow(10, d)).toFixed(2)}
            x2={W - R}
            y2={yLoss(Math.pow(10, d)).toFixed(2)}
            stroke="#1e293b"
            strokeWidth="1"
          />
          <text
            x={L - 6}
            y={(yLoss(Math.pow(10, d)) + 3).toFixed(2)}
            textAnchor="end"
            fontSize="9"
            fill="#475569"
          >
            {d === 0 ? "1" : `1e${d}`}
          </text>
        </g>
      ))}
      {/* baseline and converged references */}
      <line
        x1={L}
        y1={yLoss(BASELINE).toFixed(2)}
        x2={W - R}
        y2={yLoss(BASELINE).toFixed(2)}
        stroke="#94a3b8"
        strokeWidth="1"
        strokeDasharray="2 3"
      />
      <text
        x={W - R}
        y={(yLoss(BASELINE) - 3).toFixed(2)}
        textAnchor="end"
        fontSize="8.5"
        fill="#94a3b8"
      >
        predict-the-mean baseline ({BASELINE.toFixed(3)})
      </text>
      <line
        x1={L}
        y1={yLoss(CONVERGED_LOSS).toFixed(2)}
        x2={W - R}
        y2={yLoss(CONVERGED_LOSS).toFixed(2)}
        stroke="var(--color-success)"
        strokeWidth="1"
        strokeDasharray="2 3"
      />
      <text
        x={W - R}
        y={(yLoss(CONVERGED_LOSS) - 3).toFixed(2)}
        textAnchor="end"
        fontSize="8.5"
        fill="var(--color-success)"
      >
        converged threshold ({CONVERGED_LOSS})
      </text>

      {runs.map((r) => (
        <g key={`loss-run-${r.key}`}>
          <path
            d={lossPath(r.summary.losses)}
            fill="none"
            stroke={r.color}
            strokeWidth="1.5"
          />
          {r.summary.divergedAt !== null && (
            <g>
              <text
                x={xPos(Math.min(r.summary.divergedAt, TOTAL_STEPS)).toFixed(2)}
                y={(LOSS_TOP + 10).toFixed(2)}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill={r.color}
              >
                ×
              </text>
              <text
                x={(xPos(Math.min(r.summary.divergedAt, TOTAL_STEPS)) + 5).toFixed(2)}
                y={(LOSS_TOP + 10).toFixed(2)}
                fontSize="8.5"
                fill={r.color}
              >
                diverged @ step {r.summary.divergedAt}
              </text>
            </g>
          )}
        </g>
      ))}
      {live && live.losses.length > 1 && (
        <path
          d={lossPath(live.losses)}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
        />
      )}

      {/* shared x axis */}
      {xTicks.map((t) => (
        <g key={`x-${t}`}>
          <line
            x1={xPos(t).toFixed(2)}
            y1={(LOSS_TOP + LOSS_H).toFixed(2)}
            x2={xPos(t).toFixed(2)}
            y2={(LOSS_TOP + LOSS_H + 4).toFixed(2)}
            stroke="#334155"
            strokeWidth="1"
          />
          <text
            x={xPos(t).toFixed(2)}
            y={(LOSS_TOP + LOSS_H + 14).toFixed(2)}
            textAnchor="middle"
            fontSize="9"
            fill="#475569"
          >
            {t}
          </text>
        </g>
      ))}
      <text
        x={W - R}
        y={(H - 4).toFixed(2)}
        textAnchor="end"
        fontSize="9"
        fill="#334155"
      >
        training step (shared axis)
      </text>
    </svg>
  );
}
