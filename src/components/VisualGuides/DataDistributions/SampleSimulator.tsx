"use client";

import React, { useState, useTransition } from "react";
import {
  DistributionType,
  NormalParams,
  UniformParams,
  ExponentialParams,
  PoissonParams,
  SAMPLE_SIZES,
  generateSamples,
  DIST_LABELS,
} from "./types";

interface Props {
  dist: DistributionType;
  params: NormalParams | UniformParams | ExponentialParams | PoissonParams;
  currentSampleSize: number;
  onSampleSizeChange: (n: number) => void;
  onSamplesDrawn: (data: number[]) => void;
  empiricalVisible: boolean;
  drewSamples: boolean;
}

export default function SampleSimulator({
  dist, params,
  currentSampleSize, onSampleSizeChange,
  onSamplesDrawn,
  empiricalVisible,
  drewSamples,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string>("");

  function handleDraw() {
    setStatus(`Drawing ${currentSampleSize.toLocaleString()} samples…`);
    startTransition(() => {
      const data = generateSamples(dist, params, currentSampleSize);
      onSamplesDrawn(data);
      setStatus("");
    });
  }

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-1">
          Sample Simulator
        </p>
        <p className="text-[12px] text-[#94a3b8] leading-relaxed">
          Draw random samples from the <span className="text-white font-semibold">{DIST_LABELS[dist]}</span> distribution
          and overlay the empirical histogram on the theoretical curve.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[11px] text-[#475569]">Sample size:</span>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Sample size">
          {SAMPLE_SIZES.map(n => (
            <button
              key={n}
              role="radio"
              aria-checked={currentSampleSize === n}
              onClick={() => onSampleSizeChange(n)}
              className="px-3 py-1 rounded-lg text-[11px] font-semibold border transition-colors"
              style={{
                borderColor: currentSampleSize === n ? "var(--color-accent)" : "#1e293b",
                color:       currentSampleSize === n ? "var(--color-accent)" : "#475569",
              }}
            >
              {n.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleDraw}
          disabled={isPending}
          className="px-4 py-2 rounded-xl text-[12px] font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Drawing…" : "Draw Random Samples"}
        </button>
        {status && (
          <span className="text-[11px] text-[#94a3b8] animate-pulse">{status}</span>
        )}
        {drewSamples && !isPending && empiricalVisible && (
          <span className="text-[11px] text-[#3bb4a4] flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Showing {currentSampleSize.toLocaleString()} samples
          </span>
        )}
      </div>

      {drewSamples && (
        <div
          className="rounded-xl p-3 text-[11px] text-[#94a3b8] leading-relaxed"
          style={{ background: "#3bb4a418", border: "1px solid #3bb4a430" }}
        >
          <span className="font-semibold text-[#3bb4a4]">Law of Large Numbers: </span>
          As you draw more samples, the empirical distribution (transparent bars) converges to the
          theoretical (solid bars). Try n=50 vs n=5000 to see the difference.
        </div>
      )}
    </div>
  );
}
