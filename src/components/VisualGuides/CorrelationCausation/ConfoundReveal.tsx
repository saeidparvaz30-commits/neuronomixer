"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ICE_CREAM_DATA, SEASON_COLORS, SEASON_LABELS, linearRegression, pearsonR, Season } from "./types";

const W = 500, H = 216;
const PAD = { l: 52, r: 24, t: 16, b: 44 };
const IW = W - PAD.l - PAD.r;
const IH = H - PAD.t - PAD.b;

const toX = (v: number) => PAD.l + (v / 50) * IW;
const toY = (v: number) => PAD.t + (1 - v / 16) * IH;

interface Props { onReveal?: () => void }

export default function ConfoundReveal({ onReveal }: Props) {
  const [revealed, setRevealed] = useState(false);
  const r   = pearsonR(ICE_CREAM_DATA);
  const reg = linearRegression(ICE_CREAM_DATA);

  function handleReveal() { setRevealed(true); onReveal?.(); }

  const xTicks = [0, 10, 20, 30, 40, 50];
  const yTicks = [0, 4, 8, 12, 16];

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <p className="text-[12px] text-[#94a3b8] max-w-[380px]">
            Both ice cream sales and shark attacks spike every year at the same time. Are they causally linked?
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide">Pearson r</p>
          <p className="text-[24px] font-black text-[var(--color-accent)]">{r.toFixed(2)}</p>
          <p className="text-[10px] text-[var(--color-accent)]">very strong positive</p>
        </div>
      </div>

      {/* SVG Chart */}
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block mb-4">
        {xTicks.map(v => (
          <line key={`gx-${v}`} x1={toX(v)} y1={PAD.t} x2={toX(v)} y2={PAD.t + IH} stroke="#1e293b" strokeWidth="1" />
        ))}
        {yTicks.map(v => (
          <line key={`gy-${v}`} x1={PAD.l} y1={toY(v)} x2={PAD.l + IW} y2={toY(v)} stroke="#1e293b" strokeWidth="1" />
        ))}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1.5" />
        <line x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} stroke="#334155" strokeWidth="1.5" />
        {xTicks.map(v => <text key={`xl-${v}`} x={toX(v)} y={PAD.t + IH + 16} textAnchor="middle" fontSize="9" fill="#475569" fontFamily="Inter,sans-serif">{v}</text>)}
        {yTicks.map(v => <text key={`yl-${v}`} x={PAD.l - 8} y={toY(v) + 3} textAnchor="end" fontSize="9" fill="#475569" fontFamily="Inter,sans-serif">{v}</text>)}
        <text x={PAD.l + IW / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="Inter,sans-serif">Ice Cream Sales ($1000s/month)</text>
        <text x={14} y={PAD.t + IH / 2} textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="Inter,sans-serif" transform={`rotate(-90,14,${PAD.t + IH / 2})`}>Shark Attacks (count/month)</text>

        {/* Regression line */}
        <line
          x1={toX(0)}  y1={toY(reg.intercept)}
          x2={toX(50)} y2={toY(reg.intercept + reg.slope * 50)}
          stroke="var(--color-accent)" strokeWidth="2" strokeDasharray="6 3" opacity="0.85"
        />

        {/* Animated data points */}
        {ICE_CREAM_DATA.map(pt => (
          <motion.circle
            key={pt.id}
            cx={toX(pt.x)} cy={toY(pt.y)} r={6}
            stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"
            animate={{ fill: revealed ? SEASON_COLORS[pt.season] : "#3bb4a4" }}
            transition={{ duration: 0.7, delay: pt.id * 0.05 }}
          />
        ))}
      </svg>

      {/* Reveal or revealed state */}
      <AnimatePresence mode="wait">
        {!revealed ? (
          <motion.div key="btn" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button
              onClick={handleReveal}
              className="w-full py-3 rounded-xl bg-[var(--color-accent)] text-[#0a0e1a] font-semibold text-[13px] hover:opacity-90 transition-opacity"
            >
              Reveal the Hidden Variable →
            </button>
          </motion.div>
        ) : (
          <motion.div key="revealed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            {/* Season legend */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
              {(["summer", "fall", "winter", "spring"] as Season[]).map(s => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: SEASON_COLORS[s] }} />
                  <span className="text-[11px] text-[#94a3b8]">{SEASON_LABELS[s]}</span>
                </div>
              ))}
            </div>
            {/* Explanation */}
            <div className="rounded-xl border-l-4 border-[#3bb4a4] bg-[#3bb4a4]/5 p-3">
              <p className="text-[12px] font-semibold text-[#3bb4a4] mb-1">The Hidden Variable: Season / Temperature</p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Both ice cream sales <em>and</em> shark attacks increase in summer, because warm weather brings
                more people to the beach.{" "}
                <strong className="text-white">Temperature (via season) causes both.</strong>{" "}
                Ice cream doesn&apos;t cause sharks; they share a common cause.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
