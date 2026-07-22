"use client";

import { useMemo } from "react";
import type { LossPoint } from "./residualMath";
import {
  makeDataset,
  N_POINTS,
  TRAIN_DEPTH,
  TRAIN_LR,
  TRAIN_STEPS,
  WIDTH,
} from "./residualMath";

export type RacePhase = "idle" | "training" | "done";

export interface RaceResult {
  plainCurve: LossPoint[];
  resCurve: LossPoint[];
  plainLoss: number;
  resLoss: number;
  fitPlain: { x: number; y: number }[];
  fitRes: { x: number; y: number }[];
  durationMs: number;
}

interface Props {
  phase: RacePhase;
  progress: number; // 0..1
  live: { step: number; plainLoss: number; resLoss: number } | null;
  result: RaceResult | null;
  onRun: () => void;
}

// ── Loss chart (log y) ───────────────────────────────────────────────────────

const LW = 640;
const LH = 250;
const LL = 56;
const LR = 14;
const LT = 14;
const LB = 44;
const LPW = LW - LL - LR;
const LPH = LH - LT - LB;
const LOSS_LOG_MIN = -4.6;
const LOSS_LOG_MAX = 1.5;

function lossX(step: number): number {
  return LL + (step / (TRAIN_STEPS - 1)) * LPW;
}

function lossY(loss: number): number {
  const lv = Math.min(
    LOSS_LOG_MAX,
    Math.max(LOSS_LOG_MIN, Math.log10(Math.max(loss, 1e-300)))
  );
  return LT + ((LOSS_LOG_MAX - lv) / (LOSS_LOG_MAX - LOSS_LOG_MIN)) * LPH;
}

function lossPath(curve: LossPoint[]): string {
  return curve
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${lossX(p.step).toFixed(2)},${lossY(p.loss).toFixed(2)}`
    )
    .join(" ");
}

function LossChart({ result }: { result: RaceResult }) {
  const pPath = useMemo(() => lossPath(result.plainCurve), [result]);
  const rPath = useMemo(() => lossPath(result.resCurve), [result]);
  const grid = [1, 0, -1, -2, -3, -4];
  return (
    <svg
      viewBox={`0 0 ${LW} ${LH}`}
      className="w-full"
      role="img"
      aria-label={`Training loss curves over ${TRAIN_STEPS} steps, log scale. The plain network (dashed) plateaus at ${result.plainLoss.toExponential(1)}. The residual network (solid) descends to ${result.resLoss.toExponential(1)}.`}
    >
      {grid.map((g) => {
        const y = lossY(Math.pow(10, g));
        return (
          <g key={g}>
            <line
              x1={LL}
              y1={y.toFixed(2)}
              x2={LW - LR}
              y2={y.toFixed(2)}
              stroke="#1e293b"
              strokeWidth="1"
            />
            <text x={LL - 6} y={(y + 6).toFixed(2)} textAnchor="end" fill="#475569" fontSize="20">
              {g >= 0 ? Math.pow(10, g).toString() : `1e${g}`}
            </text>
          </g>
        );
      })}
      {[0, 500, 1000, 1500, 2000].map((s) => (
        <text
          key={s}
          x={lossX(Math.min(s, TRAIN_STEPS - 1)).toFixed(2)}
          y={LH - 28}
          textAnchor="middle"
          fill="#475569"
          fontSize="20"
        >
          {s}
        </text>
      ))}
      <text x={LL + LPW / 2} y={LH - 2} textAnchor="middle" fill="#475569" fontSize="20">
        training step
      </text>
      <path d={pPath} fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeDasharray="6 4" />
      <path d={rPath} fill="none" stroke="var(--color-success)" strokeWidth="2" />
    </svg>
  );
}

// ── Fit chart (linear) ───────────────────────────────────────────────────────

const FW = 640;
const FH = 240;
const FL = 40;
const FR = 14;
const FT = 12;
const FB = 42;
const FPW = FW - FL - FR;
const FPH = FH - FT - FB;
const FY_MAX = 1.4;

function fitX(x: number): number {
  return FL + ((x + 1) / 2) * FPW;
}

function fitY(y: number): number {
  const v = Math.min(FY_MAX, Math.max(-FY_MAX, y));
  return FT + ((FY_MAX - v) / (2 * FY_MAX)) * FPH;
}

function fitPath(pts: { x: number; y: number }[]): string {
  return pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${fitX(p.x).toFixed(2)},${fitY(p.y).toFixed(2)}`)
    .join(" ");
}

