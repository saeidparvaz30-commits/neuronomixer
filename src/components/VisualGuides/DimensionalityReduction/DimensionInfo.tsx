"use client";

import React from "react";
import { MethodType, METHOD_META } from "./data";

const STATS = [
  { label: "Original dims", value: "784D", note: "28×28 pixel MNIST image" },
  { label: "Reduced dims", value: "2D", note: "Viewable in a scatter plot" },
  { label: "Reduction", value: "98.1%", note: "Of dimensions removed" },
  { label: "Compression", value: "392×", note: "Fewer numbers to store" },
];

interface Props { method: MethodType }

export default function DimensionInfo({ method }: Props) {
  const meta = METHOD_META[method];
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
        Compression Stats
      </p>
      <div className="grid grid-cols-2 gap-2">
        {STATS.map(s => (
          <div key={s.label} className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3">
            <p className="text-[18px] font-black" style={{ color: meta.color }}>{s.value}</p>
            <p className="text-[10px] font-semibold text-white mt-0.5">{s.label}</p>
            <p className="text-[9px] text-[#475569] mt-0.5">{s.note}</p>
          </div>
        ))}
      </div>

      {/* Digit legend */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#475569] mb-2">Digit Classes</p>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 10 }, (_, i) => {
            const colors = [
              "#ef4444","#f97316","#eab308","#22c55e","#14b8a6",
              "#3b82f6","#8b5cf6","#ec4899","#f43f5e","#06b6d4",
            ];
            return (
              <div key={i} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: colors[i] }} />
                <span className="text-[10px] text-[#94a3b8]">{i}</span>
              </div>
            );
          })}
        </div>
        <p className="text-[9px] text-[#334155] mt-2">Hover points to highlight a digit class</p>
      </div>
    </div>
  );
}
