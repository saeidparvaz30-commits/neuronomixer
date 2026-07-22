"use client";

import React, { useMemo } from "react";
import { DistributionType, generatePopulation, mean, stdDev, computeBins } from "./types";

interface PopCardProps {
  type: DistributionType;
  label: string;
  color: string;
  description: string;
  isSelected: boolean;
  populationData: number[];
  onClick: () => void;
}

const MINI_W = 150;
const MINI_H = 60;
const PAD = { l: 4, r: 4, t: 4, b: 4 };
const IW = MINI_W - PAD.l - PAD.r;
const IH = MINI_H - PAD.t - PAD.b;

function MiniHistogram({ data, color }: { data: number[]; color: string }) {
  const bins = useMemo(() => computeBins(data, 20, 0, 100), [data]);

  if (bins.length === 0) return null;

  return (
    <svg viewBox={`0 0 ${MINI_W} ${MINI_H}`} width="100%" className="block">
      {bins.map((bin, i) => {
        const x = PAD.l + (i / bins.length) * IW;
        const bw = Math.max(IW / bins.length - 0.5, 1);
        const bh = bin.height * IH;
        return (
          <rect
            key={i}
            x={x}
            y={PAD.t + IH - bh}
            width={bw}
            height={bh}
            fill={color}
            opacity="0.75"
            rx="0.5"
          />
        );
      })}
    </svg>
  );
}

function PopCard({
  type,
  label,
  color,
  description,
  isSelected,
  populationData,
  onClick,
}: PopCardProps) {
  const stats = useMemo(() => {
    if (populationData.length === 0) return { mean: 0, sd: 0 };
    return { mean: mean(populationData), sd: stdDev(populationData) };
  }, [populationData]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Select ${label} population`}
      aria-pressed={isSelected}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="rounded-xl p-3 cursor-pointer transition-all select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3bb4a4]"
      style={{
        border: isSelected ? `2px solid #3bb4a4` : "1px solid #1e293b",
        background: isSelected ? "rgba(59,180,164,0.06)" : "#0f172a",
        marginTop: isSelected ? 0 : 1,
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-bold" style={{ color: isSelected ? "#3bb4a4" : color }}>
          {label}
        </span>
        {isSelected && (
          <span className="text-[9px] font-semibold text-[#3bb4a4] uppercase tracking-wider">
            Selected
          </span>
        )}
      </div>

      <div className="mb-1.5 rounded overflow-hidden" style={{ background: "#0a0e1a" }}>
        <MiniHistogram data={populationData} color={color} />
      </div>

      <p className="text-[9px] text-[#475569] leading-relaxed line-clamp-2">{description}</p>
      <p className="text-[9px] text-[#334155] mt-1 font-mono">
        μ={stats.mean.toFixed(1)} σ={stats.sd.toFixed(1)}
      </p>
    </div>
  );
}

// ── Distribution configs ───────────────────────────────────────────────────────

export const DIST_CONFIGS: Record<
  DistributionType,
  { label: string; color: string; description: string }
> = {
  normal: {
    label: "Normal",
    color: "#3bb4a4",
    description: "Bell-shaped, symmetric. Mean and median coincide. Most natural measurements follow this.",
  },
  uniform: {
    label: "Uniform",
    color: "var(--color-accent)",
    description: "Every value equally likely. Flat histogram, no center tendency.",
  },
  skewed: {
    label: "Skewed Right",
    color: "#ef4444",
    description: "Steep peak near zero with a long right tail. Models wait times, income distributions.",
  },
  bimodal: {
    label: "Bimodal",
    color: "#a855f7",
    description: "Two distinct peaks at ~30 and ~70. Represents two mixed sub-populations.",
  },
};

// ── Main component ────────────────────────────────────────────────────────────

interface PopulationPanelProps {
  selectedDistribution: DistributionType;
  populationData: number[];
  onSelect: (type: DistributionType, data: number[]) => void;
}

const DIST_ORDER: DistributionType[] = ["normal", "uniform", "skewed", "bimodal"];

export default function PopulationPanel({
  selectedDistribution,
  populationData,
  onSelect,
}: PopulationPanelProps) {
  // Pre-generate preview data for non-selected distributions (stable across renders)
  const previewData = useMemo(() => {
    const map: Partial<Record<DistributionType, number[]>> = {};
    for (const d of DIST_ORDER) {
      if (d !== selectedDistribution) {
        map[d] = generatePopulation(d, 500);
      }
    }
    return map;
  // Only regenerate when selected distribution changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDistribution]);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <h2 className="text-[13px] font-bold text-white mb-1">Population Shape</h2>
      <p className="text-[11px] text-[#475569] mb-4">
        Choose a population. Each has a very different shape, but sample means will always converge.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {DIST_ORDER.map((type) => {
          const data =
            type === selectedDistribution ? populationData : previewData[type] ?? [];
          return (
            <PopCard
              key={type}
              type={type}
              label={DIST_CONFIGS[type].label}
              color={DIST_CONFIGS[type].color}
              description={DIST_CONFIGS[type].description}
              isSelected={type === selectedDistribution}
              populationData={data}
              onClick={() => {
                const newData =
                  type === selectedDistribution
                    ? populationData
                    : generatePopulation(type, 500);
                onSelect(type, newData);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
