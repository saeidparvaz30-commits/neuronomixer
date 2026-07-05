"use client";

import React from "react";
import { MethodType, METHOD_META } from "./data";
import { N_POINTS, TSNE_PERPLEXITIES, UMAP_NEIGHBOR_OPTIONS } from "./digitsDataset";

export interface PcaParams {
  nPoints: number;
  noiseSigma: number;
  pairIndex: number; // index into PC_PAIRS
}

export const PC_PAIRS: [number, number][] = [[0, 1], [0, 2], [1, 2]];

interface Props {
  method: MethodType;
  pcaParams: PcaParams;
  onPcaParams: (patch: Partial<PcaParams>) => void;
  tsnePerplexity: number;
  onTsnePerplexity: (v: number) => void;
  umapNeighbors: number;
  onUmapNeighbors: (v: number) => void;
  /** live explained-variance ratios (PC1..PC3) from the in-browser PCA */
  explainedRatio: number[];
}

function Slider({
  label, value, display, min, max, step, note, color, onChange,
}: {
  label: string; value: number; display: string;
  min: number; max: number; step: number; note?: string; color: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] text-white font-medium">{label}</span>
        <span className="text-[12px] font-mono text-[#d4af37]">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#d4af37]"
        style={{ accentColor: color }}
        aria-label={label}
      />
      {note && <p className="text-[9px] text-[#475569] mt-0.5">{note}</p>}
    </div>
  );
}

export default function ParameterSliders({
  method, pcaParams, onPcaParams,
  tsnePerplexity, onTsnePerplexity,
  umapNeighbors, onUmapNeighbors,
  explainedRatio,
}: Props) {
  const meta = METHOD_META[method];

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
        {meta.label} Parameters
      </p>

      {method === "pca" && (
        <>
          <Slider
            label="Points shown"
            value={pcaParams.nPoints}
            display={`${pcaParams.nPoints}`}
            min={50} max={N_POINTS} step={10}
            note="PCA is refit live on this many digits (kept class-balanced)"
            color={meta.color}
            onChange={v => onPcaParams({ nPoints: v })}
          />
          <Slider
            label="Pixel noise σ"
            value={pcaParams.noiseSigma}
            display={pcaParams.noiseSigma.toFixed(1)}
            min={0} max={8} step={0.5}
            note="Gaussian noise added to the 64 pixel values (0..16) before fitting"
            color={meta.color}
            onChange={v => onPcaParams({ noiseSigma: v })}
          />
          <div>
            <p className="text-[12px] text-white font-medium mb-1.5">Component pair</p>
            <div className="flex gap-1.5 flex-wrap">
              {PC_PAIRS.map(([a, b], i) => {
                const active = pcaParams.pairIndex === i;
                return (
                  <button
                    key={`${a}-${b}`}
                    onClick={() => onPcaParams({ pairIndex: i })}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors"
                    style={{
                      borderColor: active ? meta.color : "#1e293b",
                      color: active ? meta.color : "#475569",
                      background: active ? meta.color + "14" : "transparent",
                    }}
                  >
                    PC{a + 1} / PC{b + 1}
                  </button>
                );
              })}
            </div>
            {explainedRatio.length >= 3 && (
              <p className="text-[9px] text-[#475569] mt-1.5">
                Variance captured (live): PC1 {(explainedRatio[0] * 100).toFixed(1)}%,
                PC2 {(explainedRatio[1] * 100).toFixed(1)}%,
                PC3 {(explainedRatio[2] * 100).toFixed(1)}%
              </p>
            )}
          </div>
        </>
      )}

      {method === "tsne" && (
        <Slider
          label="Perplexity"
          value={TSNE_PERPLEXITIES.indexOf(tsnePerplexity as 5 | 30 | 50)}
          display={`${tsnePerplexity}`}
          min={0} max={TSNE_PERPLEXITIES.length - 1} step={1}
          note={`Switches between real embeddings precomputed at perplexity ${TSNE_PERPLEXITIES.join(", ")}`}
          color={meta.color}
          onChange={i => onTsnePerplexity(TSNE_PERPLEXITIES[i])}
        />
      )}

      {method === "umap" && (
        <Slider
          label="n_neighbors"
          value={UMAP_NEIGHBOR_OPTIONS.indexOf(umapNeighbors as 5 | 15 | 50)}
          display={`${umapNeighbors}`}
          min={0} max={UMAP_NEIGHBOR_OPTIONS.length - 1} step={1}
          note={`Switches between real embeddings precomputed at n_neighbors ${UMAP_NEIGHBOR_OPTIONS.join(", ")}`}
          color={meta.color}
          onChange={i => onUmapNeighbors(UMAP_NEIGHBOR_OPTIONS[i])}
        />
      )}

      <p className="text-[9px] text-[#334155] leading-relaxed border-t border-white/[0.06] pt-2.5">
        The PCA view is genuinely recomputed in your browser on every change. t-SNE and UMAP
        are too slow to run live here, so their sliders switch between real embeddings of this
        exact dataset, precomputed offline with scikit-learn and umap-learn.
      </p>
    </div>
  );
}
