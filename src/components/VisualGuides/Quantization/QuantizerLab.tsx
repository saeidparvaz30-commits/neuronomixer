"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import HistogramChart from "./HistogramChart";
import {
  BIT_WIDTHS,
  computeHistogram,
  formatSmall,
  maxAbs,
  rms,
  type BitWidth,
  type QuantizationResult,
} from "./types";

interface Props {
  weights: number[];
  bits: BitWidth;
  exploredBits: Set<BitWidth>;
  resultsByBits: Record<BitWidth, QuantizationResult>;
  onBitsChange: (b: BitWidth) => void;
}

const BIN_COUNT = 41;

export default function QuantizerLab({
  weights,
  bits,
  exploredBits,
  resultsByBits,
  onBitsChange,
}: Props) {
  const range = useMemo(() => maxAbs(weights) * 1.02, [weights]);
  const weightRms = useMemo(() => rms(weights), [weights]);
  const weightBins = useMemo(
    () => computeHistogram(weights, -range, range, BIN_COUNT),
    [weights, range]
  );

  const active = resultsByBits[bits];

  const quantBins = useMemo(
    () => computeHistogram(active.dequantized, -range, range, BIN_COUNT),
    [active, range]
  );
  const errorBins = useMemo(
    () => computeHistogram(active.errors, -range, range, BIN_COUNT),
    [active, range]
  );

  const errPct = (active.rmsError / weightRms) * 100;
  const zeroPct = active.zeroShare * 100;
  const destructive = bits <= 3;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
      {/* Bit-width radiogroup */}
      <div className="mb-5">
        <p className="text-[12px] font-semibold text-[#94a3b8] mb-2">Target precision</p>
        <div
          role="radiogroup"
          aria-label="Quantization bit width"
          className="inline-flex flex-wrap rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1"
        >
          {BIT_WIDTHS.map((b) => {
            const isActive = bits === b;
            const explored = exploredBits.has(b);
            return (
              <button
                key={b}
                role="radio"
                aria-checked={isActive}
                aria-label={`${b}-bit quantization${explored ? ", explored" : ""}`}
                onClick={() => onBitsChange(b)}
                className={`relative px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] ${
                  isActive ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="quant-bits-pill"
                    className="absolute inset-0 rounded-lg"
                    style={{ background: "var(--color-accent)" }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">
                  {b}-bit
                  {explored && !isActive && (
                    <span className="ml-1.5 text-[10px]" style={{ color: "var(--color-success)" }}>
                      ✓
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Computed stats for active bit width */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Representable levels", value: String(active.levels) },
          { label: "Step size (scale)", value: formatSmall(active.scale) },
          { label: "RMS error", value: formatSmall(active.rmsError) },
          { label: "Error / weight RMS", value: `${errPct.toFixed(1)}%` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#1e293b] p-3">
            <p className="text-[10px] text-[#475569] mb-1">{s.label}</p>
            <p className="text-[15px] font-mono font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Weight histograms: original vs dequantized */}
      <div className="mb-2">
        <p className="text-[12px] font-semibold text-white mb-1">
          Weight distribution: original vs {bits}-bit reconstruction
        </p>
        <p className="text-[11px] text-[#475569] mb-3 leading-relaxed">
          2,000 deterministic bell-shaped weights. After quantization every weight snaps to one of{" "}
          {active.levels} levels spaced {formatSmall(active.scale)} apart, so the gold bars collapse
          onto a grid as the bit width drops.
        </p>
        <HistogramChart
          series={[
            { label: "Original weights", color: "#3bb4a4", bins: weightBins },
            { label: `${bits}-bit reconstruction`, color: "var(--color-accent)", bins: quantBins },
          ]}
          xMin={-range}
          xMax={range}
          ariaLabel={`Overlaid histograms of original weights and their ${bits}-bit reconstruction. The reconstruction uses ${active.levels} levels with step size ${formatSmall(active.scale)}.`}
        />
      </div>

      {/* Error histogram */}
      <div className="mt-5">
        <p className="text-[12px] font-semibold text-white mb-1">Quantization error</p>
        <p className="text-[11px] text-[#475569] mb-3 leading-relaxed">
          Original minus reconstructed, plotted on the same axis range as the weights above. At 8
          bits the error is a needle at zero; at 2 bits it spreads across a large share of the
          weight range.
        </p>
        <HistogramChart
          series={[
            { label: "Error (original - reconstructed)", color: "var(--color-warning)", bins: errorBins },
          ]}
          xMin={-range}
          xMax={range}
          height={140}
          ariaLabel={`Histogram of quantization error at ${bits} bits. RMS error ${formatSmall(active.rmsError)}, which is ${errPct.toFixed(1)} percent of the weight RMS. Maximum absolute error ${formatSmall(active.maxAbsError)}.`}
        />
      </div>

      {/* Text equivalent of the charts */}
      <p className="mt-4 text-[12px] text-[#94a3b8] leading-relaxed">
        At {bits}-bit: RMS error {formatSmall(active.rmsError)}, which is {errPct.toFixed(1)}% of
        the weight RMS ({formatSmall(weightRms)}). Largest single-weight error:{" "}
        {formatSmall(active.maxAbsError)}.{" "}
        <span style={{ color: destructive ? "var(--color-warning)" : "var(--color-success)" }}>
          {zeroPct.toFixed(1)}% of all weights snap to exactly zero
          {destructive ? ", destructive territory." : ", negligible."}
        </span>
      </p>

      {/* RMS error per bit width, all computed */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-[12px]" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="bg-[#1e293b] text-left">
              <th className="px-3 py-2 font-semibold text-[#94a3b8]">Bit width</th>
              <th className="px-3 py-2 font-semibold text-[#94a3b8]">Levels</th>
              <th className="px-3 py-2 font-semibold text-[#94a3b8]">Step size</th>
              <th className="px-3 py-2 font-semibold text-[#94a3b8]">RMS error</th>
              <th className="px-3 py-2 font-semibold text-[#94a3b8]">vs 8-bit</th>
            </tr>
          </thead>
          <tbody>
            {BIT_WIDTHS.map((b, i) => {
              const r = resultsByBits[b];
              const ratio = r.rmsError / resultsByBits[8].rmsError;
              const isActive = b === bits;
              return (
                <tr
                  key={b}
                  className={i % 2 === 0 ? "bg-[#0f172a]" : "bg-[#162032]"}
                  aria-current={isActive ? "true" : undefined}
                >
                  <td
                    className="px-3 py-2 font-mono font-semibold"
                    style={{ color: isActive ? "var(--color-accent)" : "#f1f5f9" }}
                  >
                    {b}-bit{isActive ? " (selected)" : ""}
                  </td>
                  <td className="px-3 py-2 font-mono text-[#94a3b8]">{r.levels}</td>
                  <td className="px-3 py-2 font-mono text-[#94a3b8]">{formatSmall(r.scale)}</td>
                  <td className="px-3 py-2 font-mono text-[#94a3b8]">{formatSmall(r.rmsError)}</td>
                  <td className="px-3 py-2 font-mono text-[#94a3b8]">
                    {ratio >= 10 ? ratio.toFixed(0) : ratio.toFixed(1)}×
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
