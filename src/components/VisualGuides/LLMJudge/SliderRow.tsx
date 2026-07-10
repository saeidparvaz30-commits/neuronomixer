"use client";

import React from "react";

type Props = {
  id: string;
  label: string;
  description?: string;
  value: number;
  onChange: (v: number) => void;
  /** CSS color for the value readout and the slider accent */
  accent?: string;
};

export default function SliderRow({
  id,
  label,
  description,
  value,
  onChange,
  accent = "var(--color-accent)",
}: Props) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <label htmlFor={id} className="text-[12px] font-semibold text-white">
          {label}
        </label>
        <span className="text-[13px] font-mono font-bold" style={{ color: accent }}>
          {value}
        </span>
      </div>
      {description && (
        <p className="text-[11px] text-[#475569] leading-relaxed mb-2">{description}</p>
      )}
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
        style={{ accentColor: accent }}
      />
    </div>
  );
}
