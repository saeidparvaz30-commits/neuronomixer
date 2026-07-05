"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Distribution } from "./types";

interface Props {
  distributions: Distribution[];
  withBN: boolean;
}

const BIN_COUNT = 8;

function LayerHistogram({ dist, withBN }: { dist: Distribution; withBN: boolean }) {
  const values = dist.values;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // True histogram: bin the activations, bar height = count in bin
  const bins = new Array<number>(BIN_COUNT).fill(0);
  for (const v of values) {
    const idx = Math.min(BIN_COUNT - 1, Math.floor(((v - min) / range) * BIN_COUNT));
    bins[idx] += 1;
  }
  const maxCount = Math.max(...bins, 1);

  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      <div className="text-xs font-semibold text-[#94a3b8]">Layer {dist.layer}</div>

      {/* Histogram bars: x = activation value bin, height = frequency */}
      <div className="flex items-end gap-[2px] h-20 w-full">
        <AnimatePresence mode="wait">
          {bins.map((count, i) => {
            const heightPct = (count / maxCount) * 100;
            const binCenter = min + ((i + 0.5) / BIN_COUNT) * range;
            const normalizedPos = Math.abs(binCenter - dist.mean) / (dist.std || 1);
            // Color: strong near mean, fades toward extremes
            const alpha = Math.max(0.2, 1 - normalizedPos * 0.5);
            const barColor = withBN
              ? `rgba(59,180,164,${alpha})`
              : `rgba(168,85,247,${alpha * 0.8})`;

            return (
              <motion.div
                key={`${withBN}-${i}`}
                className="flex-1 rounded-sm min-h-[3px]"
                style={{ backgroundColor: barColor }}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(4, heightPct)}%` }}
                transition={{ duration: 0.4, delay: i * 0.02, ease: "easeOut" }}
              />
            );
          })}
        </AnimatePresence>
      </div>

      {/* Stats (computed from the 20 sampled activations shown) */}
      <div className="text-[10px] text-[#94a3b8] font-mono">
        μ = {dist.mean.toFixed(2)}, σ = {dist.std.toFixed(2)}
      </div>
    </div>
  );
}

export default function DistributionDisplay({ distributions, withBN }: Props) {
  return (
    <div
      className="rounded-2xl border p-4 sm:p-6 transition-all duration-500"
      style={{
        background: withBN ? "rgba(59,180,164,0.06)" : "rgba(239,68,68,0.06)",
        borderColor: withBN ? "rgba(59,180,164,0.25)" : "rgba(239,68,68,0.25)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: withBN ? "#3bb4a4" : "#ef4444" }}
        />
        <span
          className="text-sm font-bold"
          style={{ color: withBN ? "#3bb4a4" : "#ef4444" }}
        >
          {withBN ? "With Batch Norm: distributions stabilized" : "Without Batch Norm: distributions shift each layer"}
        </span>
      </div>

      {/* Layer distributions */}
      <div className="flex gap-3 sm:gap-5">
        {distributions.map((dist) => (
          <LayerHistogram key={dist.layer} dist={dist} withBN={withBN} />
        ))}
      </div>

      {/* Annotation */}
      <p className="mt-4 text-xs text-[#94a3b8] leading-relaxed">
        {withBN
          ? "All four layers maintain a similar distribution (μ≈0, σ≈1), making gradient flow stable."
          : `Each layer develops a different distribution (layer 4 here has μ=${distributions[3]?.mean.toFixed(2)}, σ=${distributions[3]?.std.toFixed(2)}), forcing subsequent layers to constantly re-adapt.`}
      </p>
    </div>
  );
}
