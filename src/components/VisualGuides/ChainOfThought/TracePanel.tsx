"use client";

import { useMemo, useState } from "react";
import type { EvalResults, ExperimentState } from "./cotMath";
import {
  digitsToString,
  makeTraceProblems,
  runDirect,
  runScratchpad,
} from "./cotMath";

const TRACE_LENGTHS = [3, 4, 5];
const EXAMPLES_PER_LENGTH = 12;

const POSITION_NAMES = [
  "ones",
  "tens",
  "hundreds",
  "thousands",
  "ten thousands",
  "hundred thousands",
];

function fmtProb(p: number): string {
  if (p >= 0.0005) return `${(100 * p).toFixed(1)}%`;
  return p.toExponential(1);
}

interface Props {
  exp: ExperimentState;
  /** Identity changes when a training run finishes; invalidates memos. */
  results: EvalResults;
  revealed: boolean;
  onReveal: () => void;
}

export default function TracePanel({ exp, results, revealed, onReveal }: Props) {
  const [len, setLen] = useState(4);
  const [idx, setIdx] = useState(0);

  const problems = useMemo(() => makeTraceProblems(len, EXAMPLES_PER_LENGTH), [len]);
  const problem = problems[idx];

  const scratch = useMemo(
    () => runScratchpad(exp.step, problem),
    [exp, problem, results] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const direct = useMemo(
    () => runDirect(exp.direct, problem),
    [exp, problem, results] // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (!revealed) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-[12px] text-[#94a3b8] leading-relaxed max-w-[720px]">
          Both models you just trained are still in memory. Open a worked
          example to watch the scratchpad model write its trace one column at a
          time, with the probability it puts on every choice, next to the
          one-shot model attempting the same problem in a single pass.
        </p>
        <button
          onClick={onReveal}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
        >
          Reveal a worked trace
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div
          role="radiogroup"
          aria-label="Trace problem length"
          className="flex items-center gap-2"
        >
          {TRACE_LENGTHS.map((l) => (
            <button
              key={l}
              role="radio"
              aria-checked={len === l}
              onClick={() => {
                setLen(l);
                setIdx(0);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors ${
                len === l
                  ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-[#0a0e1a]"
                  : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white"
              }`}
            >
              {l} digits
            </button>
          ))}
        </div>
        <button
          onClick={() => setIdx((i) => (i + 1) % EXAMPLES_PER_LENGTH)}
          className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
        >
          Next example ({idx + 1}/{EXAMPLES_PER_LENGTH})
        </button>
      </div>

      <p className="text-[15px] font-mono text-white mb-4">
        {digitsToString(problem.a)} + {digitsToString(problem.b)} ={" "}
        <span className="text-[var(--color-accent)]">
          {digitsToString(problem.sum)}
        </span>
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Scratchpad trace */}
        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[11px] font-semibold text-[#3bb4a4] uppercase tracking-wide mb-3">
            Scratchpad model, one column at a time
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]" style={{ borderCollapse: "collapse" }}>
              <caption className="sr-only">
                Scratchpad trace steps with model confidence per step
              </caption>
              <thead>
                <tr className="bg-[#1e293b] text-[#94a3b8]">
                  <th className="text-left px-2 py-1.5 font-semibold">Step</th>
                  <th className="text-left px-2 py-1.5 font-semibold">Column</th>
                  <th className="text-left px-2 py-1.5 font-semibold">Model wrote</th>
                  <th className="text-right px-2 py-1.5 font-semibold">Confidence</th>
                  <th className="text-right px-2 py-1.5 font-semibold">Check</th>
                </tr>
              </thead>
              <tbody>
                {scratch.steps.map((s, i) => (
                  <tr
                    key={s.i}
                    style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}
                    className="text-[#94a3b8]"
                  >
                    <td className="px-2 py-1.5 font-mono text-white">{s.i + 1}</td>
                    <td className="px-2 py-1.5 font-mono">
                      {s.da} + {s.db} + carry {s.cin}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-white">
                      digit {s.predDigit}, carry {s.predCarry}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      {fmtProb(s.pPredDigit * s.pPredCarry)}
                    </td>
                    <td
                      className={`px-2 py-1.5 text-right font-semibold ${
                        s.correct ? "text-[var(--color-success)]" : "text-[#ef4444]"
                      }`}
                    >
                      {s.correct ? "✓ ok" : "✗ wrong"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mt-3">
            Answer written:{" "}
            <span className="font-mono text-white">
              {digitsToString(scratch.finalDigits)}
            </span>{" "}
            <span
              className={`font-semibold ${
                scratch.exactMatch
                  ? "text-[var(--color-success)]"
                  : "text-[#ef4444]"
              }`}
            >
              ({scratch.exactMatch ? "correct" : "wrong"})
            </span>
            . Confidence product over its own {scratch.steps.length} choices:{" "}
            <span className="font-mono text-[#3bb4a4]">
              {fmtProb(scratch.confidenceProduct)}
            </span>
            .
          </p>
        </div>

        {/* Direct attempt */}
        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[11px] font-semibold text-[#ef4444] uppercase tracking-wide mb-3">
            One-shot model, single forward pass
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]" style={{ borderCollapse: "collapse" }}>
              <caption className="sr-only">
                One-shot model probability on the true digit per answer position
              </caption>
              <thead>
                <tr className="bg-[#1e293b] text-[#94a3b8]">
                  <th className="text-left px-2 py-1.5 font-semibold">Position</th>
                  <th className="text-right px-2 py-1.5 font-semibold">True digit</th>
                  <th className="text-right px-2 py-1.5 font-semibold">Model wrote</th>
                  <th className="text-right px-2 py-1.5 font-semibold">p(true digit)</th>
                </tr>
              </thead>
              <tbody>
                {problem.sum
                  .map((trueDigit, pos) => ({ trueDigit, pos }))
                  .filter(({ pos }) => pos <= problem.len)
                  .map(({ trueDigit, pos }, i) => (
                    <tr
                      key={pos}
                      style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}
                      className="text-[#94a3b8]"
                    >
                      <td className="px-2 py-1.5">{POSITION_NAMES[pos]}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-white">
                        {trueDigit}
                      </td>
                      <td
                        className={`px-2 py-1.5 text-right font-mono ${
                          direct.predDigits[pos] === trueDigit
                            ? "text-[var(--color-success)]"
                            : "text-[#ef4444]"
                        }`}
                      >
                        {direct.predDigits[pos]}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {fmtProb(direct.pTrue[pos])}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mt-3">
            Answer written:{" "}
            <span className="font-mono text-white">
              {digitsToString(direct.predDigits)}
            </span>{" "}
            <span
              className={`font-semibold ${
                direct.exactMatch
                  ? "text-[var(--color-success)]"
                  : "text-[#ef4444]"
              }`}
            >
              ({direct.exactMatch ? "correct" : "wrong"})
            </span>
            . Probability it put on the exactly correct answer, the product of
            the p(true digit) column:{" "}
            <span className="font-mono text-[#ef4444]">
              {fmtProb(direct.pAnswer)}
            </span>
            .
          </p>
        </div>
      </div>

      <p className="text-[12px] text-[#475569] leading-relaxed mt-4 max-w-[760px]">
        Every probability above is read directly off the softmax outputs of the
        two networks trained in the previous section. The scratchpad step marked
        wrong, when you find one, is judged against the correct output for the
        carry the model actually fed itself.
      </p>
    </div>
  );
}
