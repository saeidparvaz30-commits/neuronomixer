"use client";

import React from "react";
import {
  AttnVariant,
  Dtype,
  DTYPES,
  dtypeBytes,
  GPU_CITATION,
  GPUS,
  GQA_GROUP_SIZE,
  kvCacheBytes,
  kvHeadsFor,
  formatBytes,
  formatSeq,
  Preset,
  PRESET_CITATION,
  PRESETS,
  SEQ_OPTIONS,
} from "./kvMath";

interface Props {
  seqIdx: number;
  layers: number;
  heads: number;
  headDim: number;
  dtype: Dtype;
  variant: AttnVariant;
  onSeqIdx: (v: number) => void;
  onLayers: (v: number) => void;
  onHeads: (v: number) => void;
  onHeadDim: (v: number) => void;
  onDtype: (v: Dtype) => void;
  onVariant: (v: AttnVariant) => void;
  onPreset: (p: Preset) => void;
}

const VARIANTS: { id: AttnVariant; label: string; sub: string }[] = [
  { id: "mha", label: "MHA", sub: "every head keeps K/V" },
  { id: "gqa", label: "GQA", sub: `${GQA_GROUP_SIZE} q heads share one K/V` },
  { id: "mqa", label: "MQA", sub: "all heads share one K/V" },
];

