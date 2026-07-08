"use client";

import React from "react";
import HistogramChart from "./HistogramChart";
import type { DistributionType } from "./types";

interface ComparisonViewProps {
  populationData: number[];
  sampleMeans: number[];
  distributionType: DistributionType;
  sampleSize: number;
}

function getInsightText(count: number): { text: string; color: string } {
  if (count === 0)
    return { text: "Draw samples to see the pattern emerge...", color: "#475569" };
  if (count < 10)
    return { text: "Starting to take shape...", color: "#94a3b8" };
  if (count < 100)
    return { text: "Notice the bell curve emerging!", color: "#3bb4a4" };
  if (count < 1000)
    return { text: "The CLT in action! Converging to normal!", color: "var(--color-accent)" };
  return {
    text: "1000 samples: the distribution of means is now close to normal, whatever the population shape.",
    color: "#a855f7",
  };
}

const DIST_COLORS: Record<DistributionType, string> = {
  normal: "#3bb4a4",
  uniform: "var(--color-accent)",
  skewed: "#ef4444",
  bimodal: "#a855f7",
};

const DIST_LABELS: Record<DistributionType, string> = {
  normal: "Normal",
  uniform: "Uniform",
  skewed: "Skewed Right",
  bimodal: "Bimodal",
};

export default function ComparisonView({
  populationData,
  sampleMeans,
  distributionType,
  sampleSize,
}: ComparisonViewProps) {
  const { text, color } = getInsightText(sampleMeans.length);
  const popColor = DIST_COLORS[distributionType];

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-[13px] font-bold text-white">Side-by-Side Comparison</h2>
        <span
          className="text-[11px] font-semibold transition-colors duration-500"
          style={{ color }}
        >
          {text}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Population Distribution */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: popColor }}
            />
            <p className="text-[10px] font-semibold text-[#94a3b8]">
              Population ({DIST_LABELS[distributionType]})
            </p>
          </div>
          <div className="rounded-xl overflow-hidden bg-[#0a0e1a] border border-[#1e293b]">
            <HistogramChart
              data={populationData}
              binCount={20}
              width={200}
              height={120}
              barColor={popColor}
              fixedMin={0}
              fixedMax={100}
            />
          </div>
          <p className="text-[8px] text-[#334155] mt-1">N = {populationData.length}</p>
        </div>

        {/* Sampling Distribution */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0 bg-[var(--color-accent)]" />
            <p className="text-[10px] font-semibold text-[#94a3b8]">
              Sample Means (n={sampleSize})
            </p>
          </div>
          <div className="rounded-xl overflow-hidden bg-[#0a0e1a] border border-[#1e293b]">
            {sampleMeans.length === 0 ? (
              <div
                className="flex items-center justify-center"
                style={{ height: 120 }}
              >
                <p className="text-[9px] text-[#334155]">Draw samples →</p>
              </div>
            ) : (
              <HistogramChart
                data={sampleMeans}
                binCount={15}
                width={200}
                height={120}
                barColor="var(--color-accent)"
              />
            )}
          </div>
          <p className="text-[8px] text-[#334155] mt-1">
            {sampleMeans.length} means collected
          </p>
        </div>
      </div>

      {/* Visual shape difference callout */}
      {sampleMeans.length >= 30 && distributionType !== "normal" && (
        <div className="mt-3 rounded-xl p-2.5 border border-[#3bb4a4]/20 bg-[#3bb4a4]/5">
          <p className="text-[10px] text-[#3bb4a4] leading-relaxed">
            <span className="font-bold">Key insight: </span>
            The population is <span className="italic">{DIST_LABELS[distributionType].toLowerCase()}</span>,
            but the sampling distribution of means is becoming symmetric and bell-shaped.
            This is the Central Limit Theorem at work.
          </p>
        </div>
      )}
    </div>
  );
}
