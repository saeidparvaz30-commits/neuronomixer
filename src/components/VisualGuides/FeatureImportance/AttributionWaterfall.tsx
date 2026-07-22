"use client";

import React from "react";
import {
  DATASET,
  FEATURES,
  NUM_ROWS,
  NUM_TREES,
  type Attribution,
} from "./featureImportanceMath";

interface Props {
  trained: boolean;
  selectedRow: number | null;
  /** ensembleAttribution(trees, DATASET[selectedRow].x); null until both exist. */
  attribution: Attribution | null;
  onSelectRow: (i: number) => void;
}

/** SVG geometry (all emitted coordinates quantized with toFixed). */
const W = 680;
const LABEL_W = 104;
const PLOT_X = LABEL_W + 8;
const PLOT_W = W - PLOT_X - 16;
const BAR_H = 20;
const ROW_H = 36;
const TOP = 10;

export default function AttributionWaterfall({
  trained,
  selectedRow,
  attribution,
  onSelectRow,
}: Props) {
  const row = selectedRow !== null ? DATASET[selectedRow] : null;

  return (
    <div>
      {/* Row picker */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="fi-row-select"
            className="text-[11px] font-semibold text-[#94a3b8]"
          >
            Customer row to explain
          </label>
          <select
            id="fi-row-select"
            value={selectedRow === null ? "" : String(selectedRow)}
            onChange={(e) => {
              if (e.target.value !== "") onSelectRow(Number(e.target.value));
            }}
            disabled={!trained}
            className="rounded-lg border border-[#334155] bg-[#1e293b] text-[#f1f5f9] text-[12px] px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:opacity-40"
          >
            <option value="" disabled>
              Choose a row
            </option>
            {DATASET.map((r, i) => (
              <option key={r.id} value={i}>
                Row {i + 1} ({r.y === 1 ? "churned" : "stayed"})
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              onSelectRow(
                selectedRow === null
                  ? 0
                  : (selectedRow - 1 + NUM_ROWS) % NUM_ROWS
              )
            }
            disabled={!trained}
            className="px-3 py-2 rounded-lg border border-[#334155] text-[12px] font-semibold text-[#94a3b8] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:opacity-40"
          >
            ← Prev row
          </button>
          <button
            onClick={() =>
              onSelectRow(selectedRow === null ? 0 : (selectedRow + 1) % NUM_ROWS)
            }
            disabled={!trained}
            className="px-3 py-2 rounded-lg border border-[#334155] text-[12px] font-semibold text-[#94a3b8] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:opacity-40"
          >
            Next row →
          </button>
        </div>
        {!trained && (
          <p className="text-[11px] text-[var(--color-warning)] pb-2">
            Train the forest first: attributions are read off the trained
            trees.
          </p>
        )}
      </div>

      {row !== null && attribution !== null ? (
        <WaterfallBody row={row} attribution={attribution} />
      ) : (
        <div className="rounded-xl border border-dashed border-[#334155] p-8 text-center">
          <p className="text-[12px] text-[#475569]">
            {trained
              ? "Pick any customer above, or click a row number in the Step 1 table, to see exactly how the forest assembled that prediction."
              : "The waterfall appears once you have a trained forest and a selected row."}
          </p>
        </div>
      )}
    </div>
  );
}

function WaterfallBody({
  row,
  attribution,
}: {
  row: (typeof DATASET)[number];
  attribution: Attribution;
}) {
  const { base, contrib, prediction } = attribution;

  // Order features by absolute contribution, largest first.
  const order = FEATURES.map((_, f) => f).sort(
    (a, b) => Math.abs(contrib[b]) - Math.abs(contrib[a])
  );

  // Cumulative values: base, then after each feature in display order.
  const cums: number[] = [base];
  for (const f of order) cums.push(cums[cums.length - 1] + contrib[f]);

  const lo = Math.min(0, ...cums);
  const hi = Math.max(1, ...cums);
  const x = (v: number) => PLOT_X + ((v - lo) / (hi - lo)) * PLOT_W;
  const q = (v: number) => Number(v.toFixed(2));

  const nRows = FEATURES.length + 2; // base + features + prediction
  const axisY = TOP + nRows * ROW_H + 8;
  const H = axisY + 26;

  const predictedChurn = prediction >= 0.5;

  interface Bar {
    label: string;
    x0: number;
    x1: number;
    fill: string;
    text: string;
    signed: boolean;
  }
  const bars: Bar[] = [
    {
      label: "Base rate",
      x0: 0,
      x1: base,
      fill: "#94a3b8",
      text: base.toFixed(3),
      signed: false,
    },
    ...order.map((f, k) => ({
      label: FEATURES[f].short,
      x0: cums[k],
      x1: cums[k + 1],
      fill: contrib[f] >= 0 ? "var(--color-warning)" : "#3bb4a4",
      text: `${contrib[f] >= 0 ? "+" : ""}${contrib[f].toFixed(3)}`,
      signed: true,
    })),
    {
      label: "Prediction",
      x0: 0,
      x1: prediction,
      fill: "var(--color-accent)",
      text: prediction.toFixed(3),
      signed: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5">
      <div className="rounded-xl border border-[#1e293b] p-4 overflow-x-auto">
        <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-2 uppercase tracking-wide">
          Row {row.id + 1}: from base rate to prediction
        </p>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[520px]"
          role="img"
          aria-label={`Waterfall of per-feature contributions for row ${row.id + 1}. A text version follows the chart.`}
        >
          {/* Reference gridlines at 0, 0.5, 1 */}
          {[0, 0.5, 1].map((v) => (
            <g key={v}>
              <line
                x1={q(x(v))}
                y1={TOP}
                x2={q(x(v))}
                y2={axisY}
                stroke="#1e293b"
                strokeWidth={1}
              />
              <text
                x={q(x(v))}
                y={axisY + 16}
                textAnchor="middle"
                fill="#475569"
                fontSize={14}
                fontFamily="monospace"
              >
                {v}
              </text>
            </g>
          ))}
          <text
            x={q(PLOT_X + PLOT_W / 2)}
            y={H - 2}
            textAnchor="middle"
            fill="#475569"
            fontSize={14}
          >
            P(churn)
          </text>

          {bars.map((b, i) => {
            const y = TOP + i * ROW_H + (ROW_H - BAR_H) / 2;
            const left = Math.min(b.x0, b.x1);
            const right = Math.max(b.x0, b.x1);
            const wPx = Math.max(q(x(right)) - q(x(left)), 1.5);
            const endX = x(b.x1);
            const textRight = endX + 6 + 56 < W;
            return (
              <g key={b.label + i}>
                <text
                  x={LABEL_W}
                  y={q(y + BAR_H / 2 + 5)}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize={14}
                >
                  {b.label}
                </text>
                <rect
                  x={q(x(left))}
                  y={q(y)}
                  width={q(wPx)}
                  height={BAR_H}
                  rx={3}
                  fill={b.fill}
                  opacity={0.9}
                />
                <text
                  x={q(textRight ? endX + 6 : x(left) - 6)}
                  y={q(y + BAR_H / 2 + 5)}
                  textAnchor={textRight ? "start" : "end"}
                  fill="#f1f5f9"
                  fontSize={14}
                  fontFamily="monospace"
                >
                  {b.text}
                </text>
                {/* Dashed connector to the next bar's starting edge */}
                {i > 0 && i < bars.length - 1 && (
                  <line
                    x1={q(x(b.x1))}
                    y1={q(y + BAR_H)}
                    x2={q(x(b.x1))}
                    y2={q(y + ROW_H + (ROW_H - BAR_H) / 2)}
                    stroke="#475569"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                )}
                {i === 0 && (
                  <line
                    x1={q(x(b.x1))}
                    y1={q(y + BAR_H)}
                    x2={q(x(b.x1))}
                    y2={q(y + ROW_H + (ROW_H - BAR_H) / 2)}
                    stroke="#475569"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                )}
              </g>
            );
          })}
        </svg>
        <p className="text-[10px] text-[#475569] mt-2 leading-relaxed">
          Orange pushes toward churn, teal pushes toward staying; each value is
          printed on the bar so color is never the only signal. The
          contributions sum to the prediction exactly.
        </p>
      </div>

      {/* Text equivalent + row facts */}
      <div className="space-y-4">
        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-2 uppercase tracking-wide">
            This customer
          </p>
          <ul className="space-y-1">
            {FEATURES.map((f, fi) => (
              <li
                key={f.key}
                className="flex justify-between text-[12px] text-[#94a3b8]"
              >
                <span>{f.label}</span>
                <span className="font-mono text-[#f1f5f9]">
                  {row.x[fi]}
                  {f.unit ? ` ${f.unit}` : ""}
                </span>
              </li>
            ))}
            <li className="flex justify-between text-[12px] text-[#94a3b8] pt-1 border-t border-[#1e293b]">
              <span>Actual outcome</span>
              <span
                className={
                  row.y === 1 ? "text-[#ef4444]" : "text-[var(--color-success)]"
                }
              >
                {row.y === 1 ? "Churned" : "Stayed"}
              </span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-2 uppercase tracking-wide">
            Reading the waterfall
          </p>
          <ol className="space-y-1.5 text-[12px] text-[#94a3b8] leading-relaxed list-decimal list-inside">
            <li>
              Start at the base rate {base.toFixed(3)}, the forest&apos;s
              average root prediction before looking at any feature.
            </li>
            {order.map((f) => (
              <li key={FEATURES[f].key}>
                {FEATURES[f].label} = {row.x[f]}
                {FEATURES[f].unit ? ` ${FEATURES[f].unit}` : ""}:{" "}
                <span className="font-mono text-[#f1f5f9]">
                  {contrib[f] >= 0 ? "+" : ""}
                  {contrib[f].toFixed(3)}
                </span>{" "}
                {contrib[f] >= 0 ? "toward churn" : "toward staying"}
              </li>
            ))}
            <li>
              Land on{" "}
              <span className="font-mono text-[#f1f5f9]">
                {prediction.toFixed(3)}
              </span>
              : the forest predicts{" "}
              {predictedChurn ? "churn" : "this customer stays"}.
            </li>
          </ol>
          <p className="text-[10px] text-[#475569] mt-3 leading-relaxed">
            Method: tree-path (Saabas-style) attribution. Each of the{" "}
            {NUM_TREES} trees is walked from root to leaf and every
            split&apos;s change in expected output is credited to the feature
            that made the split, then averaged over the forest. This is an
            exact additive decomposition of this forest&apos;s prediction and
            the quantity TreeSHAP (Lundberg et al., 2020) refines with Shapley
            weighting. It is not a full Shapley value computation.
          </p>
        </div>
      </div>
    </div>
  );
}
