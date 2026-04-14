"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { DistributionType, DISTRIBUTIONS, DIST_ORDER, computePDF } from "./types";

interface Props {
  params: Record<DistributionType, Record<string, number>>;
  distA: DistributionType;
  distB: DistributionType;
  onChangeA: (t: DistributionType) => void;
  onChangeB: (t: DistributionType) => void;
}

function OverlayChart({
  typeA,
  typeB,
  paramsA,
  paramsB,
}: {
  typeA: DistributionType;
  typeB: DistributionType;
  paramsA: Record<string, number>;
  paramsB: Record<string, number>;
}) {
  const metaA = DISTRIBUTIONS[typeA];
  const metaB = DISTRIBUTIONS[typeB];

  const [xMinA, xMaxA] = metaA.xRange(paramsA);
  const [xMinB, xMaxB] = metaB.xRange(paramsB);
  const xMin = Math.min(xMinA, xMinB);
  const xMax = Math.max(xMaxA, xMaxB);

  const W = 520;
  const H = 240;
  const PAD = { l: 40, r: 14, t: 16, b: 32 };
  const IW = W - PAD.l - PAD.r;
  const IH = H - PAD.t - PAD.b;
  const N = 200;

  const ptsA = useMemo(() =>
    Array.from({ length: N }, (_, i) => {
      const x = xMin + (i / (N - 1)) * (xMax - xMin);
      return { x, y: computePDF(typeA, x, paramsA) };
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [typeA, xMin, xMax, JSON.stringify(paramsA)]);

  const ptsB = useMemo(() =>
    Array.from({ length: N }, (_, i) => {
      const x = xMin + (i / (N - 1)) * (xMax - xMin);
      return { x, y: computePDF(typeB, x, paramsB) };
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [typeB, xMin, xMax, JSON.stringify(paramsB)]);

  const maxY = Math.max(
    ...ptsA.map(p => p.y),
    ...ptsB.map(p => p.y),
    0.001
  );

  const tx = (x: number) => PAD.l + ((x - xMin) / (xMax - xMin)) * IW;
  const ty = (y: number) => PAD.t + IH - (y / maxY) * IH;

  const pathA = ptsA
    .map((p, i) => `${i === 0 ? "M" : "L"} ${tx(p.x).toFixed(1)} ${ty(p.y).toFixed(1)}`)
    .join(" ");
  const pathB = ptsB
    .map((p, i) => `${i === 0 ? "M" : "L"} ${tx(p.x).toFixed(1)} ${ty(p.y).toFixed(1)}`)
    .join(" ");

  const xTicks = [0, 0.25, 0.5, 0.75, 1].map(t => xMin + t * (xMax - xMin));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-label="Distribution comparison chart">
      {/* Axes */}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
      <line x1={PAD.l} y1={PAD.t + IH} x2={W - PAD.r} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />

      {/* Grid */}
      {[0.25, 0.5, 0.75, 1].map(t => (
        <line key={t} x1={PAD.l} y1={ty(t * maxY)} x2={W - PAD.r} y2={ty(t * maxY)}
          stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
      ))}

      {/* Fills */}
      <path
        d={`${pathA} L ${tx(xMax).toFixed(1)} ${PAD.t + IH} L ${tx(xMin).toFixed(1)} ${PAD.t + IH} Z`}
        fill={metaA.color} opacity="0.08"
      />
      <path
        d={`${pathB} L ${tx(xMax).toFixed(1)} ${PAD.t + IH} L ${tx(xMin).toFixed(1)} ${PAD.t + IH} Z`}
        fill={metaB.color} opacity="0.08"
      />

      {/* Curves */}
      <motion.path
        key={`a-${typeA}-${JSON.stringify(paramsA)}`}
        d={pathA} fill="none" stroke={metaA.color} strokeWidth="2"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.55 }}
      />
      <motion.path
        key={`b-${typeB}-${JSON.stringify(paramsB)}`}
        d={pathB} fill="none" stroke={metaB.color} strokeWidth="2" strokeDasharray="5,3"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.55, delay: 0.1 }}
      />

      {/* X ticks */}
      {xTicks.map(v => (
        <text key={v} x={tx(v)} y={PAD.t + IH + 14} textAnchor="middle" fill="#475569" fontSize="8">
          {Math.abs(v) < 0.005 ? "0" : v.toFixed(1)}
        </text>
      ))}

      {/* Y label */}
      <text x={10} y={PAD.t + IH / 2} textAnchor="middle" fill="#475569" fontSize="9"
        transform={`rotate(-90, 10, ${PAD.t + IH / 2})`}>PDF</text>
    </svg>
  );
}

