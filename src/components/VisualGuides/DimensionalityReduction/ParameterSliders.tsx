"use client";

import React from "react";
import { MethodType, METHOD_META } from "./data";

interface SliderConfig {
  label: string;
  key: string;
  min: number;
  max: number;
  default: number;
  step: number;
  note?: string;
}

const SLIDERS: Record<MethodType, SliderConfig[]> = {
  pca: [
    { label: "Components", key: "components", min: 2, max: 50, default: 2, step: 1, note: "Viewing 2 of N here" },
  ],
  tsne: [
    { label: "Perplexity", key: "perplexity", min: 5, max: 50, default: 30, step: 1, note: "Controls local vs global balance" },
    { label: "Learning Rate", key: "lr", min: 10, max: 1000, default: 200, step: 10, note: "Higher = faster, less stable" },
  ],
  umap: [
    { label: "n_neighbors", key: "neighbors", min: 2, max: 100, default: 15, step: 1, note: "Size of local neighborhood" },
    { label: "min_dist", key: "min_dist", min: 0, max: 1, default: 0.1, step: 0.05, note: "How tightly to pack points" },
  ],
};

interface Props {
  method: MethodType;
  values: Record<string, number>;
  onChange: (key: string, value: number) => void;
}

export default function ParameterSliders({ method, values, onChange }: Props) {
  const meta = METHOD_META[method];
  const sliders = SLIDERS[method];

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
        {meta.label} Parameters
      </p>
      {sliders.map(s => {
        const val = values[s.key] ?? s.default;
        return (
          <div key={s.key}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] text-white font-medium">{s.label}</span>
              <span className="text-[12px] font-mono text-[#d4af37]">{val}</span>
            </div>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={val}
              onChange={e => onChange(s.key, Number(e.target.value))}
              className="w-full accent-[#d4af37]"
              style={{ accentColor: meta.color }}
            />
            <div className="flex justify-between mt-0.5">
              <span className="text-[9px] text-[#334155]">{s.min}</span>
              <span className="text-[9px] text-[#334155]">{s.max}</span>
            </div>
            {s.note && (
              <p className="text-[9px] text-[#475569] mt-0.5">{s.note}</p>
            )}
          </div>
        );
      })}
      <p className="text-[9px] text-[#334155] leading-relaxed border-t border-white/[0.06] pt-2.5">
        Note: Parameter changes here are illustrative. In practice, t-SNE recomputation takes 30–60s and UMAP 5–10s on real MNIST (70,000 points). Pre-computed embeddings are displayed.
      </p>
    </div>
  );
}
