"use client";

import React, { useMemo } from "react";
import HistogramChart from "./HistogramChart";
import { mean as calcMean, stdDev } from "./types";

interface SamplingVisualizationProps {
  sampleMeans: number[];
  sampleSize: number;
  populationMean: number;
  populationSD: number;
}

export default function SamplingVisualization({
  sampleMeans,
  sampleSize,
  populationMean,
  populationSD,
}: SamplingVisualizationProps) {
  const showOverlay = sampleMeans.length > 20;
  const theoreticalSE = populationSD / Math.sqrt(sampleSize);

  const overlayMean = useMemo(
    () => (sampleMeans.length > 0 ? calcMean(sampleMeans) : populationMean),
    [sampleMeans, populationMean]
  );

  // Dynamic bin count based on sample count
  const binCount = useMemo(() => {
    if (sampleMeans.length < 20) return 10;
    if (sampleMeans.length < 100) return 15;
    if (sampleMeans.length < 500) return 20;
    return 25;
  }, [sampleMeans.length]);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h2 className="text-[13px] font-bold text-white">
          Sampling Distribution of Means
        </h2>
        <span className="text-[11px] font-mono text-[#475569]">
          Samples drawn:{" "}
          <span className="text-[var(--color-accent)] font-bold">{sampleMeans.length}</span>
        </span>
      </div>
      <p className="text-[11px] text-[#475569] mb-3">
        Histogram of the sample means x̄ drawn so far (bar height = how many
        means fall in that bin). Red dashed curve = predicted normal (CLT).
        SE = σ/√n = {theoreticalSE.toFixed(2)}
      </p>

      {sampleMeans.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#1e293b]"
          style={{ height: 180 }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#334155"
            strokeWidth="1.5"
            className="mb-2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 3v18h18M7 16l4-4 4 4 4-4"
            />
          </svg>
          <p className="text-[11px] text-[#334155]">
            Click &quot;Draw 1 Sample&quot; to start
          </p>
        </div>
      ) : (
        <HistogramChart
          data={sampleMeans}
          binCount={binCount}
          width={380}
          height={200}
          barColor="var(--color-accent)"
          showNormalOverlay={showOverlay}
          overlayMean={overlayMean}
          overlaySd={theoreticalSE}
        />
      )}

      {sampleMeans.length > 0 && sampleMeans.length <= 20 && (
        <p className="text-[9px] text-[#475569] mt-1.5">
          Draw {21 - sampleMeans.length} more sample
          {21 - sampleMeans.length === 1 ? "" : "s"} to see the normal curve overlay
        </p>
      )}

      {showOverlay && (
        <div className="flex items-center gap-1.5 mt-2">
          <div className="flex items-center gap-1">
            <svg width="20" height="6">
              <line
                x1="0"
                y1="3"
                x2="20"
                y2="3"
                stroke="#ef4444"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
            </svg>
            <span className="text-[9px] text-[#475569]">Theoretical normal (CLT prediction)</span>
          </div>
          <div className="flex items-center gap-1 ml-3">
            <div className="w-3 h-3 rounded-sm bg-[var(--color-accent)] opacity-70" />
            <span className="text-[9px] text-[#475569]">Empirical sample means</span>
          </div>
        </div>
      )}

      {sampleMeans.length > 0 && (
        <div className="mt-2 text-[9px] text-[#334155] font-mono">
          Observed x̄̄ ={" "}
          <span className="text-[#94a3b8]">{calcMean(sampleMeans).toFixed(2)}</span>
          {" | "}SD ={" "}
          <span className="text-[#94a3b8]">{stdDev(sampleMeans).toFixed(2)}</span>
          {" | "}Predicted SE ={" "}
          <span className="text-[var(--color-accent)]">{theoreticalSE.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
