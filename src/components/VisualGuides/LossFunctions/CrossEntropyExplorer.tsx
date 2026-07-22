"use client";

import React, { useState } from "react";
import {
  crossEntropy,
  squaredErrorProb,
  ceGradLogit,
  seGradLogit,
  fmt,
  fmtSigned,
} from "./types";

interface Props {
  /** Called with the probability on every slider change; the parent tracks the sweep. */
  onProbe: (p: number) => void;
}

// Chart geometry (viewBox units)
const W = 640;
const H = 286;
const L = 46;
const R = 624;
const T = 14;
const B = 232;
const P_MIN = 0.01;
const P_MAX = 1;
const Y_MAX = 5; // nats; CE(0.01) = 4.61 still fits

function px(p: number): number {
  return L + ((p - 0) / 1) * (R - L);
}

function py(loss: number): number {
  return B - (loss / Y_MAX) * (B - T);
}

function buildCurve(f: (p: number) => number): string {
  const parts: string[] = [];
  const n = 200;
  for (let i = 0; i <= n; i++) {
    const p = P_MIN + (i / n) * (P_MAX - P_MIN);
    parts.push(`${i === 0 ? "M" : "L"}${px(p).toFixed(2)},${py(f(p)).toFixed(2)}`);
  }
  return parts.join(" ");
}

export default function CrossEntropyExplorer({ onProbe }: Props) {
  const [p, setP] = useState(0.7);

  const ce = crossEntropy(p);
  const se = squaredErrorProb(p);
  const gCe = ceGradLogit(p);
  const gSe = seGradLogit(p);

  function handleChange(value: number) {
    setP(value);
    onProbe(value);
  }

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
      <div className="mb-4">
        <p className="text-[13px] font-semibold text-white mb-1">
          Interactive C: Cross Entropy vs Squared Error
        </p>
        <p className="text-[12px] text-[#475569] leading-relaxed">
          p is the probability your classifier assigns to the true class. Sweep it down
          below 0.1 and watch which loss still produces a usable training signal. Both
          curves and all four numbers are computed from the slider value.
        </p>
      </div>

      {/* Slider */}
      <div className="mb-4 max-w-[420px]">
        <label htmlFor="ce-prob" className="block text-[11px] font-semibold text-[#94a3b8] mb-1.5">
          Predicted probability of the true class: p = {fmt(p)}
        </label>
        <input
          id="ce-prob"
          type="range"
          min={P_MIN}
          max={P_MAX}
          step={0.01}
          value={p}
          onChange={(ev) => handleChange(Number(ev.target.value))}
          className="w-full"
          style={{ accentColor: "var(--color-accent)" }}
        />
        <div className="flex justify-between text-[10px] text-[#475569] mt-1">
          <span>0.01 (confidently wrong)</span>
          <span>1.00 (confidently right)</span>
        </div>
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Loss curves versus predicted probability. At p = ${fmt(p)}: cross entropy ${fmt(ce)} nats, squared error ${fmt(se)}.`}
      >
        <defs>
          <clipPath id="ce-explorer-clip">
            <rect x={L} y={T} width={R - L} height={B - T} />
          </clipPath>
        </defs>

        {[0, 1, 2, 3, 4, 5].map((t) => (
          <g key={`y${t}`}>
            <line x1={L} y1={py(t)} x2={R} y2={py(t)} stroke="#1e293b" strokeWidth={1} />
            <text x={L - 8} y={py(t) + 6} textAnchor="end" fontSize={20} fill="#475569">
              {t}
            </text>
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <text key={`x${t}`} x={px(t)} y={B + 22} textAnchor="middle" fontSize={20} fill="#475569">
            {t}
          </text>
        ))}
        <text x={(L + R) / 2} y={H - 6} textAnchor="middle" fontSize={21} fill="#94a3b8">
          p (probability of the true class)
        </text>
        <text x={18} y={(T + B) / 2} textAnchor="middle" fontSize={21} fill="#94a3b8" transform={`rotate(-90 18 ${(T + B) / 2})`}>
          loss
        </text>

        <g clipPath="url(#ce-explorer-clip)">
          <path d={buildCurve(crossEntropy)} fill="none" stroke="var(--color-warning)" strokeWidth={2.5} />
          <path d={buildCurve(squaredErrorProb)} fill="none" stroke="#a855f7" strokeWidth={2.5} strokeDasharray="6 4" />

          <line x1={px(p)} y1={T} x2={px(p)} y2={B} stroke="#475569" strokeWidth={1} strokeDasharray="3 3" />
          <circle cx={px(p)} cy={py(Math.min(ce, Y_MAX))} r={4.5} fill="var(--color-warning)" />
          <circle cx={px(p)} cy={py(se)} r={4.5} fill="#a855f7" />
        </g>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-2 mb-4">
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <span className="inline-block w-3 h-[3px] rounded-full" style={{ background: "var(--color-warning)" }} />
          Cross entropy: -ln(p), in nats (solid orange)
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <span className="inline-block w-3 h-[3px] rounded-full bg-[#a855f7]" />
          Squared error: (1 - p)² (dashed purple)
        </span>
      </div>

      {/* Live values */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl border border-[#1e293b] bg-[#162032] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--color-warning)" }}>
            Cross entropy
          </p>
          <p className="text-2xl font-black" style={{ color: "var(--color-warning)" }}>
            {fmt(ce)} <span className="text-sm font-semibold opacity-70">nats</span>
          </p>
          <p className="text-[11px] text-[#94a3b8] mt-1.5">
            gradient wrt logit (sigmoid, y = 1):{" "}
            <span className="font-mono font-semibold text-[#f1f5f9]">p - 1 = {fmtSigned(gCe)}</span>
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] bg-[#162032] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a855f7] mb-2">
            Squared error
          </p>
          <p className="text-2xl font-black text-[#a855f7]">{fmt(se)}</p>
          <p className="text-[11px] text-[#94a3b8] mt-1.5">
            gradient wrt logit (sigmoid, y = 1):{" "}
            <span className="font-mono font-semibold text-[#f1f5f9]">
              2(p - 1)·p·(1 - p) = {fmtSigned(gSe, 3)}
            </span>
          </p>
        </div>
      </div>

      {/* Confidently-wrong callout */}
      {p < 0.1 && (
        <div
          className="mb-3 px-4 py-2.5 rounded-xl border text-[12px]"
          style={{
            borderColor: "color-mix(in srgb, var(--color-warning) 35%, transparent)",
            background: "color-mix(in srgb, var(--color-warning) 8%, transparent)",
            color: "var(--color-warning)",
          }}
        >
          At p = {fmt(p)}: cross entropy is {fmt(ce)} nats and its logit gradient is {fmtSigned(gCe)},
          still a strong push. The squared-error logit gradient has collapsed to {fmtSigned(gSe, 3)}
          because the sigmoid derivative p(1 - p) is nearly zero. A confidently wrong model trained
          with squared error barely learns from its worst mistakes.
        </div>
      )}

      <p className="text-[11px] text-[#475569] leading-relaxed">
        The gradient story generalizes: combine softmax with cross entropy and the gradient of the
        loss with respect to each logit collapses to p - y, the predicted probability minus the
        one-hot target. That clean, non-vanishing gradient (not tradition) is why softmax plus
        cross entropy is the standard pairing for classification.
      </p>
    </div>
  );
}
