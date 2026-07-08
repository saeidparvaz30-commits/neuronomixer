"use client";

import React from "react";
import { ConfidenceLevel, computeMOE } from "./types";

interface Props {
  sampleSize: number;
  moe: number;
  se: number;
  confidenceLevel: ConfidenceLevel;
  p: number;
  nonResponseRate: number;
  costPerSurvey: number;
  onNonResponseChange: (v: number) => void;
  onCostChange: (v: number) => void;
}

export default function ResultsDisplay({
  sampleSize,
  moe,
  se,
  confidenceLevel,
  p,
  nonResponseRate,
  costPerSurvey,
  onNonResponseChange,
  onCostChange,
}: Props) {
  const actualMOE = computeMOE(sampleSize, confidenceLevel, p);
  const totalCost = sampleSize * costPerSurvey;
  const adjustedN = Math.ceil(sampleSize / (1 - nonResponseRate));
  const daysNeeded = Math.ceil(sampleSize / 100);

  function formatNum(n: number): string {
    return n.toLocaleString("en-US");
  }

  function formatCurrency(n: number): string {
    return n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  }

  return (
    <div
      className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-5"
      role="region"
      aria-live="polite"
      aria-label="Sample size calculation results"
    >
      {/* Big result */}
      <div className="text-center py-4 rounded-xl bg-[#1e293b]/50 border border-[#d4af37]/20">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-1">
          Required Sample Size
        </p>
        <p className="text-5xl font-black text-[var(--color-accent)] tabular-nums">
          {formatNum(sampleSize)}
        </p>
        <p className="text-[12px] text-[#94a3b8] mt-2 max-w-[300px] mx-auto leading-relaxed">
          Survey {formatNum(sampleSize)} people to estimate the proportion
          within ±{moe}% with {confidenceLevel}% confidence
        </p>
      </div>

      {/* Secondary stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-[#1e293b]/40 p-3 text-center">
          <p className="text-[10px] text-[#94a3b8] mb-1">Standard Error</p>
          <p className="text-[14px] font-bold text-white">
            {(se * 100).toFixed(3)}%
          </p>
        </div>
        <div className="rounded-xl bg-[#1e293b]/40 p-3 text-center">
          <p className="text-[10px] text-[#94a3b8] mb-1">Actual MOE</p>
          <p className="text-[14px] font-bold text-[#3bb4a4]">
            ±{actualMOE}%
          </p>
        </div>
        <div className="rounded-xl bg-[#1e293b]/40 p-3 text-center">
          <p className="text-[10px] text-[#94a3b8] mb-1">p(1-p)</p>
          <p className="text-[14px] font-bold text-white">
            {(p * (1 - p)).toFixed(4)}
          </p>
        </div>
      </div>

      {/* Formula */}
      <div className="rounded-xl bg-[#1e293b]/30 border border-white/[0.05] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#475569] mb-1.5">
          Formula
        </p>
        <p className="text-[12px] font-mono text-[#94a3b8]">
          n = z² × p(1−p) / MOE²
        </p>
      </div>

      <div className="border-t border-white/[0.06] pt-4 space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
          Practical Estimates
        </p>

        {/* Cost */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <label
              htmlFor="cost-input"
              className="text-[12px] text-[#94a3b8] block mb-1"
            >
              Cost per survey ($)
            </label>
            <input
              id="cost-input"
              type="number"
              min={1}
              max={10000}
              value={costPerSurvey}
              onChange={(e) =>
                onCostChange(Math.max(1, parseInt(e.target.value, 10) || 1))
              }
              className="w-24 bg-[#1e293b] border border-white/10 rounded-lg px-3 py-1.5 text-[12px] text-white focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          </div>
          <div className="text-right">
            <p className="text-[11px] text-[#94a3b8]">Total budget</p>
            <p className="text-[16px] font-bold text-[var(--color-accent)]">
              {formatCurrency(totalCost)}
            </p>
          </div>
        </div>

        {/* Non-response rate */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="nonresponse-slider"
              className="text-[12px] text-[#94a3b8]"
            >
              Non-response rate
            </label>
            <span className="text-[13px] font-bold text-white">
              {Math.round(nonResponseRate * 100)}%
            </span>
          </div>
          <input
            id="nonresponse-slider"
            type="range"
            min={0}
            max={50}
            step={5}
            value={Math.round(nonResponseRate * 100)}
            onChange={(e) =>
              onNonResponseChange(parseInt(e.target.value, 10) / 100)
            }
            className="w-full accent-[#3bb4a4] cursor-pointer"
            aria-label="Non-response rate"
            aria-valuenow={Math.round(nonResponseRate * 100)}
            aria-valuemin={0}
            aria-valuemax={50}
          />
          <div className="flex justify-between text-[10px] text-[#475569] mt-0.5">
            <span>0%</span>
            <span>50%</span>
          </div>
        </div>

        {/* Adjusted stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#1e293b]/40 p-3">
            <p className="text-[10px] text-[#94a3b8] mb-1">
              Adjusted contacts needed
            </p>
            <p className="text-[15px] font-bold text-white">
              {formatNum(adjustedN)}
            </p>
            <p className="text-[10px] text-[#475569]">
              with {Math.round(nonResponseRate * 100)}% non-response
            </p>
          </div>
          <div className="rounded-xl bg-[#1e293b]/40 p-3">
            <p className="text-[10px] text-[#94a3b8] mb-1">Time estimate</p>
            <p className="text-[15px] font-bold text-white">
              {daysNeeded} {daysNeeded === 1 ? "day" : "days"}
            </p>
            <p className="text-[10px] text-[#475569]">at 100 surveys / day</p>
          </div>
        </div>
      </div>
    </div>
  );
}
