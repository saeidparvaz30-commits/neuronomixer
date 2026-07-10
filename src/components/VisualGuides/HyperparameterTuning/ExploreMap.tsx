"use client";

import React, { useMemo } from "react";
import { GRID, DATASET, leafRects } from "./tuningMath";
import HeatGrid, { HeatView } from "./HeatGrid";

interface Props {
  selectedIndex: number;
  onSelect: (index: number) => void;
  view: HeatView;
  onViewChange: (view: HeatView) => void;
}

const CLASS_FILL = ["rgba(30,93,138,0.42)", "rgba(236,72,153,0.30)"] as const;
const CLASS_STROKE = ["#1e5d8a", "#ec4899"] as const;

export default function ExploreMap({
  selectedIndex,
  onSelect,
  view,
  onViewChange,
}: Props) {
  const cell = GRID[selectedIndex];
  const rects = useMemo(() => leafRects(cell.tree), [cell]);
  const gapPts = (cell.trainAcc - cell.valAcc) * 100;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: the landscape */}
      <div>
        <div
          role="radiogroup"
          aria-label="Heatmap metric"
          className="inline-flex rounded-lg border border-[#1e293b] p-0.5 mb-3"
        >
          {(
            [
              { id: "val", label: "Validation accuracy" },
              { id: "train", label: "Training accuracy" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={view === opt.id}
              onClick={() => onViewChange(opt.id)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                view === opt.id
                  ? "bg-[#1e293b] text-white"
                  : "text-[#475569] hover:text-[#94a3b8]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <HeatGrid
          view={view}
          interactive
          selectedIndex={selectedIndex}
          onSelect={onSelect}
          showOracleStar={view === "val"}
          ariaLabel={`${view === "val" ? "Validation" : "Training"} accuracy heatmap over 10 tree depths and 10 min-leaf values. Use arrow keys to move, Enter or Space to inspect a configuration.`}
        />
        <p className="text-[11px] text-[#475569] leading-relaxed mt-3">
          Flip to training accuracy and look at the bottom-left corner: deep
          trees with tiny leaves reach 100 percent on the training set while
          their validation score sinks. That gap is overfitting, measured on
          real trees, not asserted.
        </p>
      </div>

      {/* Right: the selected model, exactly */}
      <div>
        <p className="text-[11px] font-semibold text-[#94a3b8] mb-3">
          Selected: depth{" "}
          <span className="font-mono text-[#f1f5f9]">{cell.depth}</span>, min
          leaf <span className="font-mono text-[#f1f5f9]">{cell.minLeaf}</span>
        </p>
        <svg
          viewBox="0 0 100 100"
          role="img"
          aria-label={`Decision boundary of the selected tree: ${rects.length} leaf regions over the 240-point dataset. Training accuracy ${(cell.trainAcc * 100).toFixed(1)} percent, validation accuracy ${(cell.valAcc * 100).toFixed(1)} percent.`}
          className="w-full max-w-[380px] rounded-xl border border-[#1e293b] bg-[#0f172a]"
        >
          {rects.map((r, i) => (
            <rect
              key={i}
              x={(r.x0 * 100).toFixed(2)}
              y={((1 - r.y1) * 100).toFixed(2)}
              width={((r.x1 - r.x0) * 100).toFixed(2)}
              height={((r.y1 - r.y0) * 100).toFixed(2)}
              fill={CLASS_FILL[r.pred]}
            />
          ))}
          {DATASET.train.map((p, i) => (
            <circle
              key={`t-${i}`}
              cx={(p.x * 100).toFixed(2)}
              cy={((1 - p.y) * 100).toFixed(2)}
              r="1.3"
              fill={CLASS_STROKE[p.label]}
              stroke="#0f172a"
              strokeWidth="0.3"
            />
          ))}
          {DATASET.val.map((p, i) => (
            <circle
              key={`v-${i}`}
              cx={(p.x * 100).toFixed(2)}
              cy={((1 - p.y) * 100).toFixed(2)}
              r="1.8"
              fill="none"
              stroke={CLASS_STROKE[p.label]}
              strokeWidth="0.8"
            />
          ))}
        </svg>
        <p className="text-[10px] text-[#475569] mt-2">
          Filled dots: training points. Hollow rings: validation points.
          Shaded rectangles: the tree&apos;s actual leaf regions (blue predicts
          class A, pink predicts class B).
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 max-w-[380px]">
          <div className="rounded-lg border border-[#1e293b] p-2">
            <p className="text-[9px] text-[#475569] mb-0.5">Train acc</p>
            <p className="text-[13px] font-mono font-bold text-[#f1f5f9]">
              {(cell.trainAcc * 100).toFixed(1)}%
            </p>
          </div>
          <div className="rounded-lg border border-[#1e293b] p-2">
            <p className="text-[9px] text-[#475569] mb-0.5">Val acc</p>
            <p className="text-[13px] font-mono font-bold text-[var(--color-accent)]">
              {(cell.valAcc * 100).toFixed(1)}%
            </p>
          </div>
          <div className="rounded-lg border border-[#1e293b] p-2">
            <p className="text-[9px] text-[#475569] mb-0.5">Leaves</p>
            <p className="text-[13px] font-mono font-bold text-[#f1f5f9]">
              {cell.leaves}
            </p>
          </div>
          <div className="rounded-lg border border-[#1e293b] p-2">
            <p className="text-[9px] text-[#475569] mb-0.5">Overfit gap</p>
            <p
              className={`text-[13px] font-mono font-bold ${
                gapPts > 5 ? "text-[var(--color-warning)]" : "text-[#f1f5f9]"
              }`}
            >
              {gapPts.toFixed(1)} pts
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
