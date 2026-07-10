"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  computeLatency,
  tokensVisibleAt,
  racePlayback,
  formatMs,
  formatInt,
  CATEGORY_ACCENT,
} from "./costMath";

type Props = {
  ttftMs: number;
  tpotMs: number;
  outputTokens: number;
  done: boolean;
  onDone: () => void;
};

export default function StreamRace({
  ttftMs,
  tpotMs,
  outputTokens,
  done,
  onDone,
}: Props) {
  const [simMs, setSimMs] = useState(0);
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const rafRef = useRef<number | null>(null);

  const lat = computeLatency(ttftMs, tpotMs, outputTokens);
  const { speed } = racePlayback(lat.totalMs);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const play = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    setHasRun(true);

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // Skip the animation; jump straight to the finished comparison.
      setSimMs(lat.totalMs);
      setRunning(false);
      onDone();
      return;
    }

    const total = lat.totalMs;
    const spd = speed;
    const start = performance.now();
    setSimMs(0);
    setRunning(true);

    const tick = (now: number) => {
      const sim = (now - start) * spd;
      if (sim >= total) {
        setSimMs(total);
        setRunning(false);
        rafRef.current = null;
        onDone();
        return;
      }
      setSimMs(sim);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const streamedTokens = tokensVisibleAt(simMs, ttftMs, tpotMs, outputTokens);
  const streamFrac = outputTokens > 0 ? streamedTokens / outputTokens : 0;
  const blockingDone = simMs >= lat.totalMs && hasRun;
  const finished = hasRun && !running && simMs >= lat.totalMs;
  const soonerFactor = lat.ttftMs > 0 ? lat.totalMs / lat.ttftMs : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={play}
          disabled={running}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
            running
              ? "border-[#1e293b] text-[#475569] cursor-not-allowed"
              : "border-[#334155] text-white hover:border-[#94a3b8]"
          }`}
        >
          {running ? "Racing..." : hasRun ? "Replay the race" : "Run the race"}
        </button>
        <span className="text-[11px] text-[#475569] font-mono">
          elapsed {formatMs(Math.min(simMs, lat.totalMs))} / {formatMs(lat.totalMs)}
          {speed > 1.01 ? ` (playback ${speed.toFixed(1)}x)` : ""}
        </span>
      </div>

      <div className="flex flex-col gap-4 mb-4">
        {/* Streaming lane */}
        <div className="rounded-xl border border-[#1e293b] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-semibold text-white">Streaming</p>
            <p className="text-[11px] font-mono" style={{ color: CATEGORY_ACCENT }}>
              {!hasRun
                ? "first content at " + formatMs(lat.ttftMs)
                : streamedTokens === 0
                  ? "waiting for first token..."
                  : `token ${formatInt(streamedTokens)} / ${formatInt(outputTokens)}`}
            </p>
          </div>
          <div className="h-3 rounded-full bg-[#1e293b] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${streamFrac * 100}%`,
                background: CATEGORY_ACCENT,
              }}
            />
          </div>
          <p className="text-[10px] text-[#475569] mt-1.5">
            Reading starts at TTFT ({formatMs(lat.ttftMs)}); the rest of the
            answer arrives while the user is already reading.
          </p>
        </div>

        {/* Blocking lane */}
        <div className="rounded-xl border border-[#1e293b] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-semibold text-white">Blocking</p>
            <p className="text-[11px] font-mono text-[#93c5fd]">
              {blockingDone ? (
                `entire answer at ${formatMs(lat.totalMs)}`
              ) : running ? (
                <span className="animate-pulse">nothing on screen yet...</span>
              ) : (
                `first content at ${formatMs(lat.totalMs)}`
              )}
            </p>
          </div>
          <div className="h-3 rounded-full bg-[#1e293b] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#1e5d8a]"
              style={{ width: blockingDone ? "100%" : "0%" }}
            />
          </div>
          <p className="text-[10px] text-[#475569] mt-1.5">
            Same request, same {formatMs(lat.totalMs)} of compute. The user just
            stares at a spinner until the last token exists.
          </p>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed" aria-live="polite">
        {finished ? (
          <span className="text-[var(--color-success)]">
            Race finished: streaming showed content after {formatMs(lat.ttftMs)},
            blocking after {formatMs(lat.totalMs)}. That is {soonerFactor.toFixed(1)}x
            sooner to first content, with zero change in cost or total compute.
          </span>
        ) : (
          <span className="text-[#475569]">
            Both lanes use the exact numbers from your waterfall above. Run the
            race to see why streaming is the cheapest latency optimization you
            will ever ship.
          </span>
        )}
      </p>
      {done && !finished && (
        <p className="text-[10px] text-[#475569] mt-1">
          (Race already completed for this session.)
        </p>
      )}
    </div>
  );
}
