"use client";

import React, { useState } from "react";

interface WeightedAverageBuilderProps {
  onAdjust: () => void;
}

interface Category {
  name: string;
  weight: number;
  score: number;
}

const INITIAL_CATEGORIES: Category[] = [
  { name: "Exam", weight: 40, score: 90 },
  { name: "Project", weight: 30, score: 95 },
  { name: "Participation", weight: 20, score: 80 },
  { name: "Final", weight: 10, score: 70 },
];

function normalize(cats: Category[]): Category[] {
  const total = cats.reduce((s, c) => s + c.weight, 0);
  if (total === 0) return cats;
  return cats.map((c) => ({ ...c, weight: Math.round((c.weight / total) * 100) }));
}

export default function WeightedAverageBuilder({ onAdjust }: WeightedAverageBuilderProps) {
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);

  function handleWeight(index: number, rawVal: number) {
    const updated = categories.map((c, i) => (i === index ? { ...c, weight: rawVal } : c));
    setCategories(normalize(updated));
    onAdjust();
  }

  function handleScore(index: number, val: number) {
    setCategories((prev) => prev.map((c, i) => (i === index ? { ...c, score: val } : c)));
    onAdjust();
  }

  const weightedAvg = categories.reduce((sum, c) => sum + (c.score * c.weight) / 100, 0);

  const COLORS = ["#3b82f6", "#3bb4a4", "#a855f7", "var(--color-warning)"];

  return (
    <div className="space-y-5">
      {/* Formula */}
      <div className="inline-flex items-center gap-2 rounded-lg border border-[#1e293b] bg-[#0a0e1a] px-4 py-2">
        <span className="text-[12px] text-[#94a3b8] font-mono">
          Weighted Avg = Σ(Score_i × Weight_i / 100)
        </span>
      </div>

      {/* Category controls */}
      <div className="space-y-4">
        {categories.map((cat, i) => (
          <div key={cat.name} className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold" style={{ color: COLORS[i] }}>
                {cat.name}
              </span>
              <span className="text-[12px] text-[#94a3b8] font-mono">
                {cat.score} × {cat.weight}% = {((cat.score * cat.weight) / 100).toFixed(1)} pts
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#475569] mb-1.5">
                  Weight: {cat.weight}%
                </label>
                <input
                  type="range"
                  aria-label={`${cat.name} weight`}
                  min={1}
                  max={80}
                  step={1}
                  value={cat.weight}
                  onChange={(e) => handleWeight(i, Number(e.target.value))}
                  className="w-full h-1"
                  style={{ accentColor: COLORS[i] }}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-[#475569] mb-1.5">
                  Score: {cat.score}
                </label>
                <input
                  type="range"
                  aria-label={`${cat.name} score`}
                  min={0}
                  max={100}
                  step={1}
                  value={cat.score}
                  onChange={(e) => handleScore(i, Number(e.target.value))}
                  className="w-full h-1"
                  style={{ accentColor: COLORS[i] }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-4">
        <p className="text-[10px] uppercase tracking-widest text-[#475569] mb-3">
          Score vs Weighted Contribution
        </p>
        <div className="flex items-end gap-3" style={{ height: 120 }}>
          {categories.map((cat, i) => {
            const scorePct = cat.score / 100;
            const contribPct = (cat.score * cat.weight) / 100 / 100;
            const scoreH = Math.round(scorePct * 100);
            const contribH = Math.round(contribPct * 100);
            return (
              <div key={cat.name} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-0.5" style={{ height: 100 }}>
                  <div
                    className="flex-1 rounded-t transition-all duration-300 opacity-40"
                    style={{ height: scoreH, background: COLORS[i] }}
                    title={`Score: ${cat.score}`}
                  />
                  <div
                    className="flex-1 rounded-t transition-all duration-300"
                    style={{ height: contribH, background: "var(--color-accent)" }}
                    title={`Contribution: ${((cat.score * cat.weight) / 100).toFixed(1)}`}
                  />
                </div>
                <span className="text-[9px] text-[#475569] text-center leading-tight">{cat.name}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#3b82f6]/40" />
            <span className="text-[11px] text-[#94a3b8]">Score (raw)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[var(--color-accent)]" />
            <span className="text-[11px] text-[#94a3b8]">Weighted contribution</span>
          </div>
        </div>
      </div>

      {/* Result */}
      <div className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#94a3b8] mb-1">Weighted Average</p>
          <p className="text-3xl font-black text-[var(--color-accent)]">{weightedAvg.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-[#475569] mb-1">Weights sum to</p>
          <p className="text-xl font-bold text-white">{categories.reduce((s, c) => s + c.weight, 0)}%</p>
          <p className="text-[10px] text-[#3bb4a4]">auto-normalized</p>
        </div>
      </div>

      {/* Explanation */}
      <div className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-4">
        <p className="text-[13px] text-[#94a3b8] leading-relaxed">
          A <span className="font-semibold text-white">weighted average</span> accounts for importance. The final exam at 50% weight pulls your average more than a 5%-weighted quiz. Adjust weights to see how your grade responds.
        </p>
      </div>
    </div>
  );
}
