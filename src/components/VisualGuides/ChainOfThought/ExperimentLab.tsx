"use client";

import type { EvalResults } from "./cotMath";
import {
  DIRECT_HIDDEN,
  STEP_HIDDEN,
  DIRECT_SAMPLES,
  STEP_SAMPLES,
  MAX_LEN,
  TEST_PER_LENGTH,
} from "./cotMath";

const W = 640;
const H = 250;
const L = 42;
const R = 12;
const T = 14;
const B = 30;
const PLOT_W = W - L - R;
const PLOT_H = H - T - B;

function xPos(len: number): number {
  return L + ((len - 1) / (MAX_LEN - 1)) * PLOT_W;
}

function yPos(v: number): number {
  return T + (1 - v) * PLOT_H;
}

function linePath(values: number[]): string {
  return values
    .map(
      (v, i) =>
        `${i === 0 ? "M" : "L"}${xPos(i + 1).toFixed(2)},${yPos(v).toFixed(2)}`
    )
    .join(" ");
}

function diamond(cx: number, cy: number): string {
  return `M${cx.toFixed(2)},${(cy - 4).toFixed(2)} L${(cx + 4).toFixed(2)},${cy.toFixed(2)} L${cx.toFixed(2)},${(cy + 4).toFixed(2)} L${(cx - 4).toFixed(2)},${cy.toFixed(2)} Z`;
}

export type ExperimentPhase = "idle" | "training" | "done";

interface Props {
  phase: ExperimentPhase;
  progress: number; // 0..1
  liveLoss: { step: number; direct: number } | null;
  results: EvalResults | null;
  onRun: () => void;
}

