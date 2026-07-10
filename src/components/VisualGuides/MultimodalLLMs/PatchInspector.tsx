"use client";

import React from "react";
import { Patch, EMBED_DIM, grayFill, patchStats } from "./vitMath";

interface Props {
  patch: Patch | null;
  embedding: number[] | null;
  w: number[][];
  patchSize: number;
}

/**
 * Text-level view of the real computation for one selected patch: its raw
 * pixel values, the projection matrix shape, the expanded dot product for
 * the first embedding dimension, and the full output vector.
 */
export default function PatchInspector({ patch, embedding, w, patchSize }: Props) {
  if (!patch || !embedding) {
    return (
      <p className="text-[12px] text-[#475569] leading-relaxed">
        No patch selected yet. Click any image patch token in the sequence
        above to see its pixels flattened, multiplied through the projection
        matrix, and turned into an embedding vector.
      </p>
    );
  }

  const dim = patchSize * patchSize;
  const stats = patchStats(patch.pixels);
  const previewCount = Math.min(8, dim);
  const pixelPreview = patch.pixels
    .slice(0, previewCount)
    .map((v) => v.toFixed(2))
    .join(", ");

  // Expanded dot product for embedding dimension 0, first three terms.
  const terms = patch.pixels
    .slice(0, 3)
    .map((x, i) => `${x.toFixed(2)}*${w[i][0].toFixed(3)}`)
    .join(" + ");

  return (
    <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-start">
      <div>
        <svg
          viewBox={`0 0 ${patchSize} ${patchSize}`}
          className="w-28 h-28 rounded-lg border border-[#334155]"
          shapeRendering="crispEdges"
          role="img"
          aria-label={`Enlarged patch, row ${patch.row + 1}, column ${patch.col + 1}`}
        >
          {patch.pixels.map((v, i) => (
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
        <p className="text-[11px] text-[#94a3b8] mt-2">
          Patch row {patch.row + 1}, col {patch.col + 1}
        </p>
        <p className="text-[11px] text-[#475569]">
          mean {stats.mean.toFixed(2)}, min {stats.min.toFixed(2)}, max{" "}
          {stats.max.toFixed(2)}
        </p>
      </div>

      <div className="min-w-0 space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#3bb4a4] mb-1">
            1. Flatten: {patchSize} x {patchSize} pixels become a vector of{" "}
            {dim} values
          </p>
          <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[11px] leading-relaxed rounded-xl p-3 overflow-x-auto">
            {`x = [${pixelPreview}${dim > previewCount ? `, ... ${dim - previewCount} more` : ""}]`}
          </pre>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#3bb4a4] mb-1">
            2. Project: multiply by W ({dim} x {EMBED_DIM}, fixed seeded random,
            not trained)
          </p>
          <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[11px] leading-relaxed rounded-xl p-3 overflow-x-auto">
            {`e[0] = ${terms} + ... (${dim} terms) = ${embedding[0].toFixed(3)}`}
          </pre>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#3bb4a4] mb-1">
            3. Result: one {EMBED_DIM}-dim token embedding, same space as text
          </p>
          <div className="flex flex-wrap gap-2">
            {embedding.map((v, j) => (
              <span
                key={j}
                className="font-mono text-[11px] px-2 py-1 rounded-md border border-[#1e293b] bg-[#0f172a] text-[#f1f5f9]"
              >
                e[{j}] = {v.toFixed(3)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
