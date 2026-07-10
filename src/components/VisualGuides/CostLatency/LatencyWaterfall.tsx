"use client";

import React from "react";
import {
  computeLatency,
  formatMs,
  formatInt,
  formatPct,
  CATEGORY_ACCENT,
} from "./costMath";
import { LabeledSlider } from "./Controls";

type Props = {
  ttftMs: number;
  tpotMs: number;
  outputTokens: number;
  onTtftChange: (v: number) => void;
  onTpotChange: (v: number) => void;
};

const W = 720;
const H = 150;
const PAD_X = 10;
const BAR_H = 22;

export default function LatencyWaterfall({
  ttftMs,
  tpotMs,
  outputTokens,
  onTtftChange,
  onTpotChange,
}: Props) {
  const lat = computeLatency(ttftMs, tpotMs, outputTokens);
  const innerW = W - PAD_X * 2;
  const xOf = (ms: number) =>
    PAD_X + (lat.totalMs > 0 ? (ms / lat.totalMs) * innerW : 0);
  const ttftX = xOf(lat.ttftMs);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        <LabeledSlider
          id="lat-ttft"
          label="TTFT: time to first token"
          value={ttftMs}
          min={50}
          max={3000}
          step={25}
          onChange={onTtftChange}
          format={formatMs}
        />
        <LabeledSlider
          id="lat-tpot"
          label="TPOT: time per output token"
          value={tpotMs}
          min={5}
          max={100}
          step={1}
          onChange={onTpotChange}
          format={(v) => `${v} ms/token`}
        />
      </div>

      <p className="text-[11px] text-[#475569] mb-3">
        Output length comes from your workload above: {formatInt(outputTokens)}{" "}
        tokens. Total = TTFT + tokens × TPOT.
      </p>

      {/* Waterfall */}
      <div className="rounded-xl border border-[#1e293b] p-3 overflow-x-auto mb-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[520px]"
          role="img"
          aria-label={`Latency waterfall. TTFT ${formatMs(lat.ttftMs)}, then generation of ${formatInt(
            outputTokens
          )} tokens taking ${formatMs(lat.genMs)}, total ${formatMs(lat.totalMs)}.`}
        >
          {/* TTFT row */}
          <text x={PAD_X} y={20} fontSize={11} fill="#94a3b8">
            TTFT (network + queue + prefill): {formatMs(lat.ttftMs)}
          </text>
          <rect
            x={PAD_X}
            y={28}
            width={Math.max(ttftX - PAD_X, 1.5)}
            height={BAR_H}
            rx={4}
            fill={CATEGORY_ACCENT}
          />

          {/* Generation row */}
          <text x={PAD_X} y={72} fontSize={11} fill="#94a3b8">
            Generation: {formatInt(outputTokens)} tokens × {tpotMs} ms ={" "}
            {formatMs(lat.genMs)}
          </text>
          <rect
            x={ttftX}
            y={80}
            width={Math.max(W - PAD_X - ttftX, 1.5)}
            height={BAR_H}
            rx={4}
            fill="#1e5d8a"
          />

          {/* First-token marker */}
          <line
            x1={ttftX}
            y1={28}
            x2={ttftX}
            y2={108}
            stroke="#94a3b8"
            strokeDasharray="3 3"
          />

          {/* Axis */}
          <line
            x1={PAD_X}
            y1={122}
            x2={W - PAD_X}
            y2={122}
            stroke="#334155"
          />
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={PAD_X + innerW * f}
              y1={119}
              x2={PAD_X + innerW * f}
              y2={125}
              stroke="#334155"
            />
          ))}
          <text x={PAD_X} y={140} fontSize={10} fill="#475569">
            0
          </text>
          <text
            x={ttftX}
            y={140}
            fontSize={10}
            fill="#94a3b8"
            textAnchor={ttftX > W - 80 ? "end" : "middle"}
          >
            first token
          </text>
          <text x={W - PAD_X} y={140} fontSize={10} fill="#475569" textAnchor="end">
            {formatMs(lat.totalMs)}
          </text>
        </svg>
      </div>

      {/* Readouts */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Total wait
          </p>
          <p className="text-2xl font-black font-mono text-[#f1f5f9]">
            {formatMs(lat.totalMs)}
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            TTFT share
          </p>
          <p
            className="text-2xl font-black font-mono"
            style={{ color: CATEGORY_ACCENT }}
          >
            {formatPct(lat.ttftShare)}
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Throughput
          </p>
          <p className="text-2xl font-black font-mono text-[#93c5fd]">
            {lat.tokensPerSecond.toFixed(0)} tok/s
          </p>
        </div>
      </div>

      <p className="text-[11px] text-[#475569] leading-relaxed">
        TTFT bundles everything before the first token: network, queueing, and
        prompt prefill. How prefill and decode work inside the model is the LLMs
        category&apos;s story; on the product side you measure both knobs and
        decide which segment to attack. Long answers are usually generation
        bound, so trimming output length often beats faster hardware.
      </p>
    </div>
  );
}
