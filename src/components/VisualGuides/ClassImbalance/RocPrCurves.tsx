"use client";

import React from "react";
import type { RocResult, PrResult, ConfusionMatrix } from "./types";

interface Props {
  roc: RocResult;
  pr: PrResult;
  cm: ConfusionMatrix;
  /** AUC-ROC computed on the balanced (1:1) dataset, for live comparison. */
  balancedAuc: number;
  /** Average precision computed on the balanced (1:1) dataset. */
  balancedAp: number;
  ratio: number;
}

const S = 260;
const PAD = 34;
const PLOT = S - PAD - 14;

function px(v: number): number {
  return PAD + v * PLOT;
}
function py(v: number): number {
  return S - PAD - v * PLOT;
}

function Axes({ xLabel, yLabel }: { xLabel: string; yLabel: string }) {
  return (
    <g>
      <line x1={PAD} y1={S - PAD} x2={PAD + PLOT} y2={S - PAD} stroke="#334155" strokeWidth={1} />
      <line x1={PAD} y1={S - PAD} x2={PAD} y2={S - PAD - PLOT} stroke="#334155" strokeWidth={1} />
      {[0, 0.5, 1].map((v) => (
        <g key={v}>
          <text x={px(v)} y={S - PAD + 14} fill="#475569" fontSize={10} textAnchor="middle">
            {v.toFixed(1)}
          </text>
          <text x={PAD - 6} y={py(v) + 3} fill="#475569" fontSize={10} textAnchor="end">
            {v.toFixed(1)}
          </text>
        </g>
      ))}
      <text x={PAD + PLOT / 2} y={S - 6} fill="#94a3b8" fontSize={10} textAnchor="middle">
        {xLabel}
      </text>
      <text
        x={10}
        y={S - PAD - PLOT / 2}
        fill="#94a3b8"
        fontSize={10}
        textAnchor="middle"
        transform={`rotate(-90 10 ${S - PAD - PLOT / 2})`}
      >
        {yLabel}
      </text>
    </g>
  );
}

function RocPrCurvesInner({ roc, pr, cm, balancedAuc, balancedAp, ratio }: Props) {
  const P = cm.tp + cm.fn;
  const N = cm.fp + cm.tn;
  const prevalence = P / (P + N);

  const opTpr = P > 0 ? cm.tp / P : 0;
  const opFpr = N > 0 ? cm.fp / N : 0;
  const opRecall = opTpr;
  const opPrecision = cm.tp + cm.fp > 0 ? cm.tp / (cm.tp + cm.fp) : null;

  const rocPath = roc.points.map((p) => `${px(p.fpr)},${py(p.tpr)}`).join(" ");
  const prPath = pr.points
    .map((p) => `${px(p.recall)},${py(p.precision)}`)
    .join(" ");

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* ROC */}
        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3">
          <div className="flex items-center justify-between mb-1 px-1">
            <p className="text-[12px] font-semibold text-white">ROC curve</p>
            <span className="text-[11px] font-mono font-bold text-[#3bb4a4]">
              AUC-ROC {roc.auc.toFixed(3)}
            </span>
          </div>
          <svg
            viewBox={`0 0 ${S} ${S}`}
            className="w-full h-auto"
            role="img"
            aria-label={`ROC curve at imbalance 1 to ${ratio}. Area under the curve ${roc.auc.toFixed(3)}. Current operating point: false positive rate ${opFpr.toFixed(3)}, true positive rate ${opTpr.toFixed(3)}.`}
          >
            <Axes xLabel="False positive rate" yLabel="True positive rate" />
            <line
              x1={px(0)}
              y1={py(0)}
              x2={px(1)}
              y2={py(1)}
              stroke="#334155"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <polyline points={rocPath} fill="none" stroke="#3bb4a4" strokeWidth={2} />
            <circle
              cx={px(opFpr)}
              cy={py(opTpr)}
              r={5}
              fill="var(--color-accent)"
              stroke="#0f172a"
              strokeWidth={2}
            />
          </svg>
          <p className="text-[10.5px] text-[#475569] px-1 mt-1">
            Dashed diagonal: random ranking. Gold dot: current threshold.
          </p>
        </div>

        {/* PR */}
        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3">
          <div className="flex items-center justify-between mb-1 px-1">
            <p className="text-[12px] font-semibold text-white">Precision-Recall curve</p>
            <span className="text-[11px] font-mono font-bold text-[var(--color-accent)]">
              AP {pr.averagePrecision.toFixed(3)}
            </span>
          </div>
          <svg
            viewBox={`0 0 ${S} ${S}`}
            className="w-full h-auto"
            role="img"
            aria-label={`Precision-recall curve at imbalance 1 to ${ratio}. Average precision ${pr.averagePrecision.toFixed(3)}. Current operating point: recall ${opRecall.toFixed(3)}, precision ${opPrecision === null ? "undefined" : opPrecision.toFixed(3)}.`}
          >
            <Axes xLabel="Recall" yLabel="Precision" />
            <line
              x1={px(0)}
              y1={py(prevalence)}
              x2={px(1)}
              y2={py(prevalence)}
              stroke="#334155"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <polyline
              points={prPath}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={2}
            />
            {opPrecision !== null && (
              <circle
                cx={px(opRecall)}
                cy={py(opPrecision)}
                r={5}
                fill="#3bb4a4"
                stroke="#0f172a"
                strokeWidth={2}
              />
            )}
          </svg>
          <p className="text-[10.5px] text-[#475569] px-1 mt-1">
            Dashed line: random-classifier precision = prevalence ={" "}
            {prevalence.toFixed(3)}. Teal dot: current threshold.
          </p>
        </div>
      </div>

      {/* Computed lesson */}
      <div
        className="mt-4 rounded-xl border border-[#1e293b] border-l-4 p-4"
        style={{ borderLeftColor: "var(--color-warning)" }}
      >
        <p className="text-[12px] font-semibold uppercase tracking-wide mb-1.5 text-[var(--color-warning)]">
          What the numbers say right now
        </p>
        <p className="text-[12.5px] text-[#94a3b8] leading-relaxed">
          At a balanced 1:1 split these same score distributions give AUC-ROC{" "}
          <span className="font-mono text-[#3bb4a4]">{balancedAuc.toFixed(3)}</span> and
          average precision{" "}
          <span className="font-mono text-[var(--color-accent)]">{balancedAp.toFixed(3)}</span>.
          At the current 1:{ratio} split, AUC-ROC is{" "}
          <span className="font-mono text-[#3bb4a4]">{roc.auc.toFixed(3)}</span>{" "}
          (change {(roc.auc - balancedAuc) >= 0 ? "+" : ""}
          {(roc.auc - balancedAuc).toFixed(3)}) while average precision is{" "}
          <span className="font-mono text-[var(--color-accent)]">
            {pr.averagePrecision.toFixed(3)}
          </span>{" "}
          (change {(pr.averagePrecision - balancedAp) >= 0 ? "+" : ""}
          {(pr.averagePrecision - balancedAp).toFixed(3)}). ROC axes are per-class rates,
          so they ignore the class mix. Precision divides true positives by ALL predicted
          positives, and under heavy imbalance even a small false positive RATE from the
          huge negative pool produces enough false positive COUNTS to swamp the few true
          positives.
        </p>
      </div>
    </div>
  );
}

const RocPrCurves = React.memo(RocPrCurvesInner);
export default RocPrCurves;
