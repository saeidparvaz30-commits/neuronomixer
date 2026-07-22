"use client";

import React, { useRef, useState } from "react";
import {
  TARGET,
  PRED_MIN,
  PRED_MAX,
  mseLoss,
  mseGrad,
  maeLoss,
  maeGrad,
  huberLoss,
  huberGrad,
  fmt,
  fmtSigned,
} from "./types";

interface Props {
  onAdjust: () => void;
}

// Number line geometry (viewBox units)
const NL_W = 640;
const NL_H = 126;
const NL_L = 28;
const NL_R = 612;
const NL_AXIS_Y = 82;

// Loss curve chart geometry (viewBox units)
const CH_W = 640;
const CH_H = 250;
const CH_L = 44;
const CH_R = 626;
const CH_T = 12;
const CH_B = 218;
const Y_MAX = 25; // loss axis cap; MSE intentionally exits the top of the chart

function predToPx(v: number): number {
  return NL_L + ((v - PRED_MIN) / (PRED_MAX - PRED_MIN)) * (NL_R - NL_L);
}

function chartX(v: number): number {
  return CH_L + ((v - PRED_MIN) / (PRED_MAX - PRED_MIN)) * (CH_R - CH_L);
}

function chartY(loss: number): number {
  return CH_B - (loss / Y_MAX) * (CH_B - CH_T);
}

function buildCurve(f: (pred: number) => number): string {
  const parts: string[] = [];
  for (let i = 0; i <= 160; i++) {
    const pred = PRED_MIN + (i / 160) * (PRED_MAX - PRED_MIN);
    const cmd = i === 0 ? "M" : "L";
    parts.push(`${cmd}${chartX(pred).toFixed(2)},${chartY(f(pred)).toFixed(2)}`);
  }
  return parts.join(" ");
}

