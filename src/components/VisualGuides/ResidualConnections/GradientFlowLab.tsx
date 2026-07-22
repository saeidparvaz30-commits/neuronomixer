"use client";

import { useMemo } from "react";
import {
  computeGradientFlow,
  GRAD_BATCH,
  INIT_GAIN,
  MAX_DEPTH,
  MIN_DEPTH,
  WIDTH,
} from "./residualMath";

const W = 680;
const H = 270;
const L = 76;
const R = 14;
const T = 16;
const B = 48;
const PLOT_W = W - L - R;
const PLOT_H = H - T - B;

/** Log10 display domain for gradient norms. */
const LOG_MIN = -5.5;
const LOG_MAX = 1.6;

function yFor(norm: number): number {
  const lv = Math.min(LOG_MAX, Math.max(LOG_MIN, Math.log10(Math.max(norm, 1e-300))));
  return T + ((LOG_MAX - lv) / (LOG_MAX - LOG_MIN)) * PLOT_H;
}

function fmtNorm(v: number): string {
  if (v >= 0.01 && v < 100) return v.toFixed(3);
  return v.toExponential(1);
}

interface Props {
  depth: number;
  residual: boolean;
  onDepthChange: (v: number) => void;
  onWiringChange: (residual: boolean) => void;
}

