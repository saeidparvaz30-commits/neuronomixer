"use client";

import React, { useMemo } from "react";
import {
  Person,
  ChannelId,
  CHANNELS,
  BIASED_CHANNEL_IDS,
  mean,
} from "./types";

interface Props {
  people: readonly Person[];
  channel: ChannelId;
  onChannelChange: (c: ChannelId) => void;
  nonResponse: boolean;
  onNonResponseChange: (v: boolean) => void;
  visited: ReadonlySet<ChannelId>;
}

const COLS = 25;
const CELL = 20;
const R = 5.5;

function ageColor(age: number): string {
  if (age < 35) return "#3bb4a4";
  if (age < 60) return "#60a5fa";
  return "#a855f7";
}

function fmtGap(gap: number): string {
  return `${gap >= 0 ? "+" : ""}${gap.toFixed(2)} h`;
}

export default function ChannelExplorer({
  people,
  channel,
  onChannelChange,
  nonResponse,
  onNonResponseChange,
  visited,
}: Props) {
  const activeMeta = CHANNELS.find((c) => c.id === channel)!;

  const trueMean = useMemo(() => mean(people.map((p) => p.hours)), [people]);

  const reached = useMemo(
    () => people.filter((p) => activeMeta.reaches(p)),
    [people, activeMeta]
  );
  const collected = useMemo(
    () => (nonResponse ? reached.filter((p) => p.willAnswer) : reached),
    [reached, nonResponse]
  );
  const sampleMean = useMemo(() => mean(collected.map((p) => p.hours)), [collected]);
  const gap = sampleMean - trueMean;

  // Channel-only gaps (before the non-response layer) for the comparison chart.
  const channelGaps = useMemo(() => {
    return BIASED_CHANNEL_IDS.map((id) => {
      const meta = CHANNELS.find((c) => c.id === id)!;
      const sample = people.filter((p) => meta.reaches(p));
      return {
        id,
        meta,
        n: sample.length,
        gap: mean(sample.map((p) => p.hours)) - trueMean,
      };
    });
  }, [people, trueMean]);

  const collectedSet = useMemo(() => new Set(collected), [collected]);
  const maxAbsGap = Math.max(0.5, ...channelGaps.map((g) => Math.abs(g.gap)));

  const svgHeight = Math.ceil(people.length / COLS) * CELL;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Dot grid */}
      <div className="lg:col-span-3 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <p className="text-[13px] font-semibold text-white">
            The city: {people.length} people, sorted by age
          </p>
          <div className="flex items-center gap-3 text-[10px] text-[#94a3b8]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#3bb4a4" }} />
              18 to 34
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#60a5fa" }} />
              35 to 59
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#a855f7" }} />
              60 plus
            </span>
          </div>
        </div>
        <svg
          viewBox={`0 0 ${COLS * CELL} ${svgHeight}`}
          className="w-full h-auto"
          role="img"
          aria-label={`Dot grid of ${people.length} residents sorted by age. With the ${activeMeta.label} channel, ${collected.length} of ${people.length} people appear in the collected data; the rest are dimmed because the channel can never reach them.`}
        >
          {people.map((p, i) => {
            const inSample = collectedSet.has(p);
            return (
              <circle
                key={i}
                cx={(i % COLS) * CELL + CELL / 2}
                cy={Math.floor(i / COLS) * CELL + CELL / 2}
                r={R}
                fill={ageColor(p.age)}
                opacity={inSample ? 0.95 : 0.1}
              />
            );
          })}
        </svg>
        <p className="text-[11px] text-[#475569] mt-3 leading-relaxed">
          Dimmed dots are people this channel can never reach. They are not
          refusing; they are structurally invisible. {activeMeta.whoIsMissing}
        </p>
      </div>

      {/* Controls + stats */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">
            Pick a collection channel
          </p>
          <div
            role="radiogroup"
            aria-label="Data collection channel"
            className="flex flex-col gap-2 mb-4"
          >
            {CHANNELS.map((c) => {
              const isActive = channel === c.id;
              const isVisited = visited.has(c.id);
              return (
                <button
                  key={c.id}
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => onChannelChange(c.id)}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-left text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                    isActive
                      ? "border-[var(--color-accent)] text-white bg-[#1e293b]"
                      : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ background: c.color }}
                      aria-hidden="true"
                    />
                    {c.label}
                  </span>
                  {isVisited && c.id !== "census" && (
                    <span className="text-[10px] text-[var(--color-success)]">compared</span>
                  )}
                </button>
              );
            })}
          </div>
          <label className="flex items-start gap-2 text-[11px] text-[#94a3b8] cursor-pointer">
            <input
              type="checkbox"
              checked={nonResponse}
              onChange={(e) => onNonResponseChange(e.target.checked)}
              className="mt-0.5"
              style={{ accentColor: "var(--color-accent)" }}
            />
            <span>
              Add non-response: only people willing to answer respond. Heavier
              internet users are more willing to talk about internet use, so
              this layer pushes the estimate up on top of the channel skew.
            </span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
              True city average
            </p>
            <p className="text-2xl font-black font-mono text-[#f1f5f9]">
              {trueMean.toFixed(2)} h
            </p>
            <p className="text-[10px] text-[#475569] mt-1">
              all {people.length} residents
            </p>
          </div>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
              Your sample says
            </p>
            <p className="text-2xl font-black font-mono text-[#f1f5f9]">
              {sampleMean.toFixed(2)} h
            </p>
            <p className="text-[10px] text-[#475569] mt-1">
              n = {collected.length}
              {nonResponse ? ` of ${reached.length} reached` : " reached"}
            </p>
          </div>
          <div className="col-span-2 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">Gap vs truth</p>
            <p
              className="text-2xl font-black font-mono"
              style={{
                color:
                  Math.abs(gap) >= 0.3
                    ? "var(--color-warning)"
                    : "var(--color-success)",
              }}
            >
              {fmtGap(gap)}
            </p>
            <p className="text-[10px] text-[#475569] mt-1">{activeMeta.whoAnswers}</p>
          </div>
        </div>

        {/* Gap chart per channel */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">
            Channel-only gap vs truth (no non-response layer)
          </p>
          <div className="flex flex-col gap-2">
            {channelGaps.map(({ id, meta, n, gap: g }) => {
              const isVisited = visited.has(id);
              const widthPct = (Math.abs(g) / maxAbsGap) * 50;
              return (
                <div key={id} className="flex items-center gap-2">
                  <span className="w-[72px] shrink-0 text-[11px] text-[#94a3b8]">
                    {meta.short}
                  </span>
                  <div className="relative h-4 flex-1 rounded bg-[#1e293b] overflow-hidden">
                    <span className="absolute left-1/2 top-0 bottom-0 w-px bg-[#334155]" />
                    {isVisited && (
                      <span
                        className="absolute top-0 bottom-0 rounded-sm"
                        style={{
                          background: meta.color,
                          left: g < 0 ? `${50 - widthPct}%` : "50%",
                          width: `${widthPct}%`,
                        }}
                      />
                    )}
                  </div>
                  <span className="w-[64px] shrink-0 text-right text-[11px] font-mono text-[#94a3b8]">
                    {isVisited ? `${fmtGap(g)} (n=${n})` : "?"}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-[#475569] mt-3 leading-relaxed">
            Bars appear as you visit each channel. Compare at least two against
            the truth. Notice the mall intercept: its gap is small because it
            mixes students (high) with retirees (low), yet the entire
            working-age middle is still missing. A small gap on one metric is
            not a certificate that the channel is unbiased.
          </p>
        </div>
      </div>
    </div>
  );
}
