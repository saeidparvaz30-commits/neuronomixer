"use client";

import React from "react";
import {
  Activation,
  Scheme,
  SCHEMES,
  SCHEME_META,
  SignalAnalysis,
  schemeStd,
  fmtStat,
  DEPTH,
  WIDTH,
  INPUT_DIM,
  DATA_N,
  TANH_SAT_THRESHOLD,
} from "./initMath";

type Props = {
  scheme: Scheme;
  activation: Activation;
  analysis: SignalAnalysis;
  onSchemeChange: (s: Scheme) => void;
  onActivationChange: (a: Activation) => void;
};

const HIST_W = 100;
const HIST_H = 52;

function Histogram({
  counts,
  color,
  centerLine,
  label,
}: {
  counts: readonly number[];
  color: string;
  centerLine: boolean;
  label: string;
}) {
  const max = Math.max(1, ...counts);
  const barW = HIST_W / counts.length;
  return (
    <svg
      viewBox={`0 0 ${HIST_W} ${HIST_H}`}
      className="w-full h-12"
      role="img"
      aria-label={label}
      preserveAspectRatio="none"
    >
      <rect x="0" y="0" width={HIST_W} height={HIST_H} fill="#1e293b" opacity="0.35" />
      {centerLine && (
        <line
          x1={(HIST_W / 2).toFixed(1)}
          y1="0"
          x2={(HIST_W / 2).toFixed(1)}
          y2={HIST_H}
          stroke="#334155"
          strokeWidth="1"
        />
      )}
      {counts.map((c, i) => {
        const h = (c / max) * (HIST_H - 4);
        if (h <= 0) return null;
        return (
          <rect
            key={i}
            x={(i * barW + 0.4).toFixed(2)}
            y={(HIST_H - h).toFixed(2)}
            width={(barW - 0.8).toFixed(2)}
            height={h.toFixed(2)}
            fill={color}
            opacity="0.9"
          />
        );
      })}
    </svg>
  );
}