export default function ExperimentLab({
  phase,
  progress,
  liveLoss,
  results,
  onRun,
}: Props) {
  const trainingScratchpad = progress * (STEP_SAMPLES + DIRECT_SAMPLES) < STEP_SAMPLES;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[11px] font-semibold text-[#ef4444] uppercase tracking-wide mb-1.5">
            Solver A: one-shot
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed">
            A single-hidden-layer network ({DIRECT_HIDDEN} units) that reads
            both operands, padded to {MAX_LEN} digits, and must emit all{" "}
            {MAX_LEN + 1} answer digits in one forward pass. No intermediate
            state anywhere: every carry must be resolved inside the network.
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[11px] font-semibold text-[#3bb4a4] uppercase tracking-wide mb-1.5">
            Solver B: scratchpad
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed">
            An even smaller network ({STEP_HIDDEN} units) that only ever learns
            one column: digit + digit + carry-in to digit + carry-out. At answer
            time it runs once per column, feeding its own predicted carry
            forward, exactly like a model writing its working out loud.
          </p>
        </div>
      </div>

      <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
        Both networks train right here in your browser with plain SGD
        ({STEP_SAMPLES.toLocaleString()} column examples for the scratchpad
        model, {DIRECT_SAMPLES.toLocaleString()} full problems for the one-shot
        model) from fixed seeds, then face {TEST_PER_LENGTH} held-out problems
        per length from a separate seed. Every number below is measured from
        that run. Seeds are fixed, so running again reproduces the same numbers
        exactly.
      </p>

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
            ? "Train both models"
            : phase === "training"
              ? `Training ${trainingScratchpad ? "scratchpad" : "one-shot"} model...`
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
              {(STEP_SAMPLES + DIRECT_SAMPLES).toLocaleString()} training
              examples
            </p>
          </div>
        )}
        {liveLoss && phase !== "idle" && (
          <p className="text-[11px] font-mono text-[#475569]">
            loss (EMA): scratchpad{" "}
            <span className="text-[#3bb4a4]">
              {Number.isNaN(liveLoss.step) ? "..." : liveLoss.step.toFixed(4)}
            </span>
            {", "}one-shot{" "}
            <span className="text-[#ef4444]">
              {Number.isNaN(liveLoss.direct) ? "..." : liveLoss.direct.toFixed(3)}
            </span>
          </p>
        )}
      </div>

      {results && (
        <div>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mb-2 text-[11px]">
            <span className="flex items-center gap-1.5 text-[#94a3b8]">
              <svg width="22" height="10" aria-hidden="true">
                <line x1="0" y1="5" x2="22" y2="5" stroke="#ef4444" strokeWidth="2" />
                <rect x="8" y="2" width="6" height="6" fill="#ef4444" />
              </svg>
              One-shot, measured (squares)
            </span>
            <span className="flex items-center gap-1.5 text-[#94a3b8]">
              <svg width="22" height="10" aria-hidden="true">
                <line x1="0" y1="5" x2="22" y2="5" stroke="#3bb4a4" strokeWidth="2" />
                <circle cx="11" cy="5" r="3.5" fill="#3bb4a4" />
              </svg>
              Scratchpad, measured (circles)
            </span>
            <span className="flex items-center gap-1.5 text-[#94a3b8]">
              <svg width="22" height="10" aria-hidden="true">
                <line x1="0" y1="5" x2="22" y2="5" stroke="var(--color-accent)" strokeWidth="2" strokeDasharray="4 3" />
                <path d={diamond(11, 5)} fill="var(--color-accent)" />
              </svg>
              Compounding model p&#772;^n (diamonds, dashed)
            </span>
          </div>

          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto"
            role="img"
            aria-label="Measured exact-match accuracy against problem length for both trained models. Full values in the table below."
          >
            {[0, 0.25, 0.5, 0.75, 1].map((g) => (
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
                  x={L - 6}
                  y={(yPos(g) + 3).toFixed(2)}
                  textAnchor="end"
                  fontSize="9"
                  fill="#475569"
                >
                  {Math.round(g * 100)}%
                </text>
              </g>
            ))}
            {results.perLength.map((r) => (
              <text
                key={r.len}
                x={xPos(r.len).toFixed(2)}
                y={H - 12}
                textAnchor="middle"
                fontSize="10"
                fill="#475569"
              >
                {r.len}
              </text>
            ))}
            <text x={W - R} y={H - 2} textAnchor="end" fontSize="9" fill="#334155">
              problem length (digits)
            </text>

            <path
              d={linePath(results.perLength.map((r) => r.predictedChain))}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
            <path
              d={linePath(results.perLength.map((r) => r.directAcc))}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
            />
            <path
              d={linePath(results.perLength.map((r) => r.scratchAcc))}
              fill="none"
              stroke="#3bb4a4"
              strokeWidth="2"
            />
            {results.perLength.map((r) => (
              <g key={r.len}>
                <path d={diamond(xPos(r.len), yPos(r.predictedChain))} fill="var(--color-accent)" />
                <rect
                  x={(xPos(r.len) - 3).toFixed(2)}
                  y={(yPos(r.directAcc) - 3).toFixed(2)}
                  width="6"
                  height="6"
                  fill="#ef4444"
                />
                <circle
                  cx={xPos(r.len).toFixed(2)}
                  cy={yPos(r.scratchAcc).toFixed(2)}
                  r="3.5"
                  fill="#3bb4a4"
                />
              </g>
            ))}
          </svg>

          {/* Results table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-[11px]" style={{ borderCollapse: "collapse" }}>
              <caption className="sr-only">
                Measured exact-match accuracy by problem length
              </caption>
              <thead>
                <tr className="bg-[#1e293b] text-[#94a3b8]">
                  <th className="text-left px-3 py-2 font-semibold">Length</th>
                  <th className="text-right px-3 py-2 font-semibold">
                    One-shot exact match
                  </th>
                  <th className="text-right px-3 py-2 font-semibold">
                    Scratchpad exact match
                  </th>
                  <th className="text-right px-3 py-2 font-semibold">
                    Mean step prob p&#772;
                  </th>
                  <th className="text-right px-3 py-2 font-semibold">
                    Model: p&#772;^n
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.perLength.map((r, i) => (
                  <tr
                    key={r.len}
                    style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}
                    className="text-[#94a3b8]"
                  >
                    <td className="px-3 py-1.5 font-mono text-white">
                      {r.len} digit{r.len > 1 ? "s" : ""}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-[#ef4444]">
                      {(100 * r.directAcc).toFixed(1)}%
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-[#3bb4a4]">
                      {(100 * r.scratchAcc).toFixed(1)}%
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {(100 * r.meanStepProb).toFixed(2)}%
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-[var(--color-accent)]">
                      {(100 * r.predictedChain).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-xl border border-[#334155] bg-[#162032] p-4 space-y-2">
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              Reading the measurement: the gold dashed curve feeds the measured
              mean per-step probability, p&#772; ={" "}
              <span className="font-mono text-[var(--color-accent)]">
                {(100 * results.meanStepProbOverall).toFixed(2)}%
              </span>
              , into the compounding model from the panel above. It can sit
              below the measured scratchpad accuracy because an exact match
              only needs the argmax to be right at each step, not the full
              probability mass.
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              Fine print: at lengths 1 and 2 the input space is tiny (100 and
              about 8,100 problems), so the one-shot model has seen most of it
              during training and can memorize. The honest region is length 3
              and up, where memorization runs out and only the scratchpad
              survives. Final training loss (EMA): scratchpad{" "}
              <span className="font-mono text-[#3bb4a4]">
                {results.stepFinalLoss.toFixed(4)}
              </span>
              , one-shot{" "}
              <span className="font-mono text-[#ef4444]">
                {results.directFinalLoss.toFixed(3)}
              </span>
              .
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
