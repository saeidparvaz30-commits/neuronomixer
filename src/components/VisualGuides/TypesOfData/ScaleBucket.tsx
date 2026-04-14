"use client";

import React from "react";
import type { Scale, DataExample } from "./types";
import { SCALE_INFO } from "./types";

interface Props {
  scale: Scale;
  items: DataExample[];
  isOver: boolean;
  phase: 1 | 2;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragLeave: () => void;
}

export default function ScaleBucket({ scale, items, isOver, phase, onDragOver, onDrop, onDragLeave }: Props) {
  const info = SCALE_INFO[scale];

  return (
    <div
      role="region"
      aria-label={`Drop zone for ${info.name} data`}
      aria-describedby={`bucket-desc-${scale}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
      className={`rounded-2xl border-2 transition-all min-h-[120px] p-3 ${
        isOver
          ? "border-[#d4af37] bg-[#d4af37]/5"
          : "border-[#1e293b] bg-[#0f172a] hover:border-[#334155]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <span
            className="text-[12px] font-bold"
            style={{ color: info.color }}
          >
            {info.name}
          </span>
          <span
            id={`bucket-desc-${scale}`}
            className="block text-[10px] text-[#475569] mt-0.5 leading-tight"
          >
            {info.description}
          </span>
        </div>
        {items.length > 0 && (
          <span className="text-[10px] font-semibold text-[#94a3b8] bg-[#1e293b] rounded-full px-2 py-0.5">
            {items.length}
          </span>
        )}
      </div>

      {/* Dropped items */}
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#1e293b] border border-[#334155] text-[11px] text-white"
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-[11px] text-[#334155] italic">
            {phase === 1 ? "Drop cards here" : "Empty"}
          </p>
        )}
      </div>
    </div>
  );
}
