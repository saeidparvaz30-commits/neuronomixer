"use client";

import React from "react";
import {
  Patch,
  EMBED_DIM,
  grayFill,
  embedFill,
  formatVector,
  patchStats,
} from "./vitMath";

interface TextTokenEntry {
  token: string;
  embedding: number[];
}

interface Props {
  textTokens: TextTokenEntry[];
  patches: Patch[];
  patchEmbeddings: number[][];
  patchSize: number;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

function EmbeddingStrip({ embedding }: { embedding: number[] }) {
  return (
    <div
      className="flex gap-[2px] mt-1.5"
      title={`Embedding (${EMBED_DIM} dims): ${formatVector(embedding)}`}
      aria-hidden="true"
    >
      {embedding.map((v, j) => (
        <span
          key={j}
          className="w-[9px] h-[9px] rounded-[2px]"
          style={{ background: embedFill(v) }}
        />
      ))}
    </div>
  );
}

/**
 * The single mixed sequence: text tokens first, then image patch tokens.
 * Every strip below a token is the real 8-dim vector for that token,
 * recomputed live from the pixels and the projection matrix.
 */
export default function TokenSequence({
  textTokens,
  patches,
  patchEmbeddings,
  patchSize,
  selectedIndex,
  onSelect,
}: Props) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      {textTokens.map(({ token, embedding }) => (
        <div
          key={token}
          className="flex flex-col items-center rounded-lg border border-[#334155] bg-[#1e293b] px-2.5 py-2"
        >
          <span className="text-[11px] font-mono font-semibold text-[#a855f7]">
            {token}
          </span>
          <EmbeddingStrip embedding={embedding} />
        </div>
      ))}

      <span
        className="self-center text-[10px] uppercase tracking-wide text-[#475569] px-1"
        aria-hidden="true"
      >
        +
      </span>

      {patches.map((p) => {
        const emb = patchEmbeddings[p.index];
        const { mean } = patchStats(p.pixels);
        const selected = selectedIndex === p.index;
        return (
          <button
            key={p.index}
            type="button"
            onClick={() => onSelect(p.index)}
            aria-pressed={selected}
            aria-label={`Image patch row ${p.row + 1}, column ${p.col + 1}. Mean brightness ${mean.toFixed(2)}. Press to inspect its pixel values and embedding.`}
            title={`Patch r${p.row + 1}c${p.col + 1}: mean ${mean.toFixed(2)}, embedding ${formatVector(emb)}`}
            className={`flex flex-col items-center rounded-lg border px-2 py-2 transition-colors ${
              selected
                ? "border-[var(--color-accent)] bg-[#1e293b]"
                : "border-[#1e293b] bg-[#0f172a] hover:border-[#334155]"
            }`}
          >
            <svg
              viewBox={`0 0 ${patchSize} ${patchSize}`}
              className="w-9 h-9 rounded-[3px]"
              shapeRendering="crispEdges"
              aria-hidden="true"
            >
              {p.pixels.map((v, i) => (
                <rect
                  key={i}
                  x={i % patchSize}
                  y={Math.floor(i / patchSize)}
                  width={1}
                  height={1}
                  fill={grayFill(v)}
                />
              ))}
            </svg>
            <span
              className={`text-[9px] font-mono mt-1 ${selected ? "text-[var(--color-accent)]" : "text-[#475569]"}`}
            >
              {selected ? "selected" : `p${p.index + 1}`}
            </span>
            <EmbeddingStrip embedding={emb} />
          </button>
        );
      })}
    </div>
  );
}
