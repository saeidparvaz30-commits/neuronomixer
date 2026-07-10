"use client";

import React, { useRef, useState } from "react";
import {
  GRID,
  GRID_ROWS,
  GRID_COLS,
  DEPTHS,
  MIN_LEAFS,
  ORACLE,
  VAL_ACC_MIN,
  VAL_ACC_MAX,
  TRAIN_ACC_MIN,
  TRAIN_ACC_MAX,
} from "./tuningMath";

export type HeatView = "val" | "train";

interface Props {
  view: HeatView;
  /** Interactive mode: cells are keyboard-focusable buttons. */
  interactive?: boolean;
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  /** cellIndex -> 1-based trial order, for search overlays. */
  markers?: ReadonlyMap<number, number>;
  /** Cell holding the best score among revealed trials (gold marker). */
  bestMarkerIndex?: number;
  showOracleStar?: boolean;
  /** When true the grid is aria-hidden; a text equivalent must sit nearby. */
  decorative?: boolean;
  ariaLabel?: string;
}

/** Teal sequential ramp: alpha of the token teal #3bb4a4, never a new hex. */
function cellFill(acc: number, lo: number, hi: number): string {
  const norm = hi > lo ? (acc - lo) / (hi - lo) : 0;
  const alpha = 0.06 + 0.9 * norm;
  return `rgba(59,180,164,${alpha.toFixed(3)})`;
}

export default function HeatGrid({
  view,
  interactive = false,
  selectedIndex,
  onSelect,
  markers,
  bestMarkerIndex,
  showOracleStar = false,
  decorative = false,
  ariaLabel,
}: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusIdx, setFocusIdx] = useState(selectedIndex ?? 0);
  const lo = view === "val" ? VAL_ACC_MIN : TRAIN_ACC_MIN;
  const hi = view === "val" ? VAL_ACC_MAX : TRAIN_ACC_MAX;

  const moveFocus = (target: number) => {
    setFocusIdx(target);
    refs.current[target]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!interactive) return;
    const di = Math.floor(focusIdx / GRID_COLS);
    const li = focusIdx % GRID_COLS;
    let nd = di;
    let nl = li;
    if (e.key === "ArrowUp") nd = Math.max(0, di - 1);
    else if (e.key === "ArrowDown") nd = Math.min(GRID_ROWS - 1, di + 1);
    else if (e.key === "ArrowLeft") nl = Math.max(0, li - 1);
    else if (e.key === "ArrowRight") nl = Math.min(GRID_COLS - 1, li + 1);
    else if (e.key === "Home") nl = 0;
    else if (e.key === "End") nl = GRID_COLS - 1;
    else return;
    e.preventDefault();
    moveFocus(nd * GRID_COLS + nl);
  };

  return (
    <div
      role={decorative ? undefined : "group"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : ariaLabel}
      onKeyDown={handleKeyDown}
    >
      <p className="text-[10px] text-[#475569] mb-1.5">
        min samples per leaf (columns), tree depth (rows)
      </p>
      <div
        className="grid gap-[3px]"
        style={{
          gridTemplateColumns: `minmax(28px,auto) repeat(${GRID_COLS}, minmax(0, 1fr))`,
        }}
      >
        <span aria-hidden="true" />
        {MIN_LEAFS.map((m) => (
          <span
            key={`h-${m}`}
            aria-hidden="true"
            className="text-center text-[9px] font-mono text-[#475569]"
          >
            {m}
          </span>
        ))}
        {GRID.map((cell) => {
          const acc = view === "val" ? cell.valAcc : cell.trainAcc;
          const isSelected = interactive && selectedIndex === cell.index;
          const trialNo = markers?.get(cell.index);
          const isBestMarker = bestMarkerIndex === cell.index;
          const isOracle = showOracleStar && cell.index === ORACLE.index;
          const label =
            `Depth ${cell.depth}, min leaf ${cell.minLeaf}. ` +
            `Validation accuracy ${(cell.valAcc * 100).toFixed(1)} percent, ` +
            `training accuracy ${(cell.trainAcc * 100).toFixed(1)} percent.` +
            (isOracle ? " Best of the full sweep." : "");
          const inner = (
            <>
              {isOracle && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center justify-center text-[10px] leading-none text-[#f1f5f9]"
                >
                  ★
                </span>
              )}
              {trialNo !== undefined && (
                <span
                  aria-hidden="true"
                  className={`absolute inset-0 m-auto flex h-[15px] w-[15px] items-center justify-center rounded-full text-[8px] font-mono font-bold leading-none ${
                    isBestMarker
                      ? "bg-[var(--color-accent)] text-[#0a0e1a]"
                      : "bg-[#0f172a] text-[#f1f5f9] border border-[#334155]"
                  }`}
                >
                  {trialNo}
                </span>
              )}
            </>
          );
          const style: React.CSSProperties = {
            background: cellFill(acc, lo, hi),
            boxShadow: isSelected
              ? "inset 0 0 0 2px var(--color-accent)"
              : undefined,
          };
          return (
            <React.Fragment key={cell.index}>
              {cell.li === 0 && (
                <span
                  aria-hidden="true"
                  className="flex items-center justify-end pr-1 text-[9px] font-mono text-[#475569]"
                >
                  {DEPTHS[cell.di]}
                </span>
              )}
              {interactive ? (
                <button
                  ref={(el) => {
                    refs.current[cell.index] = el;
                  }}
                  type="button"
                  tabIndex={focusIdx === cell.index ? 0 : -1}
                  aria-label={label}
                  aria-pressed={isSelected}
                  onFocus={() => setFocusIdx(cell.index)}
                  onClick={() => onSelect?.(cell.index)}
                  className="relative aspect-square rounded-[3px] transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                  style={style}
                >
                  {inner}
                </button>
              ) : (
                <span
                  className="relative aspect-square rounded-[3px]"
                  style={style}
                >
                  {inner}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-2" aria-hidden="true">
        <span className="text-[9px] font-mono text-[#475569]">
          {(lo * 100).toFixed(1)}%
        </span>
        <span
          className="h-[6px] flex-1 max-w-[160px] rounded-full"
          style={{
            background:
              "linear-gradient(to right, rgba(59,180,164,0.06), rgba(59,180,164,0.96))",
          }}
        />
        <span className="text-[9px] font-mono text-[#475569]">
          {(hi * 100).toFixed(1)}%
        </span>
        <span className="text-[9px] text-[#475569]">
          {view === "val" ? "validation" : "training"} accuracy
        </span>
        {showOracleStar && (
          <span className="text-[9px] text-[#475569]">· ★ sweep best</span>
        )}
      </div>
    </div>
  );
}
