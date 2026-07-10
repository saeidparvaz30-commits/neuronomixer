"use client";

import React from "react";
import {
  Distribution,
  displayChar,
  SERIES_COLORS,
} from "./ngramMath";

export interface LastPick {
  char: string;
  prob: number;
  mode: "sampled" | "chosen";
  /** Present only for sampled picks: the uniform draw and its CDF slice. */
  u: number | null;
  lo: number | null;
  hi: number | null;
}

type Props = {
  dist: Distribution;
  lastPick: LastPick | null;
  onPick: (index: number) => void;
  disabled: boolean;
};

/**
 * The cumulative-probability strip: every slice is one candidate character,
 * width equal to its probability, and the marker shows where the last
 * uniform draw landed. Pure SVG, aria-hidden; the text equivalent lives
 * next to it in the client.
 */
function SampleStrip({ dist, lastPick }: { dist: Distribution; lastPick: LastPick | null }) {
  let acc = 0;
  const slices = dist.entries.map((e, i) => {
    const x = acc;
    acc += e.prob;
    return { char: e.char, x, w: e.prob, i };
  });
  const showMarker = lastPick !== null && lastPick.u !== null;
  return (
    <svg
      viewBox="0 0 100 10"
      preserveAspectRatio="none"
      className="w-full h-5 rounded-md overflow-hidden"
      aria-hidden="true"
    >
      {slices.map((s) => {
        const isPicked = showMarker && lastPick !== null && s.char === lastPick.char;
        return (
          <rect
            key={`${s.char}-${s.i}`}
            x={Number((s.x * 100).toFixed(2))}
            y={0}
            width={Number((s.w * 100).toFixed(2))}
            height={10}
            fill={
              isPicked
                ? "#d4af37"
                : s.i % 2 === 0
                  ? SERIES_COLORS.slice
                  : SERIES_COLORS.bar
            }
            opacity={isPicked ? 1 : 0.55}
          />
        );
      })}
      {showMarker && lastPick !== null && lastPick.u !== null && (
        <line
          x1={Number((lastPick.u * 100).toFixed(2))}
          x2={Number((lastPick.u * 100).toFixed(2))}
          y1={0}
          y2={10}
          stroke="#f1f5f9"
          strokeWidth={0.6}
        />
      )}
    </svg>
  );
}

/**
 * The probability bars over next characters. Every bar is a real button:
 * clicking it appends that character, so the whole visualization is
 * keyboard operable. Counts and probabilities come straight from the
 * distribution object; nothing is invented here.
 */
export default function DistributionBars({ dist, lastPick, onPick, disabled }: Props) {
  const maxProb = dist.entries.length > 0 ? dist.entries[0].prob : 1;
  return (
    <div>
      <div className="flex flex-col gap-1.5 mb-4">
        {dist.entries.map((e, i) => {
          const isPicked = lastPick !== null && e.char === lastPick.char;
          return (
            <button
              key={e.char}
              onClick={() => onPick(i)}
              disabled={disabled}
              aria-label={`Choose character ${e.char === " " ? "space" : e.char}, probability ${(100 * e.prob).toFixed(1)} percent, seen ${e.count} of ${dist.total} times`}
              className={`group grid grid-cols-[34px_1fr_150px] items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                isPicked
                  ? "border-[var(--color-accent)]"
                  : "border-[#1e293b] hover:border-[#334155]"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span
                className={`inline-flex w-6 h-6 items-center justify-center rounded-md text-[13px] font-mono font-bold ${
                  isPicked ? "text-[#0a0e1a]" : "text-[#f1f5f9]"
                }`}
                style={{
                  background: isPicked ? "var(--color-accent)" : "#1e293b",
                }}
              >
                {displayChar(e.char)}
              </span>
              <span className="h-3 rounded-full bg-[#1e293b] overflow-hidden block">
                <span
                  className="h-full rounded-full block transition-[width] duration-300"
                  style={{
                    width: `${((100 * e.prob) / maxProb).toFixed(2)}%`,
                    backgroundColor: isPicked ? "#d4af37" : SERIES_COLORS.bar,
                  }}
                />
              </span>
              <span className="text-[11px] font-mono text-[#94a3b8] whitespace-nowrap">
                {(100 * e.prob).toFixed(1)}%
                <span className="text-[#475569]">
                  {" "}
                  ({e.count}/{dist.total})
                </span>
                {isPicked && lastPick !== null && (
                  <span className="ml-1.5 font-sans font-semibold text-[var(--color-accent)]">
                    {lastPick.mode === "sampled" ? "sampled" : "your pick"}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1.5">
        The same distribution as one cumulative strip from 0 to 1
      </p>
      <SampleStrip dist={dist} lastPick={lastPick} />
      <p className="text-[11px] text-[#475569] leading-relaxed mt-1.5">
        {lastPick !== null && lastPick.u !== null && lastPick.lo !== null && lastPick.hi !== null ? (
          <>
            Last draw: u = {lastPick.u.toFixed(3)} landed in the slice for{" "}
            <span className="font-mono text-[var(--color-accent)]">
              {displayChar(lastPick.char)}
            </span>{" "}
            ({lastPick.lo.toFixed(3)} to {lastPick.hi.toFixed(3)}), which holds{" "}
            {(100 * lastPick.prob).toFixed(1)}% of the line.
          </>
        ) : lastPick !== null ? (
          <>
            You chose{" "}
            <span className="font-mono text-[var(--color-accent)]">
              {displayChar(lastPick.char)}
            </span>{" "}
            yourself, overriding the dice. Its slice holds{" "}
            {(100 * lastPick.prob).toFixed(1)}% of the line.
          </>
        ) : (
          <>
            Sampling means drawing a uniform number between 0 and 1 and taking
            whichever slice it lands in. Bigger slice, more likely character.
          </>
        )}
      </p>
    </div>
  );
}
