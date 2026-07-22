"use client";

import React from "react";
import { MethodType, METHOD_META, DIGIT_COLORS } from "./data";
import { INPUT_DIM } from "./digitsDataset";
import { PC_PAIRS } from "./ParameterSliders";

// All values derived from the actual dataset constants, not hardcoded:
// 64 -> 2 dims removes 1 - 2/64 = 96.9%; 64/2 = 32x fewer numbers per image.
const REDUCTION_PCT = ((1 - 2 / INPUT_DIM) * 100).toFixed(1);
const COMPRESSION = INPUT_DIM / 2;
const MNIST_DIM = 28 * 28;
const MNIST_REDUCTION_PCT = ((1 - 2 / MNIST_DIM) * 100).toFixed(1);

const STATS = [
  { label: "Original dims", value: `${INPUT_DIM}D`, note: "8×8 pixel digit image" },
  { label: "Reduced dims", value: "2D", note: "Viewable in a scatter plot" },
  { label: "Reduction", value: `${REDUCTION_PCT}%`, note: "Of dimensions removed" },
  { label: "Compression", value: `${COMPRESSION}×`, note: "Fewer numbers per image" },
];

interface Props {
  method: MethodType;
  /** live explained-variance ratios from the in-browser PCA (PC1..PC3) */
  explainedRatio: number[];
  /** index into PC_PAIRS: which component pair is currently on screen */
  pairIndex: number;
}

export default function DimensionInfo({ method, explainedRatio, pairIndex }: Props) {
  const meta = METHOD_META[method];
  const [pcA, pcB] = PC_PAIRS[pairIndex];
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
        Compression Stats
      </p>
      <div className="grid grid-cols-2 gap-2">
        {STATS.map(s => (
          <div key={s.label} className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3">
            <p className="text-[18px] font-black" style={{ color: meta.color }}>{s.value}</p>
            <p className="text-[10px] font-semibold text-white mt-0.5">{s.label}</p>
            <p className="text-[9px] text-[#475569] mt-0.5">{s.note}</p>
          </div>
        ))}
      </div>

      {method === "pca" && explainedRatio.length >= 3 && (
        <p className="text-[10px] text-[#94a3b8] leading-relaxed">
          PC{pcA + 1} + PC{pcB + 1} on screen capture{" "}
          <span className="font-semibold" style={{ color: meta.color }}>
            {((explainedRatio[pcA] + explainedRatio[pcB]) * 100).toFixed(1)}%
          </span>{" "}
          of the total variance of the selected digits (computed live). The rest is lost
          in the projection, which is why classes overlap.
        </p>
      )}

      <p className="text-[9px] text-[#475569] leading-relaxed">
        This guide uses scikit-learn&apos;s 8×8 digits dataset. Full-size MNIST images are
        28×28 = {MNIST_DIM}D, so reducing those to 2D removes {MNIST_REDUCTION_PCT}% of dimensions.
      </p>

      {/* Digit legend */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#475569] mb-2">Digit Classes</p>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: DIGIT_COLORS[i] }} />
              <span className="text-[10px] text-[#94a3b8]">{i}</span>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-[#334155] mt-2">Tap or hover points to highlight a digit class</p>
      </div>
    </div>
  );
}
