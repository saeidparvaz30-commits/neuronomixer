"use client";

import React from "react";
import {
  BATCH_SIZE,
  CharProb,
  ExperimentPoint,
  SampleResult,
  SamplerSettings,
  TruncMethod,
  TruncRow,
  displayChar,
  displayText,
} from "./decodingMath";

interface Props {
  settings: SamplerSettings;
  onTemperature: (t: number) => void;
  onMethod: (m: TruncMethod) => void;
  onParam: (v: number) => void;
  /** Tempered + truncated distribution at the seed context. */
  previewRows: TruncRow[];
  /** Base (untempered) distribution at the seed context. */
  baseDist: CharProb[];
  oneSample: SampleResult | null;
  onSampleOne: () => void;
  experiments: ExperimentPoint[];
  onRunBatch: () => void;
}

const METHODS: { id: TruncMethod; label: string }[] = [
  { id: "topk", label: "Top-k" },
  { id: "topp", label: "Top-p" },
  { id: "minp", label: "Min-p" },
];

const POINT_COLORS = ["#3bb4a4", "#a855f7", "#ec4899", "#1e5d8a", "#ef4444"];

const PARAM_CONFIG: Record<
  TruncMethod,
  { min: number; max: number; step: number; label: string }
> = {
  topk: { min: 1, max: 15, step: 1, label: "k: number of top characters kept" },
  topp: {
    min: 0.1,
    max: 1,
    step: 0.05,
    label: "p: smallest set whose cumulative probability reaches p",
  },
  minp: {
    min: 0,
    max: 0.5,
    step: 0.02,
    label: "min-p: keep characters above this fraction of the top probability",
  },
};

