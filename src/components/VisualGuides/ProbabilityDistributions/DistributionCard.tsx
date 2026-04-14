"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Minus,
  TrendingDown,
  Hash,
  Percent,
  Circle,
  Triangle,
  Zap,
} from "lucide-react";
import { DistributionType, DISTRIBUTIONS, computePDF } from "./types";

const ICON_MAP: Record<DistributionType, React.ElementType> = {
  normal: Bell,
  uniform: Minus,
  exponential: TrendingDown,
  poisson: Hash,
  binomial: Percent,
  beta: Circle,
  gamma: Triangle,
  laplace: Zap,
};

interface MiniCurveProps {
  type: DistributionType;
  color: string;
  params: Record<string, number>;
}

function MiniCurve({ type, color, params }: MiniCurveProps) {
  const meta = DISTRIBUTIONS[type];
  const [xMin, xMax] = meta.xRange(params);
  const W = 200;
  const H = 72;
  const N = meta.isContinuous ? 70 : Math.min(30, Math.round(xMax - xMin) + 1);

  const pts = useMemo(() => {
    return Array.from({ length: N }, (_, i) => {
      const x = xMin + (i / (N - 1)) * (xMax - xMin);
      const y = computePDF(type, x, params);
      return { x, y };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, xMin, xMax, N, JSON.stringify(params)]);

  const maxY = Math.max(...pts.map(p => p.y), 0.001);
  const tx = (x: number) => 4 + ((x - xMin) / (xMax - xMin)) * (W - 8);
  const ty = (y: number) => H - 4 - (y / maxY) * (H - 8);

  if (!meta.isContinuous) {
    const bw = Math.max(1.5, (W - 8) / N - 1.5);
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-hidden="true">
        {pts.map((p, i) => {
          const bh = (p.y / maxY) * (H - 8);
          return (
            <rect
              key={i}
              x={tx(p.x) - bw / 2}
              y={H - 4 - bh}
              width={bw}
              height={bh}
              fill={color}
              opacity="0.75"
              rx="1"
            />
          );
        })}
      </svg>
    );
  }

  const pathD = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${tx(p.x).toFixed(1)} ${ty(p.y).toFixed(1)}`)
    .join(" ");
  const fillD = `${pathD} L ${tx(xMax).toFixed(1)} ${H - 4} L ${tx(xMin).toFixed(1)} ${H - 4} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" aria-hidden="true">
      <path d={fillD} fill={color} opacity="0.12" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

interface Props {
  type: DistributionType;
  params: Record<string, number>;
  isSelected: boolean;
  isOpened: boolean;
  onClick: () => void;
}

export default function DistributionCard({ type, params, isSelected, isOpened, onClick }: Props) {
  const meta = DISTRIBUTIONS[type];
  const Icon = ICON_MAP[type];

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={`${meta.label} distribution — click to explore`}
      aria-pressed={isSelected}
      onClick={onClick}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className="relative rounded-2xl border bg-[#0f172a] p-3 cursor-pointer text-left overflow-hidden transition-colors"
      style={{
        borderColor: isSelected ? meta.color : "#1e293b",
        background: isSelected ? meta.color + "0a" : "#0f172a",
      }}
    >
      {/* Left accent bar when selected */}
      {isSelected && (
        <span
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
          style={{ background: meta.color }}
        />
      )}

      {/* Opened dot */}
      {isOpened && !isSelected && (
        <span
          className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full"
          style={{ background: meta.color, opacity: 0.6 }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-1 pl-1">
        <div className="flex items-center gap-1.5">
          <Icon size={12} style={{ color: meta.color }} />
          <span className="text-[12px] font-bold text-white">{meta.label}</span>
        </div>
        <span
          className="text-[8px] font-semibold uppercase tracking-[0.8px] px-1.5 py-0.5 rounded"
          style={{ background: meta.color + "1a", color: meta.color }}
        >
          {meta.isContinuous ? "PDF" : "PMF"}
        </span>
      </div>

      <p className="text-[9px] text-[#475569] mb-2 leading-snug pl-1 line-clamp-2">
        {meta.tagline}
      </p>

      {/* Mini sparkline */}
      <MiniCurve type={type} color={meta.color} params={params} />
    </motion.div>
  );
}
