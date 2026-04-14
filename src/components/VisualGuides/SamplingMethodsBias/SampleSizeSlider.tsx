"use client";

import React from "react";

interface Props {
  value: number;
  onChange: (n: number) => void;
}

export default function SampleSizeSlider({ value, onChange }: Props) {
  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
          Sample Size
        </p>
        <span className="text-[14px] font-bold text-white font-mono">
          n = <span className="text-[#d4af37]">{value}</span>
        </span>
      </div>

      <div className="relative">
        <input
          type="range"
          min={10}
          max={200}
          step={10}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #d4af37 ${((value - 10) / (200 - 10)) * 100}%, #1e293b ${((value - 10) / (200 - 10)) * 100}%)`,
          }}
        />
      </div>

      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-[#334155]">10</span>
        <span className="text-[10px] text-[#334155]">100</span>
        <span className="text-[10px] text-[#334155]">200</span>
      </div>

      <p className="text-[10px] text-[#334155] mt-2">
        Larger samples tend to be more representative — adjust to see the effect.
      </p>
    </div>
  );
}