export default function GradientFlowLab({
  depth,
  residual,
  onDepthChange,
  onWiringChange,
}: Props) {
  const plain = useMemo(() => computeGradientFlow(depth, false), [depth]);
  const skip = useMemo(() => computeGradientFlow(depth, true), [depth]);

  const active = residual ? skip : plain;
  const ghost = residual ? plain : skip;
  const activeColor = residual ? "var(--color-success)" : "var(--color-warning)";

  const n = depth + 1;
  const gap = 2;
  const barW = Math.max(4, Math.floor(PLOT_W / n) - gap);
  const xFor = (l: number) => L + (l * PLOT_W) / n + gap / 2;

  const attenuation = plain.hGradNorms[depth] / plain.hGradNorms[0];
  const skipAdvantage = skip.hGradNorms[0] / plain.hGradNorms[0];

  const gridLevels = [1, -1, -3, -5];
  const tickEvery = depth > 18 ? 5 : depth > 8 ? 4 : 2;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
      <div className="mb-4">
        <p className="text-[13px] font-semibold text-white mb-1">
          Gradient Flow Lab: one real backward pass
        </p>
        <p className="text-[12px] text-[#475569] leading-relaxed max-w-[720px]">
          A network of {depth} blocks (width {WIDTH}, block f(h) = W&#8322;
          tanh(W&#8321;h + b&#8321;) + b&#8322;) is built fresh at every setting,
          then runs one full forward and backward pass on a fixed {GRAD_BATCH}-point
          batch. Each bar is the measured norm of the loss gradient reaching that
          layer, exactly what the first SGD step would use. Both wirings share
          identical weights; only the skip connections differ. Block weights are
          Xavier-initialized then scaled by {INIT_GAIN}, slightly inside the stable
          regime, so each block genuinely attenuates the signal it passes back
          (the regime the vanishing-gradients guide describes).
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4 mb-5">
        <div className="min-w-[220px] flex-1 max-w-[340px]">
          <label
            htmlFor="rc-depth"
            className="block text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1.5"
          >
            Network depth: {depth} blocks
          </label>
          <input
            id="rc-depth"
            type="range"
            min={MIN_DEPTH}
            max={MAX_DEPTH}
            step={1}
            value={depth}
            onChange={(e) => onDepthChange(Number(e.target.value))}
            className="w-full accent-[#d4af37]"
          />
        </div>
        <div>
          <p
            id="rc-wiring-label"
            className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1.5"
          >
            Skip connections
          </p>
          <div
            role="radiogroup"
            aria-labelledby="rc-wiring-label"
            className="inline-flex rounded-xl border border-[#1e293b] overflow-hidden"
          >
            {[
              { label: "Off (plain)", value: false },
              { label: "On (residual)", value: true },
            ].map((opt) => {
              const selected = residual === opt.value;
              return (
                <button
                  key={opt.label}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onWiringChange(opt.value)}
                  className={`px-4 py-2 text-[12px] font-semibold transition-colors ${
                    selected
                      ? "bg-[var(--color-accent)] text-[#0a0e1a]"
                      : "text-[#94a3b8] hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Bar chart of gradient norms per layer for a ${depth}-block network with skip connections ${residual ? "on" : "off"}. Gradient reaching layer 0 is ${fmtNorm(active.hGradNorms[0])}, gradient at the top layer is ${fmtNorm(active.hGradNorms[depth])}. The other wiring is shown as outlines for comparison.`}
      >
        {gridLevels.map((g) => {
          const y = yFor(Math.pow(10, g));
          return (
            <g key={g}>
              <line
                x1={L}
                y1={y.toFixed(2)}
                x2={W - R}
                y2={y.toFixed(2)}
                stroke="#1e293b"
                strokeWidth="1"
              />
              <text x={L - 6} y={(y + 6).toFixed(2)} textAnchor="end" fill="#475569" fontSize="21">
                {g === 1 ? "10" : g === -1 ? "0.1" : `1e${g}`}
              </text>
            </g>
          );
        })}
        {/* Ghost bars: the other wiring, outlined */}
        {ghost.hGradNorms.map((v, l) => {
          const y = yFor(v);
          return (
            <rect
              key={`g${l}`}
              x={xFor(l).toFixed(2)}
              y={y.toFixed(2)}
              width={barW}
              height={Math.max(1, T + PLOT_H - y).toFixed(2)}
              fill="none"
              stroke="#334155"
              strokeWidth="1"
            />
          );
        })}
        {/* Active bars */}
        {active.hGradNorms.map((v, l) => {
          const y = yFor(v);
          return (
            <rect
              key={`a${l}`}
              x={xFor(l).toFixed(2)}
              y={y.toFixed(2)}
              width={barW}
              height={Math.max(1, T + PLOT_H - y).toFixed(2)}
              fill={activeColor}
              opacity="0.85"
            />
          );
        })}
        {/* X ticks */}
        {active.hGradNorms.map((_, l) =>
          l % tickEvery === 0 || l === depth ? (
            <text
              key={`t${l}`}
              x={(xFor(l) + barW / 2).toFixed(2)}
              y={H - 30}
              textAnchor="middle"
              fill="#475569"
              fontSize="21"
            >
              {l}
            </text>
          ) : null
        )}
        <text x={L + PLOT_W / 2} y={H - 4} textAnchor="middle" fill="#475569" fontSize="21">
          layer (0 = input side, {depth} = output side)
        </text>
        <text
          x={12}
          y={T + PLOT_H / 2}
          textAnchor="middle"
          fill="#475569"
          fontSize="21"
          transform={`rotate(-90 12 ${(T + PLOT_H / 2).toFixed(0)})`}
        >
          gradient norm (log)
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-2 mb-4">
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ background: activeColor }}
          />
          filled: {residual ? "with skips (residual)" : "no skips (plain)"}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <span className="inline-block w-3 h-3 rounded-sm border border-[#334155]" />
          outline: {residual ? "no skips (plain)" : "with skips (residual)"}
        </span>
      </div>

      {/* Stats: all measured from the backward pass above */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Gradient reaching layer 0 ({residual ? "residual" : "plain"})
          </p>
          <p className="text-xl font-black font-mono" style={{ color: activeColor }}>
            {fmtNorm(active.hGradNorms[0])}
          </p>
          <p className="text-[11px] text-[#475569] mt-1">
            vs {fmtNorm(active.hGradNorms[depth])} at the top layer
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Plain net: top-to-bottom attenuation
          </p>
          <p className="text-xl font-black font-mono text-[var(--color-warning)]">
            {attenuation >= 2 ? `${attenuation.toExponential(1)}x` : `${attenuation.toFixed(2)}x`}
          </p>
          <p className="text-[11px] text-[#475569] mt-1">
            weaker by the time it reaches layer 0
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Skips deliver to layer 0
          </p>
          <p className="text-xl font-black font-mono text-[var(--color-success)]">
            {skipAdvantage.toExponential(1)}x
          </p>
          <p className="text-[11px] text-[#475569] mt-1">
            more gradient signal than the plain wiring
          </p>
        </div>
      </div>

      <p className="text-[11px] text-[#475569] leading-relaxed mt-4 max-w-[720px]">
        With skips the signal even grows toward the input, because every block adds
        its branch on top of the identity path. Real residual networks pair skips
        with normalization layers to keep that growth in check; He et al. 2015 used
        batch normalization inside every block.
      </p>
    </div>
  );
}
