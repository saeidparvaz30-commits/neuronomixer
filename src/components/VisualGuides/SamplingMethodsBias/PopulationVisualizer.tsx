"use client";

import React, { useMemo } from "react";
import { PopulationUnit } from "./types";

interface Props {
  population: PopulationUnit[];
  selectedIds: Set<number>;
  populationMean: number;
  populationSD: number;
}

const SVG_W = 600;
const SVG_H = 300;
const PADDING = 12;

export default function PopulationVisualizer({
  population,
  selectedIds,
  populationMean,
  populationSD,
}: Props) {
  const circles = useMemo(() => {
    return population.map(unit => {
      const cx = PADDING + unit.x * (SVG_W - PADDING * 2);
      const cy = PADDING + unit.y * (SVG_H - PADDING * 2);
      const isSelected = selectedIds.has(unit.id);
      const baseColor = unit.group === "A" ? "#3bb4a4" : "#ef4444";
      return { unit, cx, cy, isSelected, baseColor };
    });
  }, [population, selectedIds]);

  const groupACount = population.filter(u => u.group === "A").length;
  const groupBCount = population.length - groupACount;
  const selectedCount = selectedIds.size;

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      {/* Header stats */}
      <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-1">
            Population (N = {population.length})
          </p>
          <p className="text-[13px] font-bold text-white">
            Mean ={" "}
            <span className="text-[#d4af37]">{populationMean.toFixed(2)}</span>
            {"  "}
            <span className="text-[#475569] font-normal text-[12px]">
              SD = {populationSD.toFixed(2)}
            </span>
          </p>
        </div>
        {selectedCount > 0 && (
          <div className="text-right">
            <p className="text-[11px] text-[#94a3b8]">
              <span className="font-semibold text-[#d4af37]">{selectedCount}</span> selected
            </p>
          </div>
        )}
      </div>

      {/* SVG canvas */}
      <div className="rounded-xl overflow-hidden border border-[#1e293b] bg-[#070d1a]">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          width="100%"
          height="100%"
          style={{ display: "block", aspectRatio: `${SVG_W} / ${SVG_H}` }}
          aria-label="Population scatter plot"
        >
          {/* Unselected units rendered first (behind selected) */}
          {circles
            .filter(c => !c.isSelected)
            .map(({ unit, cx, cy, baseColor }) => (
              <circle
                key={unit.id}
                cx={cx}
                cy={cy}
                r={3.2}
                fill={baseColor}
                opacity={0.55}
              />
            ))}

          {/* Selected units rendered on top with gold ring */}
          {circles
            .filter(c => c.isSelected)
            .map(({ unit, cx, cy, baseColor }) => (
              <g key={`sel-${unit.id}`}>
                <circle cx={cx} cy={cy} r={5.5} fill="#d4af37" opacity={0.35} />
                <circle cx={cx} cy={cy} r={3.2} fill={baseColor} opacity={1} />
                <circle cx={cx} cy={cy} r={5} fill="none" stroke="#d4af37" strokeWidth={1.2} opacity={0.9} />
              </g>
            ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#3bb4a4] inline-block" />
          <span className="text-[11px] text-[#94a3b8]">
            Group A ({groupACount} — 60%)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] inline-block" />
          <span className="text-[11px] text-[#94a3b8]">
            Group B ({groupBCount} — 40%)
          </span>
        </div>
        {selectedCount > 0 && (
          <div className="flex items-center gap-1.5 ml-auto">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block border"
              style={{ borderColor: "#d4af37", background: "transparent" }}
            />
            <span className="text-[11px] text-[#d4af37]">Selected sample</span>
          </div>
        )}
      </div>
    </div>
  );
}
