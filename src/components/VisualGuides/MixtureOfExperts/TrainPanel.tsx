"use client";

import React from "react";
import {
  MAX_STEPS,
  MIN_TRAIN_STEPS,
  TRAIN_BATCH_SIZES,
  TARGET_FORMULA,
  GRID_RES,
  NUM_EXPERTS,
  TOP_K,
} from "./moeMath";

type Props = {
  stepCount: number;
  rmseHistory: readonly number[];
  onTrain: (n: number) => void;
  onResetWeights: () => void;
};

function RmseSparkline({ values }: { values: readonly number[] }) {
  const w = 260;
  const h = 56;
  const pad = 4;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1e-6);
  const points = values
    .map((v, i) => {
      const x =
        values.length === 1
          ? w / 2
          : pad + (i / (values.length - 1)) * (w - 2 * pad);
      const y = pad + ((max - v) / range) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-14"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke="#3bb4a4"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function TrainPanel({
  stepCount,
  rmseHistory,
  onTrain,
  onResetWeights,
}: Props) {
  const currentRmse = rmseHistory[rmseHistory.length - 1];
  const initialRmse = rmseHistory[0];
  const atCap = stepCount >= MAX_STEPS;
  const trained = stepCount >= MIN_TRAIN_STEPS;

  return (
    <div>
      <div className="rounded-xl border border-[#1e293b] p-4 mb-4">
        <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
          The visible ground truth the layer learns
        </p>
        <p className="text-[13px] font-mono text-[#93c5fd] mb-2">
          {TARGET_FORMULA}
        </p>
        <p className="text-[11px] text-[#94a3b8] leading-relaxed">
          Training data is a fixed {GRID_RES}x{GRID_RES} grid over [-1, 1]
          squared, never resampled. Each button press runs real full-batch
          gradient descent (with momentum) on the mean squared error of the
          top-{TOP_K} MoE prediction, plus the standard load-balancing
          auxiliary loss so no expert is starved. Training always uses all{" "}
          {NUM_EXPERTS} experts; the ablation toggles below affect inference
          only.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {TRAIN_BATCH_SIZES.map((n) => (
          <button
            key={n}
            onClick={() => onTrain(n)}
            disabled={atCap}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
              atCap
                ? "border border-[#1e293b] text-[#475569] cursor-not-allowed"
                : "bg-[#3bb4a4] text-[#0a0e1a]"
            }`}
          >
            Train ×{n}
          </button>
        ))}
        <button
          onClick={onResetWeights}
          disabled={stepCount === 0}
          className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors disabled:opacity-40 disabled:hover:border-[#1e293b] disabled:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          Reset weights
        </button>
        {atCap && (
          <span className="text-[10px] text-[var(--color-warning)]">
            Step cap reached ({MAX_STEPS}). Reset the weights to train again.
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Gradient steps
          </p>
          <p className="text-2xl font-black font-mono text-[#f1f5f9]">
            {stepCount}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            {trained
              ? "trained: routing below is meaningful"
              : `train at least ${MIN_TRAIN_STEPS} to unlock the gates`}
          </p>
        </div>
        <div className="rounded-xl border border-[#3bb4a4]/40 p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Grid RMSE (all {NUM_EXPERTS} experts on)
          </p>
          <p className="text-2xl font-black font-mono text-[#3bb4a4]">
            {currentRmse.toFixed(4)}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            {initialRmse.toFixed(4)} at step 0 (untrained)
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3 col-span-2 lg:col-span-1">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            RMSE curve (recomputed after every step)
          </p>
          <RmseSparkline values={rmseHistory} />
        </div>
      </div>
    </div>
  );
}
