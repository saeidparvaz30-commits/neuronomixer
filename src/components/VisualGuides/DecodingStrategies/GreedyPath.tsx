"use client";

import React from "react";
import { GreedyStep, SEED, displayChar, displayText } from "./decodingMath";

interface Props {
  steps: GreedyStep[];
  selected: number | null;
  onSelect: (index: number) => void;
}

/**
 * The greedy decode path: one chip per generated character. Selecting a
 * chip reveals the full next-char distribution the model saw at that step,
 * with the argmax (the char greedy took) highlighted.
 */
export default function GreedyPath({ steps, selected, onSelect }: Props) {
  const sel = selected !== null ? steps[selected] : null;

  return (
    <div>
      {/* Chip row: seed + one button per greedy step */}
      <div className="flex flex-wrap items-center gap-1 mb-4" role="group" aria-label="Greedy decode path, one button per generated character">
        <span className="px-2 py-1 rounded-md bg-[#1e293b] text-[12px] font-mono text-[#94a3b8] mr-1" aria-label={`Seed text: ${SEED}`}>
          {displayText(SEED)}
        </span>
        {steps.map((s) => (
          <button
            key={s.index}
            onClick={() => onSelect(s.index)}
            aria-pressed={selected === s.index}
            aria-label={`Step ${s.index + 1}: character ${s.char === " " ? "space" : s.char}, log-prob ${s.logProb.toFixed(2)}`}
            className={`w-7 h-8 rounded-md text-[13px] font-mono transition-colors border ${
              selected === s.index
                ? "border-[var(--color-accent)] bg-[#d4af37]/10 text-[var(--color-accent)] font-bold"
                : "border-[#1e293b] bg-[#0f172a] text-[#f1f5f9] hover:border-[#334155]"
            }`}
          >
            {displayChar(s.char)}
          </button>
        ))}
      </div>

      {sel === null ? (
        <p className="text-[12px] text-[#475569] leading-relaxed">
          Select any character above to see the exact distribution the model
          held at that step, and why greedy took what it took.
        </p>
      ) : (
        <div className="rounded-xl border border-[#1e293b] bg-[#162032] p-4">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-3">
            <p className="text-[12px] text-[#94a3b8]">
              Step {sel.index + 1}: context{" "}
              <span className="font-mono text-white">
                &quot;{displayText(sel.context)}&quot;
              </span>{" "}
              (order {sel.usedOrder})
            </p>
            <p className="text-[12px] text-[#94a3b8]">
              greedy took{" "}
              <span className="font-mono text-[var(--color-accent)] font-bold">
                {displayChar(sel.char)}
              </span>{" "}
              at log-prob {sel.logProb.toFixed(3)}
            </p>
            <p className="text-[12px] text-[#94a3b8]">
              cumulative log-prob {sel.cumLogProb.toFixed(2)}
            </p>
          </div>
          <div className="space-y-1.5">
            {sel.dist.slice(0, 8).map((d, i) => (
              <div key={d.char} className="flex items-center gap-2">
                <span
                  className={`w-6 text-center font-mono text-[12px] ${
                    i === 0 ? "text-[var(--color-accent)] font-bold" : "text-[#94a3b8]"
                  }`}
                >
                  {displayChar(d.char)}
                </span>
                <div className="flex-1 h-4 rounded bg-[#0f172a] overflow-hidden">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${(d.prob * 100).toFixed(2)}%`,
                      background: i === 0 ? "var(--color-accent)" : "#334155",
                    }}
                  />
                </div>
                <span className="w-14 text-right font-mono text-[11px] text-[#94a3b8]">
                  {(d.prob * 100).toFixed(1)}%
                </span>
                {i === 0 && (
                  <span className="text-[10px] uppercase tracking-wide text-[var(--color-accent)] font-semibold">
                    argmax
                  </span>
                )}
              </div>
            ))}
            {sel.dist.length > 8 && (
              <p className="text-[10px] text-[#475569]">
                plus {sel.dist.length - 8} more characters with smaller mass
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
