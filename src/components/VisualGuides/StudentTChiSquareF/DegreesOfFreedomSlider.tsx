"use client";

import React from "react";

interface DegreesOfFreedomSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  color?: string;
  hint?: string;
}

export default function DegreesOfFreedomSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  color = "var(--color-accent)",
  hint,
}: DegreesOfFreedomSliderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8]">
          {label}
        </span>
        <span
          className="text-[13px] font-mono font-bold tabular-nums"
          style={{ color }}
        >
          {value}
        </span>
      </div>

      <div className="relative h-5 flex items-center">
        {/* Track background */}
        <div className="absolute inset-0 flex items-center pointer-events-none">
          <div className="w-full h-1.5 rounded-full bg-[#1e293b]" />
          {/* Filled track */}
          <div
            className="absolute h-1.5 rounded-full transition-all duration-150"
            style={{
              width: `${((value - min) / (max - min)) * 100}%`,
              background: color,
            }}
          />
        </div>

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative w-full h-5 appearance-none bg-transparent cursor-pointer"
          style={
            {
              "--thumb-color": color,
            } as React.CSSProperties
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#475569]">{min}</span>
        {hint && (
          <span className="text-[10px] text-[#475569] italic text-center px-2">
            {hint}
          </span>
        )}
        <span className="text-[10px] text-[#475569]">{max}</span>
      </div>

      {/* Slider thumb styling via global CSS injection */}
      <style>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--thumb-color, var(--color-accent));
          border: 2px solid #0f172a;
          cursor: pointer;
          box-shadow: 0 0 0 2px var(--thumb-color, var(--color-accent))33;
          transition: box-shadow 0.15s;
        }
        input[type='range']::-webkit-slider-thumb:hover {
          box-shadow: 0 0 0 4px var(--thumb-color, var(--color-accent))44;
        }
        input[type='range']::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--thumb-color, var(--color-accent));
          border: 2px solid #0f172a;
          cursor: pointer;
        }
        input[type='range']:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
}
