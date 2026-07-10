"use client";

import {
  chainCurve,
  chainSuccess,
  cotTokens,
  directTokens,
  TOKENS_PER_STEP,
} from "./cotMath";

const MAX_N = 40;
const TABLE_NS = [2, 4, 8, 12, 16, 24, 32, 40];

const W = 640;
const H = 240;
const L = 42;
const R = 12;
const T = 12;
const B = 28;
const PLOT_W = W - L - R;
const PLOT_H = H - T - B;

function xPos(n: number): number {
  return L + ((n - 1) / (MAX_N - 1)) * PLOT_W;
}

function yPos(v: number): number {
  return T + (1 - v) * PLOT_H;
}

function pathFrom(values: number[]): string {
  return values
    .map(
      (v, i) =>
        `${i === 0 ? "M" : "L"}${xPos(i + 1).toFixed(2)},${yPos(v).toFixed(2)}`
    )
    .join(" ");
}

function fmtPct(v: number): string {
  if (v >= 0.0995) return `${(100 * v).toFixed(1)}%`;
  if (v >= 0.001) return `${(100 * v).toFixed(2)}%`;
  if (v >= 0.00001) return `${(100 * v).toFixed(4)}%`;
  return "< 0.001%";
}

interface Props {
  pEasy: number;
  pHard: number;
  horizon: number;
  onPEasy: (v: number) => void;
  onPHard: (v: number) => void;
  onHorizon: (v: number) => void;
}

