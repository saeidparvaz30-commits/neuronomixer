"use client";

import React, { useMemo } from "react";
import {
  lossAlongIsoFlop,
  optimalAllocation,
  formatCount,
  formatFlops,
  type Allocation,
} from "./scalingMath";

export const LOGC_MIN = 19;
export const LOGC_MAX = 26;
export const OFFSET_MAX = 1.5;

interface Props {
  logC: number;
  offset: number;
  c: number;
  user: Allocation;
  opt: Allocation;
  onLogCChange: (v: number) => void;
  onOffsetChange: (v: number) => void;
}

const W = 640;
const H = 300;
const ML = 48;
const MR = 14;
const MT = 14;
const MB = 34;
const PW = W - ML - MR;
const PH = H - MT - MB;
const SPAN = 1.6;

export default function IsoFlopExplorer({
  logC,
  offset,
  c,
  user,
  opt,
  onLogCChange,
  onOffsetChange,
}: Props) {
  const plot = useMemo(() => {
    const logNOpt = Math.log10(opt.n);
    const logNs: number[] = [];
    for (let i = 0; i <= 120; i++) {
      logNs.push(logNOpt - SPAN + (2 * SPAN * i) / 120);
    }
    const main = lossAlongIsoFlop(c, logNs);
    const below = lossAlongIsoFlop(c / 10, logNs);
    const above = lossAlongIsoFlop(c * 10, logNs);

    const yMin = optimalAllocation(c * 10).loss - 0.03;
    const mainMax = Math.max(main[0].loss, main[main.length - 1].loss);
    const yMax = mainMax + 0.06;

    const xMin = logNOpt - SPAN;
    const x = (logN: number) => ML + ((logN - xMin) / (2 * SPAN)) * PW;
    const y = (loss: number) => MT + ((yMax - loss) / (yMax - yMin)) * PH;

    const toPath = (pts: { logN: number; loss: number }[]) => {
      let d = "";
      let pen = false;
      for (const p of pts) {
        if (p.loss > yMax || p.loss < yMin) {
          pen = false;
          continue;
        }
        d += `${pen ? "L" : "M"}${x(p.logN).toFixed(2)},${y(p.loss).toFixed(2)}`;
        pen = true;
      }
      return d;
    };

    const xTicks: { px: number; label: string }[] = [];
    for (let k = Math.ceil(xMin); k <= Math.floor(logNOpt + SPAN); k++) {
      xTicks.push({ px: x(k), label: formatCount(Math.pow(10, k)) });
    }
    const yTicks: { py: number; label: string }[] = [];
    for (let i = 0; i <= 4; i++) {
      const v = yMin + ((yMax - yMin) * i) / 4;
      yTicks.push({ py: y(v), label: v.toFixed(2) });
    }

    const userLogN = Math.log10(user.n);
    const userVisible = user.loss <= yMax && user.loss >= yMin;

    return {
      mainPath: toPath(main),
      belowPath: toPath(below),
      abovePath: toPath(above),
      xTicks,
      yTicks,
      optX: x(logNOpt).toFixed(2),
      optY: y(opt.loss).toFixed(2),
      userX: x(userLogN).toFixed(2),
      userY: y(Math.min(Math.max(user.loss, yMin), yMax)).toFixed(2),
      userVisible,
    };
  }, [c, user, opt]);

  const overhead = user.loss - opt.loss;
  const overheadPct = (overhead / opt.loss) * 100;
  const ratio = user.d / user.n;
  const frontierRatio = opt.d / opt.n;

  return (
    <div>
      {/* Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label
              htmlFor="scaling-budget"
              className="text-[12px] font-semibold text-white"
            >
              Compute budget C
            </label>
            <span className="text-[12px] font-mono text-[var(--color-accent)]">
              {formatFlops(c)} FLOPs
            </span>
          </div>
          <input
            id="scaling-budget"
            type="range"
            min={LOGC_MIN}
            max={LOGC_MAX}
            step={0.05}
            value={logC}
            onChange={(e) => onLogCChange(parseFloat(e.target.value))}
            aria-label="Compute budget in FLOPs, log scale"
            className="w-full accent-[#d4af37]"
          />
          <p className="text-[11px] text-[#475569] mt-1">
            Log scale, 1e{LOGC_MIN} to 1e{LOGC_MAX} FLOPs. The valley of the
            curve is the compute-optimal allocation for this budget.
          </p>
        </div>
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label
              htmlFor="scaling-alloc"
              className="text-[12px] font-semibold text-white"
            >
              Allocation: parameters vs tokens
            </label>
            <span className="text-[12px] font-mono text-[#3bb4a4]">
              {offset >= 0 ? "+" : ""}
              {offset.toFixed(2)} dec
            </span>
          </div>
          <input
            id="scaling-alloc"
            type="range"
            min={-OFFSET_MAX}
            max={OFFSET_MAX}
            step={0.05}
            value={offset}
            onChange={(e) => onOffsetChange(parseFloat(e.target.value))}
            aria-label="Parameter count offset from compute-optimal, in log10 decades"
            className="w-full accent-[#3bb4a4]"
          />
          <p className="text-[11px] text-[#475569] mt-1">
            0.00 is the compute-optimal N. Negative: smaller model, more
            tokens. Positive: bigger model, fewer tokens. C stays fixed.
          </p>
        </div>
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Iso-FLOP loss curve at ${formatFlops(c)} FLOPs. Predicted loss at your allocation: ${user.loss.toFixed(3)}. Compute-optimal loss: ${opt.loss.toFixed(3)}.`}
      >
        {/* Axes */}
        <line x1={ML} y1={MT} x2={ML} y2={MT + PH} stroke="#334155" strokeWidth={1} />
        <line x1={ML} y1={MT + PH} x2={ML + PW} y2={MT + PH} stroke="#334155" strokeWidth={1} />
        {plot.yTicks.map((t) => (
          <g key={`y${t.label}`}>
            <line x1={ML} y1={t.py} x2={ML + PW} y2={t.py} stroke="#1e293b" strokeWidth={1} />
            <text x={ML - 6} y={t.py + 3} textAnchor="end" fontSize={10} fill="#475569">
              {t.label}
            </text>
          </g>
        ))}
        {plot.xTicks.map((t) => (
          <text
            key={`x${t.label}`}
            x={t.px}
            y={MT + PH + 16}
            textAnchor="middle"
            fontSize={10}
            fill="#475569"
          >
            {t.label}
          </text>
        ))}
        <text x={ML + PW / 2} y={H - 4} textAnchor="middle" fontSize={10} fill="#475569">
          Parameters N (log scale)
        </text>
        <text
          x={12}
          y={MT + PH / 2}
          textAnchor="middle"
          fontSize={10}
          fill="#475569"
          transform={`rotate(-90 12 ${MT + PH / 2})`}
        >
          Predicted loss
        </text>

        {/* Neighbor iso-FLOP curves for context */}
        <path d={plot.belowPath} fill="none" stroke="#1e5d8a" strokeWidth={1.25} strokeDasharray="3 4" opacity={0.7} />
        <path d={plot.abovePath} fill="none" stroke="#1e5d8a" strokeWidth={1.25} strokeDasharray="3 4" opacity={0.7} />

        {/* Main iso-FLOP curve */}
        <path d={plot.mainPath} fill="none" stroke="#f1f5f9" strokeWidth={2} />

        {/* Optimal marker */}
        <circle cx={plot.optX} cy={plot.optY} r={5} fill="var(--color-accent)" />
        <text x={plot.optX} y={parseFloat(plot.optY) - 10} textAnchor="middle" fontSize={10} fill="var(--color-accent)" fontWeight={600}>
          optimal
        </text>

        {/* User marker */}
        <line
          x1={plot.userX}
          y1={MT}
          x2={plot.userX}
          y2={MT + PH}
          stroke="#3bb4a4"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.6}
        />
        {plot.userVisible && (
          <circle cx={plot.userX} cy={plot.userY} r={5} fill="#3bb4a4" stroke="#0f172a" strokeWidth={1.5} />
        )}
        <text x={plot.userX} y={MT + 10} textAnchor="middle" fontSize={10} fill="#3bb4a4" fontWeight={600}>
          you
        </text>

        {/* Neighbor labels */}
        <text x={ML + PW - 4} y={MT + 12} textAnchor="end" fontSize={9} fill="#1e5d8a">
          dashed: C / 10 and C x 10
        </text>
      </svg>

      {/* Live readout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
        {[
          { label: "Parameters N", value: formatCount(user.n), color: "#3bb4a4" },
          { label: "Tokens D = C/6N", value: formatCount(user.d), color: "#3bb4a4" },
          { label: "Tokens per param", value: ratio.toFixed(1), color: "#3bb4a4" },
          { label: "Predicted loss", value: user.loss.toFixed(3), color: "#3bb4a4" },
          { label: "Optimal loss", value: opt.loss.toFixed(3), color: "var(--color-accent)" },
          {
            label: "Loss overhead",
            value: `+${overhead.toFixed(3)} (${overheadPct.toFixed(1)}%)`,
            color: overhead > 0.005 ? "var(--color-warning)" : "var(--color-success)",
          },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#1e293b] p-3">
            <p className="text-[10px] text-[#475569] mb-1">{s.label}</p>
            <p className="text-[13px] font-mono font-bold" style={{ color: s.color }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[#475569] mt-3 leading-relaxed">
        Frontier allocation at this budget: {formatCount(opt.n)} parameters on{" "}
        {formatCount(opt.d)} tokens ({frontierRatio.toFixed(0)} tokens per
        parameter). All values are computed live from L(N, D) with the
        Hoffmann et al. 2022 constants.
      </p>
    </div>
  );
}
