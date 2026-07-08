"use client";

import React from "react";
import { DistributionType, DISTRIBUTIONS } from "./types";

interface Props {
  type: DistributionType;
  params: Record<string, number>;
}

export default function StatisticsDisplay({ type, params }: Props) {
  const meta = DISTRIBUTIONS[type];
  const stats = meta.getStats(params);

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">
        Statistics
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Object.entries(stats).map(([key, val]) => (
          <div
            key={key}
            className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] px-3 py-2"
          >
            <p
              className="text-[9px] font-semibold uppercase tracking-[1px] mb-0.5"
              style={{ color: "var(--color-accent)" }}
            >
              {key}
            </p>
            <p className="text-[13px] font-bold font-mono text-white tabular-nums leading-tight">
              {val}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
