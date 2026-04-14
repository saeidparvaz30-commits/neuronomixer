"use client";

import React, { useState } from "react";

interface GrowthCalculatorProps {
  onAdjust: () => void;
}

const DISPLAY_YEARS = [1, 5, 10, 15, 20, 25, 30];

export default function GrowthCalculator({ onAdjust }: GrowthCalculatorProps) {
  const [initialAmount, setInitialAmount] = useState(100);
  const [annualRate, setAnnualRate] = useState(5);
  const [years, setYears] = useState(10);

  function handleChange<T>(setter: (v: T) => void, value: T) {
    setter(value);
    onAdjust();
  }

  const rate = annualRate / 100;
  const clampedYears = Math.min(years, 30);

  // Values at display years (only those <= selected years)
  const activeYears = DISPLAY_YEARS.filter((y) => y <= clampedYears);
  if (activeYears.length === 0 || activeYears[activeYears.length - 1] !== clampedYears) {
    // Always include the selected year
    const lastActive = activeYears[activeYears.length - 1];
    if (!lastActive || lastActive !== clampedYears) {
      activeYears.push(clampedYears);
    }
  }

  const simpleValues = activeYears.map((y) => initialAmount + initialAmount * rate * y);
  const compoundValues = activeYears.map((y) => initialAmount * Math.pow(1 + rate, y));

  const finalSimple = initialAmount + initialAmount * rate * clampedYears;
  const finalCompound = initialAmount * Math.pow(1 + rate, clampedYears);
  const difference = finalCompound - finalSimple;

  // Bar chart max
  const allValues = [...simpleValues, ...compoundValues];
  const maxValue = Math.max(...allValues);

  const BAR_HEIGHT = 140;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-2">
            Initial Amount
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={100}
              max={1000}
              step={50}
              value={initialAmount}
              onChange={(e) => handleChange(setInitialAmount, Number(e.target.value))}
              className="flex-1 accent-[#d4af37] h-1"
            />
            <span className="text-sm font-semibold text-white w-14 text-right">${initialAmount}</span>
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-2">
            Annual Rate
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0.5}
              max={10}
              step={0.5}
              value={annualRate}
              onChange={(e) => handleChange(setAnnualRate, Number(e.target.value))}
              className="flex-1 accent-[#d4af37] h-1"
            />
            <span className="text-sm font-semibold text-white w-14 text-right">{annualRate}%</span>
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-2">
            Years
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={30}
              step={1}
              value={years}
              onChange={(e) => handleChange(setYears, Number(e.target.value))}
              className="flex-1 accent-[#d4af37] h-1"
            />
            <span className="text-sm font-semibold text-white w-14 text-right">{years} yr</span>
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-4 overflow-x-auto">
        <div className="flex items-end gap-2 min-w-[360px]" style={{ height: BAR_HEIGHT + 32 }}>
          {activeYears.map((y, i) => {
            const sVal = simpleValues[i];
            const cVal = compoundValues[i];
            const sH = Math.round((sVal / maxValue) * BAR_HEIGHT);
            const cH = Math.round((cVal / maxValue) * BAR_HEIGHT);
            return (
              <div key={y} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full flex items-end gap-0.5" style={{ height: BAR_HEIGHT }}>
                  {/* Simple bar */}
                  <div
                    className="flex-1 rounded-t bg-[#3b82f6]/70 transition-all duration-300"
                    style={{ height: sH }}
                    title={`Simple: $${sVal.toFixed(0)}`}
                  />
                  {/* Compound bar */}
                  <div
                    className="flex-1 rounded-t bg-[#d4af37]/80 transition-all duration-300"
                    style={{ height: cH }}
                    title={`Compound: $${cVal.toFixed(0)}`}
                  />
                </div>
                <span className="text-[9px] text-[#475569]">yr{y}</span>
              </div>
            );
          })}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#3b82f6]/70" />
            <span className="text-[11px] text-[#94a3b8]">Simple</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#d4af37]/80" />
            <span className="text-[11px] text-[#94a3b8]">Compound</span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4">
          <p className="text-[10px] uppercase tracking-widest text-[#475569] mb-1">Simple Final</p>
          <p className="text-xl font-bold text-[#3b82f6]">${finalSimple.toFixed(2)}</p>
          <p className="text-[10px] text-[#475569] mt-1">
            {initialAmount} + ({initialAmount} × {(rate * 100).toFixed(1)}% × {years})
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4">
          <p className="text-[10px] uppercase tracking-widest text-[#475569] mb-1">Compound Final</p>
          <p className="text-xl font-bold text-[#d4af37]">${finalCompound.toFixed(2)}</p>
          <p className="text-[10px] text-[#475569] mt-1">
            {initialAmount} × (1 + {(rate * 100).toFixed(1)}%)^{years}
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-4">
          <p className="text-[10px] uppercase tracking-widest text-[#475569] mb-1">Compound Advantage</p>
          <p className="text-xl font-bold text-[#3bb4a4]">+${difference.toFixed(2)}</p>
          <p className="text-[10px] text-[#475569] mt-1">
            {((difference / finalSimple) * 100).toFixed(1)}% more than simple
          </p>
        </div>
      </div>

      {/* Explanation */}
      <div className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-4">
        <p className="text-[13px] text-[#94a3b8] leading-relaxed">
          <span className="font-semibold text-white">Simple growth</span> increases linearly.{" "}
          <span className="font-semibold text-[#d4af37]">Compound growth</span> multiplies — each year, the interest earns interest. Over 30 years, compound growth can be 2–3× larger.
        </p>
      </div>
    </div>
  );
}
