"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { DistributionType, computePDF, DISTRIBUTIONS } from "./types";

interface Props {
  type: DistributionType;
  params: Record<string, number>;
  height?: number;
}

export default function DistributionCurve({ type, params, height = 300 }: Props) {
  const meta = DISTRIBUTIONS[type];
  const [xMin, xMax] = meta.xRange(params);
  const isContinuous = meta.isContinuous;

  const W = 480;
  const H = height;
  const PAD = { l: 56, r: 12, t: 14, b: 36 };
  const IW = W - PAD.l - PAD.r;
  const IH = H - PAD.t - PAD.b;

  const N = isContinuous
    ? 200
    : Math.min(60, Math.round(xMax - xMin) + 1);

  const pts = useMemo(() => {
    return Array.from({ length: N }, (_, i) => {
      const x = xMin + (i / (N - 1)) * (xMax - xMin);
      const y = computePDF(type, x, params);
      return { x, y };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, xMin, xMax, N, JSON.stringify(params)]);

  const maxY = Math.max(...pts.map(p => p.y), 0.001);

  const tx = (x: number) => PAD.l + ((x - xMin) / (xMax - xMin)) * IW;
  const ty = (y: number) => PAD.t + IH - (y / maxY) * IH;

  // X-axis ticks: 5 ticks
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map(t => xMin + t * (xMax - xMin));

  // Y-axis ticks: 4 levels
  const yTicks = [0.25, 0.5, 0.75, 1].map(t => t * maxY);

  // Continuous path
  const pathD = isContinuous
    ? pts
        .map((p, i) => `${i === 0 ? "M" : "L"} ${tx(p.x).toFixed(1)} ${ty(p.y).toFixed(1)}`)
        .join(" ")
    : "";

  // Bar width for discrete
  const barW = isContinuous ? 0 : Math.max(2, IW / N - 2);

  return (
    <div className="w-full overflow-hidden rounded-xl" style={{ background: "#0a0e1a" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        aria-label={`${meta.label} ${isContinuous ? "PDF" : "PMF"} curve`}
      >
        {/* Grid lines */}
        {yTicks.map(yt => (
          <line
            key={yt}
            x1={PAD.l}
            y1={ty(yt)}
            x2={W - PAD.r}
            y2={ty(yt)}
            stroke="#1e293b"
            strokeWidth="0.5"
            strokeDasharray="3,3"
          />
        ))}

        {/* Axes */}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
        <line x1={PAD.l} y1={PAD.t + IH} x2={W - PAD.r} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />

        {/* Y-axis label */}
        <text
          x={14}
          y={PAD.t + IH / 2}
          textAnchor="middle"
          fill="#475569"
          fontSize="16"
          transform={`rotate(-90, 14, ${PAD.t + IH / 2})`}
        >
          {isContinuous ? "PDF" : "PMF"}
        </text>

        {/* Y-axis ticks */}
        {yTicks.map(yt => (
          <text key={yt} x={PAD.l - 4} y={ty(yt) + 5} textAnchor="end" fill="#475569" fontSize="15">
            {yt.toFixed(yt < 0.01 ? 3 : yt < 0.1 ? 2 : 1)}
          </text>
        ))}

        {/* X-axis ticks */}
        {xTicks.map(v => (
          <g key={v}>
            <line x1={tx(v)} y1={PAD.t + IH} x2={tx(v)} y2={PAD.t + IH + 4} stroke="#334155" strokeWidth="1" />
            <text x={tx(v)} y={PAD.t + IH + 20} textAnchor="middle" fill="#475569" fontSize="15">
              {Math.abs(v) < 0.005 ? "0" : v.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Continuous: animated path */}
        {isContinuous && (
          <>
            {/* Fill under curve */}
            <path
              d={`${pathD} L ${tx(xMax).toFixed(1)} ${PAD.t + IH} L ${tx(xMin).toFixed(1)} ${PAD.t + IH} Z`}
              fill={meta.color}
              opacity="0.07"
            />
            <motion.path
              key={JSON.stringify(params)}
              d={pathD}
              fill="none"
              stroke={meta.color}
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </>
        )}

        {/* Discrete: animated bars */}
        {!isContinuous &&
          pts.map((p, i) => {
            const bh = (p.y / maxY) * IH;
            const barX = tx(p.x) - barW / 2;
            const barY = PAD.t + IH - bh;
            return (
              <motion.rect
                key={`${i}-${JSON.stringify(params)}`}
                x={barX}
                width={barW}
                fill={meta.color}
                opacity="0.8"
                rx="1"
                initial={{ height: 0, y: PAD.t + IH }}
                animate={{ height: bh, y: barY }}
                transition={{ duration: 0.3, delay: i * 0.008, ease: "easeOut" }}
              />
            );
          })}
      </svg>
    </div>
  );
}
