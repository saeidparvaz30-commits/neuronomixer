"use client";

import React from "react";
import {
  DATASET,
  FEATURES,
  NUM_ROWS,
  NUM_TREES,
  MAX_DEPTH,
  MIN_LEAF,
  classBalance,
  featureValue,
} from "./featureImportanceMath";

interface Props {
  treesBuilt: number;
  training: boolean;
  trained: boolean;
  /** Computed by ensembleAccuracy on the full dataset; null until trained. */
  baselineAcc: number | null;
  permuted: ReadonlySet<number>;
  selectedRow: number | null;
  onTrain: () => void;
  onSelectRow: (i: number) => void;
}

const BALANCE = classBalance();

export default function DatasetTrainPanel({
  treesBuilt,
  training,
  trained,
  baselineAcc,
  permuted,
  selectedRow,
  onTrain,
  onSelectRow,
}: Props) {
  const progressPct = ((100 * treesBuilt) / NUM_TREES).toFixed(2);

  return (
    <div>
      {/* Dataset facts, all computed from DATASET */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="px-2.5 py-1 rounded-full border border-[#334155] text-[11px] text-[#94a3b8]">
          {NUM_ROWS} customers
        </span>
        <span className="px-2.5 py-1 rounded-full border border-[#334155] text-[11px] text-[#94a3b8]">
          {FEATURES.length} features
        </span>
        <span className="px-2.5 py-1 rounded-full border border-[#ef4444]/40 text-[11px] text-[#ef4444]">
          {BALANCE.churned} churned
        </span>
        <span className="px-2.5 py-1 rounded-full border border-[#22c55e]/40 text-[11px] text-[var(--color-success)]">
          {BALANCE.stayed} stayed
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        {/* The visible dataset */}
        <div className="rounded-xl border border-[#1e293b] overflow-hidden">
          <div className="max-h-[340px] overflow-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#1e293b] text-left">
                  <th
                    scope="col"
                    className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold"
                  >
                    Row
                  </th>
                  {FEATURES.map((f, fi) => (
                    <th
                      key={f.key}
                      scope="col"
                      className="px-3 py-2 text-[10px] uppercase tracking-wide font-semibold"
                    >
                      <span className="text-[#94a3b8]">{f.short}</span>
                      {f.unit ? (
                        <span className="text-[#475569]"> ({f.unit})</span>
                      ) : null}
                      {permuted.has(fi) && (
                        <span className="ml-1 text-[var(--color-warning)] normal-case tracking-normal">
                          shuffled
                        </span>
                      )}
                    </th>
                  ))}
                  <th
                    scope="col"
                    className="px-3 py-2 text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold"
                  >
                    Outcome
                  </th>
                </tr>
              </thead>
              <tbody>
                {DATASET.map((row, i) => {
                  const isSelected = selectedRow === i;
                  return (
                    <tr
                      key={row.id}
                      style={{
                        background: isSelected
                          ? "#1e293b"
                          : i % 2 === 0
                            ? "#0f172a"
                            : "#162032",
                      }}
                    >
                      <td className="px-2 py-1">
                        <button
                          onClick={() => onSelectRow(i)}
                          aria-pressed={isSelected}
                          aria-label={`Select row ${i + 1} for the local explanation`}
                          className={`px-2 py-0.5 rounded-md border text-[11px] font-mono transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                            isSelected
                              ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                              : "border-[#334155] text-[#94a3b8] hover:border-[var(--color-accent)]"
                          }`}
                        >
                          {i + 1}
                        </button>
                      </td>
                      {FEATURES.map((f, fi) => {
                        const shuffled = permuted.has(fi);
                        return (
                          <td
                            key={f.key}
                            className={`px-3 py-1 font-mono ${
                              shuffled
                                ? "text-[var(--color-warning)]"
                                : "text-[#f1f5f9]"
                            }`}
                          >
                            {featureValue(i, fi, permuted)}
                          </td>
                        );
                      })}
                      <td className="px-3 py-1">
                        {row.y === 1 ? (
                          <span className="text-[#ef4444]">Churned</span>
                        ) : (
                          <span className="text-[var(--color-success)]">
                            Stayed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Train panel */}
        <div className="rounded-xl border border-[#1e293b] p-4 h-fit">
          <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
            The model
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
            A bagged ensemble of {NUM_TREES} CART trees, depth at most{" "}
            {MAX_DEPTH}, at least {MIN_LEAF} rows per leaf, each trained on a
            deterministic bootstrap of these {NUM_ROWS} rows. Leaves store the
            mean churn label, so the forest outputs a probability. Training is
            real and runs in your browser; the fixed seed means retraining
            rebuilds the same forest.
          </p>
          <button
            onClick={onTrain}
            disabled={training}
            className="w-full px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {training
              ? "Training..."
              : trained
                ? "Retrain forest"
                : "Train the forest"}
          </button>

          <div className="mt-3">
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={NUM_TREES}
              aria-valuenow={treesBuilt}
              aria-label="Trees built"
              className="h-2 rounded-full bg-[#1e293b] overflow-hidden"
            >
              <div
                className="h-full rounded-full transition-[width] duration-150"
                style={{
                  width: `${progressPct}%`,
                  background: "var(--color-accent)",
                }}
              />
            </div>
            <p className="text-[11px] text-[#475569] mt-1.5">
              {treesBuilt} of {NUM_TREES} trees built
            </p>
          </div>

          {trained && baselineAcc !== null && (
            <div className="mt-3 rounded-lg border border-[#1e293b] bg-[#162032] p-3">
              <p className="text-[10px] text-[#475569] mb-1">
                Training accuracy (threshold 0.5)
              </p>
              <p className="text-[16px] font-mono font-bold text-[var(--color-success)]">
                {(100 * baselineAcc).toFixed(1)}%
              </p>
              <p className="text-[11px] text-[#94a3b8]">
                {Math.round(baselineAcc * NUM_ROWS)} of {NUM_ROWS} rows correct
              </p>
              <p className="text-[10px] text-[#475569] mt-2 leading-relaxed">
                Measured on the same rows the forest trained on. That is fine
                here because we are inspecting the model, not certifying it;
                honest generalization measurement uses held-out data and is its
                own topic.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
