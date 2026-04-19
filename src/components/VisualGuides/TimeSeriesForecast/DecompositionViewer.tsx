"use client";

import React from "react";
import type { DecompositionResult } from "./types";
import TimeSeriesPlot from "./TimeSeriesPlot";

interface Props {
  original: number[];
  decomposition: DecompositionResult;
  labels: string[];
}

export default function DecompositionViewer({ original, decomposition, labels }: Props) {
  const { trend, seasonal, residual } = decomposition;

  const panels = [
    { title: "Observed", values: original, color: "#3bb4a4", showZero: false },
    { title: "Trend", values: trend, color: "#1e5d8a", showZero: false },
    { title: "Seasonal", values: seasonal, color: "#d4af37", showZero: true },
    { title: "Residual", values: residual, color: "#94a3b8", showZero: true },
  ];

  return (
    <div className="space-y-3">
      {panels.map((panel) => (
        <div
          key={panel.title}
          className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: panel.color }}
            />
            <span className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide">
              {panel.title}
            </span>
          </div>
          <TimeSeriesPlot
            values={panel.values}
            labels={labels}
            color={panel.color}
            height={150}
            showZeroLine={panel.showZero}
          />
        </div>
      ))}
      <p className="text-[11px] text-[#475569] leading-relaxed px-1">
        <span className="text-white">Additive decomposition:</span> Observed = Trend + Seasonal + Residual.
        The trend captures long-run direction, the seasonal component captures repeating patterns,
        and the residual is what neither model explains.
      </p>
    </div>
  );
}
