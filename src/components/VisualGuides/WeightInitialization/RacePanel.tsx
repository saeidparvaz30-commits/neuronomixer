"use client";

import React from "react";
import {
  Activation,
  RunnerResult,
  Scheme,
  SCHEME_META,
  RACE_STEPS,
  DATA_N,
  LEARNING_RATE,
  MOMENTUM,
  DEPTH,
  WIDTH,
  raceWinner,
  fmtStat,
} from "./initMath";

export interface CurveSnapshot {
  scheme: Scheme;
  losses: number[];
  diverged: boolean;
  divergedAtStep: number | null;
}

export type RacePhase = "idle" | "running" | "done";

type Props = {
  activation: Activation;
  phase: RacePhase;
  progress: number;
  curves: CurveSnapshot[] | null;
  results: RunnerResult[] | null;
  durationMs: number | null;
  onRun: () => void;
};

const W = 560;
const H = 240;
const PAD_L = 40;
const PAD_R = 10;
const PAD_T = 10;
const PAD_B = 44;
const Y_MAX = 1.5;

function xOf(step: number): number {
  return PAD_L + (step / RACE_STEPS) * (W - PAD_L - PAD_R);
}

function yOf(loss: number): number {
  const clamped = Math.min(Math.max(loss, 0), Y_MAX);
  return PAD_T + (1 - clamped / Y_MAX) * (H - PAD_T - PAD_B);
}