function Slider({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={`kv-slider-${label}`} className="text-[11px] text-[#94a3b8]">
          {label}
        </label>
        <span className="text-[12px] font-mono font-bold text-white">{display}</span>
      </div>
      <input
        id={`kv-slider-${label}`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#d4af37]"
        aria-label={label}
      />
    </div>
  );
}

export default function MemoryCalculator({
  seqIdx,
  layers,
  heads,
  headDim,
  dtype,
  variant,
  onSeqIdx,
  onLayers,
  onHeads,
  onHeadDim,
  onDtype,
  onVariant,
  onPreset,
}: Props) {
  const seqLen = SEQ_OPTIONS[seqIdx];
  const bytes = dtypeBytes(dtype);
  const kvHeads = kvHeadsFor(variant, heads);
  const total = kvCacheBytes({ layers, kvHeads, headDim, seqLen, bytesPerValue: bytes });
  const mhaTotal = kvCacheBytes({ layers, kvHeads: heads, headDim, seqLen, bytesPerValue: bytes });
  const shrink = mhaTotal / total;

  return (
    <div>
      {/* Presets */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-[11px] text-[#475569]">Presets:</span>
        {PRESETS.map((p) => {
          const active =
            p.layers === layers &&
            p.heads === heads &&
            p.headDim === headDim &&
            p.variant === variant;
          return (
            <button
              key={p.id}
              onClick={() => onPreset(p)}
              aria-pressed={active}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                active
                  ? "border-[#d4af37] text-[var(--color-accent)]"
                  : "border-[#334155] text-[#94a3b8] hover:border-[#d4af37] hover:text-[#d4af37]"
              }`}
            >
              {p.label}
              {active ? " (active)" : ""}
            </button>
          );
        })}
        <span className="text-[10px] text-[#475569] w-full sm:w-auto">{PRESET_CITATION}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <Slider
            label="Sequence length (cached tokens)"
            value={seqIdx}
            display={formatSeq(seqLen)}
            min={0}
            max={SEQ_OPTIONS.length - 1}
            step={1}
            onChange={onSeqIdx}
          />
          <Slider
            label="Layers"
            value={layers}
            display={`${layers}`}
            min={4}
            max={96}
            step={4}
            onChange={onLayers}
          />
          <Slider
            label="Query heads"
            value={heads}
            display={`${heads}`}
            min={8}
            max={128}
            step={8}
            onChange={onHeads}
          />
          <Slider
            label="Head dimension"
            value={headDim}
            display={`${headDim}`}
            min={32}
            max={256}
            step={32}
            onChange={onHeadDim}
          />

          {/* Dtype */}
          <div>
            <p className="text-[11px] text-[#94a3b8] mb-1.5">Cache dtype</p>
            <div role="radiogroup" aria-label="Cache dtype" className="flex gap-2">
              {DTYPES.map((d) => (
                <button
                  key={d.id}
                  role="radio"
                  aria-checked={dtype === d.id}
                  onClick={() => onDtype(d.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                    dtype === d.id
                      ? "border-[#d4af37] text-[var(--color-accent)] bg-[#d4af37]/10"
                      : "border-[#334155] text-[#94a3b8] hover:border-[#d4af37]"
                  }`}
                >
                  {d.label} ({d.bytes} B)
                </button>
              ))}
            </div>
          </div>

          {/* Attention variant */}
          <div>
            <p className="text-[11px] text-[#94a3b8] mb-1.5">
              Attention variant (KV heads: <span className="font-mono text-white">{kvHeads}</span>)
            </p>
            <div role="radiogroup" aria-label="Attention variant" className="flex flex-wrap gap-2">
              {VARIANTS.map((v) => (
                <button
                  key={v.id}
                  role="radio"
                  aria-checked={variant === v.id}
                  onClick={() => onVariant(v.id)}
                  className={`px-3 py-1.5 rounded-lg text-left border transition-colors ${
                    variant === v.id
                      ? "border-[#d4af37] bg-[#d4af37]/10"
                      : "border-[#334155] hover:border-[#d4af37]"
                  }`}
                >
                  <span
                    className={`block text-[11px] font-semibold ${
                      variant === v.id ? "text-[var(--color-accent)]" : "text-white"
                    }`}
                  >
                    {v.label}
                  </span>
                  <span className="block text-[9px] text-[#475569]">{v.sub}</span>
                </button>
              ))}
            </div>
            {variant !== "mha" && (
              <p className="text-[11px] text-[#94a3b8] mt-2">
                {variant === "gqa" ? "GQA" : "MQA"} shrinks the cache{" "}
                <span className="font-mono font-bold text-[var(--color-success)]">
                  {shrink.toFixed(1)}x
                </span>{" "}
                vs MHA ({formatBytes(mhaTotal)} to {formatBytes(total)}). Attention FLOPs are
                unchanged: every query head still takes dot products, they just share the
                stored K/V.
              </p>
            )}
          </div>
        </div>

        {/* Readout */}
        <div>
          <div className="rounded-xl border border-[#1e293b] bg-[#162032] p-4 mb-4">
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-2">
              KV cache size (batch 1)
            </p>
            <p className="text-3xl font-black font-mono text-[var(--color-accent)] mb-3">
              {formatBytes(total)}
            </p>
            <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[10px] leading-relaxed rounded-lg p-3 overflow-x-auto">
{`2 (K+V) x ${layers} layers x ${kvHeads} kv heads
  x ${headDim} dims x ${formatSeq(seqLen)} tokens x ${bytes} B
= ${total.toLocaleString("en-US")} bytes`}
            </pre>
          </div>

          {/* GPU comparison */}
          <p className="text-[11px] text-[#94a3b8] mb-2">
            Cache alone as a share of GPU memory (weights, activations, and framework overhead
            still need their own room):
          </p>
          <div className="space-y-2.5">
            {GPUS.map((gpu) => {
              const cap = gpu.gb * 1024 ** 3;
              const pct = (total / cap) * 100;
              const width = Math.min(100, pct);
              const over = pct > 100;
              return (
                <div key={gpu.name}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] text-[#94a3b8]">
                      {gpu.name} ({gpu.gb} GB)
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        over
                          ? "text-[#ef4444]"
                          : pct > 50
                          ? "text-[var(--color-warning)]"
                          : "text-[var(--color-success)]"
                      }`}
                    >
                      {over ? `${(pct / 100).toFixed(1)}x over capacity` : `${pct.toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#1e293b] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${width.toFixed(2)}%`,
                        background: over
                          ? "#ef4444"
                          : pct > 50
                          ? "var(--color-warning)"
                          : "var(--color-success)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-[#475569] mt-2">{GPU_CITATION}</p>
        </div>
      </div>
    </div>
  );
}
