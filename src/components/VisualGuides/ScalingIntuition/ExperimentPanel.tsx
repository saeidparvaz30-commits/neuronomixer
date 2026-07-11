"use client";

import React from "react";
import {
  WIDTHS,
  DATA_SIZES,
  NUM_SIZES,
  NUM_RUNS,
  STEPS,
  LEARNING_RATE,
  WEIGHT_DECAY,
  NOISE_SIGMA,
  paramCount,
  runSpec,
  meanBaselineVal,
  log10,
  type RunResult,
} from "./scalingMath";

export type Phase = "idle" | "running" | "done";

type Props = {
  phase: Phase;
  progress: number;
  runIdx: number;
  liveLoss: number | null;
  elapsedMs: number | null;
  results: readonly (RunResult | null)[];
  selectedCell: number | null;
  bestPerBudget: readonly number[];
  onRun: () => void;
  onSelectCell: (i: number) => void;
};

/** Fixed log-scale color anchors so cell shading never depends on which runs finished. */
const COLOR_LO = log10(0.008);
const COLOR_HI = log10(2.5);

function cellFill(val: number): string {
  const t = Math.min(1, Math.max(0, (COLOR_HI - log10(val)) / (COLOR_HI - COLOR_LO)));
  return `rgba(59,180,164,${(0.06 + 0.66 * t).toFixed(3)})`;
}

