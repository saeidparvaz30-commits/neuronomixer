"use client";

import React from "react";
import {
  GRID,
  PATCH_SIZES,
  PROMPT_TOKENS,
  patchCountFor,
  sequenceLengthFor,
} from "./vitMath";

interface Props {
  currentPatchSize: number;
}

/**
 * Sequence length per patch size for the on-screen 24x24 image. Every bar
 * value is computed: (GRID / patchSize)^2 image tokens plus the fixed text
 * prompt tokens.
 */
export default function CostChart({ currentPatchSize }: Props) {
  const rows = PATCH_SIZES.map((p) => ({
    p,
    imageTokens: patchCountFor(p),
    total: sequenceLengthFor(p),
  }));
  const maxTotal = Math.max(...rows.map((r) => r.total));

  const width = 460;
  const barMaxW = 250;
  const rowH = 52;
  const height = rows.length * rowH + 8;

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label={`Sequence length by patch size for the ${GRID} by ${GRID} image: ${rows
          .map((r) => `${r.p} pixel patches give ${r.total} tokens`)
          .join("; ")}.`}
      >
        {rows.map((r, i) => {
          const y = i * rowH + 6;
          const barW = Number(((r.total / maxTotal) * barMaxW).toFixed(1));
          const isCurrent = r.p === currentPatchSize;
          return (
            <g key={r.p}>
              <text
                x={0}
                y={y + 15}
                fontSize={14}
                fontFamily="monospace"
                fill={isCurrent ? "#f1f5f9" : "#94a3b8"}
              >
                {r.p}x{r.p}px
              </text>
              <rect
                x={64}
                y={y}
                width={barW}
                height={20}
                rx={4}
                fill={isCurrent ? "var(--color-accent)" : "#334155"}
              />
              <text
                x={64}
                y={y + 38}
                fontSize={14}
                fontFamily="monospace"
                fill={isCurrent ? "#f1f5f9" : "#94a3b8"}
              >
                {r.imageTokens} image + {PROMPT_TOKENS.length} text ={" "}
                {r.total}
                {isCurrent ? "  (current)" : ""}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-[11px] text-[#475569] leading-relaxed mt-2 max-w-[680px]">
        Halving the patch side length quadruples the image token count: cost
        scales with (side / patch)&sup2;. Production vision transformers work
        the same way at scale: ViT-Base/16 slices a 224x224 input into 16x16
        pixel patches, which is (224 / 16)&sup2; = 196 image tokens per image
        (Dosovitskiy et al., 2020, &quot;An Image Is Worth 16x16 Words&quot;).
      </p>
    </div>
  );
}