export default function RacePanel({
  activation,
  phase,
  progress,
  curves,
  results,
  durationMs,
  onRun,
}: Props) {
  const winner = results ? raceWinner(results) : null;
  const ln2 = Math.LN2;

  return (
    <div>
      <div className="rounded-xl border border-[#1e293b] p-4 mb-4">
        <p className="text-[11px] text-[#94a3b8] leading-relaxed">
          Five copies of the same {DEPTH}-layer, {WIDTH}-unit {activation === "tanh" ? "tanh" : "ReLU"}{" "}
          network, identical except for how the weights start, each train on the same{" "}
          {DATA_N} ring points with full-batch gradient descent (learning rate{" "}
          {LEARNING_RATE}, momentum {MOMENTUM}, {RACE_STEPS} steps). Every loss value is
          computed live from a real forward and backward pass; nothing is scripted. If a
          run overflows to a non-finite loss it is marked diverged and stops, which is
          itself a real outcome of bad initialization.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={onRun}
          disabled={phase === "running"}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
            phase === "running"
              ? "border border-[#1e293b] text-[#475569] cursor-not-allowed"
              : "bg-[#3bb4a4] text-[#0a0e1a]"
          }`}
        >
          {phase === "done" ? "Race again" : "Race all 5 schemes"}
        </button>
        {phase === "running" && (
          <div className="flex items-center gap-2 min-w-[200px] flex-1 max-w-[340px]">
            <div
              role="progressbar"
              aria-label="Training progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              className="h-2 flex-1 rounded-full bg-[#1e293b] overflow-hidden"
            >
              <div
                className="h-full bg-[var(--color-accent)] transition-[width]"
                style={{ width: `${(progress * 100).toFixed(1)}%` }}
              />
            </div>
            <span className="text-[11px] text-[#94a3b8] font-mono">
              {Math.round(progress * 100)}%
            </span>
          </div>
        )}
        {phase === "done" && durationMs !== null && (
          <span className="text-[11px] text-[#475569]">
            Trained 5 nets x {RACE_STEPS} steps in {Math.round(durationMs)} ms in your
            browser.
          </span>
        )}
      </div>

      {/* Loss curves */}
      {curves && curves.length > 0 && (
        <div className="rounded-xl border border-[#1e293b] p-3 mb-4">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            role="img"
            aria-label="Training loss curves for the five initialization schemes. The table below lists the final numbers."
          >
            {/* gridlines */}
            {[0, 0.5, 1.0, 1.5].map((v) => (
              <g key={v}>
                <line
                  x1={PAD_L}
                  y1={yOf(v).toFixed(1)}
                  x2={W - PAD_R}
                  y2={yOf(v).toFixed(1)}
                  stroke="#1e293b"
                  strokeWidth="1"
                />
                <text
                  x={PAD_L - 6}
                  y={(yOf(v) + 3).toFixed(1)}
                  textAnchor="end"
                  fontSize="17"
                  fill="#475569"
                >
                  {v.toFixed(1)}
                </text>
              </g>
            ))}
            {/* ln 2 reference */}
            <line
              x1={PAD_L}
              y1={yOf(ln2).toFixed(1)}
              x2={W - PAD_R}
              y2={yOf(ln2).toFixed(1)}
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
            <text
              x={W - PAD_R - 2}
              y={(yOf(ln2) - 4).toFixed(1)}
              textAnchor="end"
              fontSize="17"
              fill="#94a3b8"
            >
              coin flip: ln 2 = {ln2.toFixed(3)}
            </text>
            {/* x labels */}
            {[0, RACE_STEPS / 2, RACE_STEPS].map((s) => (
              <text
                key={s}
                x={xOf(s).toFixed(1)}
                y={H - 26}
                textAnchor="middle"
                fontSize="17"
                fill="#475569"
              >
                {s}
              </text>
            ))}
            <text
              x={(W / 2).toFixed(1)}
              y={H - 4}
              textAnchor="middle"
              fontSize="17"
              fill="#334155"
            >
              gradient step
            </text>
            {/* curves */}
            {curves.map((c) => {
              if (c.losses.length === 0) return null;
              const pts = c.losses
                .map((l, t) => `${xOf(t).toFixed(1)},${yOf(l).toFixed(1)}`)
                .join(" ");
              const lastX = xOf(c.losses.length - 1);
              const lastY = yOf(c.losses[c.losses.length - 1]);
              return (
                <g key={c.scheme}>
                  <polyline
                    points={pts}
                    fill="none"
                    stroke={SCHEME_META[c.scheme].color}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {c.diverged && (
                    <text
                      x={Math.min(lastX + 4, W - PAD_R - 96).toFixed(1)}
                      y={(lastY + 3).toFixed(1)}
                      fontSize="17"
                      fill={SCHEME_META[c.scheme].color}
                    >
                      x diverged
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <p className="text-[10px] text-[#475569] mt-1.5">
            Losses above {Y_MAX.toFixed(1)} are clipped to the top of the chart (the large
            random scheme can start far higher). Legend below pairs each color with its
            scheme name; color is never the only cue.
          </p>
          {/* live legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
            {curves.map((c) => (
              <span key={c.scheme} className="flex items-center gap-1.5 text-[11px]">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ background: SCHEME_META[c.scheme].color }}
                  aria-hidden="true"
                />
                <span className="text-[#94a3b8]">{SCHEME_META[c.scheme].label}</span>
                <span className="font-mono text-[#f1f5f9]">
                  {c.diverged
                    ? `diverged @ step ${c.divergedAtStep}`
                    : c.losses.length > 0
                      ? fmtStat(c.losses[c.losses.length - 1])
                      : ""}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Final results */}
      {results && (
        <div className="rounded-xl border border-[#1e293b] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#1e293b] text-left">
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                    scheme
                  </th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                    final loss
                  </th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                    accuracy
                  </th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                    outcome
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const isWinner = winner === r.scheme;
                  return (
                    <tr
                      key={r.scheme}
                      style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}
                    >
                      <td className="px-3 py-2 text-[#94a3b8]">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: SCHEME_META[r.scheme].color }}
                            aria-hidden="true"
                          />
                          {SCHEME_META[r.scheme].label}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[#f1f5f9]">
                        {fmtStat(r.finalLoss)}
                      </td>
                      <td className="px-3 py-2 font-mono text-[#f1f5f9]">
                        {Number.isFinite(r.accuracy)
                          ? `${(100 * r.accuracy).toFixed(1)}%`
                          : "n/a"}
                      </td>
                      <td className="px-3 py-2">
                        {r.diverged ? (
                          <span className="text-[#ef4444] font-semibold">
                            diverged at step {r.divergedAtStep}
                          </span>
                        ) : isWinner ? (
                          <span className="text-[var(--color-accent)] font-semibold">
                            winner (lowest loss)
                          </span>
                        ) : r.accuracy >= 0.95 ? (
                          <span className="text-[var(--color-success)]">converged</span>
                        ) : (
                          <span className="text-[var(--color-warning)]">stuck</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
