"use client";

import React from "react";
import { DistributionType, DISTRIBUTIONS } from "./types";

interface Props {
  type: DistributionType;
  params: Record<string, number>;
  onChange: (key: string, value: number) => void;
}

export default function ParameterControls({ type, params, onChange }: Props) {
  const meta = DISTRIBUTIONS[type];

  return (
    <div className="space-y-4">
      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
        Parameters
      </p>
      {meta.paramDefs.map(p => {
        const value = params[p.key] ?? p.default;
        return (
          <div key={p.key}>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor={`param-${type}-${p.key}`}
                className="text-[12px] text-[#94a3b8]"
              >
                {p.label}
              </label>
              <span
                className="text-[12px] font-mono font-bold tabular-nums"
                style={{ color: meta.color }}
              >
                {value.toFixed(p.step < 0.1 ? 3 : p.step < 1 ? 2 : 1)}
              </span>
            </div>
            <input
              id={`param-${type}-${p.key}`}
              type="range"
              min={p.min}
              max={p.max}
              step={p.step}
              value={value}
              onChange={e => onChange(p.key, Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: meta.color }}
              aria-label={`${p.label} for ${meta.label} distribution`}
              aria-valuenow={value}
              aria-valuemin={p.min}
              aria-valuemax={p.max}
            />
            <div className="flex justify-between mt-0.5">
              <span className="text-[9px] text-[#334155]">{p.min}</span>
              <span className="text-[9px] text-[#334155]">{p.max}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
