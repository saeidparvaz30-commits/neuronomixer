"use client";

import React from "react";
import {
  LogisticParams,
  LEARNING_RATE,
  L2_LAMBDA,
  MIN_TRAIN_STEPS,
  MAX_TRAIN_STEPS,
  TRAIN_BATCH_SIZES,
  N_PER_CLASS,
} from "./logisticMath";

type Props = {
  stepCount: number;
  refitSteps: number;
  lossHistory: readonly number[];
  currentLoss: number;
  params: LogisticParams;
  onTrain: (n: number) => void;
  onResetWeights: () => void;
};

function LossSparkline({ values }: { values: readonly number[] }) {
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

export default function TrainControls({
  stepCount,
  refitSteps,
  lossHistory,
  currentLoss,
  params,
  onTrain,
  onResetWeights,
}: Props) {
  const atCap = stepCount >= MAX_TRAIN_STEPS;
  const trained = stepCount >= MIN_TRAIN_STEPS;
  const initialLoss = lossHistory[0];

  return (
    <div>
      <div className="rounded-xl border border-[#1e293b] p-4 mb-4">
        <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
          The objective the buttons minimize
        </p>
        <p className="text-[13px] font-mono text-[#93c5fd] mb-2">
          L = mean cross-entropy + ({L2_LAMBDA} / 2) * (w1^2 + w2^2)
        </p>
        <p className="text-[11px] text-[#94a3b8] leading-relaxed">
          Each button press runs real full-batch gradient descent (learning
          rate {LEARNING_RATE}) on the {2 * N_PER_CLASS} visible points. The
          small L2 penalty keeps the weights bounded when the classes are
          linearly separable; without it they would grow forever. Every number
          below is recomputed from the current weights after every step.
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
          disabled={stepCount === 0 && refitSteps === 0}
          className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors disabled:opacity-40 disabled:hover:border-[#1e293b] disabled:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          Reset weights
        </button>
        {atCap && (
          <span className="text-[10px] text-[var(--color-warning)]">
            Step cap reached ({MAX_TRAIN_STEPS}). Reset the weights to train
            again.
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Gradient steps
          </p>
          <p className="text-2xl font-black font-mono text-[#f1f5f9]">
            {stepCount}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            {refitSteps > 0 ? `plus ${refitSteps} live-refit steps. ` : ""}
            {trained
              ? "trained: the map below is meaningful"
              : `train at least ${MIN_TRAIN_STEPS} to unlock the map`}
          </p>
        </div>
        <div className="rounded-xl border border-[#3bb4a4]/40 p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Cross-entropy loss
          </p>
          <p className="text-2xl font-black font-mono text-[#3bb4a4]">
            {currentLoss.toFixed(4)}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            {initialLoss.toFixed(4)} at step 0 (untrained, p = 0.5)
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Learned score function
          </p>
          <p className="text-[13px] font-mono text-[#93c5fd] leading-relaxed">
            z = {params.w1.toFixed(2)} x1 + {params.w2.toFixed(2)} x2 +{" "}
            {params.b.toFixed(2)}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            p = sigmoid(z), updated live
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Loss curve (Train button steps)
          </p>
          <LossSparkline values={lossHistory} />
        </div>
      </div>
    </div>
  );
}
