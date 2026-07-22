"use client";

import React, { useMemo } from "react";
import {
  MIN_WIDTH,
  MAX_WIDTH,
  TRAIN_STEPS,
  TRAIN_SET_SIZE,
  LEARNING_RATE,
  MOMENTUM,
  paramCount,
  compressionRatio,
  NUM_PIXELS,
} from "./autoencoderMath";

export type TrainPhase = "idle" | "training" | "trained";

export interface RunInfo {
  width: number;
  ms: number;
  finalLoss: number;
}

interface Props {
  width: number;
  onWidthChange: (w: number) => void;
  phase: TrainPhase;
  progress: number;
  onTrain: () => void;
  lossHistory: readonly number[];
  runInfo: RunInfo | null;
  trainedWidths: ReadonlySet<number>;
}

const CURVE_W = 320;
const CURVE_H = 96;

/** Downsampled polyline points for the loss curve, quantized for SSR parity. */
function lossPolyline(history: readonly number[]): string {
  if (history.length < 2) return "";
  const maxLoss = Math.max(...history);
  const stride = Math.max(1, Math.floor(history.length / 200));
  const pts: string[] = [];
  for (let i = 0; i < history.length; i += stride) {
    const x = ((i / (TRAIN_STEPS - 1)) * CURVE_W).toFixed(1);
    const y = (CURVE_H - (history[i] / maxLoss) * (CURVE_H - 6) - 3).toFixed(1);
    pts.push(`${x},${y}`);
  }
  const lastIdx = history.length - 1;
  pts.push(
    `${((lastIdx / (TRAIN_STEPS - 1)) * CURVE_W).toFixed(1)},${(
      CURVE_H - (history[lastIdx] / maxLoss) * (CURVE_H - 6) - 3
    ).toFixed(1)}`
  );
  return pts.join(" ");
}

export default function TrainPanel({
  width,
  onWidthChange,
  phase,
  progress,
  onTrain,
  lossHistory,
  runInfo,
  trainedWidths,
}: Props) {
  const polyline = useMemo(() => lossPolyline(lossHistory), [lossHistory]);
  const firstLoss = lossHistory.length > 0 ? lossHistory[0] : null;
  const lastLoss = lossHistory.length > 0 ? lossHistory[lossHistory.length - 1] : null;
  const sliderLocked = phase === "training" || (phase === "idle" && trainedWidths.size === 0);

  return (
    <div className="space-y-4">
      {/* Architecture readout */}
      <div className="rounded-xl bg-[#1e293b]/60 p-3 font-mono text-[12px] text-[#93c5fd]">
        {NUM_PIXELS} pixels &rarr; tanh({width}) &rarr; sigmoid({NUM_PIXELS}) &middot;{" "}
        {paramCount(width)} parameters &middot; {compressionRatio(width).toFixed(1)}x
        compression
      </div>

      {/* Bottleneck slider */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="ae-bottleneck" className="text-[12px] font-semibold text-white">
            Bottleneck width
          </label>
          <span className="text-[12px] font-mono font-bold text-[var(--color-accent)]">
            {width} {width === 1 ? "number" : "numbers"}
          </span>
        </div>
        <input
          id="ae-bottleneck"
          type="range"
          min={MIN_WIDTH}
          max={MAX_WIDTH}
          step={1}
          value={width}
          disabled={sliderLocked}
          onChange={(e) => onWidthChange(Number(e.target.value))}
          className="w-full accent-[#d4af37] disabled:opacity-40"
          aria-label="Bottleneck width, the number of latent values the image is squeezed into"
        />
        <div className="flex justify-between text-[10px] text-[#475569] mt-0.5">
          <span>{MIN_WIDTH} (extreme squeeze)</span>
          <span>{MAX_WIDTH} (roomy)</span>
        </div>
        {phase === "idle" && trainedWidths.size === 0 && (
          <p className="text-[11px] text-[#475569] mt-1.5">
            Train the network first, then this slider retrains at each new width you pick
            (results are cached per width for this session).
          </p>
        )}
      </div>

      {/* Train button / progress */}
      {phase === "training" ? (
        <div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            aria-label="Training progress"
            className="h-2 rounded-full bg-[#1e293b] overflow-hidden"
          >
            <div
              className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-150"
              style={{ width: `${(progress * 100).toFixed(0)}%` }}
            />
          </div>
          <p className="text-[11px] text-[#94a3b8] mt-1.5">
            Training width {width}: step {Math.round(progress * TRAIN_STEPS)} of {TRAIN_STEPS}
            {lastLoss !== null && <> &middot; loss {lastLoss.toFixed(4)}</>}
          </p>
        </div>
      ) : phase === "idle" && trainedWidths.size === 0 ? (
        <button
          onClick={onTrain}
          className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
        >
          Train the autoencoder
        </button>
      ) : null}

      {/* Loss curve */}
      {lossHistory.length > 1 && (
        <div>
          <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
            Training loss (MSE, full batch of {TRAIN_SET_SIZE} images)
          </p>
          <svg
            viewBox={`0 0 ${CURVE_W} ${CURVE_H}`}
            className="w-full rounded-lg border border-[#1e293b] bg-[#0f172a]"
            role="img"
            aria-label={
              firstLoss !== null && lastLoss !== null
                ? `Training loss curve from ${firstLoss.toFixed(4)} at step 0 to ${lastLoss.toFixed(4)} at step ${lossHistory.length}`
                : "Training loss curve"
            }
          >
            <polyline
              points={polyline}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={1.5}
            />
          </svg>
          <div className="flex justify-between text-[10px] font-mono text-[#475569] mt-0.5">
            <span>step 0: {firstLoss !== null ? firstLoss.toFixed(4) : ""}</span>
            <span>
              step {lossHistory.length}: {lastLoss !== null ? lastLoss.toFixed(4) : ""}
            </span>
          </div>
        </div>
      )}

      {/* Run stats */}
      {runInfo && phase === "trained" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="rounded-xl border border-[#1e293b] p-2.5">
            <p className="text-[10px] text-[#475569] mb-0.5">Final loss</p>
            <p className="text-[13px] font-mono font-bold text-[var(--color-success)]">
              {runInfo.finalLoss.toFixed(4)}
            </p>
          </div>
          <div className="rounded-xl border border-[#1e293b] p-2.5">
            <p className="text-[10px] text-[#475569] mb-0.5">Steps</p>
            <p className="text-[13px] font-mono font-bold text-white">{TRAIN_STEPS}</p>
          </div>
          <div className="rounded-xl border border-[#1e293b] p-2.5">
            <p className="text-[10px] text-[#475569] mb-0.5">Trained in</p>
            <p className="text-[13px] font-mono font-bold text-white">
              {Math.round(runInfo.ms)} ms
            </p>
          </div>
        </div>
      )}

      <p className="text-[10px] text-[#475569] leading-relaxed">
        Real gradient descent runs in your browser: full-batch, learning rate{" "}
        {LEARNING_RATE}, momentum {MOMENTUM}, deterministic initialization per width, so
        retraining the same width reproduces the exact same weights.
      </p>
    </div>
  );
}
