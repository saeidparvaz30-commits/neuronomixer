"use client";

import React from "react";
import type { Pipeline, ScalingDemoResult } from "./types";
import { SHIFT_MIN, SHIFT_MAX } from "./types";
import PipelineToggle from "./PipelineToggle";
import StatCompare from "./StatCompare";

interface Props {
  result: ScalingDemoResult;
  pipeline: Pipeline;
  onPipelineChange: (p: Pipeline) => void;
  shift: number;
  onShiftChange: (v: number) => void;
}

const W = 560;
const H = 300;
const M = { l: 46, r: 16, t: 16, b: 48 };

const pct = (a: number) => `${Math.round(a * 100)}%`;

export default function PreprocessingDemo({
  result,
  pipeline,
  onPipelineChange,
  shift,
  onShiftChange,
}: Props) {
  const active = result[pipeline];
  const pts = active.points;

  const xs = pts.map((p) => p.z1);
  const ys = pts.map((p) => p.z2);
  const xLo = Math.min(...xs);
  const xHi = Math.max(...xs);
  const yLo = Math.min(...ys);
  const yHi = Math.max(...ys);
  const xPad = (xHi - xLo || 1) * 0.08;
  const yPad = (yHi - yLo || 1) * 0.08;
  const xMin = xLo - xPad;
  const xMax = xHi + xPad;
  const yMin = yLo - yPad;
  const yMax = yHi + yPad;

  const sx = (x: number) => M.l + ((x - xMin) / (xMax - xMin)) * (W - M.l - M.r);
  const sy = (y: number) => H - M.b - ((y - yMin) / (yMax - yMin)) * (H - M.t - M.b);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-3 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <PipelineToggle<Pipeline>
            layoutId="preprocessing-pipeline-pill"
            ariaLabel="Preprocessing pipeline"
            active={pipeline}
            onChange={onPipelineChange}
            options={[
              { id: "leaky", label: "Leaky: scale, then split", color: "var(--color-warning)" },
              { id: "proper", label: "Honest: split, then scale", color: "var(--color-success)" },
            ]}
          />
          <span className="text-[11px] text-[#475569]">
            Scaler statistics from: <span className="text-[#94a3b8] font-mono">{active.statsSource}</span>
          </span>
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={`Scatter plot of ${result.trainN} training and ${result.valN} validation points in z-scaled feature space under the ${pipeline === "leaky" ? "leaky" : "honest"} pipeline. Validation accuracy is ${pct(active.accuracy)}.`}
        >
          {/* axes */}
          <line x1={M.l} y1={H - M.b} x2={W - M.r} y2={H - M.b} stroke="#334155" strokeWidth={1} />
          <line x1={M.l} y1={M.t} x2={M.l} y2={H - M.b} stroke="#334155" strokeWidth={1} />
          <text x={M.l} y={H - M.b + 19} fill="#475569" fontSize={17} textAnchor="middle">
            {xMin.toFixed(1)}
          </text>
          <text x={W - M.r} y={H - M.b + 19} fill="#475569" fontSize={17} textAnchor="end">
            {xMax.toFixed(1)}
          </text>
          <text x={M.l - 6} y={H - M.b} fill="#475569" fontSize={17} textAnchor="end">
            {yMin.toFixed(1)}
          </text>
          <text x={M.l - 6} y={M.t + 12} fill="#475569" fontSize={17} textAnchor="end">
            {yMax.toFixed(1)}
          </text>
          <text x={(M.l + W - M.r) / 2} y={H - 4} fill="#94a3b8" fontSize={18} textAnchor="middle">
            signal feature (z-scaled)
          </text>
          <text
            x={12}
            y={(M.t + H - M.b) / 2}
            fill="#94a3b8"
            fontSize={18}
            textAnchor="middle"
            transform={`rotate(-90 12 ${(M.t + H - M.b) / 2})`}
          >
            batch feature (z-scaled)
          </text>

          {pts.map((p, i) => {
            const cx = sx(p.z1);
            const cy = sy(p.z2);
            const color = p.y === 1 ? "#a855f7" : "#3bb4a4";
            const fill = p.y === 1 ? color : "none";
            return p.split === "train" ? (
              <circle key={i} cx={cx} cy={cy} r={4.5} fill={fill} stroke={color} strokeWidth={1.6} />
            ) : (
              <rect
                key={i}
                x={-4}
                y={-4}
                width={8}
                height={8}
                transform={`translate(${cx} ${cy}) rotate(45)`}
                fill={fill}
                stroke={color}
                strokeWidth={1.6}
              />
            );
          })}
        </svg>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[10px] text-[#94a3b8]">
          <span className="flex items-center gap-1.5">
            <svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="4" fill="none" stroke="#3bb4a4" strokeWidth="1.6" /></svg>
            train, label 0 (hollow circle)
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="4" fill="#a855f7" /></svg>
            train, label 1 (filled circle)
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="10" height="10" aria-hidden="true"><rect x="2" y="2" width="6" height="6" transform="rotate(45 5 5)" fill="none" stroke="#3bb4a4" strokeWidth="1.6" /></svg>
            validation, label 0 (hollow diamond)
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="10" height="10" aria-hidden="true"><rect x="2" y="2" width="6" height="6" transform="rotate(45 5 5)" fill="#a855f7" /></svg>
            validation, label 1 (filled diamond)
          </span>
        </div>
      </div>

      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
          <div className="flex items-baseline justify-between mb-2">
            <label htmlFor="dl-shift-slider" className="text-[11px] font-semibold text-[#94a3b8]">
              Validation batch shift (offset on the batch feature)
            </label>
            <span className="text-[13px] font-mono font-bold text-white">+{shift.toFixed(1)}</span>
          </div>
          <input
            id="dl-shift-slider"
            type="range"
            min={SHIFT_MIN}
            max={SHIFT_MAX}
            step={0.5}
            value={shift}
            onChange={(e) => onShiftChange(parseFloat(e.target.value))}
            className="w-full"
            style={{ accentColor: "var(--color-accent)" }}
          />
          <p className="text-[10px] text-[#475569] mt-2 leading-relaxed">
            At zero shift both pipelines agree. Increase it and watch the leaky score stay rosy
            while the honest score collapses.
          </p>
        </div>

        <StatCompare
          title="1-NN validation accuracy (computed live)"
          items={[
            {
              label: `Leaky pipeline: z-scaler fit on all ${result.trainN + result.valN} rows before splitting`,
              display: pct(result.leaky.accuracy),
              fraction: result.leaky.accuracy,
              color: "var(--color-warning)",
              highlighted: pipeline === "leaky",
            },
            {
              label: `Honest pipeline: z-scaler fit on the ${result.trainN} training rows only`,
              display: pct(result.proper.accuracy),
              fraction: result.proper.accuracy,
              color: "var(--color-success)",
              highlighted: pipeline === "proper",
            },
          ]}
        />

        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
            The leaky scaler saw the validation rows, so the batch offset between the halves got
            baked into the standard deviation it divides by. That inflated std shrinks every
            standardized distance along the shifted feature, muting the offset enough for nearest
            neighbors to keep matching across the halves. The honest pipeline reveals the truth:
            this 1-nearest-neighbor model breaks the moment a new batch arrives with a different
            offset, exactly what production would do to it.
          </p>
        </div>
      </div>
    </div>
  );
}
