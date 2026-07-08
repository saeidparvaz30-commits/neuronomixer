"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { DatasetId, NonparametricData, DATASETS } from "./types";

interface Props {
  selectedDataset: DatasetId;
  onSelect: (id: DatasetId) => void;
}

const BADGE_MAP: Record<DatasetId, { label: string; color: string }> = {
  skewed: { label: "Violates normality", color: "bg-[#ec4899]/20 text-[#ec4899] border border-[#ec4899]/30" },
  ordinal: { label: "Not continuous", color: "bg-[#d4af37]/20 text-[var(--color-accent)] border border-[#d4af37]/30" },
  "small-sample": { label: "n=12", color: "bg-white/10 text-[#94a3b8] border border-white/10" },
  outliers: { label: "Sensitive to outliers", color: "bg-[#ec4899]/20 text-[#ec4899] border border-[#ec4899]/30" },
};

function MiniHistogram({ values }: { values: number[] }) {
  const W = 50, H = 30, BINS = 10;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const bins = Array.from({ length: BINS }, () => 0);
  values.forEach((v) => {
    const idx = Math.min(BINS - 1, Math.floor(((v - min) / range) * BINS));
    bins[idx]++;
  });
  const maxCount = Math.max(...bins, 1);
  const barW = W / BINS;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="opacity-60">
      {bins.map((count, i) => {
        const bh = (count / maxCount) * (H - 2);
        return (
          <rect
            key={i}
            x={i * barW + 0.5}
            y={H - bh - 1}
            width={barW - 1}
            height={bh}
            fill="#1e5d8a"
            rx={0.5}
          />
        );
      })}
    </svg>
  );
}

function DataTable({ dataset }: { dataset: NonparametricData }) {
  const preview = useMemo(() => dataset.values.slice(0, 10), [dataset.values]);
  const isPaired = !!(dataset.before && dataset.after);

  return (
    <div className="mt-4">
      <p className="text-[11px] text-[#94a3b8] mb-2 font-medium">
        n={dataset.values.length} observations · showing first 10
      </p>
      <div className="overflow-x-auto rounded-xl border border-[#1e293b]">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-[#1e293b]">
              <th className="text-left px-3 py-1.5 text-[#94a3b8] font-medium">Index</th>
              {isPaired ? (
                <>
                  <th className="text-right px-3 py-1.5 text-[#94a3b8] font-medium">Before</th>
                  <th className="text-right px-3 py-1.5 text-[#94a3b8] font-medium">After</th>
                  <th className="text-right px-3 py-1.5 text-[#94a3b8] font-medium">Diff</th>
                </>
              ) : dataset.group1 && dataset.group2 ? (
                <>
                  <th className="text-right px-3 py-1.5 text-[#94a3b8] font-medium">Group 1</th>
                  <th className="text-right px-3 py-1.5 text-[#94a3b8] font-medium">Group 2</th>
                </>
              ) : (
                <th className="text-right px-3 py-1.5 text-[#94a3b8] font-medium">Value</th>
              )}
            </tr>
          </thead>
          <tbody>
            {preview.map((_, i) => (
              <tr key={i} className="border-b border-[#1e293b]/50 last:border-0 hover:bg-[#1e293b]/30">
                <td className="px-3 py-1 text-[#475569] font-mono">{i + 1}</td>
                {isPaired ? (
                  <>
                    <td className="px-3 py-1 text-right font-mono text-white">
                      {dataset.before![i] ?? "—"}
                    </td>
                    <td className="px-3 py-1 text-right font-mono text-white">
                      {dataset.after![i] ?? "—"}
                    </td>
                    <td className="px-3 py-1 text-right font-mono text-[#94a3b8]">
                      {dataset.before![i] !== undefined && dataset.after![i] !== undefined
                        ? (dataset.before![i] - dataset.after![i]).toFixed(1)
                        : "—"}
                    </td>
                  </>
                ) : dataset.group1 && dataset.group2 ? (
                  <>
                    <td className="px-3 py-1 text-right font-mono text-white">
                      {dataset.group1[i] ?? "—"}
                    </td>
                    <td className="px-3 py-1 text-right font-mono text-white">
                      {dataset.group2[i] ?? "—"}
                    </td>
                  </>
                ) : (
                  <td className="px-3 py-1 text-right font-mono text-white">
                    {dataset.values[i]}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DataLoader({ selectedDataset, onSelect }: Props) {
  const current = DATASETS.find((d) => d.id === selectedDataset)!;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <h3 className="text-[13px] font-bold text-white mb-1">Select Dataset</h3>
      <p className="text-[11px] text-[#94a3b8] mb-4">
        Each dataset exhibits a different reason to prefer nonparametric methods.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Select dataset">
        {DATASETS.map((ds) => {
          const badge = BADGE_MAP[ds.id];
          const active = ds.id === selectedDataset;
          return (
            <motion.button
              key={ds.id}
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(ds.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-colors ${
                active
                  ? "border-[var(--color-accent)] bg-[#d4af37]/5"
                  : "border-[#1e293b] hover:border-[#334155]"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="datasetHighlight"
                  className="absolute inset-0 rounded-xl border border-[#d4af37]/50"
                  transition={{ duration: 0.2 }}
                />
              )}
              <MiniHistogram values={ds.values} />
              <span className="text-[11px] font-semibold text-white leading-tight">{ds.label}</span>
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${badge.color}`}>
                {badge.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      <DataTable dataset={current} />
    </div>
  );
}
