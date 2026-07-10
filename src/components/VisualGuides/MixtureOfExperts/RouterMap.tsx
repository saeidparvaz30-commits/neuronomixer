"use client";

import React, { useMemo, useRef } from "react";
import {
  MoEParams,
  routerMap,
  expertUtilization,
  EXPERT_COLORS,
  MAP_RES,
  NUM_EXPERTS,
  TOP_K,
} from "./moeMath";

type Props = {
  params: MoEParams;
  enabled: readonly boolean[];
  x1: number;
  x2: number;
  onSelect: (x1: number, x2: number) => void;
  trained: boolean;
};

const CELL = 10;
const SIZE = MAP_RES * CELL;

function clampRound(v: number): number {
  const clamped = Math.max(-1, Math.min(1, v));
  return Math.round(clamped * 20) / 20;
}

export default function RouterMap({
  params,
  enabled,
  x1,
  x2,
  onSelect,
  trained,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const cells = useMemo(() => routerMap(params, enabled), [params, enabled]);

  // One <path> per expert instead of MAP_RES^2 rects.
  const expertPaths = useMemo(() => {
    const d = Array.from({ length: NUM_EXPERTS }, () => "");
    cells.forEach((e, idx) => {
      if (e < 0) return;
      const r = Math.floor(idx / MAP_RES);
      const c = idx % MAP_RES;
      const px = c * CELL;
      const py = SIZE - (r + 1) * CELL; // x2 increases upward
      d[e] += `M${px} ${py}h${CELL}v${CELL}h-${CELL}Z`;
    });
    return d;
  }, [cells]);

  const util = useMemo(
    () => expertUtilization(params, enabled),
    [params, enabled]
  );

  const markerX = (((x1 + 1) / 2) * SIZE).toFixed(1);
  const markerY = (SIZE - ((x2 + 1) / 2) * SIZE).toFixed(1);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    onSelect(clampRound(fx * 2 - 1), clampRound(1 - fy * 2));
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,340px)_1fr] gap-4">
        <div>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="w-full rounded-xl border border-[#334155] cursor-crosshair"
            role="img"
            aria-label={`Router map: the input plane colored by each cell's top-1 expert. The current input is at x1 ${x1.toFixed(2)}, x2 ${x2.toFixed(2)}. Click to move the input; the sliders do the same from the keyboard.`}
            onClick={handleClick}
          >
            <rect x={0} y={0} width={SIZE} height={SIZE} fill="#0f172a" />
            {expertPaths.map((d, e) =>
              d.length > 0 ? (
                <path key={e} d={d} fill={EXPERT_COLORS[e]} fillOpacity={0.8} />
              ) : null
            )}
            <circle
              cx={markerX}
              cy={markerY}
              r={7}
              fill="none"
              stroke="#0a0e1a"
              strokeWidth={4}
            />
            <circle
              cx={markerX}
              cy={markerY}
              r={7}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={2}
            />
          </svg>
          <div className="flex justify-between text-[10px] text-[#475569] mt-1">
            <span>x1: -1 (left) to +1 (right)</span>
            <span>x2: -1 (bottom) to +1 (top)</span>
          </div>
          <p className="text-[11px] text-[#94a3b8] leading-relaxed mt-2">
            Each cell shows the top-1 expert the router would pick there. The
            gold ring is your current input. Click the map to move it, or use
            the x1 and x2 sliders.
            {!trained &&
              " Before training, these regions are arbitrary leftovers of random initialization."}
          </p>
        </div>

        <div>
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-2">
            Expert utilization: share of grid points routing each expert into
            the top-{TOP_K} (recomputed from the router)
          </p>
          <div className="flex flex-col gap-1.5">
            {util.map((u, e) => (
              <div
                key={e}
                className="grid grid-cols-[52px_1fr_84px] items-center gap-2"
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-3 h-3 rounded-sm"
                    style={{ background: EXPERT_COLORS[e] }}
                    aria-hidden="true"
                  />
                  <span className="text-[11px] font-mono text-[#94a3b8]">
                    E{e + 1}
                  </span>
                </span>
                <div className="h-2 rounded-full bg-[#1e293b] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{
                      width: `${Math.min(100, 100 * u).toFixed(2)}%`,
                      background: EXPERT_COLORS[e],
                    }}
                  />
                </div>
                <span className="text-[11px] font-mono text-[#f1f5f9]">
                  {(100 * u).toFixed(1)}%
                  {!enabled[e] && (
                    <span className="text-[#ef4444] ml-1">off</span>
                  )}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#475569] leading-relaxed mt-3">
            The load-balancing auxiliary loss keeps these shares near{" "}
            {((100 * TOP_K) / NUM_EXPERTS).toFixed(0)}% each during training.
            Without it, real MoE training collapses: a few experts win early,
            get all the gradient, and the rest never learn.
          </p>
        </div>
      </div>
    </div>
  );
}
