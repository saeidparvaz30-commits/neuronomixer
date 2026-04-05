"use client";

import React from "react";
import { DistType, DISTRIBUTIONS } from "./types";

const DIST_ORDER: DistType[] = ["normal", "uniform", "skewed-right", "skewed-left", "bimodal"];

interface Props {
  current: DistType;
  onChange: (d: DistType) => void;
}

export default function DistributionSelector({ current, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {DIST_ORDER.map(d => {
        const meta = DISTRIBUTIONS[d];
        const active = d === current;
        return (
          <button
            key={d}
            onClick={() => onChange(d)}
            className="px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-colors"
            style={{
              borderColor: active ? meta.color : "#1e293b",
              color: active ? meta.color : "#475569",
              background: active ? meta.color + "14" : "transparent",
            }}
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