export default function ExperimentPanel({
  phase,
  progress,
  runIdx,
  liveLoss,
  elapsedMs,
  results,
  selectedCell,
  bestPerBudget,
  onRun,
  onSelectCell,
}: Props) {
  const spec = runSpec(Math.min(runIdx, NUM_RUNS - 1));
  const pct = Math.round(progress * 100);
  const selected = selectedCell !== null ? results[selectedCell] : null;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
      <div className="mb-4">
        <p className="text-[13px] font-semibold text-white mb-1">
          The 16-run grid experiment
        </p>
        <p className="text-[12px] text-[#475569] leading-relaxed max-w-[680px]">
          One click trains {NUM_RUNS} real networks in your browser: every
          width on every data budget, {STEPS} full-batch Adam steps each
          (learning rate {LEARNING_RATE}, weight decay {WEIGHT_DECAY}),
          identical settings for all runs. Seeds are deterministic, so
          re-running reproduces exactly the same losses.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={onRun}
          disabled={phase === "running"}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
            phase === "running"
              ? "border border-[#1e293b] text-[#475569] cursor-not-allowed"
              : "bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90"
          }`}
        >
          {phase === "idle" ? "Run all 16 training runs" : phase === "running" ? "Training..." : "Run again (same seeds, same result)"}
        </button>
        {phase === "running" && (
          <span className="text-[12px] text-[#94a3b8] font-mono">
            Run {Math.min(runIdx + 1, NUM_RUNS)} / {NUM_RUNS}: width{" "}
            {WIDTHS[spec.widthIdx]} on {DATA_SIZES[spec.dataIdx]} points
            {liveLoss !== null && liveLoss !== Infinity
              ? `, train MSE ${liveLoss.toFixed(4)}`
              : ""}
          </span>
        )}
        {phase === "done" && elapsedMs !== null && (
          <span className="text-[12px] text-[#3bb4a4] font-mono">
            All {NUM_RUNS} runs finished in {(elapsedMs / 1000).toFixed(1)}s
            (measured in your browser)
          </span>
        )}
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Experiment progress"
        className="h-2 rounded-full bg-[#1e293b] overflow-hidden mb-5"
      >
        <div
          className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-150"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p aria-live="polite" className="sr-only">
        {phase === "done" ? "All 16 training runs finished. The results grid is ready." : ""}
      </p>

      {/* Heatmap */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12px] min-w-[520px]">
          <caption className="sr-only">
            Validation loss of each trained network: rows are model widths,
            columns are training set sizes. Lower is better. Cells fill in as
            runs finish.
          </caption>
          <thead>
            <tr className="bg-[#1e293b]">
              <th scope="col" className="text-left px-3 py-2 text-[#94a3b8] font-semibold rounded-l-lg">
                Width (params)
              </th>
              {DATA_SIZES.map((n, d) => (
                <th
                  key={n}
                  scope="col"
                  className={`px-3 py-2 text-[#94a3b8] font-semibold text-center ${d === NUM_SIZES - 1 ? "rounded-r-lg" : ""}`}
                >
                  {n} points
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WIDTHS.map((w, wi) => (
              <tr key={w} style={{ background: wi % 2 === 0 ? "#0f172a" : "#162032" }}>
                <th scope="row" className="text-left px-3 py-2 text-white font-semibold whitespace-nowrap">
                  {w}{" "}
                  <span className="text-[#475569] font-normal">
                    ({paramCount(w)}p)
                  </span>
                </th>
                {DATA_SIZES.map((n, di) => {
                  const i = wi * NUM_SIZES + di;
                  const r = results[i];
                  const isCurrent = phase === "running" && i === runIdx;
                  const isBest = r !== null && bestPerBudget[di] === wi && phase === "done";
                  const isSelected = selectedCell === i;
                  return (
                    <td key={n} className="px-1.5 py-1.5 text-center">
                      {r === null ? (
                        <div
                          className={`rounded-lg border px-2 py-2.5 text-[11px] ${
                            isCurrent
                              ? "border-[var(--color-accent)] text-[var(--color-accent)] animate-pulse"
                              : "border-[#1e293b] text-[#475569]"
                          }`}
                        >
                          {isCurrent ? "training" : "queued"}
                        </div>
                      ) : (
                        <button
                          onClick={() => onSelectCell(i)}
                          aria-pressed={isSelected}
                          aria-label={`Width ${w} on ${n} points: validation loss ${r.val.toFixed(3)}.${isBest ? " Best width for this budget." : ""} Press to inspect this run.`}
                          className={`w-full rounded-lg border px-2 py-2 font-mono text-[12px] text-[#f1f5f9] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                            isSelected
                              ? "border-[var(--color-accent)]"
                              : "border-transparent hover:border-[#334155]"
                          }`}
                          style={{ background: cellFill(r.val) }}
                        >
                          {r.val.toFixed(3)}
                          {isBest && (
                            <span className="ml-1 text-[var(--color-accent)]" aria-hidden="true">
                              ★
                            </span>
                          )}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-[#475569] mt-2">
        Validation MSE against the noise-free function (lower is better).
        Deeper teal = lower loss on a fixed log scale; the number in each cell
        is the loss itself. ★ marks the best width per budget. Click any
        finished cell to inspect its run.
      </p>

      {/* Detail card for the selected run */}
      {selected !== null && (
        <div className="mt-4 rounded-xl border border-[#334155] bg-[#162032] p-4">
          <p className="text-[11px] font-semibold text-white mb-3">
            Width {WIDTHS[selected.widthIdx]} (
            {paramCount(WIDTHS[selected.widthIdx])} parameters) trained on{" "}
            {DATA_SIZES[selected.dataIdx]} points
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div className="rounded-lg border border-[#1e293b] bg-[#0f172a] p-3">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                Train MSE (noisy labels)
              </p>
              <p className="text-lg font-black font-mono text-[#f1f5f9]">
                {selected.train.toFixed(4)}
              </p>
            </div>
            <div className="rounded-lg border border-[#1e293b] bg-[#0f172a] p-3">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                Validation MSE (true function)
              </p>
              <p className="text-lg font-black font-mono text-[#3bb4a4]">
                {selected.val.toFixed(4)}
              </p>
            </div>
            <div className="rounded-lg border border-[#1e293b] bg-[#0f172a] p-3">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                Predict-the-mean baseline
              </p>
              <p className="text-lg font-black font-mono text-[#94a3b8]">
                {meanBaselineVal(selected.dataIdx).toFixed(4)}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
            {selected.train < NOISE_SIGMA * NOISE_SIGMA * 0.5 && (
              <>
                Train MSE is far below the label-noise floor of{" "}
                {(NOISE_SIGMA * NOISE_SIGMA).toFixed(4)}: this network
                memorized noise, not just signal.{" "}
              </>
            )}
            {selected.val < meanBaselineVal(selected.dataIdx) ? (
              <>
                It beats the trivial predict-the-mean baseline by{" "}
                {(meanBaselineVal(selected.dataIdx) / selected.val).toFixed(1)}
                x on validation: it learned real structure.
              </>
            ) : (
              <>
                On validation it is{" "}
                {(selected.val / meanBaselineVal(selected.dataIdx)).toFixed(1)}
                x WORSE than just predicting the training mean: the noise it
                memorized actively misleads it between the training points.
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