export default function SamplingLab({
  settings,
  onTemperature,
  onMethod,
  onParam,
  previewRows,
  baseDist,
  oneSample,
  onSampleOne,
  experiments,
  onRunBatch,
}: Props) {
  const cfg = PARAM_CONFIG[settings.method];
  const paramValue =
    settings.method === "topk"
      ? settings.topK
      : settings.method === "topp"
        ? settings.topP
        : settings.minP;
  const keptCount = previewRows.filter((r) => r.kept).length;

  // ---- scatter geometry ----
  const W = 520;
  const H = 260;
  const L = 56;
  const R = 16;
  const T = 14;
  const B = 40;
  const lps = experiments.map((e) => e.meanLogProb);
  const lpMin = experiments.length > 0 ? Math.min(...lps) - 0.15 : -3;
  const lpMax = experiments.length > 0 ? Math.max(...lps) + 0.15 : 0;
  const xOf = (d: number) => L + d * (W - L - R);
  const yOf = (lp: number) =>
    T + (1 - (lp - lpMin) / Math.max(lpMax - lpMin, 1e-9)) * (H - T - B);

  return (
    <div>
      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl border border-[#1e293b] p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="ds-temperature"
                className="text-[12px] font-semibold text-white"
              >
                Temperature
              </label>
              <span className="font-mono text-[12px] text-[var(--color-accent)]">
                {settings.temperature.toFixed(2)}
              </span>
            </div>
            <input
              id="ds-temperature"
              type="range"
              min={0.3}
              max={2}
              step={0.05}
              value={settings.temperature}
              onChange={(e) => onTemperature(Number(e.target.value))}
              className="w-full accent-[#d4af37]"
            />
            <p className="text-[11px] text-[#475569] mt-1">
              Below 1 sharpens the distribution toward the top character,
              above 1 flattens it.
            </p>
          </div>

          <div>
            <p className="text-[12px] font-semibold text-white mb-1.5">
              Truncation method
            </p>
            <div className="flex gap-2" role="group" aria-label="Truncation method">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onMethod(m.id)}
                  aria-pressed={settings.method === m.id}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors ${
                    settings.method === m.id
                      ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[#d4af37]/10"
                      : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155]"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="ds-param"
                className="text-[12px] font-semibold text-white"
              >
                {cfg.label}
              </label>
              <span className="font-mono text-[12px] text-[var(--color-accent)]">
                {settings.method === "topk"
                  ? Math.round(paramValue)
                  : paramValue.toFixed(2)}
              </span>
            </div>
            <input
              id="ds-param"
              type="range"
              min={cfg.min}
              max={cfg.max}
              step={cfg.step}
              value={paramValue}
              onChange={(e) => onParam(Number(e.target.value))}
              className="w-full accent-[#d4af37]"
            />
          </div>
        </div>

        {/* Live distribution preview at the seed context */}
        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[12px] font-semibold text-white mb-1">
            The candidate pool right now
          </p>
          <p className="text-[11px] text-[#475569] mb-3">
            Next-char distribution at the seed context, after temperature,
            with the truncation cut applied: {keptCount} of{" "}
            {previewRows.length} characters stay in the pool.
          </p>
          <div className="space-y-1">
            {previewRows.slice(0, 10).map((r) => (
              <div key={r.char} className="flex items-center gap-2">
                <span
                  className={`w-5 text-center font-mono text-[12px] ${
                    r.kept ? "text-[#f1f5f9]" : "text-[#475569]"
                  }`}
                >
                  {displayChar(r.char)}
                </span>
                <div className="flex-1 h-3.5 rounded bg-[#0f172a] overflow-hidden border border-[#1e293b]">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${(r.prob * 100).toFixed(2)}%`,
                      background: r.kept ? "#3bb4a4" : "#334155",
                    }}
                  />
                </div>
                <span className="w-12 text-right font-mono text-[10px] text-[#94a3b8]">
                  {(r.prob * 100).toFixed(1)}%
                </span>
                <span
                  className={`w-16 text-right font-mono text-[10px] ${
                    r.kept ? "text-[#3bb4a4]" : "text-[#475569]"
                  }`}
                >
                  {r.kept ? `${(r.renormProb * 100).toFixed(1)}%` : "cut"}
                </span>
              </div>
            ))}
            {previewRows.length > 10 && (
              <p className="text-[10px] text-[#475569]">
                plus {previewRows.length - 10} more characters,{" "}
                {previewRows.slice(10).some((r) => r.kept)
                  ? "some still in the pool"
                  : "all cut"}
              </p>
            )}
          </div>
          <p className="text-[10px] text-[#475569] mt-2">
            Columns: tempered probability, then renormalized share of the
            kept pool (base probabilities before temperature:{" "}
            {baseDist
              .slice(0, 3)
              .map((d) => `${displayChar(d.char)} ${(d.prob * 100).toFixed(1)}%`)
              .join(", ")}
            ).
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={onSampleOne}
          className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
        >
          Sample one continuation
        </button>
        <button
          onClick={onRunBatch}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
        >
          Run {BATCH_SIZE} samples
        </button>
        <p className="text-[11px] text-[#475569]">
          Run the batch at two different settings to see the tradeoff appear.
        </p>
      </div>

      {oneSample && (
        <div className="rounded-xl border border-[#1e293b] bg-[#162032] p-4 mb-4">
          <p className="text-[11px] text-[#475569] mb-1">One sampled continuation:</p>
          <p className="font-mono text-[13px] text-[#f1f5f9] break-all mb-1">
            {displayText(oneSample.text)}
          </p>
          <p className="text-[11px] text-[#94a3b8]">
            Mean log-prob per char under the base model:{" "}
            <span className="font-mono text-[var(--color-accent)]">
              {oneSample.meanLogProb.toFixed(3)} nats
            </span>
          </p>
        </div>
      )}

      {/* Latest batch + scatter */}
      {experiments.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-[#1e293b] p-4">
            <p className="text-[12px] font-semibold text-white mb-2">
              Latest batch: {experiments[experiments.length - 1].settingsLabel}
            </p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="rounded-lg bg-[#162032] p-3">
                <p className="text-[10px] text-[#475569] mb-0.5">
                  Diversity (unique / {BATCH_SIZE})
                </p>
                <p className="font-mono text-[16px] font-bold text-[var(--color-accent)]">
                  {experiments[experiments.length - 1].diversity.toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg bg-[#162032] p-3">
                <p className="text-[10px] text-[#475569] mb-0.5">
                  Mean log-prob / char
                </p>
                <p className="font-mono text-[16px] font-bold text-[var(--color-accent)]">
                  {experiments[experiments.length - 1].meanLogProb.toFixed(3)}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-[#475569] mb-1">
              Most frequent continuations in this batch:
            </p>
            <ul className="space-y-1">
              {experiments[experiments.length - 1].top.map((t) => (
                <li key={t.text} className="text-[11px] font-mono text-[#94a3b8] break-all">
                  <span className="text-[var(--color-accent)]">{t.count}x</span>{" "}
                  {displayText(t.text)}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-[#1e293b] p-4">
            <p className="text-[12px] font-semibold text-white mb-2">
              Diversity vs mean likelihood, all runs
            </p>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full h-auto"
              role="img"
              aria-label="Scatter plot of experiment runs: diversity on the horizontal axis, mean log-prob per character on the vertical axis. The values are listed below the plot."
            >
              <line x1={L} y1={T} x2={L} y2={H - B} stroke="#334155" />
              <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke="#334155" />
              {[0, 0.25, 0.5, 0.75, 1].map((d) => (
                <g key={d}>
                  <line
                    x1={xOf(d).toFixed(1)}
                    y1={H - B}
                    x2={xOf(d).toFixed(1)}
                    y2={H - B + 4}
                    stroke="#334155"
                  />
                  <text
                    x={xOf(d).toFixed(1)}
                    y={H - B + 16}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#475569"
                  >
                    {d.toFixed(2)}
                  </text>
                </g>
              ))}
              {[lpMin, (lpMin + lpMax) / 2, lpMax].map((lp, i) => (
                <text
                  key={i}
                  x={L - 6}
                  y={(yOf(lp) + 3).toFixed(1)}
                  textAnchor="end"
                  fontSize={9}
                  fill="#475569"
                >
                  {lp.toFixed(2)}
                </text>
              ))}
              <text
                x={(L + (W - R)) / 2}
                y={H - 8}
                textAnchor="middle"
                fontSize={10}
                fill="#94a3b8"
              >
                diversity (unique continuations / {BATCH_SIZE})
              </text>
              <text
                x={12}
                y={(T + (H - B)) / 2}
                textAnchor="middle"
                fontSize={10}
                fill="#94a3b8"
                transform={`rotate(-90 12 ${(T + (H - B)) / 2})`}
              >
                mean log-prob / char (nats)
              </text>
              {experiments.map((e, i) => (
                <g key={e.id}>
                  <circle
                    cx={xOf(e.diversity).toFixed(1)}
                    cy={yOf(e.meanLogProb).toFixed(1)}
                    r={7}
                    fill={POINT_COLORS[i % POINT_COLORS.length]}
                    opacity={0.9}
                  />
                  <text
                    x={xOf(e.diversity).toFixed(1)}
                    y={(yOf(e.meanLogProb) + 3).toFixed(1)}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={700}
                    fill="#0a0e1a"
                  >
                    {i + 1}
                  </text>
                </g>
              ))}
            </svg>
            <ul className="mt-2 space-y-1">
              {experiments.map((e, i) => (
                <li key={e.id} className="flex items-center gap-2 text-[11px] text-[#94a3b8]">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ background: POINT_COLORS[i % POINT_COLORS.length] }}
                  />
                  <span className="font-semibold text-[#f1f5f9]">{i + 1}.</span>
                  <span>{e.settingsLabel}:</span>
                  <span className="font-mono">
                    diversity {e.diversity.toFixed(2)}, mean log-prob{" "}
                    {e.meanLogProb.toFixed(3)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
