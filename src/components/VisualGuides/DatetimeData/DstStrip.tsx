"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  DstMode,
  EVENTS,
  STRIP_LEN,
  fmtDate,
  fmtOffset,
  fmtTime,
  localParts,
  naiveWallDiffMin,
  pad2,
  stripCells,
  trueDiffMin,
  zoneById,
} from "./timeModel";

type Props = {
  mode: DstMode;
  onModeChange: (m: DstMode) => void;
  cursor: number;
  onCursorChange: (i: number) => void;
  springCrossed: boolean;
  fallCrossed: boolean;
};

const MODES: Array<{ id: DstMode; label: string }> = [
  { id: "spring", label: "Spring forward (Mar 31)" },
  { id: "fall", label: "Fall back (Oct 27)" },
];

export default function DstStrip({
  mode,
  onModeChange,
  cursor,
  onCursorChange,
  springCrossed,
  fallCrossed,
}: Props) {
  const cells = stripCells(mode);
  const cur = cells[cursor];
  const cet = zoneById("cet");

  // Naive-arithmetic bug, computed live from the event pairs and the zone model
  const [pairA, pairB] =
    mode === "spring" ? [EVENTS[2], EVENTS[3]] : [EVENTS[4], EVENTS[5]];
  const trueMin = trueDiffMin(pairA.utc, pairB.utc);
  const naiveMin = naiveWallDiffMin(cet, pairA.utc, pairB.utc);
  const aLocal = localParts(cet, pairA.utc);
  const bLocal = localParts(cet, pairB.utc);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div
          role="radiogroup"
          aria-label="DST transition"
          className="inline-flex rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1"
        >
          {MODES.map((m) => {
            const isActive = m.id === mode;
            return (
              <button
                key={m.id}
                role="radio"
                aria-checked={isActive}
                onClick={() => onModeChange(m.id)}
                className={`relative px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                  isActive ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="dt-dst-pill"
                    className="absolute inset-0 rounded-lg bg-[var(--color-accent)]"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative">{m.label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className={springCrossed ? "text-[var(--color-success)]" : "text-[#475569]"}>
            {springCrossed ? "✓ " : "○ "}spring crossed
          </span>
          <span className={fallCrossed ? "text-[var(--color-success)]" : "text-[#475569]"}>
            {fallCrossed ? "✓ " : "○ "}fall crossed
          </span>
        </div>
      </div>

      {/* Hour strip: UTC row is even; local row jumps or repeats */}
      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {cells.map((c, i) => (
              <div
                key={`u${i}`}
                className={`rounded-lg px-2 py-1.5 text-center border ${
                  i === cursor ? "border-[var(--color-accent)]" : "border-[#1e293b]"
                } bg-[#0f172a]`}
              >
                <p className="text-[9px] uppercase tracking-wide text-[#475569]">UTC</p>
                <p className="text-[12px] font-mono text-[#94a3b8]">{fmtTime(c.utcParts)}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((c, i) => {
              const isAmbiguous =
                mode === "fall" && c.local.h === 2 && (i === 2 || i === 3);
              const isJump = mode === "spring" && i === 3;
              return (
                <div
                  key={`l${i}`}
                  className={`rounded-lg px-2 py-1.5 text-center border ${
                    i === cursor ? "border-[var(--color-accent)]" : "border-[#1e293b]"
                  } ${isAmbiguous || isJump ? "bg-[#162032]" : "bg-[#0f172a]"}`}
                >
                  <p className="text-[9px] uppercase tracking-wide text-[#475569]">
                    {c.offsetMin === 120 ? "CEST" : "CET"}
                  </p>
                  <p
                    className="text-[12px] font-mono font-semibold"
                    style={{
                      color: isAmbiguous
                        ? "var(--color-warning)"
                        : isJump
                          ? "var(--color-warning)"
                          : "#f1f5f9",
                    }}
                  >
                    {fmtTime(c.local)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <p className="text-[10px] text-[#475569] mt-1.5">
        {mode === "spring"
          ? "Local labels read 01:00 then 03:00: the wall clock never shows 02:xx on Mar 31. The UTC row underneath stays perfectly even."
          : "Local 02:00 appears twice (once as CEST, once as CET): a bare local timestamp 02:30 on Oct 27 names two different instants."}
      </p>

      {/* Cursor */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <label htmlFor="dst-cursor" className="text-[11px] text-[#94a3b8] whitespace-nowrap">
          Step hour by hour
        </label>
        <input
          id="dst-cursor"
          type="range"
          min={0}
          max={STRIP_LEN - 1}
          step={1}
          value={cursor}
          onChange={(e) => onCursorChange(Number(e.target.value))}
          className="w-full sm:max-w-[300px] accent-[#d4af37]"
        />
        <p className="text-[12px] font-mono text-white whitespace-nowrap">
          UTC {fmtTime(cur.utcParts)} {"->"} local{" "}
          <span className="text-[var(--color-accent)]">{fmtTime(cur.local)}</span>{" "}
          <span className="text-[#475569]">(UTC{fmtOffset(cur.offsetMin)})</span>
        </p>
      </div>

      {/* The naive bug, computed */}
      <div className="mt-4 rounded-xl border border-[#1e293b] bg-[#0f172a] p-4">
        <p className="text-[12px] font-semibold text-white mb-2">
          The bug this causes: subtracting wall-clock times
        </p>
        <p className="text-[11px] text-[#94a3b8] leading-relaxed mb-3">
          Take two real events from the timeline above: {pairA.label.toLowerCase()} and{" "}
          {pairB.label.toLowerCase()}. In local Central European wall-clock time they read{" "}
          {fmtDate(aLocal)} {fmtTime(aLocal)} and {fmtDate(bLocal)} {fmtTime(bLocal)}. Subtract
          the UTC instants and you get the truth. Subtract the local clock readings, the way
          naive code does, and you get the lie:
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-[#1e293b] p-3">
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
              True elapsed (UTC arithmetic)
            </p>
            <p className="text-xl font-black font-mono" style={{ color: "var(--color-success)" }}>
              {trueMin >= 0 ? "" : "-"}
              {Math.floor(Math.abs(trueMin) / 60)}h {pad2(Math.abs(trueMin) % 60)}m
            </p>
          </div>
          <div className="rounded-lg border border-[#1e293b] p-3">
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
              Naive local subtraction
            </p>
            <p className="text-xl font-black font-mono" style={{ color: "var(--color-warning)" }}>
              {naiveMin < 0 ? "-" : ""}
              {Math.floor(Math.abs(naiveMin) / 60)}h {pad2(Math.abs(naiveMin) % 60)}m
            </p>
            <p className="text-[10px] text-[#475569] mt-1">
              {mode === "spring"
                ? `double-counts the skipped hour: off by +${naiveMin - trueMin} min`
                : `the ticket "escalates" ${Math.abs(naiveMin)} minutes before it was opened`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
