"use client";

import React from "react";

export interface StatItem {
  label: string;
  display: string; // formatted value, computed upstream
  fraction: number; // 0..1 bar width
  color: string;
  highlighted?: boolean;
  note?: string;
}

interface Props {
  title: string;
  items: StatItem[];
}

export default function StatCompare({ title, items }: Props) {
  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">
        {title}
      </p>
      <div className="flex flex-col gap-3">
        {items.map((it) => (
          <div key={it.label}>
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span
                className={`text-[11px] leading-snug ${
                  it.highlighted ? "text-white font-semibold" : "text-[#94a3b8]"
                }`}
              >
                {it.label}
              </span>
              <span className="text-[15px] font-mono font-bold shrink-0" style={{ color: it.color }}>
                {it.display}
              </span>
            </div>
            <div className="h-2 rounded-full bg-[#1e293b] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, it.fraction * 100))}%`,
                  background: it.color,
                }}
              />
            </div>
            {it.note && <p className="text-[10px] text-[#475569] mt-1">{it.note}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
