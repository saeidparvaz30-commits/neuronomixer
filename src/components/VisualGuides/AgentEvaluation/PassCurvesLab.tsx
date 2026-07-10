"use client";

import React, { useMemo } from "react";
import { ACCENT_PINK } from "./types";
import {
  K_MAX,
  N_SETS,
  buildCurves,
  analyticPassAtK,
  analyticPassPowK,
} from "./passMath";

export const GAP_AT_TARGET = 0.9;
export const GAP_POW_TARGET = 0.5;

const TEAL = "#3bb4a4";

const W = 560;
const H = 280;
const PAD_L = 46;
const PAD_R = 14;
const PAD_T = 12;
const PAD_B = 30;

function xPos(k: number): number {
  return PAD_L + ((k - 1) / (K_MAX - 1)) * (W - PAD_L - PAD_R);
}

function yPos(v: number): number {
  return PAD_T + (1 - v) * (H - PAD_T - PAD_B);
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

type Props = {
  p: number;
  k: number;
  onPChange: (p: number) => void;
  onKChange: (k: number) => void;
  gapFound: boolean;
  gapSnapshot: { p: number; k: number; atK: number; powK: number } | null;
};

export default function PassCurvesLab({
  p,
  k,
  onPChange,
  onKChange,
  gapFound,
  gapSnapshot,
}: Props) {
  const curves = useMemo(() => buildCurves(p), [p]);

  // Smooth analytic polylines sampled at quarter steps of k.
  const analyticPaths = useMemo(() => {
    const atK: string[] = [];
    const powK: string[] = [];
    for (let kk = 1; kk <= K_MAX; kk += 0.25) {
      atK.push(`${xPos(kk).toFixed(1)},${yPos(analyticPassAtK(p, kk)).toFixed(1)}`);
      powK.push(`${xPos(kk).toFixed(1)},${yPos(analyticPassPowK(p, kk)).toFixed(1)}`);
    }
    return { atK: atK.join(" "), powK: powK.join(" ") };
  }, [p]);

  const atK = analyticPassAtK(p, k);
  const powK = analyticPassPowK(p, k);
  const current = curves[k - 1];
  const gapLive = atK >= GAP_AT_TARGET && powK <= GAP_POW_TARGET;

  return (
    <div>
      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl border border-[#1e293b] p-4">
          <label
            htmlFor="ae-p-slider"
            className="flex items-center justify-between text-[12px] font-semibold text-white mb-2"
          >
            <span>Per-attempt success probability p</span>
            <span className="font-mono text-[var(--color-accent)]">{p.toFixed(2)}</span>
          </label>
          <input
            id="ae-p-slider"
            type="range"
            min={0.05}
            max={0.99}
            step={0.01}
            value={p}
            onChange={(e) => onPChange(Number(e.target.value))}
            className="w-full accent-[#ec4899]"
            aria-label="Per-attempt success probability p"
          />
          <p className="text-[11px] text-[#475569] mt-1.5 leading-relaxed">
            How often a single run of the agent succeeds on this task.
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-4">
          <label
            htmlFor="ae-k-slider"
            className="flex items-center justify-between text-[12px] font-semibold text-white mb-2"
          >
            <span>Number of attempts k</span>
            <span className="font-mono text-[var(--color-accent)]">{k}</span>
          </label>
          <input
            id="ae-k-slider"
            type="range"
            min={1}
            max={K_MAX}
            step={1}
            value={k}
            onChange={(e) => onKChange(Number(e.target.value))}
            className="w-full accent-[#ec4899]"
            aria-label="Number of attempts k"
          />
          <p className="text-[11px] text-[#475569] mt-1.5 leading-relaxed">
            pass@k asks: did at least one of k runs succeed? pass^k asks: did all k?
          </p>
        </div>
      </div>

      {/* Formulas */}
      <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[11px] leading-relaxed rounded-xl p-4 overflow-x-auto mb-4">
{`pass@k = 1 - (1 - p)^k    "can it do the task at least once in k tries"
pass^k = p^k              "does it do the task in every one of k tries"`}
      </pre>

      {/* Chart */}
      <div className="rounded-xl border border-[#1e293b] p-4 mb-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={`Chart of pass at k and pass to the power k versus number of attempts, for p equals ${p.toFixed(
            2
          )}. At k equals ${k}, pass at k is ${pct(atK)} and pass to the power k is ${pct(powK)}.`}
        >
          {/* Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={yPos(v)}
                y2={yPos(v)}
                stroke="#1e293b"
                strokeWidth={1}
              />
              <text
                x={PAD_L - 8}
                y={yPos(v) + 3.5}
                textAnchor="end"
                fontSize={10}
                fill="#475569"
              >
                {Math.round(v * 100)}%
              </text>
            </g>
          ))}
          {curves.map((pt) => (
            <text
              key={pt.k}
              x={xPos(pt.k)}
              y={H - PAD_B + 16}
              textAnchor="middle"
              fontSize={10}
              fill="#475569"
            >
              {pt.k}
            </text>
          ))}
          <text
            x={(PAD_L + W - PAD_R) / 2}
            y={H - 2}
            textAnchor="middle"
            fontSize={10}
            fill="#475569"
          >
            k (attempts)
          </text>

          {/* Current-k marker */}
          <line
            x1={xPos(k)}
            x2={xPos(k)}
            y1={PAD_T}
            y2={H - PAD_B}
            stroke="var(--color-accent)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />

          {/* Analytic curves */}
          <polyline
            points={analyticPaths.atK}
            fill="none"
            stroke={ACCENT_PINK}
            strokeWidth={2}
          />
          <polyline
            points={analyticPaths.powK}
            fill="none"
            stroke={TEAL}
            strokeWidth={2}
            strokeDasharray="6 4"
          />

          {/* Empirical points from the seeded simulation */}
          {curves.map((pt) => (
            <circle
              key={`at-${pt.k}`}
              cx={xPos(pt.k)}
              cy={yPos(pt.empiricalAtK)}
              r={3.5}
              fill={ACCENT_PINK}
              stroke="#0f172a"
              strokeWidth={1}
            />
          ))}
          {curves.map((pt) => (
            <rect
              key={`pow-${pt.k}`}
              x={xPos(pt.k) - 3}
              y={yPos(pt.empiricalPowK) - 3}
              width={6}
              height={6}
              fill={TEAL}
              stroke="#0f172a"
              strokeWidth={1}
            />
          ))}
        </svg>

        {/* Legend: shape + line style, not color alone */}
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
          <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
            <svg width="26" height="10" aria-hidden="true">
              <line x1="0" y1="5" x2="26" y2="5" stroke={ACCENT_PINK} strokeWidth="2" />
              <circle cx="13" cy="5" r="3" fill={ACCENT_PINK} />
            </svg>
            pass@k: solid line (exact), dots (simulated)
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
            <svg width="26" height="10" aria-hidden="true">
              <line
                x1="0"
                y1="5"
                x2="26"
                y2="5"
                stroke={TEAL}
                strokeWidth="2"
                strokeDasharray="5 3"
              />
              <rect x="10" y="2" width="6" height="6" fill={TEAL} />
            </svg>
            pass^k: dashed line (exact), squares (simulated)
          </span>
        </div>
        <p className="text-[11px] text-[#475569] mt-2 leading-relaxed">
          Simulated points come from {N_SETS} task sets of {K_MAX} attempts each, drawn
          with a seeded PRNG (reseeded from p), so they are reproducible. Lines are the
          exact formulas.
        </p>
      </div>

      {/* Readouts at current k */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            pass@{k} (at least one success)
          </p>
          <p className="text-2xl font-black font-mono" style={{ color: ACCENT_PINK }}>
            {pct(atK)}
          </p>
          <p className="text-[11px] text-[#475569] font-mono">
            simulated: {current ? pct(current.empiricalAtK) : "n/a"}
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            pass^{k} (all {k} succeed)
          </p>
          <p className="text-2xl font-black font-mono" style={{ color: TEAL }}>
            {pct(powK)}
          </p>
          <p className="text-[11px] text-[#475569] font-mono">
            simulated: {current ? pct(current.empiricalPowK) : "n/a"}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-accent)]/40 p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            reliability gap
          </p>
          <p className="text-2xl font-black font-mono text-[var(--color-accent)]">
            {pct(atK - powK)}
          </p>
          <p className="text-[11px] text-[#475569]">pass@{k} minus pass^{k}</p>
        </div>
      </div>

      {/* Gap challenge */}
      <div
        className={`rounded-xl border p-4 ${
          gapFound
            ? "border-[#22c55e]/40 bg-[#22c55e]/5"
            : "border-[#1e293b] bg-[#0f172a]"
        }`}
      >
        <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5 text-[var(--color-accent)]">
          Mini challenge: prove the demo-to-production gap
        </p>
        <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-2">
          Find a setting where pass@k is at least {Math.round(GAP_AT_TARGET * 100)}% (a
          demo will almost surely work at least once) while pass^k is at most{" "}
          {Math.round(GAP_POW_TARGET * 100)}% (whether all k runs succeed is worse than a
          coin flip). That is the same agent, measured two ways.
        </p>
        {gapFound && gapSnapshot ? (
          <p className="text-[12px] font-semibold text-[var(--color-success)]">
            Gap found at p = {gapSnapshot.p.toFixed(2)}, k = {gapSnapshot.k}: pass@
            {gapSnapshot.k} = {pct(gapSnapshot.atK)} vs pass^{gapSnapshot.k} ={" "}
            {pct(gapSnapshot.powK)}. This stays earned even if you keep exploring.
          </p>
        ) : (
          <p className="text-[12px] font-semibold text-[#475569]">
            Current setting: pass@{k} = {pct(atK)}, pass^{k} = {pct(powK)}
            {gapLive ? "" : ". Not there yet, try raising k or lowering p."}
          </p>
        )}
      </div>
    </div>
  );
}
