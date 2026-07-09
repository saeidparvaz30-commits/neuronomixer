"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Prices,
  CacheKnobs,
  cacheRequestCosts,
  cacheCumulative,
  cacheBreakEven,
  steadyCacheSavings,
  formatUSD,
  formatInt,
  formatPct,
  formatMult,
  MAX_REUSE,
  CATEGORY_ACCENT,
} from "./costMath";
import { LabeledSlider } from "./Controls";

type Props = {
  promptTokens: number;
  outputTokens: number;
  requestsPerDay: number;
  prices: Prices;
  knobs: CacheKnobs;
  nReuse: number;
  onKnobChange: (field: keyof CacheKnobs, value: number) => void;
  onNReuseChange: (v: number) => void;
  solved: boolean;
  onSolved: () => void;
};

type Feedback = "low" | "high" | "correct" | null;

const CW = 720;
const CH = 240;
const PAD = { left: 56, right: 14, top: 12, bottom: 30 };

export default function CacheSavings({
  promptTokens,
  outputTokens,
  requestsPerDay,
  prices,
  knobs,
  nReuse,
  onKnobChange,
  onNReuseChange,
  solved,
  onSolved,
}: Props) {
  const [feedback, setFeedback] = useState<Feedback>(null);

  const rc = cacheRequestCosts(promptTokens, prices.inPerMTok, knobs);
  const atN = cacheCumulative(nReuse, promptTokens, outputTokens, prices, knobs);
  const breakEven = cacheBreakEven(promptTokens, outputTokens, prices, knobs);
  const savings = steadyCacheSavings(
    { promptTokens, outputTokens, requestsPerDay },
    prices,
    knobs
  );

  const series = useMemo(
    () =>
      Array.from({ length: MAX_REUSE }, (_, i) => {
        const n = i + 1;
        return {
          n,
          ...cacheCumulative(n, promptTokens, outputTokens, prices, knobs),
        };
      }),
    [promptTokens, outputTokens, prices, knobs]
  );

  // A knob change moves the break-even; stale feedback would mislead.
  useEffect(() => {
    if (!solved) setFeedback(null);
  }, [breakEven, solved]);

  const check = () => {
    if (breakEven !== null && nReuse === breakEven) {
      setFeedback("correct");
      onSolved();
    } else if (breakEven !== null && nReuse > breakEven) {
      setFeedback("high");
    } else {
      setFeedback("low");
    }
  };

  // Chart scales
  const innerW = CW - PAD.left - PAD.right;
  const innerH = CH - PAD.top - PAD.bottom;
  const maxY =
    Math.max(
      series[series.length - 1].uncachedTotal,
      series[series.length - 1].cachedTotal
    ) * 1.08 || 1;
  const xOf = (n: number) => PAD.left + ((n - 1) / (MAX_REUSE - 1)) * innerW;
  const yOf = (v: number) => PAD.top + innerH - (v / maxY) * innerH;
  const uncachedPath = series.map((p) => `${xOf(p.n)},${yOf(p.uncachedTotal)}`).join(" ");
  const cachedPath = series.map((p) => `${xOf(p.n)},${yOf(p.cachedTotal)}`).join(" ");

  return (
    <div>
      {/* Knobs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-2">
        <LabeledSlider
          id="cache-share"
          label="Cached prefix share of prompt"
          value={Math.round(knobs.cachedShare * 100)}
          min={5}
          max={95}
          step={5}
          onChange={(v) => onKnobChange("cachedShare", v / 100)}
          format={(v) => `${v}%`}
        />
        <LabeledSlider
          id="cache-write"
          label="Cache write rate (x input price)"
          value={knobs.writeMult}
          min={1}
          max={2}
          step={0.05}
          onChange={(v) => onKnobChange("writeMult", v)}
          format={formatMult}
        />
        <LabeledSlider
          id="cache-read"
          label="Cache read rate (x input price)"
          value={knobs.readMult}
          min={0.05}
          max={0.9}
          step={0.05}
          onChange={(v) => onKnobChange("readMult", v)}
          format={formatMult}
        />
      </div>
      <p className="text-[11px] text-[#475569] leading-relaxed mb-4">
        The write and read rates are editable multipliers of your input price,
        defaults illustrative as of July 2026: writing the prefix costs a
        premium once, rereading it gets a deep discount. Cached prefix here:{" "}
        {formatInt(rc.cachedTokens)} of {formatInt(promptTokens)} prompt tokens.
      </p>

      {/* Per-request economics */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Input cost, no cache
          </p>
          <p className="text-[15px] font-mono font-bold text-[#f1f5f9]">
            {formatUSD(rc.plainCost)}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">every request</p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            First request (write)
          </p>
          <p className="text-[15px] font-mono font-bold text-[var(--color-warning)]">
            {formatUSD(rc.writeCost)}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            {rc.writeCost > rc.plainCost
              ? `+${formatUSD(rc.writeCost - rc.plainCost)} premium`
              : "no premium"}
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Later requests (read)
          </p>
          <p className="text-[15px] font-mono font-bold text-[var(--color-success)]">
            {formatUSD(rc.readCost)}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            saves {formatPct(savings.inputShareSaved, 1)} of the input bill
          </p>
        </div>
      </div>

      {/* Cumulative chart */}
      <div className="rounded-xl border border-[#1e293b] p-3 overflow-x-auto mb-4">
        <div className="flex items-center gap-4 px-1 pb-2">
          <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
            <span className="inline-block w-4 h-0.5 bg-[#94a3b8]" /> no cache
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
            <span
              className="inline-block w-4 h-0.5"
              style={{ background: CATEGORY_ACCENT }}
            />{" "}
            with cache
          </span>
        </div>
        <svg
          viewBox={`0 0 ${CW} ${CH}`}
          className="w-full min-w-[520px]"
          role="img"
          aria-label={`Cumulative cost of ${nReuse} requests reusing the same prefix: ${formatUSD(
            atN.uncachedTotal
          )} without caching versus ${formatUSD(atN.cachedTotal)} with caching.`}
        >
          {/* Axes */}
          <line
            x1={PAD.left}
            y1={PAD.top}
            x2={PAD.left}
            y2={CH - PAD.bottom}
            stroke="#334155"
          />
          <line
            x1={PAD.left}
            y1={CH - PAD.bottom}
            x2={CW - PAD.right}
            y2={CH - PAD.bottom}
            stroke="#334155"
          />
          {[0, 0.5, 1].map((f) => (
            <text
              key={f}
              x={PAD.left - 6}
              y={yOf(maxY * f) + 3}
              fontSize={10}
              fill="#475569"
              textAnchor="end"
            >
              {formatUSD(maxY * f)}
            </text>
          ))}
          {[1, 5, 10, 15, 20].map((n) => (
            <text
              key={n}
              x={xOf(n)}
              y={CH - PAD.bottom + 16}
              fontSize={10}
              fill="#475569"
              textAnchor="middle"
            >
              {n}
            </text>
          ))}
          <text
            x={CW - PAD.right}
            y={CH - 4}
            fontSize={10}
            fill="#475569"
            textAnchor="end"
          >
            requests reusing the prefix
          </text>

          {/* Break-even marker, revealed once found */}
          {solved && breakEven !== null && (
            <g>
              <line
                x1={xOf(breakEven)}
                y1={PAD.top}
                x2={xOf(breakEven)}
                y2={CH - PAD.bottom}
                stroke="var(--color-success)"
                strokeDasharray="4 3"
              />
              <text
                x={xOf(breakEven)}
                y={PAD.top + 10}
                fontSize={10}
                fill="var(--color-success)"
                textAnchor="middle"
              >
                break-even: {breakEven}
              </text>
            </g>
          )}

          {/* Current-n marker */}
          <line
            x1={xOf(nReuse)}
            y1={PAD.top}
            x2={xOf(nReuse)}
            y2={CH - PAD.bottom}
            stroke="#475569"
            strokeDasharray="2 3"
          />

          {/* Cost lines */}
          <polyline
            points={uncachedPath}
            fill="none"
            stroke="#94a3b8"
            strokeWidth={2}
          />
          <polyline
            points={cachedPath}
            fill="none"
            stroke={CATEGORY_ACCENT}
            strokeWidth={2}
          />
          <circle
            cx={xOf(nReuse)}
            cy={yOf(atN.uncachedTotal)}
            r={4}
            fill="#94a3b8"
          />
          <circle
            cx={xOf(nReuse)}
            cy={yOf(atN.cachedTotal)}
            r={4}
            fill={CATEGORY_ACCENT}
          />
        </svg>
      </div>

      {/* Challenge */}
      <div className="rounded-xl border border-[#1e293b] p-4">
        <p className="text-[12px] font-semibold text-white mb-1">
          Find the break-even
        </p>
        <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
          The first request pays the write premium, so caching starts out MORE
          expensive. Move the slider to the smallest number of requests at which
          the cached total drops below the no-cache total, then lock it in.
        </p>
        <LabeledSlider
          id="cache-reuse"
          label="Requests reusing this prefix"
          value={nReuse}
          min={1}
          max={MAX_REUSE}
          step={1}
          onChange={onNReuseChange}
          format={formatInt}
        />
        <p className="text-[12px] font-mono mt-2 mb-3" aria-live="polite">
          <span className="text-[#94a3b8]">
            no cache {formatUSD(atN.uncachedTotal)} vs cached{" "}
            {formatUSD(atN.cachedTotal)}:{" "}
          </span>
          {atN.delta > 0 ? (
            <span className="text-[var(--color-warning)]">
              caching costs {formatUSD(atN.delta)} more here
            </span>
          ) : atN.delta < 0 ? (
            <span className="text-[var(--color-success)]">
              caching saves {formatUSD(-atN.delta)} here
            </span>
          ) : (
            <span className="text-[#94a3b8]">dead even</span>
          )}
        </p>

        {solved ? (
          <div className="rounded-xl border border-[var(--color-success)]/40 p-3">
            <p className="text-[12px] text-[var(--color-success)] leading-relaxed">
              Break-even found: with these rates the cache pays for itself at
              request {breakEven ?? nReuse}. From there on, every reuse saves{" "}
              {formatUSD(savings.perRequestSaved)} of input spend, about{" "}
              {formatUSD(savings.perMonthSaved)} per month at your workload
              (steady state, ignoring the one-time write).
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={check}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#334155] text-white hover:border-[#94a3b8] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              This is the break-even
            </button>
            {feedback === "low" && (
              <span className="text-[11px] text-[var(--color-warning)]" role="status">
                Not yet: at {nReuse} request{nReuse === 1 ? "" : "s"} caching
                still costs the same or more. Push higher.
              </span>
            )}
            {feedback === "high" && (
              <span className="text-[11px] text-[var(--color-warning)]" role="status">
                Caching is already cheaper here, but this is not the SMALLEST
                such count. Walk it back.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
