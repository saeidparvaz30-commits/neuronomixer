"use client";

import { useMemo } from "react";
import { FilterDefinition } from "./types";

interface FeatureMapDisplayProps {
  /** Min-max rescaled 0-255 values, used only for cell brightness */
  outputGrid: number[][];
  /** True convolution responses (can be negative); used for all statistics */
  rawGrid: number[][];
  filter: FilterDefinition;
}

function activationColor(v: number): string {
  // Diverging color: 0 = dark, 255 = bright turquoise
  const norm = v / 255;
  if (norm >= 0.5) {
    // 0.5 → dark surface, 1 → bright turquoise
    const t = (norm - 0.5) * 2;
    const r = Math.round(30 * (1 - t) + 59 * t);
    const g = Math.round(41 * (1 - t) + 180 * t);
    const b = Math.round(59 * (1 - t) + 164 * t);
    return `rgb(${r},${g},${b})`;
  } else {
    // 0 → very dark, 0.5 → surface
    const t = norm * 2;
    const r = Math.round(15 * (1 - t) + 30 * t);
    const g = Math.round(23 * (1 - t) + 41 * t);
    const b = Math.round(42 * (1 - t) + 59 * t);
    return `rgb(${r},${g},${b})`;
  }
}

export default function FeatureMapDisplay({ outputGrid, rawGrid, filter }: FeatureMapDisplayProps) {
  // Statistics come from the RAW responses. Computing them on the min-max
  // rescaled display grid would always yield 255 / 0 by construction.
  const { maxVal, minVal, strongPct } = useMemo(() => {
    if (!rawGrid.length) return { maxVal: "0", minVal: "0", strongPct: 0 };
    const flat = rawGrid.flat();
    const max = Math.max(...flat);
    const min = Math.min(...flat);
    const strong =
      max > 0 ? flat.filter((v) => v > max / 2).length : 0;
    return {
      maxVal: max.toFixed(2),
      minVal: min.toFixed(2),
      strongPct: Math.round((strong / flat.length) * 100),
    };
  }, [rawGrid]);

  if (!outputGrid.length) {
    return (
      <div className="bg-[#1e293b]/60 border border-white/[0.07] rounded-2xl p-4 h-full flex items-center justify-center">
        <p className="text-[#94a3b8] text-sm">Run convolution to see feature map</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1e293b]/60 border border-white/[0.07] rounded-2xl p-4 flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-white mb-0.5">Feature Map</h3>
        <p className="text-[11px] text-[#94a3b8]">
          Where the <span style={{ color: filter.color }}>{filter.label}</span> filter activates
        </p>
      </div>

      {/* Color scale legend */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[#475569]">Low</span>
        <div
          className="flex-1 h-3 rounded-full"
          style={{
            background: `linear-gradient(90deg, rgb(15,23,42), rgb(30,41,59), ${filter.color})`,
          }}
        />
        <span className="text-[10px]" style={{ color: filter.color }}>High</span>
      </div>

      {/* Feature map grid */}
      <div className="flex justify-center">
        <div
          className="grid gap-1 p-2 bg-[#0f172a] rounded-xl"
          style={{ gridTemplateColumns: "repeat(6, 44px)" }}
        >
          {outputGrid.map((row, r) =>
            row.map((val, c) => {
              const raw = rawGrid[r]?.[c] ?? 0;
              return (
                <div
                  key={`fm-${r}-${c}`}
                  className="w-11 h-11 rounded-md flex items-center justify-center transition-all"
                  style={{ background: activationColor(val) }}
                  title={`(${r},${c}): response ${raw.toFixed(3)}`}
                >
                  <span
                    className="text-[9px] font-mono font-semibold"
                    style={{ color: val > 180 ? "#0f172a" : val > 80 ? "#f1f5f9" : "#475569" }}
                  >
                    {raw.toFixed(1)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[
          { label: "Max response", value: maxVal, color: filter.color },
          { label: "Min response", value: minVal, color: "#94a3b8" },
          { label: "Strong cells (>½ max)", value: `${strongPct}%`, color: "#3bb4a4" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-[#0f172a]/60 border border-white/[0.06] rounded-lg p-2.5 text-center"
          >
            <div className="text-base font-bold" style={{ color }}>
              {value}
            </div>
            <div className="text-[9px] text-[#475569] mt-0.5 leading-tight">{label}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#0f172a]/60 border border-white/[0.06] rounded-lg p-3">
        <p className="text-[11px] text-[#94a3b8] leading-relaxed">
          <span className="text-white font-semibold">Bright cells</span> = strong filter response.
          The pattern of activations reveals where the{" "}
          <span style={{ color: filter.color }}>{filter.detectsWhat.toLowerCase()}</span> appear
          in the input image.
        </p>
      </div>
    </div>
  );
}
