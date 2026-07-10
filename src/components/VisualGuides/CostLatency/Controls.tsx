"use client";

import React, { useEffect, useState } from "react";
import { CATEGORY_ACCENT } from "./costMath";

type SliderProps = {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
};

export function LabeledSlider({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: SliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="text-[12px] text-[#94a3b8]">
          {label}
        </label>
        <span className="text-[12px] font-mono text-[#f1f5f9]">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        id={id}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
        style={{ accentColor: CATEGORY_ACCENT }}
      />
    </div>
  );
}

type PriceFieldProps = {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
};

export function PriceField({ id, label, value, onChange }: PriceFieldProps) {
  const [text, setText] = useState(() => String(value));

  // Sync external resets (Try Again) without clobbering in-progress typing.
  useEffect(() => {
    setText((prev) => (Number(prev) === value ? prev : String(value)));
  }, [value]);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[11px] text-[#94a3b8]">
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <span className="text-[12px] font-mono text-[#475569]">$</span>
        <input
          type="number"
          id={id}
          inputMode="decimal"
          min={0}
          step={0.05}
          value={text}
          onChange={(e) => {
            const raw = e.target.value;
            setText(raw);
            const parsed = Number(raw);
            if (Number.isFinite(parsed) && parsed >= 0) onChange(parsed);
          }}
          className="w-24 bg-[#1e293b] border border-[#334155] rounded-lg px-2 py-1.5 text-[13px] font-mono text-[#f1f5f9] focus:outline-none focus:border-[#94a3b8]"
        />
        <span className="text-[11px] text-[#475569]">/MTok</span>
      </div>
    </div>
  );
}
