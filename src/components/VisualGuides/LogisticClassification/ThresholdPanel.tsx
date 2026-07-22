"use client";

import React from "react";
import {
  LabeledPoint,
  LogisticParams,
  confusionCounts,
  accuracy,
  precision,
  recall,
  logit,
  THRESHOLD_MIN,
  THRESHOLD_MAX,
} from "./logisticMath";

type Props = {
  params: LogisticParams;
  points: readonly LabeledPoint[];
  threshold: number;
  trained: boolean;
  onThresholdChange: (t: number) => void;
};

function pct(v: number | null): string {
  return v === null ? "n/a" : `${(100 * v).toFixed(1)}%`;
}

export default function ThresholdPanel({
  params,
  points,
  threshold,
  trained,
  onThresholdChange,
}: Props) {
  const c = confusionCounts(params, points, threshold);
  const total = points.length;

  return (
    <div>
      <div className="rounded-xl border border-[#1e293b] p-4 mb-4">
        <label
          htmlFor="lc-threshold"
          className="block text-[11px] font-semibold text-white mb-1"
        >
          Decision threshold t: predict class 1 when p is at least{" "}
          <span className="font-mono text-[var(--color-accent)]">
            {threshold.toFixed(2)}
          </span>
        </label>
        <input
          id="lc-threshold"
          type="range"
          min={THRESHOLD_MIN}
          max={THRESHOLD_MAX}
          step={0.01}
          value={threshold}
          onChange={(e) => onThresholdChange(Number(e.target.value))}
          className="w-full accent-[#d4af37]"
        />
        <div className="flex justify-between text-[10px] text-[#475569] mt-0.5">
          <span>{THRESHOLD_MIN.toFixed(2)}: flag almost everything</span>
          <span>{THRESHOLD_MAX.toFixed(2)}: flag only when sure</span>
        </div>
        <p className="text-[11px] text-[#94a3b8] leading-relaxed mt-2">
          Same trained weights, different cut: the threshold shifts the
          boundary to the score value logit(t) ={" "}
          <span className="font-mono text-[#93c5fd]">
            {logit(threshold).toFixed(2)}
          </span>
          , it never rotates it. Rotation comes only from retraining.
        </p>
      </div>

      <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-2">
        Confusion counts on the {total} points, recomputed live
      </p>
      <div className="rounded-xl border border-[#1e293b] overflow-hidden mb-3">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#1e293b] text-left">
              <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                actual \ predicted
              </th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                predicted 1
              </th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">
                predicted 0
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: "#0f172a" }}>
              <td className="px-3 py-2 text-[#94a3b8]">actual 1</td>
              <td className="px-3 py-2 font-mono text-[var(--color-success)]">
                {c.tp} TP
              </td>
              <td className="px-3 py-2 font-mono text-[#ef4444]">{c.fn} FN</td>
            </tr>
            <tr style={{ background: "#162032" }}>
              <td className="px-3 py-2 text-[#94a3b8]">actual 0</td>
              <td className="px-3 py-2 font-mono text-[#ef4444]">{c.fp} FP</td>
              <td className="px-3 py-2 font-mono text-[var(--color-success)]">
                {c.tn} TN
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Accuracy
          </p>
          <p className="text-[15px] font-mono font-bold text-[#f1f5f9]">
            {pct(accuracy(c))}
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Precision
          </p>
          <p className="text-[15px] font-mono font-bold text-[#f1f5f9]">
            {pct(precision(c))}
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Recall
          </p>
          <p className="text-[15px] font-mono font-bold text-[#f1f5f9]">
            {pct(recall(c))}
          </p>
        </div>
      </div>

      {!trained && (
        <p className="text-[11px] text-[var(--color-warning)] leading-relaxed mt-3">
          The model is untrained, so p = 0.5 for every point: at t up to 0.50
          everything is predicted class 1, above it everything is class 0.
          These counts are real, they are just counts of a useless model.
        </p>
      )}
    </div>
  );
}
