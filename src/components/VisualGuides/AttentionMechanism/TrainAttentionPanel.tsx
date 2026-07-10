"use client";

import React from "react";
import type { Episode, EvalResult } from "./attentionMath";
import {
  DIM,
  NUM_TYPES,
  SEQ_LEN,
  TRAIN_EPISODES,
  EVAL_EPISODES,
  TYPE_LABELS,
} from "./attentionMath";
import AttentionHeatmap from "./AttentionHeatmap";

export type TrainPhase = "idle" | "training" | "done";

// Loss curve geometry
const W = 620;
const H = 200;
const L = 46;
const R = 12;
const T = 12;
const B = 28;
const PLOT_W = W - L - R;
const PLOT_H = H - T - B;
/** Log-scale y domain for the loss curve. */
const LOG_MIN = -4;
const LOG_MAX = Math.log10(2);

function xPos(episode: number): number {
  return L + (episode / TRAIN_EPISODES) * PLOT_W;
}

function yPos(loss: number): number {
  const lg = Math.max(LOG_MIN, Math.min(LOG_MAX, Math.log10(Math.max(loss, 1e-12))));
  return T + ((LOG_MAX - lg) / (LOG_MAX - LOG_MIN)) * PLOT_H;
}

interface Props {
  phase: TrainPhase;
  progress: number;
  lossEma: number | null;
  lossHistory: ReadonlyArray<{ episode: number; loss: number }>;
  heat: number[][];
  diagMean: number;
  evalBefore: EvalResult;
  evalAfter: EvalResult | null;
  durationMs: number | null;
  demo: Episode;
  onRun: () => void;
}

