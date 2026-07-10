"use client";

import React from "react";

export interface ScatterPoint {
  x: number;
  y: number;
  kind: "text" | "patch";
  label: string;
}

interface Props {
  points: ScatterPoint[];
}

/**
 * All token embeddings plotted on their first two dimensions (disclosed in
 * the caption). Text tokens are purple squares, image patch tokens are teal
 * circles: after projection they live in the same coordinate system.
 */
export default function SharedSpaceScatter({ points }: Props) {
  const width = 420;
  const height = 260;
  const pad = 22;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(-0.2, ...xs);
  const xMax = Math.max(0.2, ...xs);
  const yMin = Math.min(-0.2, ...ys);
  const yMax = Math.max(0.2, ...ys);

  const sx = (v: number) =>
    Number((pad + ((v - xMin) / (xMax - xMin)) * (width - 2 * pad)).toFixed(1));
  const sy = (v: number) =>
    Number((height - pad - ((v - yMin) / (yMax - yMin)) * (height - 2 * pad)).toFixed(1));

  const textCount = points.filter((p) => p.kind === "text").length;
  const patchCount = points.length - textCount;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-2">
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <span className="w-2.5 h-2.5 bg-[#a855f7]" aria-hidden="true" />
          Text token (square)
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#3bb4a4]" aria-hidden="true" />
          Image patch token (circle)
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-[520px]"
        role="img"
        aria-label={`Scatter plot of embedding dimension 1 versus dimension 0 for all ${points.length} tokens in the sequence: ${textCount} text tokens and ${patchCount} image patch tokens share one coordinate system.`}
      >
        {/* Zero axes */}
        <line
          x1={sx(0)}
          y1={pad}
          x2={sx(0)}
          y2={height - pad}
          stroke="#1e293b"
          strokeWidth={1}
        />
        <line
          x1={pad}
          y1={sy(0)}
          x2={width - pad}
          y2={sy(0)}
          stroke="#1e293b"
          strokeWidth={1}
        />
        <text x={width - pad} y={sy(0) - 5} fontSize={9} fill="#475569" textAnchor="end">
          e[0]
        </text>
        <text x={sx(0) + 5} y={pad + 8} fontSize={9} fill="#475569">
          e[1]
        </text>
        {points.map((p, i) =>
          p.kind === "text" ? (
            <rect
              key={i}
              x={sx(p.x) - 4}
              y={sy(p.y) - 4}
              width={8}
              height={8}
              fill="#a855f7"
              fillOpacity={0.9}
            >
              <title>{`${p.label}: (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`}</title>
            </rect>
          ) : (
            <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={4} fill="#3bb4a4" fillOpacity={0.85}>
              <title>{`${p.label}: (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`}</title>
            </circle>
          )
        )}
      </svg>
      <p className="text-[11px] text-[#475569] leading-relaxed mt-2 max-w-[680px]">
        Axes are the first two of the 8 embedding dimensions, plotted directly
        (no dimensionality reduction).
        Redraw the image or move the patch-size slider and the teal points move,
        because they are recomputed from your pixels. The purple text tokens
        stay put: their embeddings come from the fixed lookup table.
      </p>
    </div>
  );
}
