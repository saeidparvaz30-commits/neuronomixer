"use client";

import React from "react";
import { DIMENSIONS, DimensionId, DimensionResult } from "./data";

interface Props {
  dims: Record<DimensionId, DimensionResult>;
}

function meterColor(pct: number): string {
  if (pct >= 0.9995) return "var(--color-success)";
  if (pct >= 0.75) return "var(--color-warning)";
  return "#ef4444";
}

function meterStatus(pct: number): string {
  if (pct >= 0.9995) return "clean";
  if (pct >= 0.75) return "degraded";
  return "critical";
}

export default function DimensionMeters({ dims }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {DIMENSIONS.map((dim) => {
        const res = dims[dim.id];
        const color = meterColor(res.pct);
        const status = meterStatus(res.pct);
        return (
          <div
            key={dim.id}
            className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4"
          >
            <div className="flex items-baseline justify-between gap-2 mb-0.5">
              <p className="text-[13px] font-semibold text-white">{dim.label}</p>
              <p className="text-[17px] font-black font-mono" style={{ color }}>
                {(res.pct * 100).toFixed(1)}%
              </p>
            </div>
            <p className="text-[11px] text-[#475569] mb-2">{dim.question}</p>
            <div
              className="h-2 rounded-full bg-[#1e293b] overflow-hidden"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(res.pct * 1000) / 10}
              aria-label={`${dim.label}: ${(res.pct * 100).toFixed(1)} percent, ${status}`}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${res.pct * 100}%`, background: color }}
              />
            </div>
            <div className="flex items-center justify-between gap-2 mt-1.5">
              <p className="text-[10px] text-[#475569]">{res.caption}</p>
              <p
                className="text-[10px] font-semibold uppercase tracking-wide shrink-0"
                style={{ color }}
              >
                {status}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
