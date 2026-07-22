"use client";

import React from "react";
import type { ConfusionMatrix, ThresholdMetrics, OptimalThresholds } from "./types";

interface Props {
  threshold: number;
  onThresholdChange: (t: number) => void;
  cm: ConfusionMatrix;
  metrics: ThresholdMetrics;
  optimal: OptimalThresholds;
}

function pct(v: number): string {
  return (v * 100).toFixed(1) + "%";
}

function ThresholdPanelInner({
  threshold,
  onThresholdChange,
  cm,
  metrics,
  optimal,
}: Props) {
  const divergence = Math.abs(optimal.accThreshold - optimal.f1Threshold);

  const tiles = [
    {
      label: "Accuracy",
      value: pct(metrics.accuracy),
      color: "#f1f5f9",
      note: "(TP + TN) / all",
    },
    {
      label: "Precision",
      value: metrics.precision === null ? "n/a" : pct(metrics.precision),
      color: "var(--color-accent)",
      note: metrics.precision === null ? "no predicted positives" : "TP / (TP + FP)",
    },
    {
      label: "Recall",
      value: pct(metrics.recall),
      color: "#3bb4a4",
      note: "TP / (TP + FN)",
    },
    {
      label: "F1",
      value: metrics.f1.toFixed(3),
      color: "#a855f7",
      note: "harmonic mean of P and R",
    },
  ];

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
      <div className="mb-4">
        <p className="text-[13px] font-semibold text-white mb-1">
          Decision Threshold
        </p>
        <p className="text-[12px] text-[#475569] leading-relaxed">
          Every score at or above the threshold is predicted positive. Move it and
          watch the confusion matrix and metrics recompute.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <label
          htmlFor="threshold-slider"
          className="text-[12px] text-[#94a3b8] whitespace-nowrap"
        >
          Threshold:{" "}
          <span className="font-mono font-semibold text-white">
            {threshold.toFixed(2)}
          </span>
        </label>
        <input
          id="threshold-slider"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={threshold}
          onChange={(e) => onThresholdChange(Number(e.target.value))}
          className="w-full max-w-[360px] accent-[#d4af37]"
          aria-label="Decision threshold from 0 to 1"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Confusion matrix */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8] mb-2">
            Confusion matrix
          </p>
          <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#1e293b]">
                <th className="p-2 text-left font-semibold text-[#94a3b8] border border-[#334155]"></th>
                <th className="p-2 text-center font-semibold text-[#94a3b8] border border-[#334155]">
                  Predicted +
                </th>
                <th className="p-2 text-center font-semibold text-[#94a3b8] border border-[#334155]">
                  Predicted -
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-[#0f172a]">
                <td className="p-2 font-semibold text-[#94a3b8] border border-[#334155]">
                  Actual +
                </td>
                <td className="p-2 text-center font-mono font-bold border border-[#334155]">
                  <span style={{ color: "var(--color-success)" }}>TP {cm.tp}</span>
                </td>
                <td className="p-2 text-center font-mono font-bold border border-[#334155]">
                  <span style={{ color: "var(--color-warning)" }}>FN {cm.fn}</span>
                </td>
              </tr>
              <tr className="bg-[#162032]">
                <td className="p-2 font-semibold text-[#94a3b8] border border-[#334155]">
                  Actual -
                </td>
                <td className="p-2 text-center font-mono font-bold border border-[#334155]">
                  <span style={{ color: "var(--color-warning)" }}>FP {cm.fp}</span>
                </td>
                <td className="p-2 text-center font-mono font-bold border border-[#334155]">
                  <span className="text-[#f1f5f9]">TN {cm.tn}</span>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
          <p className="text-[10.5px] text-[#475569] mt-2 leading-relaxed">
            {cm.tp + cm.fn} actual positives, {cm.fp + cm.tn} actual negatives. New to
            these four cells? Start with the confusion matrix guide linked below.
          </p>
        </div>

        {/* Metric tiles */}
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#475569] mb-1">
                {t.label}
              </p>
              <p className="text-xl font-black font-mono" style={{ color: t.color }}>
                {t.value}
              </p>
              <p className="text-[10px] text-[#475569] mt-0.5">{t.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Optimal thresholds */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#1e293b] p-3.5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#475569] mb-1">
              Accuracy-optimal threshold
            </p>
            <p className="text-[13px] font-mono font-bold text-[#f1f5f9]">
              t = {optimal.accThreshold.toFixed(2)}{" "}
              <span className="text-[#475569] font-normal">
                (accuracy {pct(optimal.accValue)})
              </span>
            </p>
          </div>
          <button
            onClick={() => onThresholdChange(optimal.accThreshold)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-[#334155] text-[#94a3b8] hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            aria-label={`Set threshold to accuracy-optimal value ${optimal.accThreshold.toFixed(2)}`}
          >
            Set
          </button>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3.5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#475569] mb-1">
              F1-optimal threshold
            </p>
            <p className="text-[13px] font-mono font-bold text-[#f1f5f9]">
              t = {optimal.f1Threshold.toFixed(2)}{" "}
              <span className="text-[#475569] font-normal">
                (F1 {optimal.f1Value.toFixed(3)})
              </span>
            </p>
          </div>
          <button
            onClick={() => onThresholdChange(optimal.f1Threshold)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-[#334155] text-[#94a3b8] hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            aria-label={`Set threshold to F1-optimal value ${optimal.f1Threshold.toFixed(2)}`}
          >
            Set
          </button>
        </div>
      </div>

      <p className="text-[11.5px] text-[#94a3b8] leading-relaxed mt-3">
        The two optima are computed by sweeping 201 candidate thresholds over the current
        data. Right now they sit{" "}
        <span className="font-mono font-semibold text-[var(--color-warning)]">
          {divergence.toFixed(2)}
        </span>{" "}
        apart. They sit close together on balanced data, but under imbalance they
        usually split:
        accuracy is happiest pushing the threshold up and ignoring the minority class,
        while F1 has to keep finding it. Try 1:10 and 1:50 and compare the two accuracy
        values against the do-nothing baseline above.
      </p>
    </div>
  );
}

const ThresholdPanel = React.memo(ThresholdPanelInner);
export default ThresholdPanel;