export default function PredictionLossLab({ onAdjust }: Props) {
  const [pred, setPred] = useState(-3);
  const [delta, setDelta] = useState(1);
  const dragging = useRef(false);
  const lineRef = useRef<SVGSVGElement | null>(null);

  const e = pred - TARGET;
  const mse = mseLoss(e);
  const mae = maeLoss(e);
  const hub = huberLoss(e, delta);
  const gMse = mseGrad(e);
  const gMae = maeGrad(e);
  const gHub = huberGrad(e, delta);

  function setFromClientX(clientX: number) {
    const svg = lineRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const vx = ((clientX - rect.left) / rect.width) * NL_W;
    const raw = PRED_MIN + ((vx - NL_L) / (NL_R - NL_L)) * (PRED_MAX - PRED_MIN);
    const next = Math.min(PRED_MAX, Math.max(PRED_MIN, Math.round(raw * 10) / 10));
    setPred(next);
    onAdjust();
  }

  function nudge(step: number) {
    setPred((prev) => {
      const next = Math.min(PRED_MAX, Math.max(PRED_MIN, Math.round((prev + step) * 10) / 10));
      return next;
    });
    onAdjust();
  }

  function handleKeyDown(ev: React.KeyboardEvent) {
    switch (ev.key) {
      case "ArrowLeft":
      case "ArrowDown":
        ev.preventDefault();
        nudge(-0.1);
        break;
      case "ArrowRight":
      case "ArrowUp":
        ev.preventDefault();
        nudge(0.1);
        break;
      case "PageDown":
        ev.preventDefault();
        nudge(-1);
        break;
      case "PageUp":
        ev.preventDefault();
        nudge(1);
        break;
      case "Home":
        ev.preventDefault();
        setPred(PRED_MIN);
        onAdjust();
        break;
      case "End":
        ev.preventDefault();
        setPred(PRED_MAX);
        onAdjust();
        break;
    }
  }

  const gradientRatio = Number.isFinite(gMae) && gMae !== 0 ? Math.abs(gMse) / Math.abs(gMae) : null;

  const lossCards = [
    {
      name: "MSE (squared error)",
      color: "#ef4444",
      formula: "L = e²",
      loss: mse,
      grad: fmtSigned(gMse),
      gradNote: "grows linearly with e",
    },
    {
      name: "MAE (absolute error)",
      color: "#3bb4a4",
      formula: "L = |e|",
      loss: mae,
      grad: Number.isFinite(gMae) ? fmtSigned(gMae) : "undefined (kink at e = 0)",
      gradNote: "constant magnitude 1",
    },
    {
      name: `Huber (δ = ${fmt(delta, 1)})`,
      color: "var(--color-accent)",
      formula: "L = ½e² or δ(|e| - ½δ)",
      loss: hub,
      grad: fmtSigned(gHub),
      gradNote: `capped at ±${fmt(delta, 1)}`,
    },
  ];

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
      <div className="mb-4">
        <p className="text-[13px] font-semibold text-white mb-1">
          Interactive A: One Prediction, Three Losses
        </p>
        <p className="text-[12px] text-[#475569] leading-relaxed">
          Drag the prediction along the number line (or focus it and use the arrow keys).
          The target is fixed at {TARGET}. Every value below is computed live from
          e = prediction - target.
        </p>
      </div>

      {/* Number line */}
      <svg
        ref={lineRef}
        viewBox={`0 0 ${NL_W} ${NL_H}`}
        className="w-full select-none touch-none cursor-pointer"
        role="img"
        aria-label={`Number line. Target fixed at ${TARGET}. Prediction currently at ${fmt(pred, 1)}, error ${fmt(e, 1)}.`}
        onPointerDown={(ev) => {
          dragging.current = true;
          ev.currentTarget.setPointerCapture(ev.pointerId);
          setFromClientX(ev.clientX);
        }}
        onPointerMove={(ev) => {
          if (dragging.current) setFromClientX(ev.clientX);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
      >
        {/* Axis */}
        <line x1={NL_L} y1={NL_AXIS_Y} x2={NL_R} y2={NL_AXIS_Y} stroke="#334155" strokeWidth={1.5} />
        {[-8, -6, -4, -2, 0, 2, 4, 6, 8].map((t) => (
          <g key={t}>
            <line x1={predToPx(t)} y1={NL_AXIS_Y - 4} x2={predToPx(t)} y2={NL_AXIS_Y + 4} stroke="#334155" strokeWidth={1} />
            <text x={predToPx(t)} y={NL_AXIS_Y + 24} textAnchor="middle" fontSize={20} fill="#475569">
              {t}
            </text>
          </g>
        ))}

        {/* Error segment */}
        <line
          x1={predToPx(TARGET)}
          y1={NL_AXIS_Y - 26}
          x2={predToPx(pred)}
          y2={NL_AXIS_Y - 26}
          stroke="#94a3b8"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <text
          x={(predToPx(TARGET) + predToPx(pred)) / 2}
          y={NL_AXIS_Y - 36}
          textAnchor="middle"
          fontSize={20}
          fill="#94a3b8"
        >
          e = {fmt(e, 1)}
        </text>

        {/* Target marker */}
        <g>
          <rect
            x={predToPx(TARGET) - 6}
            y={NL_AXIS_Y - 6}
            width={12}
            height={12}
            transform={`rotate(45 ${predToPx(TARGET)} ${NL_AXIS_Y})`}
            fill="var(--color-accent)"
          />
          <text x={predToPx(TARGET)} y={NL_AXIS_Y - 58} textAnchor="middle" fontSize={20} fontWeight={600} fill="var(--color-accent)">
            target = {TARGET}
          </text>
        </g>

        {/* Draggable prediction handle */}
        <g
          role="slider"
          tabIndex={0}
          aria-label="Prediction value"
          aria-valuemin={PRED_MIN}
          aria-valuemax={PRED_MAX}
          aria-valuenow={pred}
          aria-valuetext={`prediction ${fmt(pred, 1)}, error ${fmt(e, 1)}`}
          onKeyDown={handleKeyDown}
          className="cursor-grab focus:outline-none"
        >
          <circle cx={predToPx(pred)} cy={NL_AXIS_Y} r={13} fill="transparent" stroke="none" />
          <circle cx={predToPx(pred)} cy={NL_AXIS_Y} r={9} fill="#1e5d8a" stroke="#f1f5f9" strokeWidth={2} />
          <text x={predToPx(pred)} y={NL_AXIS_Y - 16} textAnchor="middle" fontSize={20} fontWeight={600} fill="#f1f5f9">
            {fmt(pred, 1)}
          </text>
        </g>
      </svg>

      {/* Loss cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 mb-4">
        {lossCards.map((c) => (
          <div key={c.name} className="rounded-xl border border-[#1e293b] bg-[#162032] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: c.color }}>
              {c.name}
            </p>
            <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[10px] rounded px-2 py-1 mb-2 overflow-x-auto">
              {c.formula}
            </pre>
            <p className="text-2xl font-black" style={{ color: c.color }}>
              {fmt(c.loss)}
            </p>
            <p className="text-[11px] text-[#94a3b8] mt-1.5">
              gradient: <span className="font-mono font-semibold text-[#f1f5f9]">{c.grad}</span>
            </p>
            <p className="text-[10px] text-[#475569] mt-0.5">{c.gradNote}</p>
          </div>
        ))}
      </div>

      {/* Huber delta slider */}
      <div className="mb-5 max-w-[360px]">
        <label htmlFor="huber-delta" className="block text-[11px] font-semibold text-[#94a3b8] mb-1.5">
          Huber threshold δ: {fmt(delta, 1)} (quadratic inside ±δ, linear outside)
        </label>
        <input
          id="huber-delta"
          type="range"
          min={0.2}
          max={3}
          step={0.1}
          value={delta}
          onChange={(ev) => setDelta(Number(ev.target.value))}
          className="w-full"
          style={{ accentColor: "var(--color-accent)" }}
        />
      </div>

      {/* Gradient explosion callout */}
      {gradientRatio !== null && Math.abs(e) > 4 && (
        <div
          className="mb-4 px-4 py-2.5 rounded-xl border text-[12px]"
          style={{
            borderColor: "color-mix(in srgb, var(--color-warning) 35%, transparent)",
            background: "color-mix(in srgb, var(--color-warning) 8%, transparent)",
            color: "var(--color-warning)",
          }}
        >
          At e = {fmt(e, 1)} the MSE gradient is {fmtSigned(gMse)}, which is {fmt(gradientRatio, 1)}x
          the MAE gradient magnitude. This single point now dominates any batch it is in.
        </div>
      )}

      {/* Loss curve chart */}
      <div>
        <p className="text-[11px] font-semibold text-[#94a3b8] mb-2">
          Loss as a function of the prediction (same three functions, plotted over the whole line;
          the y axis is capped at {Y_MAX}, so MSE simply leaves the chart)
        </p>
        <svg
          viewBox={`0 0 ${CH_W} ${CH_H}`}
          className="w-full"
          role="img"
          aria-label={`Loss curves versus prediction. At prediction ${fmt(pred, 1)}: MSE ${fmt(mse)}, MAE ${fmt(mae)}, Huber ${fmt(hub)}.`}
        >
          <defs>
            <clipPath id="loss-curves-clip">
              <rect x={CH_L} y={CH_T} width={CH_R - CH_L} height={CH_B - CH_T} />
            </clipPath>
          </defs>

          {/* Grid + y ticks */}
          {[0, 5, 10, 15, 20, 25].map((t) => (
            <g key={t}>
              <line x1={CH_L} y1={chartY(t)} x2={CH_R} y2={chartY(t)} stroke="#1e293b" strokeWidth={1} />
              <text x={CH_L - 8} y={chartY(t) + 6} textAnchor="end" fontSize={20} fill="#475569">
                {t}
              </text>
            </g>
          ))}
          {/* x ticks */}
          {[-8, -4, 0, 2, 4, 8].map((t) => (
            <text key={t} x={chartX(t)} y={CH_B + 22} textAnchor="middle" fontSize={20} fill="#475569">
              {t}
            </text>
          ))}

          <g clipPath="url(#loss-curves-clip)">
            <path d={buildCurve((x) => mseLoss(x - TARGET))} fill="none" stroke="#ef4444" strokeWidth={2} />
            <path d={buildCurve((x) => maeLoss(x - TARGET))} fill="none" stroke="#3bb4a4" strokeWidth={2} />
            <path
              d={buildCurve((x) => huberLoss(x - TARGET, delta))}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={2}
              strokeDasharray="5 4"
            />
            {/* Current prediction marker */}
            <line x1={chartX(pred)} y1={CH_T} x2={chartX(pred)} y2={CH_B} stroke="#475569" strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={chartX(pred)} cy={chartY(mse)} r={4} fill="#ef4444" />
            <circle cx={chartX(pred)} cy={chartY(mae)} r={4} fill="#3bb4a4" />
            <circle cx={chartX(pred)} cy={chartY(hub)} r={4} fill="var(--color-accent)" />
          </g>

          {/* Target tick on x axis */}
          <text x={chartX(TARGET)} y={CH_T + 16} textAnchor="middle" fontSize={20} fill="var(--color-accent)">
            target
          </text>
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-2">
          {[
            { label: "MSE: e² (solid red)", color: "#ef4444" },
            { label: "MAE: |e| (solid teal)", color: "#3bb4a4" },
            { label: `Huber δ = ${fmt(delta, 1)} (dashed gold)`, color: "var(--color-accent)" },
          ].map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
              <span className="inline-block w-3 h-[3px] rounded-full" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
