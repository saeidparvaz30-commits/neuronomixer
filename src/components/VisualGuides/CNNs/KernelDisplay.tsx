"use client";

import { FilterDefinition } from "./types";

interface KernelDisplayProps {
  filter: FilterDefinition;
}

function cellStyle(val: number): React.CSSProperties {
  if (val > 0) {
    const intensity = Math.min(1, val / 8);
    return {
      background: `rgba(59,180,164,${0.15 + intensity * 0.55})`,
      color: "#f1f5f9",
      borderColor: `rgba(59,180,164,${0.3 + intensity * 0.4})`,
    };
  }
  if (val < 0) {
    const intensity = Math.min(1, Math.abs(val) / 8);
    return {
      background: `rgba(239,68,68,${0.15 + intensity * 0.55})`,
      color: "#f1f5f9",
      borderColor: `rgba(239,68,68,${0.3 + intensity * 0.4})`,
    };
  }
  return {
    background: "#1e293b",
    color: "#94a3b8",
    borderColor: "rgba(255,255,255,0.08)",
  };
}

export default function KernelDisplay({ filter }: KernelDisplayProps) {
  return (
    <div className="bg-[#1e293b]/60 border border-white/[0.07] rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white mb-1">Filter Kernel</h3>
      <p className="text-[11px] text-[#94a3b8] mb-3">
        3×3 weight matrix applied at each position
      </p>
      <div className="flex gap-4 items-start flex-wrap">
        <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(3, 44px)" }}>
          {filter.kernel.map((row, r) =>
            row.map((val, c) => (
              <div
                key={`${r}-${c}`}
                className="w-11 h-11 flex items-center justify-center text-sm font-bold rounded-lg border"
                style={cellStyle(val)}
              >
                {val}
              </div>
            ))
          )}
        </div>
        <div className="flex-1 min-w-[160px]">
          <p
            className="text-[12px] font-semibold mb-1"
            style={{ color: filter.color }}
          >
            {filter.detectsWhat}
          </p>
          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
            {filter.description}
          </p>
          <div className="flex gap-3 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(59,180,164,0.5)" }} />
              <span className="text-[10px] text-[#94a3b8]">Positive</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(239,68,68,0.5)" }} />
              <span className="text-[10px] text-[#94a3b8]">Negative</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#1e293b] border border-white/10" />
              <span className="text-[10px] text-[#94a3b8]">Zero</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