function FitChart({ result }: { result: RaceResult }) {
  const target = useMemo(() => makeDataset(N_POINTS), []);
  const pPath = useMemo(() => fitPath(result.fitPlain), [result]);
  const rPath = useMemo(() => fitPath(result.fitRes), [result]);
  return (
    <svg
      viewBox={`0 0 ${FW} ${FH}`}
      className="w-full"
      role="img"
      aria-label="Learned fits after training. Gold dots mark the training targets on the sine curve. The residual network's solid curve passes through the targets. The plain network's dashed curve is a cruder, flattened approximation."
    >
      {[-1, 0, 1].map((v) => (
        <g key={v}>
          <line
            x1={FL}
            y1={fitY(v).toFixed(2)}
            x2={FW - FR}
            y2={fitY(v).toFixed(2)}
            stroke="#1e293b"
            strokeWidth="1"
          />
          <text x={FL - 6} y={(fitY(v) + 6).toFixed(2)} textAnchor="end" fill="#475569" fontSize="20">
            {v}
          </text>
        </g>
      ))}
      {[-1, -0.5, 0, 0.5, 1].map((v) => (
        <text
          key={v}
          x={fitX(v).toFixed(2)}
          y={FH - 26}
          textAnchor="middle"
          fill="#475569"
          fontSize="20"
        >
          {v}
        </text>
      ))}
      <text x={FL + FPW / 2} y={FH - 2} textAnchor="middle" fill="#475569" fontSize="20">
        x
      </text>
      {target.xs.map((x, i) => (
        <circle
          key={i}
          cx={fitX(x).toFixed(2)}
          cy={fitY(target.ys[i]).toFixed(2)}
          r="2.5"
          fill="var(--color-accent)"
          opacity="0.8"
        />
      ))}
      <path d={pPath} fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeDasharray="6 4" />
      <path d={rPath} fill="none" stroke="var(--color-success)" strokeWidth="2" />
    </svg>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export default function TrainingRace({ phase, progress, live, result, onRun }: Props) {
  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
      <div className="mb-4">
        <p className="text-[13px] font-semibold text-white mb-1">
          Training Race: same weights, only the wiring differs
        </p>
        <p className="text-[12px] text-[#475569] leading-relaxed max-w-[720px]">
          Two {TRAIN_DEPTH}-block networks (width {WIDTH}) start from byte-identical
          weights and train right here in your browser on the same task: fit
          y = sin(3x) on {N_POINTS} points with full-batch gradient descent
          (learning rate {TRAIN_LR}, {TRAIN_STEPS.toLocaleString()} steps each).
          The only difference is the skip connections. Seeds are fixed, so running
          again reproduces the same numbers exactly.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <button
          onClick={onRun}
          disabled={phase === "training"}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity ${
            phase === "training"
              ? "bg-[#1e293b] text-[#475569] cursor-not-allowed"
              : "bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90"
          }`}
        >
          {phase === "idle"
            ? "Train both networks"
            : phase === "training"
              ? "Training..."
              : "Run again (same seeds, same result)"}
        </button>
        {phase === "training" && (
          <div className="flex-1 min-w-[160px] max-w-[320px]">
            <div
              className="h-2 rounded-full bg-[#1e293b] overflow-hidden"
              role="progressbar"
              aria-label="Training progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
            >
              <div
                className="h-full bg-[var(--color-accent)] transition-[width] duration-100"
                style={{ width: `${(progress * 100).toFixed(1)}%` }}
              />
            </div>
            {live && (
              <p className="text-[11px] text-[#475569] mt-1.5 font-mono">
                step {live.step.toLocaleString()} / {TRAIN_STEPS.toLocaleString()}: plain{" "}
                {live.plainLoss.toExponential(1)}, residual {live.resLoss.toExponential(1)}
              </p>
            )}
          </div>
        )}
      </div>

      {result && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                Final loss: plain (no skips)
              </p>
              <p className="text-xl font-black font-mono text-[var(--color-warning)]">
                {result.plainLoss.toExponential(2)}
              </p>
              <p className="text-[11px] text-[#475569] mt-1">stuck on a plateau</p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                Final loss: residual (with skips)
              </p>
              <p className="text-xl font-black font-mono text-[var(--color-success)]">
                {result.resLoss.toExponential(2)}
              </p>
              <p className="text-[11px] text-[#475569] mt-1">
                {(result.plainLoss / result.resLoss).toFixed(0)}x lower than plain
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                Measured training time
              </p>
              <p className="text-xl font-black font-mono text-white">
                {(result.durationMs / 1000).toFixed(1)}s
              </p>
              <p className="text-[11px] text-[#475569] mt-1">
                {(2 * TRAIN_STEPS).toLocaleString()} real gradient steps in your browser
              </p>
            </div>
          </div>

          <div>
            <p className="text-[12px] font-semibold text-white mb-2">
              Training loss (log scale)
            </p>
            <LossChart result={result} />
          </div>

          <div>
            <p className="text-[12px] font-semibold text-white mb-2">
              What each network learned
            </p>
            <FitChart result={result} />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
              <svg width="22" height="8" aria-hidden="true">
                <line x1="0" y1="4" x2="22" y2="4" stroke="var(--color-warning)" strokeWidth="2" strokeDasharray="6 4" />
              </svg>
              plain, dashed
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
              <svg width="22" height="8" aria-hidden="true">
                <line x1="0" y1="4" x2="22" y2="4" stroke="var(--color-success)" strokeWidth="2" />
              </svg>
              residual, solid
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
              <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-accent)]" />
              training targets, y = sin(3x)
            </span>
          </div>

          <p className="text-[11px] text-[#475569] leading-relaxed max-w-[720px]">
            The residual network starts from a higher loss (the skip path amplifies the
            untrained forward signal) yet descends fast and keeps descending. The plain
            network levels off early: with the backward signal attenuated block after
            block, its early layers barely move, so it settles for a crude fit.
          </p>
        </div>
      )}
    </div>
  );
}
