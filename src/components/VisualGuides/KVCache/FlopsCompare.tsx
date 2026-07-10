"use client";

import React, { useMemo } from "react";
import {
  decodeStepFlops,
  formatFlops,
  formatSeq,
  fullCausalAttnFlops,
  totalFlopsWithCache,
  totalFlopsWithoutCache,
} from "./kvMath";

export const PROMPT_OPTIONS = [128, 256, 512, 1024, 2048, 4096, 8192];
export const GEN_OPTIONS = [64, 128, 256, 512, 1024, 2048, 4096];

interface Props {
  layers: number;
  heads: number;
  headDim: number;
  promptIdx: number;
  genIdx: number;
  onPromptIdx: (v: number) => void;
  onGenIdx: (v: number) => void;
}

const W = 640;
const H = 260;
const PAD = { left: 64, right: 16, top: 16, bottom: 34 };
const SAMPLES = 48;

export default function FlopsCompare({
  layers,
  heads,
  headDim,
  promptIdx,
  genIdx,
  onPromptIdx,
  onGenIdx,
}: Props) {
  const prompt = PROMPT_OPTIONS[promptIdx];
  const gen = GEN_OPTIONS[genIdx];

  const { withPath, withoutPath, yMax, totalWith, totalWithout } = useMemo(() => {
    const yMaxRaw = fullCausalAttnFlops(prompt + gen, layers, heads, headDim);
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;
    const x = (t: number) => PAD.left + (t / gen) * plotW;
    const y = (v: number) => PAD.top + plotH - (v / yMaxRaw) * plotH;
    let wp = "";
    let wop = "";
    for (let i = 0; i <= SAMPLES; i++) {
      const t = Math.max(1, Math.round((gen * i) / SAMPLES));
      const cmd = i === 0 ? "M" : "L";
      wp += `${cmd}${x(t).toFixed(2)},${y(decodeStepFlops(prompt + t, layers, heads, headDim)).toFixed(2)} `;
      wop += `${cmd}${x(t).toFixed(2)},${y(fullCausalAttnFlops(prompt + t, layers, heads, headDim)).toFixed(2)} `;
    }
    return {
      withPath: wp.trim(),
      withoutPath: wop.trim(),
      yMax: yMaxRaw,
      totalWith: totalFlopsWithCache(prompt, gen, layers, heads, headDim),
      totalWithout: totalFlopsWithoutCache(prompt, gen, layers, heads, headDim),
    };
  }, [prompt, gen, layers, heads, headDim]);

  const speedup = totalWithout / totalWith;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 max-w-[560px]">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="kv-flops-prompt" className="text-[11px] text-[#94a3b8]">
              Prompt length
            </label>
            <span className="text-[12px] font-mono font-bold text-white">
              {formatSeq(prompt)} tokens
            </span>
          </div>
          <input
            id="kv-flops-prompt"
            type="range"
            min={0}
            max={PROMPT_OPTIONS.length - 1}
            step={1}
            value={promptIdx}
            onChange={(e) => onPromptIdx(Number(e.target.value))}
            className="w-full accent-[#d4af37]"
            aria-label="Prompt length"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="kv-flops-gen" className="text-[11px] text-[#94a3b8]">
              Tokens to generate
            </label>
            <span className="text-[12px] font-mono font-bold text-white">
              {formatSeq(gen)} tokens
            </span>
          </div>
          <input
            id="kv-flops-gen"
            type="range"
            min={0}
            max={GEN_OPTIONS.length - 1}
            step={1}
            value={genIdx}
            onChange={(e) => onGenIdx(Number(e.target.value))}
            className="w-full accent-[#d4af37]"
            aria-label="Tokens to generate"
          />
        </div>
      </div>

      {/* Chart */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[560px] h-auto"
          role="img"
          aria-label={`Attention FLOPs per decode step for ${formatSeq(gen)} generated tokens after a ${formatSeq(prompt)} token prompt. Without a cache the per step cost grows quadratically to ${formatFlops(fullCausalAttnFlops(prompt + gen, layers, heads, headDim))}. With a cache it grows linearly to ${formatFlops(decodeStepFlops(prompt + gen, layers, heads, headDim))}.`}
        >
          {/* Gridlines + y labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const yy = PAD.top + (H - PAD.top - PAD.bottom) * (1 - f);
            return (
              <g key={f}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={yy.toFixed(2)}
                  y2={yy.toFixed(2)}
                  stroke="#1e293b"
                  strokeWidth="1"
                />
                <text
                  x={PAD.left - 6}
                  y={(yy + 3).toFixed(2)}
                  textAnchor="end"
                  fill="#475569"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {formatFlops(yMax * f)}
                </text>
              </g>
            );
          })}
          {/* x labels */}
          <text x={PAD.left} y={H - 12} fill="#475569" fontSize="9" fontFamily="monospace">
            token 1
          </text>
          <text
            x={W - PAD.right}
            y={H - 12}
            textAnchor="end"
            fill="#475569"
            fontSize="9"
            fontFamily="monospace"
          >
            token {gen}
          </text>
          <text
            x={(PAD.left + W - PAD.right) / 2}
            y={H - 12}
            textAnchor="middle"
            fill="#475569"
            fontSize="9"
          >
            generated token index
          </text>

          <path d={withoutPath} fill="none" stroke="var(--color-warning)" strokeWidth="2.5" strokeDasharray="6 4" />
          <path d={withPath} fill="none" stroke="var(--color-accent)" strokeWidth="2.5" />
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-5 mt-2 mb-4 text-[10px] text-[#94a3b8]">
        <span className="flex items-center gap-1.5">
          <svg width="22" height="6" aria-hidden="true">
            <line x1="0" y1="3" x2="22" y2="3" stroke="var(--color-accent)" strokeWidth="2.5" />
          </svg>
          with cache (solid): linear per step
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="22" height="6" aria-hidden="true">
            <line
              x1="0"
              y1="3"
              x2="22"
              y2="3"
              stroke="var(--color-warning)"
              strokeWidth="2.5"
              strokeDasharray="5 3"
            />
          </svg>
          without cache (dashed): quadratic per step
        </span>
      </div>

      {/* Totals (text equivalent of the chart) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] mb-1">Total, with cache</p>
          <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
            {formatFlops(totalWith)}
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] mb-1">Total, without cache</p>
          <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
            {formatFlops(totalWithout)}
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] mb-1">Attention work saved</p>
          <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
            {speedup.toFixed(1)}x less
          </p>
        </div>
      </div>
      <p className="text-[10px] text-[#475569] mt-2">
        Counts cover attention scores and weighted sums only (QK^T and AV from the attention
        formula), per layer per query head. Projections, MLP blocks, and softmax are excluded
        on both sides, so the ratio isolates what caching saves.
      </p>
    </div>
  );
}
