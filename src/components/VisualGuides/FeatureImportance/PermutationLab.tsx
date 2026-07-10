"use client";

import React from "react";
import { FEATURES, NUM_ROWS } from "./featureImportanceMath";

interface Props {
  trained: boolean;
  permuted: ReadonlySet<number>;
  onToggle: (f: number) => void;
  /** ensembleAccuracy(trees, EMPTY_SET); null until trained. */
  baselineAcc: number | null;
  /** ensembleAccuracy(trees, permuted); null until trained. */
  currentAcc: number | null;
  /** permutationImportance(trees, f) per feature; null until trained. */
  importances: number[] | null;
  /** True once the user has shuffled two distinct features. */
  showImportance: boolean;
}

export default function PermutationLab({
  trained,
  permuted,
  onToggle,
  baselineAcc,
  currentAcc,
  importances,
  showImportance,
}: Props) {
  const accPct =
    currentAcc !== null ? `${(100 * currentAcc).toFixed(2)}%` : "0%";
  const basePct =
    baselineAcc !== null ? `${(100 * baselineAcc).toFixed(2)}%` : "0%";

  const ranked =
    importances !== null
      ? FEATURES.map((f, i) => ({ f, i, delta: importances[i] })).sort(
          (a, b) => b.delta - a.delta
        )
      : null;
  const maxDelta = ranked ? Math.max(ranked[0].delta, 1e-9) : 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Feature shuffle toggles */}
      <div>
        <div className="space-y-2.5 mb-4">
          {FEATURES.map((f, i) => {
            const on = permuted.has(i);
            return (
              <div
                key={f.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#1e293b] p-3"
              >
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-[#f1f5f9]">
                    {f.label}
                    {f.unit ? (
                      <span className="text-[#475569]"> ({f.unit})</span>
                    ) : null}
                  </p>
                  <p className="text-[11px] text-[#94a3b8] truncate">
                    {f.blurb}
                  </p>
                </div>
                <button
                  onClick={() => onToggle(i)}
                  disabled={!trained}
                  aria-pressed={on}
                  aria-label={`${on ? "Restore" : "Shuffle"} the ${f.label} column`}
                  className={`shrink-0 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:opacity-40 ${
                    on
                      ? "border-[var(--color-warning)] text-[var(--color-warning)]"
                      : "border-[#334155] text-[#94a3b8] hover:border-[var(--color-warning)]"
                  }`}
                >
                  {on ? "Shuffled, restore" : "Shuffle column"}
                </button>
              </div>
            );
          })}
        </div>
        {!trained && (
          <p className="text-[11px] text-[var(--color-warning)]">
            Train the forest in Step 1 first; without a model there is no
            accuracy to break.
          </p>
        )}
      </div>

      {/* Accuracy bar + measured importance */}
      <div>
        <div className="rounded-xl border border-[#1e293b] p-4 mb-4">
          <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-2 uppercase tracking-wide">
            Accuracy on the {NUM_ROWS} rows, recomputed live
          </p>
          <div className="relative h-4 rounded-full bg-[#1e293b] overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
              style={{
                width: accPct,
                background: "var(--color-accent)",
              }}
            />
            {baselineAcc !== null && (
              <div
                aria-hidden="true"
                className="absolute inset-y-0 w-0.5 bg-white"
                style={{ left: basePct }}
              />
            )}
          </div>
          {trained && currentAcc !== null && baselineAcc !== null ? (
            <p className="text-[12px] text-[#94a3b8] mt-2 font-mono">
              {(100 * currentAcc).toFixed(1)}% now (
              {Math.round(currentAcc * NUM_ROWS)}/{NUM_ROWS}), baseline{" "}
              {(100 * baselineAcc).toFixed(1)}% marked by the white tick
            </p>
          ) : (
            <p className="text-[12px] text-[#475569] mt-2">
              Waiting for a trained forest.
            </p>
          )}
          {trained &&
            currentAcc !== null &&
            baselineAcc !== null &&
            permuted.size > 0 && (
              <p className="text-[11px] text-[#94a3b8] mt-1.5 leading-relaxed">
                {currentAcc < baselineAcc ? (
                  <>
                    Shuffling destroyed{" "}
                    <span className="text-[var(--color-warning)] font-semibold">
                      {(100 * (baselineAcc - currentAcc)).toFixed(1)} points
                    </span>{" "}
                    of accuracy: the model was relying on the information you
                    just scrambled.
                  </>
                ) : (
                  <>
                    No accuracy lost: the model never relied on the shuffled
                    column(s), so scrambling them changes nothing.
                  </>
                )}
              </p>
            )}
        </div>

        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-2 uppercase tracking-wide">
            Measured permutation importance
          </p>
          {showImportance && ranked !== null && baselineAcc !== null ? (
            <>
              <div className="space-y-2">
                {ranked.map(({ f, delta }) => {
                  const w = `${((100 * Math.max(delta, 0)) / maxDelta).toFixed(2)}%`;
                  return (
                    <div key={f.key}>
                      <div className="flex items-center justify-between text-[11px] mb-0.5">
                        <span className="text-[#f1f5f9]">{f.label}</span>
                        <span className="font-mono text-[#94a3b8]">
                          {delta >= 0 ? "-" : "+"}
                          {(100 * Math.abs(delta)).toFixed(1)} pp
                        </span>
                      </div>
                      <div
                        className="h-2 rounded-full bg-[#1e293b] overflow-hidden"
                        aria-hidden="true"
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: w,
                            background: "var(--color-warning)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-[#475569] mt-3 leading-relaxed">
                Each value: baseline accuracy minus accuracy with only that one
                column shuffled, the classic permutation importance (Breiman
                2001, Random Forests). On {NUM_ROWS} rows one flipped
                prediction moves the number by {(100 / NUM_ROWS).toFixed(1)}{" "}
                pp, so treat tiny values as zero.
              </p>
            </>
          ) : (
            <p className="text-[12px] text-[#475569] leading-relaxed">
              Shuffle at least two different columns above to unlock the
              per-feature measurement. Try one column the model should care
              about and one it should not.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