function DistributionSelect({
  value,
  onChange,
  exclude,
  label,
}: {
  value: DistributionType;
  onChange: (t: DistributionType) => void;
  exclude: DistributionType;
  label: string;
}) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-[1px] text-[#475569] mb-1">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {DIST_ORDER.filter(t => t !== exclude).map(t => {
          const meta = DISTRIBUTIONS[t];
          const isActive = value === t;
          return (
            <button
              key={t}
              onClick={() => onChange(t)}
              className="text-[10px] px-2.5 py-1 rounded-lg border font-semibold transition-colors"
              style={{
                borderColor: isActive ? meta.color : "#1e293b",
                color: isActive ? meta.color : "#475569",
                background: isActive ? meta.color + "15" : "transparent",
              }}
            >
              {meta.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function insightText(typeA: DistributionType, typeB: DistributionType): string {
  const metaA = DISTRIBUTIONS[typeA];
  const metaB = DISTRIBUTIONS[typeB];
  const contA = metaA.isContinuous;
  const contB = metaB.isContinuous;
  if (!contA && !contB) {
    return `Both ${metaA.label} and ${metaB.label} are discrete distributions. Compare how probability mass is spread across integer values.`;
  }
  if (contA && contB) {
    return `Both ${metaA.label} and ${metaB.label} are continuous. The dashed line shows ${metaB.label}. Notice differences in tail behaviour and peak location.`;
  }
  const cont = contA ? metaA.label : metaB.label;
  const disc = contA ? metaB.label : metaA.label;
  return `${cont} is continuous (PDF), while ${disc} is discrete (PMF). The y-axes are both normalized to their respective peaks for easier visual comparison.`;
}

export default function ComparisonMode({ params, distA, distB, onChangeA, onChangeB }: Props) {
  const metaA = DISTRIBUTIONS[distA];
  const metaB = DISTRIBUTIONS[distB];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-5"
    >
      <div className="flex items-center gap-2">
        <span className="w-4 h-px bg-[#d4af37]" />
        <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#d4af37]">
          Comparison Mode
        </p>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DistributionSelect value={distA} onChange={onChangeA} exclude={distB} label="Distribution A (solid)" />
        <DistributionSelect value={distB} onChange={onChangeB} exclude={distA} label="Distribution B (dashed)" />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-8 h-0.5" style={{ background: metaA.color, display: "inline-block" }} />
          <span className="text-[11px] font-semibold" style={{ color: metaA.color }}>{metaA.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="28" height="4" viewBox="0 0 28 4">
            <line x1="0" y1="2" x2="28" y2="2" stroke={metaB.color} strokeWidth="2" strokeDasharray="5,3" />
          </svg>
          <span className="text-[11px] font-semibold" style={{ color: metaB.color }}>{metaB.label}</span>
        </div>
      </div>

      {/* Overlay chart */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#0a0e1a" }}>
        <OverlayChart
          typeA={distA}
          typeB={distB}
          paramsA={params[distA]}
          paramsB={params[distB]}
        />
      </div>

      {/* Insight */}
      <p className="text-[12px] text-[#94a3b8] leading-relaxed rounded-xl border border-[#1e293b] bg-[#0a0e1a] px-4 py-3">
        {insightText(distA, distB)}
      </p>

      {/* Stats side by side */}
      <div className="grid grid-cols-2 gap-4">
        {[{ t: distA, p: params[distA] }, { t: distB, p: params[distB] }].map(({ t, p }) => {
          const meta = DISTRIBUTIONS[t];
          const stats = meta.getStats(p);
          return (
            <div key={t} className="rounded-xl border border-[#1e293b] p-3">
              <p className="text-[10px] font-bold mb-2" style={{ color: meta.color }}>{meta.label}</p>
              <dl className="space-y-1">
                {Object.entries(stats).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <dt className="text-[9px] text-[#475569]">{k}</dt>
                    <dd className="text-[10px] font-mono font-bold text-white tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
