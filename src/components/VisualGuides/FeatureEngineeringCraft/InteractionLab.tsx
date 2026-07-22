"use client";

import React, { useMemo } from "react";
import { Delivery, InteractionFits } from "./types";

interface Props {
  rows: readonly Delivery[];
  fits: InteractionFits;
  interactionOn: boolean;
  onToggle: () => void;
  /** True once the interaction has been switched on at least once. */
  seen: boolean;
}

const W = 420;
const H = 420;
const PAD = 44;

export default function InteractionLab({ rows, fits, interactionOn, onToggle, seen }: Props) {
  const activeFit = interactionOn ? fits.interaction : fits.additive;

  const domain = useMemo(() => {
    const all = [
      ...rows.map((r) => r.cost),
      ...fits.additive.predictions,
      ...fits.interaction.predictions,
    ];
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const pad = (hi - lo) * 0.06;
    return { lo: lo - pad, hi: hi + pad };
  }, [rows, fits]);

  const s = (v: number) => PAD + ((v - domain.lo) / (domain.hi - domain.lo)) * (W - PAD - 14);
  const syFlip = (v: number) =>
    H - 36 - ((v - domain.lo) / (domain.hi - domain.lo)) * (H - 36 - 14);

  const ticks = useMemo(() => {
    const step = 25;
    const lo = Math.ceil(domain.lo / step) * step;
    const out: number[] = [];
    for (let v = lo; v <= domain.hi; v += step) out.push(v);
    return out;
  }, [domain]);

  const rmseDropPct =
    ((fits.additive.rmse - fits.interaction.rmse) / fits.additive.rmse) * 100;

  const b = activeFit.beta;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Predicted vs actual */}
      <div className="lg:col-span-3 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5">
        <p className="text-[13px] font-semibold text-white mb-2">
          Predicted vs actual invoice, {rows.length} deliveries
        </p>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto max-w-[440px] mx-auto"
          role="img"
          aria-label={`Predicted versus actual delivery cost for ${rows.length} deliveries using the ${interactionOn ? "model with the distance times weight interaction" : "additive model"}. Points on the diagonal are perfect predictions. Current fit error: RMSE ${activeFit.rmse.toFixed(2)} dollars.`}
        >
          {ticks.map((v) => (
            <g key={v}>
              <line x1={s(v)} x2={s(v)} y1={14} y2={H - 36} stroke="#1e293b" strokeWidth={1} />
              <line x1={PAD} x2={W - 14} y1={syFlip(v)} y2={syFlip(v)} stroke="#1e293b" strokeWidth={1} />
              <text x={s(v)} y={H - 18} textAnchor="middle" fontSize={13} fill="#475569">
                {v}
              </text>
              <text x={PAD - 6} y={syFlip(v) + 4} textAnchor="end" fontSize={13} fill="#475569">
                {v}
              </text>
            </g>
          ))}
          <line
            x1={s(domain.lo)}
            y1={syFlip(domain.lo)}
            x2={s(domain.hi)}
            y2={syFlip(domain.hi)}
            stroke="#334155"
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
          {rows.map((r, i) => (
            <circle
              key={i}
              cx={s(r.cost)}
              cy={syFlip(activeFit.predictions[i])}
              r={3.5}
              fill={interactionOn ? "#3bb4a4" : "#a855f7"}
              opacity={0.6}
            />
          ))}
          <text x={W - 14} y={H - 4} textAnchor="end" fontSize={13} fill="#475569">
            actual cost ($)
          </text>
          <text x={12} y={14} fontSize={13} fill="#475569">
            predicted ($)
          </text>
        </svg>
        <p className="text-[11px] text-[#475569] mt-2 leading-relaxed">
          The dashed diagonal is a perfect prediction. Without the interaction
          column the additive model overshoots cheap short-and-light runs and
          undershoots long-and-heavy ones, because no sum of two straight-line
          effects can express a price that multiplies.
        </p>
      </div>

      {/* Controls + stats */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">
            The feature the raw table does not have
          </p>
          <button
            aria-pressed={interactionOn}
            onClick={onToggle}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
              interactionOn
                ? "border-[var(--color-accent)] text-white bg-[#1e293b]"
                : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155]"
            }`}
          >
            <span className="font-mono">distance * weight</span>
            <span
              className="text-[10px] font-semibold"
              style={{ color: interactionOn ? "var(--color-success)" : "#475569" }}
            >
              {interactionOn ? "column added" : "add column"}
            </span>
          </button>
          <div className="mt-4 rounded-xl bg-[#1e293b]/60 p-3 font-mono text-[11px] text-[#93c5fd] leading-relaxed overflow-x-auto">
            cost = {b[0].toFixed(2)} + {b[1].toFixed(2)}*dist + {b[2].toFixed(2)}*wt
            {interactionOn ? ` + ${b[3].toFixed(3)}*dist*wt` : ""}
          </div>
          <p className="text-[10px] text-[#475569] mt-2 leading-relaxed">
            Coefficients refit live on the {rows.length} deliveries every time
            you toggle the column.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
              Additive model RMSE
            </p>
            <p className="text-2xl font-black font-mono text-[#f1f5f9]">
              ${fits.additive.rmse.toFixed(2)}
            </p>
            <p className="text-[10px] text-[#475569] mt-1">distance + weight only</p>
          </div>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
              With interaction
            </p>
            <p
              className="text-2xl font-black font-mono"
              style={{ color: seen ? "var(--color-success)" : "#475569" }}
            >
              {seen ? `$${fits.interaction.rmse.toFixed(2)}` : "?"}
            </p>
            <p className="text-[10px] text-[#475569] mt-1">
              {seen
                ? `error down ${rmseDropPct.toFixed(0)}% on the same 3 raw columns`
                : "add the column to find out"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
            The courier really does charge partly per km-kg, so the truth lives
            in a column the raw table never shipped. No coefficient on distance
            alone or weight alone can bend a plane into that surface. Feature
            engineering here is not decoration: the model class stays linear,
            and the new column is what lets a linear model tell the truth.
          </p>
        </div>
      </div>
    </div>
  );
}
