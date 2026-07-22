"use client";

import React, { useMemo, useRef } from "react";
import {
  AdPoint,
  TransformId,
  TransformFit,
  TRANSFORM_ORDER,
  TRANSFORM_META,
  BIN_MIN,
  BIN_MAX,
} from "./types";

interface Props {
  data: readonly AdPoint[];
  fits: Record<TransformId, TransformFit>;
  active: TransformId;
  onSelect: (t: TransformId) => void;
  tried: ReadonlySet<TransformId>;
  binCount: number;
  onBinCountChange: (n: number) => void;
}

const W = 600;
const H = 340;
const PAD_L = 44;
const PAD_R = 14;
const PAD_T = 28;
const PAD_B = 52;

export default function TransformBench({
  data,
  fits,
  active,
  onSelect,
  tried,
  binCount,
  onBinCountChange,
}: Props) {
  const activeFit = fits[active];
  const rawRmse = fits.raw.rmse;
  const radioRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const moveActive = (delta: 1 | -1) => {
    const i = TRANSFORM_ORDER.indexOf(active);
    const next = TRANSFORM_ORDER[(i + delta + TRANSFORM_ORDER.length) % TRANSFORM_ORDER.length];
    onSelect(next);
    radioRefs.current[next]?.focus();
  };

  const onRadioKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      moveActive(1);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      moveActive(-1);
    }
  };

  const domain = useMemo(() => {
    const ys = data.map((p) => p.signups);
    const xMin = data[0].spend;
    const xMax = data[data.length - 1].spend;
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);
    const yPad = (yMax - yMin) * 0.08;
    return { xMin, xMax, yMin: yMin - yPad, yMax: yMax + yPad };
  }, [data]);

  const sx = (x: number) =>
    PAD_L + ((x - domain.xMin) / (domain.xMax - domain.xMin)) * (W - PAD_L - PAD_R);
  const sy = (y: number) =>
    H - PAD_B - ((y - domain.yMin) / (domain.yMax - domain.yMin)) * (H - PAD_T - PAD_B);

  const curvePath = activeFit.curve
    .map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`)
    .join(" ");

  const xTicks = [250, 750, 1250, 1750];
  const yTicks = useMemo(() => {
    const lo = Math.ceil(domain.yMin / 20) * 20;
    const ticks: number[] = [];
    for (let v = lo; v <= domain.yMax; v += 20) ticks.push(v);
    return ticks;
  }, [domain]);

  const maxRmse = Math.max(...TRANSFORM_ORDER.map((t) => fits[t].rmse));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Scatter + live fit */}
      <div className="lg:col-span-3 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
          <p className="text-[13px] font-semibold text-white">
            Daily ad spend vs signups: {data.length} days
          </p>
          <span className="text-[10px] text-[#94a3b8] flex items-center gap-1.5">
            <span
              className="inline-block w-4 h-0.5 rounded"
              style={{ background: TRANSFORM_META[active].color }}
              aria-hidden="true"
            />
            fit on {TRANSFORM_META[active].formula}
          </span>
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={`Scatter plot of ${data.length} days of ad spend against signups with the live least-squares fit using the ${TRANSFORM_META[active].label} feature. Current fit error: RMSE ${activeFit.rmse.toFixed(2)} signups, R squared ${activeFit.r2.toFixed(2)}.`}
        >
          {yTicks.map((v) => (
            <g key={`y${v}`}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={sy(v)}
                y2={sy(v)}
                stroke="#1e293b"
                strokeWidth={1}
              />
              <text x={PAD_L - 6} y={sy(v) + 6} textAnchor="end" fontSize={19} fill="#475569">
                {v}
              </text>
            </g>
          ))}
          {xTicks.map((v) => (
            <text
              key={`x${v}`}
              x={sx(v)}
              y={H - PAD_B + 20}
              textAnchor="middle"
              fontSize={19}
              fill="#475569"
            >
              ${v}
            </text>
          ))}
          <text x={W - PAD_R} y={H - 6} textAnchor="end" fontSize={19} fill="#475569">
            spend per day
          </text>
          <text x={PAD_L} y={PAD_T - 6} fontSize={19} fill="#475569">
            signups
          </text>
          {data.map((p, i) => (
            <circle
              key={i}
              cx={sx(p.spend)}
              cy={sy(p.signups)}
              r={3}
              fill="#3bb4a4"
              opacity={0.5}
            />
          ))}
          <path
            d={curvePath}
            fill="none"
            stroke={TRANSFORM_META[active].color}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-[11px] text-[#475569] mt-2 leading-relaxed">
          The model is always the same: an intercept plus one coefficient on one
          feature, refit from scratch on every click. Only the feature changes.{" "}
          {TRANSFORM_META[active].tagline}
        </p>
      </div>

      {/* Controls + stats */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">
            Feed the model a different feature
          </p>
          <div role="radiogroup" aria-label="Feature transform" className="flex flex-col gap-2">
            {TRANSFORM_ORDER.map((t) => {
              const meta = TRANSFORM_META[t];
              const isActive = active === t;
              const isTried = tried.has(t) || t === "raw";
              return (
                <button
                  key={t}
                  ref={(el) => {
                    radioRefs.current[t] = el;
                  }}
                  role="radio"
                  aria-checked={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => onSelect(t)}
                  onKeyDown={onRadioKeyDown}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-left text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                    isActive
                      ? "border-[var(--color-accent)] text-white bg-[#1e293b]"
                      : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ background: meta.color }}
                      aria-hidden="true"
                    />
                    {meta.label}
                    <span className="font-mono text-[10px] text-[#475569]">{meta.formula}</span>
                  </span>
                  {isTried && t !== "raw" && (
                    <span className="text-[10px] text-[var(--color-success)]">tried</span>
                  )}
                </button>
              );
            })}
          </div>
          {active === "bins" && (
            <div className="mt-4">
              <label
                htmlFor="fec-bin-count"
                className="block text-[11px] text-[#94a3b8] mb-1.5"
              >
                Quantile bins: <span className="font-mono text-white">{binCount}</span>{" "}
                <span className="text-[#475569]">({binCount} fitted means)</span>
              </label>
              <input
                id="fec-bin-count"
                type="range"
                min={BIN_MIN}
                max={BIN_MAX}
                step={1}
                value={binCount}
                onChange={(e) => onBinCountChange(Number(e.target.value))}
                className="w-full"
                style={{ accentColor: "var(--color-accent)" }}
              />
              <p className="text-[10px] text-[#475569] mt-1.5 leading-relaxed">
                More bins tend to shrink the error on the data they were fit
                to, since each extra bin is another number the model gets to
                memorize. That is a tendency, not a rule: quantile bins are
                recomputed from scratch at every count rather than nested
                inside one another, so one more bin can occasionally raise
                the in-sample error before the trend resumes. Slide from 8 to
                9 bins to see it happen on this data.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
              Fit error (RMSE)
            </p>
            <p
              className="text-2xl font-black font-mono"
              style={{
                color:
                  active === "raw"
                    ? "#f1f5f9"
                    : activeFit.rmse < rawRmse
                      ? "var(--color-success)"
                      : "var(--color-warning)",
              }}
            >
              {activeFit.rmse.toFixed(2)}
            </p>
            <p className="text-[10px] text-[#475569] mt-1">
              signups off, on average
            </p>
          </div>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
            <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">R squared</p>
            <p className="text-2xl font-black font-mono text-[#f1f5f9]">
              {activeFit.r2.toFixed(3)}
            </p>
            <p className="text-[10px] text-[#475569] mt-1">
              {activeFit.params} fitted parameter{activeFit.params === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {/* RMSE leaderboard for tried transforms */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">
            Fit error by feature (lower is better)
          </p>
          <div className="flex flex-col gap-2">
            {TRANSFORM_ORDER.map((t) => {
              const meta = TRANSFORM_META[t];
              const isTried = tried.has(t) || t === "raw";
              const widthPct = (fits[t].rmse / maxRmse) * 100;
              return (
                <div key={t} className="flex items-center gap-2">
                  <span className="w-[76px] shrink-0 text-[11px] text-[#94a3b8]">{meta.label}</span>
                  <div className="relative h-4 flex-1 rounded bg-[#1e293b] overflow-hidden">
                    {isTried && (
                      <span
                        className="absolute top-0 bottom-0 left-0 rounded-sm"
                        style={{ background: meta.color, width: `${widthPct}%` }}
                      />
                    )}
                  </div>
                  <span className="w-[44px] shrink-0 text-right text-[11px] font-mono text-[#94a3b8]">
                    {isTried ? fits[t].rmse.toFixed(2) : "?"}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-[#475569] mt-3 leading-relaxed">
            Bars fill in as you try each feature. The lesson is not that log
            always wins. It is that the data decides: this world has
            diminishing returns, so compressing big spends helps and squaring
            them hurts. Craft means checking, not memorizing a favorite move.
          </p>
        </div>
      </div>
    </div>
  );
}