export default function CompoundingExplorer({
  pEasy,
  pHard,
  horizon,
  onPEasy,
  onPHard,
  onHorizon,
}: Props) {
  const easyCurve = chainCurve(pEasy, MAX_N);
  const hardCurve = chainCurve(pHard, MAX_N);
  const easyAtN = chainSuccess(pEasy, horizon);
  const hardAtN = chainSuccess(pHard, horizon);
  const ratio = hardAtN > 0 ? easyAtN / hardAtN : Infinity;
  const ratioLabel =
    ratio > 1e6
      ? "over 1,000,000x"
      : ratio >= 100
        ? `${Math.round(ratio)}x`
        : `${ratio.toFixed(1)}x`;

  return (
    <div>
      {/* Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div>
          <label
            htmlFor="cot-p-easy"
            className="block text-[11px] font-semibold text-[#94a3b8] mb-1.5"
          >
            Per-step success with a scratchpad: p ={" "}
            <span className="text-[var(--color-accent)] font-mono">
              {pEasy.toFixed(3)}
            </span>
          </label>
          <input
            id="cot-p-easy"
            type="range"
            min={0.9}
            max={0.999}
            step={0.001}
            value={pEasy}
            onChange={(e) => onPEasy(parseFloat(e.target.value))}
            className="w-full accent-[#d4af37]"
          />
        </div>
        <div>
          <label
            htmlFor="cot-p-hard"
            className="block text-[11px] font-semibold text-[#94a3b8] mb-1.5"
          >
            Per-digit success without one: q ={" "}
            <span className="text-[#ef4444] font-mono">{pHard.toFixed(2)}</span>
          </label>
          <input
            id="cot-p-hard"
            type="range"
            min={0.5}
            max={0.99}
            step={0.01}
            value={pHard}
            onChange={(e) => onPHard(parseFloat(e.target.value))}
            className="w-full accent-[#ef4444]"
          />
        </div>
        <div>
          <label
            htmlFor="cot-horizon"
            className="block text-[11px] font-semibold text-[#94a3b8] mb-1.5"
          >
            Problem length: n ={" "}
            <span className="text-white font-mono">{horizon}</span> digits
          </label>
          <input
            id="cot-horizon"
            type="range"
            min={1}
            max={MAX_N}
            step={1}
            value={horizon}
            onChange={(e) => onHorizon(parseInt(e.target.value, 10))}
            className="w-full accent-[#94a3b8]"
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-2 text-[11px]">
        <span className="flex items-center gap-1.5 text-[#94a3b8]">
          <svg width="22" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="22" y2="4" stroke="var(--color-accent)" strokeWidth="2.5" />
          </svg>
          Scratchpad: p^n (solid gold)
        </span>
        <span className="flex items-center gap-1.5 text-[#94a3b8]">
          <svg width="22" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="22" y2="4" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="5 3" />
          </svg>
          One-shot: q^n (dashed red)
        </span>
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Whole-answer success probability against problem length. At n equals ${horizon}: scratchpad ${fmtPct(easyAtN)}, one-shot ${fmtPct(hardAtN)}. Full values in the table below.`}
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
        {[1, 10, 20, 30, 40].map((n) => (
          <text
            key={n}
            x={xPos(n).toFixed(2)}
            y={H - 10}
            textAnchor="middle"
            fontSize="9"
            fill="#475569"
          >
            {n}
          </text>
        ))}
        <text x={W - R} y={H - 10} textAnchor="end" fontSize="9" fill="#334155">
          digits
        </text>
        {/* Marker at selected n */}
        <line
          x1={xPos(horizon).toFixed(2)}
          y1={T}
          x2={xPos(horizon).toFixed(2)}
          y2={T + PLOT_H}
          stroke="#334155"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <path d={pathFrom(hardCurve)} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="5 3" />
        <path d={pathFrom(easyCurve)} fill="none" stroke="var(--color-accent)" strokeWidth="2" />
        <circle
          cx={xPos(horizon).toFixed(2)}
          cy={yPos(easyAtN).toFixed(2)}
          r="4"
          fill="var(--color-accent)"
        />
        <rect
          x={(xPos(horizon) - 3.5).toFixed(2)}
          y={(yPos(hardAtN) - 3.5).toFixed(2)}
          width="7"
          height="7"
          fill="#ef4444"
        />
      </svg>

      {/* Readouts at n */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] mb-1">
            Scratchpad, whole answer right (p^{horizon})
          </p>
          <p className="text-[16px] font-mono font-bold text-[var(--color-accent)]">
            {fmtPct(easyAtN)}
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] mb-1">
            One-shot, whole answer right (q^{horizon})
          </p>
          <p className="text-[16px] font-mono font-bold text-[#ef4444]">
            {fmtPct(hardAtN)}
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] mb-1">Scratchpad advantage</p>
          <p className="text-[16px] font-mono font-bold text-white">{ratioLabel}</p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] mb-1">
            Output tokens: {cotTokens(horizon)} vs {directTokens(horizon)}
          </p>
          <p className="text-[11px] text-[#94a3b8] leading-snug">
            assuming {TOKENS_PER_STEP} tokens per written step (illustrative)
          </p>
        </div>
      </div>

      {/* Text equivalent table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-[11px]" style={{ borderCollapse: "collapse" }}>
          <caption className="sr-only">
            Whole-answer success probability by problem length for both solvers
          </caption>
          <thead>
            <tr className="bg-[#1e293b] text-[#94a3b8]">
              <th className="text-left px-3 py-2 font-semibold">n (digits)</th>
              <th className="text-right px-3 py-2 font-semibold">
                Scratchpad p^n
              </th>
              <th className="text-right px-3 py-2 font-semibold">One-shot q^n</th>
              <th className="text-right px-3 py-2 font-semibold">Advantage</th>
            </tr>
          </thead>
          <tbody>
            {TABLE_NS.map((n, i) => {
              const pv = chainSuccess(pEasy, n);
              const qv = chainSuccess(pHard, n);
              const r = qv > 0 ? pv / qv : Infinity;
              return (
                <tr
                  key={n}
                  style={{ background: i % 2 === 0 ? "#0f172a" : "#162032" }}
                  className="text-[#94a3b8]"
                >
                  <td className="px-3 py-1.5 font-mono text-white">{n}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-[var(--color-accent)]">
                    {fmtPct(pv)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-[#ef4444]">
                    {fmtPct(qv)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono">
                    {r > 1e6 ? "> 1,000,000x" : r >= 100 ? `${Math.round(r)}x` : `${r.toFixed(1)}x`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-xl border border-[#334155] bg-[#162032] p-4">
        <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1.5">
          What this panel assumes
        </p>
        <p className="text-[12px] text-[#94a3b8] leading-relaxed">
          This is an error model, not a measurement: every step is assumed to
          succeed independently with a fixed probability. Both solvers compound,
          p^n and q^n both decay, so the chain of thought does not escape
          compounding. It wins by moving the base close to 1: each written step
          is a tiny local problem, while each unwritten digit hides a whole
          carry chain. The constant q is actually generous to the one-shot
          solver; in the experiment below its measured per-digit accuracy gets
          worse as problems grow.
        </p>
      </div>
    </div>
  );
}
