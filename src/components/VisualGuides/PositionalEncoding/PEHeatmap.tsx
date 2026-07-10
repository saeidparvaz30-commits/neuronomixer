"use client";

import React, { useMemo } from "react";
import {
  HeatmapParams,
  baseFromExp,
  sinusoidalPE,
  peColor,
  wavelengthForPair,
  N_POS_MIN,
  N_POS_MAX,
  D_MODEL_MIN,
  D_MODEL_MAX,
  BASE_EXP_MIN,
  BASE_EXP_MAX,
} from "./peMath";

interface Props {
  params: HeatmapParams;
  inspectPos: number;
  onNPosChange: (v: number) => void;
  onDModelChange: (v: number) => void;
  onBaseExpChange: (v: number) => void;
  onInspectPosChange: (v: number) => void;
}

const PLOT_W = 600;

export default function PEHeatmap({
  params,
  inspectPos,
  onNPosChange,
  onDModelChange,
  onBaseExpChange,
  onInspectPosChange,
}: Props) {
  const { nPos, dModel, baseExp } = params;
  const base = baseFromExp(baseExp);

  const pe = useMemo(
    () => sinusoidalPE(nPos, dModel, base),
    [nPos, dModel, base]
  );

  const cell = PLOT_W / dModel;
  const plotH = cell * nPos;
  const ip = Math.min(inspectPos, nPos - 1);
  const inspectRow = pe[ip];
  const shownDims = Math.min(8, dModel);
  const lastPair = Math.floor(dModel / 2) - 1;
  const firstWavelength = wavelengthForPair(0, dModel, base);
  const lastWavelength = wavelengthForPair(lastPair, dModel, base);

  return (
    <div>
      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label
            htmlFor="pe-npos"
            className="block text-[11px] font-semibold text-[#94a3b8] mb-1"
          >
            Positions: <span className="text-white font-mono">{nPos}</span>
          </label>
          <input
            id="pe-npos"
            type="range"
            min={N_POS_MIN}
            max={N_POS_MAX}
            step={4}
            value={nPos}
            onChange={(e) => onNPosChange(Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]"
          />
        </div>
        <div>
          <label
            htmlFor="pe-dmodel"
            className="block text-[11px] font-semibold text-[#94a3b8] mb-1"
          >
            Model dimension d:{" "}
            <span className="text-white font-mono">{dModel}</span>
          </label>
          <input
            id="pe-dmodel"
            type="range"
            min={D_MODEL_MIN}
            max={D_MODEL_MAX}
            step={2}
            value={dModel}
            onChange={(e) => onDModelChange(Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]"
          />
        </div>
        <div>
          <label
            htmlFor="pe-base"
            className="block text-[11px] font-semibold text-[#94a3b8] mb-1"
          >
            Base constant:{" "}
            <span className="text-white font-mono">{base.toLocaleString("en-US")}</span>
          </label>
          <input
            id="pe-base"
            type="range"
            min={BASE_EXP_MIN}
            max={BASE_EXP_MAX}
            step={0.1}
            value={baseExp}
            onChange={(e) => onBaseExpChange(Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]"
          />
        </div>
      </div>

      {/* Heatmap */}
      <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${PLOT_W} ${plotH.toFixed(2)}`}
          className="w-full h-auto block"
          role="img"
          aria-label={`Sinusoidal positional encoding heatmap: ${nPos} positions by ${dModel} dimensions, base ${base}. Left columns oscillate fast down the position axis, right columns slowly. Use the inspect slider below for exact values.`}
        >
          {pe.map((row, pos) =>
            row.map((v, dim) => (
              <rect
                key={`${pos}-${dim}`}
                x={(dim * cell).toFixed(2)}
                y={(pos * cell).toFixed(2)}
                width={(cell + 0.35).toFixed(2)}
                height={(cell + 0.35).toFixed(2)}
                fill={peColor(v)}
              />
            ))
          )}
          {/* inspected row outline */}
          <rect
            x="0"
            y={(ip * cell).toFixed(2)}
            width={PLOT_W}
            height={cell.toFixed(2)}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="1.5"
          />
        </svg>
        <div className="flex items-center justify-between mt-2 text-[10px] text-[#475569]">
          <span>dimension 0 (fast sinusoid)</span>
          <span>dimension {dModel - 1} (slow sinusoid)</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm inline-block"
            style={{ background: peColor(-1) }}
            aria-hidden="true"
          />
          <span className="text-[11px] text-[#94a3b8]">value -1 (blue)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm inline-block border border-[#334155]"
            style={{ background: peColor(0) }}
            aria-hidden="true"
          />
          <span className="text-[11px] text-[#94a3b8]">value 0 (dark)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm inline-block"
            style={{ background: peColor(1) }}
            aria-hidden="true"
          />
          <span className="text-[11px] text-[#94a3b8]">value +1 (pink)</span>
        </div>
        <span className="text-[11px] text-[#475569]">
          Rows: positions 0 to {nPos - 1}, top to bottom. Columns: embedding
          dimensions.
        </span>
      </div>

      {/* Inspect row: keyboard-operable text equivalent of the heatmap */}
      <div className="mt-4 rounded-xl border border-[#1e293b] p-4">
        <label
          htmlFor="pe-inspect"
          className="block text-[11px] font-semibold text-[#94a3b8] mb-1"
        >
          Inspect position:{" "}
          <span className="text-white font-mono">{ip}</span>
        </label>
        <input
          id="pe-inspect"
          type="range"
          min={0}
          max={nPos - 1}
          step={1}
          value={ip}
          onChange={(e) => onInspectPosChange(Number(e.target.value))}
          className="w-full accent-[var(--color-accent)]"
        />
        <p className="text-[11px] text-[#475569] mt-2 mb-1">
          PE[{ip}], first {shownDims} of {dModel} dimensions (computed from the
          formula above):
        </p>
        <p className="font-mono text-[12px] text-[#93c5fd] break-words">
          [
          {inspectRow
            .slice(0, shownDims)
            .map((v) => (v >= 0 ? "+" : "") + v.toFixed(3))
            .join(", ")}
          {dModel > shownDims ? ", ..." : ""}]
        </p>
        <p className="text-[11px] text-[#94a3b8] leading-relaxed mt-2">
          Dimension pair 0 repeats every {firstWavelength.toFixed(2)} positions;
          the last pair ({lastPair}) repeats every{" "}
          {lastWavelength >= 1000
            ? Math.round(lastWavelength).toLocaleString("en-US")
            : lastWavelength.toFixed(2)}{" "}
          positions. Together the columns form a smooth binary-clock style
          fingerprint that is unique per position.
        </p>
      </div>
    </div>
  );
}