export default function SignalFlowLab({
  scheme,
  activation,
  analysis,
  onSchemeChange,
  onActivationChange,
}: Props) {
  const meta = SCHEME_META[scheme];
  const hiddenStd = schemeStd(scheme, WIDTH, WIDTH);
  const firstStd = schemeStd(scheme, INPUT_DIM, WIDTH);
  const inertLabel = activation === "tanh" ? "saturated" : "zero";
  const ratio = analysis.gradRatio;
  const ratioText = Number.isFinite(ratio) ? fmtStat(ratio) : "0/0 (no gradient flows at all)";
  const lastGrad = analysis.layers[DEPTH - 1].gradStd;
  const firstGrad = analysis.layers[0].gradStd;
  const firstAct = analysis.layers[0].actStd;
  const lastAct = analysis.layers[DEPTH - 1].actStd;
  const forwardCollapsing = firstAct > 0 && lastAct / firstAct < 0.5;

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-4 mb-5">
        <div>
          <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-2">
            Init scheme
          </p>
          <div
            role="radiogroup"
            aria-label="Weight initialization scheme"
            className="flex flex-wrap gap-2"
          >
            {SCHEMES.map((s) => {
              const active = s === scheme;
              return (
                <button
                  key={s}
                  role="radio"
                  aria-checked={active}
                  onClick={() => onSchemeChange(s)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                    active
                      ? "border-[#94a3b8] bg-[#1e293b] text-white"
                      : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: SCHEME_META[s].color }}
                    aria-hidden="true"
                  />
                  {SCHEME_META[s].label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="lg:ml-auto">
          <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-2">
            Hidden activation
          </p>
          <div
            role="radiogroup"
            aria-label="Hidden activation function"
            className="flex gap-2"
          >
            {(["tanh", "relu"] as Activation[]).map((a) => {
              const active = a === activation;
              return (
                <button
                  key={a}
                  role="radio"
                  aria-checked={active}
                  onClick={() => onActivationChange(a)}
                  className={`px-3.5 py-2 rounded-xl text-[12px] font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                    active
                      ? "border-[#94a3b8] bg-[#1e293b] text-white"
                      : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white"
                  }`}
                >
                  {a === "tanh" ? "tanh" : "ReLU"}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Formula card with citations, every std computed from schemeStd() */}
      <div className="rounded-xl border border-[#1e293b] p-4 mb-5">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-1.5">
          <p className="text-[12px] font-semibold text-white">{meta.label}</p>
          <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[12px] px-2 py-0.5 rounded inline-block whitespace-pre-wrap">
            {meta.formula}
          </pre>
        </div>
        <p className="text-[11px] text-[#94a3b8] leading-relaxed">
          For this network that means weight std{" "}
          <span className="font-mono text-[#f1f5f9]">{fmtStat(firstStd)}</span> on the first
          layer ({INPUT_DIM} to {WIDTH}) and{" "}
          <span className="font-mono text-[#f1f5f9]">{fmtStat(hiddenStd)}</span> on the{" "}
          {WIDTH} to {WIDTH} hidden layers. Biases start at 0 (the standard convention).
        </p>
        {meta.citation && (
          <p className="text-[10px] text-[#475569] mt-1.5">Source: {meta.citation}.</p>
        )}
      </div>

      {/* Per-layer activation histograms */}
      <div className="mb-4">
        <p className="text-[12px] font-semibold text-white mb-0.5">
          Activations per layer (forward pass)
        </p>
        <p className="text-[11px] text-[#475569] mb-2">
          Histogram of all {DATA_N * WIDTH} post-activation values per layer, shared x-range{" "}
          <span className="font-mono">
            [{fmtStat(analysis.actRange[0])}, {fmtStat(analysis.actRange[1])}]
          </span>
          . Watch the distribution walk layer by layer.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {analysis.layers.map((l, i) => (
            <div key={i} className="rounded-lg border border-[#1e293b] p-1.5">
              <p className="text-[9px] text-[#475569] uppercase tracking-wide mb-1">
                Layer {i + 1}
              </p>
              <Histogram
                counts={l.actHist}
                color="#3bb4a4"
                centerLine={activation === "tanh"}
                label={`Layer ${i + 1} activation histogram, standard deviation ${fmtStat(l.actStd)}`}
              />
              <p className="text-[9px] text-[#94a3b8] mt-1">
                std <span className="font-mono text-[#f1f5f9]">{fmtStat(l.actStd)}</span>
              </p>
              <p className="text-[9px] text-[#475569]">
                {(100 * l.inertFrac).toFixed(0)}% {inertLabel}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Per-layer gradient histograms */}
      <div className="mb-4">
        <p className="text-[12px] font-semibold text-white mb-0.5">
          Gradients per layer (backward pass)
        </p>
        <p className="text-[11px] text-[#475569] mb-2">
          Histogram of dL/d(pre-activation) from a real backward pass of the per-example loss,
          shared symmetric x-range{" "}
          <span className="font-mono">
            [{fmtStat(analysis.gradRange[0])}, {fmtStat(analysis.gradRange[1])}]
          </span>
          . Backprop flows right to left: layer 6 first, layer 1 last.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {analysis.layers.map((l, i) => (
            <div key={i} className="rounded-lg border border-[#1e293b] p-1.5">
              <p className="text-[9px] text-[#475569] uppercase tracking-wide mb-1">
                Layer {i + 1}
              </p>
              <Histogram
                counts={l.gradHist}
                color="#a855f7"
                centerLine
                label={`Layer ${i + 1} gradient histogram, standard deviation ${fmtStat(l.gradStd)}`}
              />
              <p className="text-[9px] text-[#94a3b8] mt-1">
                std <span className="font-mono text-[#f1f5f9]">{fmtStat(l.gradStd)}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Computed verdict line */}
      <div className="rounded-xl border border-[#1e293b] bg-[#162032] p-3.5">
        <p className="text-[11px] text-[#94a3b8] leading-relaxed">
          Gradient std leaves layer 6 at{" "}
          <span className="font-mono text-[#f1f5f9]">{fmtStat(lastGrad)}</span> and arrives at
          layer 1 at <span className="font-mono text-[#f1f5f9]">{fmtStat(firstGrad)}</span>:
          a backward amplification factor of{" "}
          <span className="font-mono text-[var(--color-accent)]">{ratioText}</span> across{" "}
          {DEPTH} layers.{" "}
          {Number.isFinite(ratio) && ratio < 0.01 && "That is a vanishing gradient: the early layers barely learn."}
          {Number.isFinite(ratio) && ratio > 5 && "That is an exploding gradient: the early layers get updates far larger than the late ones."}
          {Number.isFinite(ratio) && ratio >= 0.01 && ratio <= 5 && !forwardCollapsing && "That is a healthy scale: every layer receives a usable learning signal."}
          {Number.isFinite(ratio) && ratio >= 0.01 && ratio <= 5 && forwardCollapsing && (
            <>
              The backward scale survives, but the forward signal is collapsing: activation std
              falls from <span className="font-mono text-[#f1f5f9]">{fmtStat(firstAct)}</span> at
              layer 1 to <span className="font-mono text-[#f1f5f9]">{fmtStat(lastAct)}</span> at
              layer {DEPTH} above.
              {activation === "relu" &&
                " That shrinking signal is exactly what He initialization fixes for ReLU."}
            </>
          )}
          {!Number.isFinite(ratio) && "With all-zero weights nothing flows at all: every neuron computes the same thing and no gradient reaches the hidden layers."}
        </p>
        {activation === "tanh" && (
          <p className="text-[10px] text-[#475569] mt-1.5">
            Saturated = |activation| above {TANH_SAT_THRESHOLD}; there tanh is nearly flat, so
            its derivative kills the gradient.
          </p>
        )}
        {activation === "relu" && (
          <p className="text-[10px] text-[#475569] mt-1.5">
            Zero = the unit output exactly 0 for that input (ReLU off), so no gradient flows
            through it. Around half being zero is expected and healthy for ReLU.
          </p>
        )}
      </div>
    </div>
  );
}
