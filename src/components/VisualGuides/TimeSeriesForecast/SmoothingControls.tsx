"use client";

import React, { useState } from "react";
import TimeSeriesPlot from "./TimeSeriesPlot";

interface Props {
  values: number[];
  labels: string[];
  maWindow: number;
  alpha: number;
  maSmoothed: number[];
  esSmoothed: number[];
  onMaChange: (w: number) => void;
  onAlphaChange: (a: number) => void;
  onSmoothingAdjusted: () => void;
}

export default function SmoothingControls({
  values,
  labels,
  maWindow,
  alpha,
  maSmoothed,
  esSmoothed,
  onMaChange,
  onAlphaChange,
  onSmoothingAdjusted,
}: Props) {
  const [firedOnce, setFiredOnce] = useState(false);

  function handleMaChange(w: number) {
    onMaChange(w);
    if (!firedOnce) {
      setFiredOnce(true);
      onSmoothingAdjusted();
    }
  }

  function handleAlphaChange(a: number) {
    onAlphaChange(a);
    if (!firedOnce) {
      setFiredOnce(true);
      onSmoothingAdjusted();
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Moving Average */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[13px] font-semibold text-white">Moving Average</p>
            <p className="text-[11px] text-[#475569] mt-0.5">
              Smooths out short-term fluctuations
            </p>
          </div>
          <span className="text-[13px] font-mono font-bold text-[#3bb4a4] bg-[#3bb4a4]/10 px-3 py-1 rounded-lg">
            w = {maWindow}
          </span>
        </div>

        <div className="mb-4">
          <input
            type="range"
            min={3}
            max={24}
            step={1}
            value={maWindow}
            onChange={(e) => handleMaChange(Number(e.target.value))}
            aria-label="Moving average window in months"
            className="w-full accent-[#3bb4a4]"
          />
          <div className="flex justify-between text-[10px] text-[#475569] mt-0.5">
            <span>3 months</span>
            <span>24 months</span>
          </div>
        </div>

        <div className="mb-3">
          <TimeSeriesPlot
            values={values}
            labels={labels}
            color="#334155"
            height={160}
            overlayValues={maSmoothed}
            overlayColor="#3bb4a4"
          />
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded bg-[#475569]" />
            <span className="text-[#475569]">Original</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded bg-[#3bb4a4]" />
            <span className="text-[#3bb4a4]">MA({maWindow})</span>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-[#475569] leading-relaxed">
          A larger window produces a smoother line but introduces more lag.
          Small windows track the data closely but retain noise.
        </p>
      </div>

      {/* Exponential Smoothing */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[13px] font-semibold text-white">Exponential Smoothing</p>
            <p className="text-[11px] text-[#475569] mt-0.5">
              Weights recent data more heavily
            </p>
          </div>
          <span className="text-[13px] font-mono font-bold text-[var(--color-accent)] bg-[#d4af37]/10 px-3 py-1 rounded-lg">
            α = {alpha.toFixed(2)}
          </span>
        </div>

        <div className="mb-4">
          <input
            type="range"
            min={0.05}
            max={0.95}
            step={0.05}
            value={alpha}
            onChange={(e) => handleAlphaChange(Number(e.target.value))}
            aria-label="Exponential smoothing alpha"
            className="w-full accent-[var(--color-accent)]"
          />
          <div className="flex justify-between text-[10px] text-[#475569] mt-0.5">
            <span>α=0.05 (slow)</span>
            <span>α=0.95 (fast)</span>
          </div>
        </div>

        <div className="mb-3">
          <TimeSeriesPlot
            values={values}
            labels={labels}
            color="#334155"
            height={160}
            overlayValues={esSmoothed}
            overlayColor="var(--color-accent)"
          />
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded bg-[#475569]" />
            <span className="text-[#475569]">Original</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded bg-[var(--color-accent)]" />
            <span className="text-[var(--color-accent)]">ES(α={alpha.toFixed(2)})</span>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-[#475569] leading-relaxed">
          ES[t] = α · y[t] + (1−α) · ES[t−1]. High α reacts quickly to changes
          but stays noisy. Low α is smoother but slow to adapt.
        </p>
      </div>
    </div>
  );
}
