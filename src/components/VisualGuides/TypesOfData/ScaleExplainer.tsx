"use client";

import React from "react";
import type { Scale } from "./types";
import { SCALE_INFO } from "./types";
import { DATA_EXAMPLES } from "./types";
import ValidOperationsPanel from "./ValidOperationsPanel";

interface Props {
  scale: Scale;
  sortedItems: string[];
}

export default function ScaleExplainer({ scale, sortedItems }: Props) {
  const info = SCALE_INFO[scale];
  const placed = DATA_EXAMPLES.filter((e) => sortedItems.includes(e.id));

  return (
    <div
      className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 flex flex-col h-full"
      style={{ borderTopColor: info.color, borderTopWidth: 2 }}
    >
      <div className="mb-3">
        <span className="text-[13px] font-bold" style={{ color: info.color }}>{info.name}</span>
        <p className="text-[11px] text-[#94a3b8] mt-0.5 leading-tight">{info.description}</p>
      </div>

      {/* Cards in this bucket */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {placed.map((item) => (
          <div key={item.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#1e293b] text-[11px] text-white">
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <ValidOperationsPanel scale={scale} />
    </div>
  );
}