export default function TrainAttentionPanel({
  phase,
  progress,
  lossEma,
  lossHistory,
  heat,
  diagMean,
  evalBefore,
  evalAfter,
  durationMs,
  demo,
  onRun,
}: Props) {
  const lossPath = lossHistory
    .map(
      (h, i) =>
        `${i === 0 ? "M" : "L"}${xPos(h.episode).toFixed(2)},${yPos(h.loss).toFixed(2)}`
    )
    .join(" ");

  return (
    <div>
      {/* The task */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-1.5">
            The recall game
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
            Each episode stores {SEQ_LEN} slots. Every slot carries a type tag
            (A, B, C or D, each appearing once, in random order) and a random
            number in [-2, 2]. The model is then given a cue type and must
            output the number stored at the slot with the matching tag. One
            held-out example:
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {demo.types.map((t, i) => (
              <div
                key={i}
                className={`rounded-lg border px-2.5 py-1.5 text-center ${
                  t === demo.cue
                    ? "border-[var(--color-accent)]"
                    : "border-[#334155]"
                }`}
              >
                <p className="text-[9px] text-[#475569]">slot {i + 1}</p>
                <p className="text-[12px] font-mono font-bold text-white">
                  {TYPE_LABELS[t]}: {demo.values[i].toFixed(2)}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#94a3b8]">
            Cue{" "}
            <span className="font-mono font-bold text-[var(--color-accent)]">
              {TYPE_LABELS[demo.cue]}
            </span>{" "}
            must recall{" "}
            <span className="font-mono font-bold text-white">
              {demo.target.toFixed(2)}
            </span>
            . The gold border marks the matching slot the model must find on
            its own.
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-1.5">
            What is learnable
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed">
            Two tiny embedding tables: Wq maps the cue type to a query vector
            and Wk maps each slot type to a key vector ({NUM_TYPES}x{DIM}{" "}
            numbers each, {2 * NUM_TYPES * DIM} parameters total). Scores are
            scaled dot products, q&middot;k/&radic;{DIM}, softmaxed into
            weights that blend the stored values. The loss is the squared
            recall error, and every gradient step below backpropagates through
            the softmax for real. Stored values pass through unweighted by any
            value projection, a simplification so the lookup itself is the
            only thing being learned. The &radic;d score scaling is the
            convention from Vaswani et al. 2017, &quot;Attention Is All You
            Need&quot;.
          </p>
        </div>
      </div>

      {/* Run controls */}
      <div className="flex flex-wrap items-center gap-4 mb-5">
        <button
          onClick={onRun}
          disabled={phase === "training"}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity ${
            phase === "training"
              ? "bg-[#1e293b] text-[#475569] cursor-not-allowed"
              : "bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90"
          }`}
        >
          {phase === "idle"
            ? `Train the lookup (${TRAIN_EPISODES.toLocaleString()} episodes)`
            : phase === "training"
              ? "Training..."
              : "Run again (same seeds, same result)"}
        </button>
        {phase === "training" && (
          <div className="flex-1 min-w-[160px] max-w-[320px]">
            <div
              className="h-2 rounded-full bg-[#1e293b] overflow-hidden"
              role="progressbar"
              aria-label="Training progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
            >
              <div
                className="h-full bg-[var(--color-accent)] transition-all"
                style={{ width: `${(progress * 100).toFixed(2)}%` }}
              />
            </div>
            <p className="text-[10px] text-[#475569] mt-1">
              {Math.round(progress * 100)}% of{" "}
              {TRAIN_EPISODES.toLocaleString()} episodes
            </p>
          </div>
        )}
        {lossEma !== null && phase !== "idle" && (
          <p className="text-[11px] font-mono text-[#475569]">
            loss (EMA):{" "}
            <span className="text-[var(--color-accent)]">
              {lossEma.toFixed(5)}
            </span>
          </p>
        )}
        {phase === "done" && durationMs !== null && (
          <p className="text-[11px] text-[#475569]">
            trained in{" "}
            <span className="font-mono text-white">
              {durationMs.toFixed(0)} ms
            </span>{" "}
            in your browser (measured)
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loss curve */}
        <div>
          <p className="text-[11px] font-semibold text-white mb-0.5">
            Training loss (EMA, log scale)
          </p>
          <p className="text-[10px] text-[#475569] mb-2">
            Squared recall error per episode; sampled every 25 episodes.
          </p>
          {lossHistory.length > 1 ? (
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full h-auto rounded-xl border border-[#1e293b] bg-[#0f172a]"
              role="img"
              aria-label={`Training loss curve on a log scale, falling from about ${lossHistory[0].loss.toFixed(2)} to ${lossHistory[lossHistory.length - 1].loss.toFixed(5)} over ${lossHistory[lossHistory.length - 1].episode} episodes.`}
            >
              {[1, 0.1, 0.01, 0.001].map((g) => (
                <g key={g}>
                  <line
                    x1={L}
                    y1={yPos(g).toFixed(2)}
                    x2={W - R}
                    y2={yPos(g).toFixed(2)}
                    stroke="#1e293b"
                    strokeWidth="1"
                  />
                  <text
                    x={L - 5}
                    y={(yPos(g) + 3).toFixed(2)}
                    textAnchor="end"
                    fontSize="9"
                    fill="#475569"
                  >
                    {g}
                  </text>
                </g>
              ))}
              {[0, 1000, 2000, 3000].map((e) => (
                <text
                  key={e}
                  x={xPos(e).toFixed(2)}
                  y={H - 10}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#475569"
                >
                  {e}
                </text>
              ))}
              <text x={W - R} y={H - 1} textAnchor="end" fontSize="8" fill="#334155">
                episodes
              </text>
              <path
                d={lossPath}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="2"
              />
            </svg>
          ) : (
            <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] h-[180px] flex items-center justify-center">
              <p className="text-[11px] text-[#475569]">
                Run training to draw the loss curve.
              </p>
            </div>
          )}
        </div>

        {/* Live heatmap */}
        <div>
          <AttentionHeatmap
            heat={heat}
            title={
              phase === "done"
                ? "Attention heatmap after training"
                : phase === "training"
                  ? "Attention heatmap (updating live)"
                  : "Attention heatmap before training"
            }
            subtitle={`Diagonal mean ${diagMean.toFixed(3)} (0.25 = uniform chance, 1.0 = perfect lookup)`}
          />
        </div>
      </div>

      {/* Before / after evaluation */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-[11px]" style={{ borderCollapse: "collapse" }}>
          <caption className="sr-only">
            Held-out evaluation before and after training
          </caption>
          <thead>
            <tr className="bg-[#1e293b] text-[#94a3b8]">
              <th className="text-left px-3 py-2 font-semibold">
                Held-out evaluation ({EVAL_EPISODES} fresh episodes)
              </th>
              <th className="text-right px-3 py-2 font-semibold">
                Untrained model
              </th>
              <th className="text-right px-3 py-2 font-semibold">
                After training
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                label: "Mean squared recall error",
                before: evalBefore.mse.toFixed(4),
                after: evalAfter ? evalAfter.mse.toFixed(5) : null,
              },
              {
                label: "Mean weight on the matching slot",
                before: evalBefore.meanCorrectWeight.toFixed(3),
                after: evalAfter ? evalAfter.meanCorrectWeight.toFixed(3) : null,
              },
              {
                label: "Argmax finds the matching slot",
                before: `${(100 * evalBefore.argmaxAccuracy).toFixed(1)}%`,
                after: evalAfter
                  ? `${(100 * evalAfter.argmaxAccuracy).toFixed(1)}%`
                  : null,
              },
            ].map((row, i) => (
              <tr
                key={row.label}
                style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}
                className="text-[#94a3b8]"
              >
                <td className="px-3 py-1.5">{row.label}</td>
                <td className="px-3 py-1.5 text-right font-mono">{row.before}</td>
                <td className="px-3 py-1.5 text-right font-mono text-[var(--color-accent)]">
                  {row.after ?? "run training"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[10px] text-[#475569] mt-1.5">
          Both columns are measured on the same {EVAL_EPISODES} episodes from a
          seed the training never used. A model with uniform weights blends all
          four values equally, which is why the untrained row sits near chance.
        </p>
      </div>
    </div>
  );
}
