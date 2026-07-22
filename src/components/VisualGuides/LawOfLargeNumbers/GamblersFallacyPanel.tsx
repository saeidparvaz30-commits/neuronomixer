"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuideMotion } from "@/lib/guideMotion";
import {
  computeGamblerSeries,
  fmt,
  GAMBLER_BASE_SEED,
  GAMBLER_FLIPS,
  STREAK_LEN,
} from "./types";

// ── Mini line chart (linear x-axis) ──────────────────────────────────────────

const MW = 300;
const MH = 160;
const MPAD = { l: 40, r: 10, t: 12, b: 26 };

function MiniChart({
  values,
  color,
  refValue,
  title,
  ariaLabel,
}: {
  values: number[];
  color: string;
  refValue?: number;
  title: string;
  ariaLabel: string;
}) {
  const n = values.length;
  const innerW = MW - MPAD.l - MPAD.r;
  const innerH = MH - MPAD.t - MPAD.b;

  let yMin = Infinity;
  let yMax = -Infinity;
  for (const v of values) {
    if (v < yMin) yMin = v;
    if (v > yMax) yMax = v;
  }
  if (refValue !== undefined) {
    yMin = Math.min(yMin, refValue);
    yMax = Math.max(yMax, refValue);
  }
  if (yMax - yMin < 1e-9) {
    yMin -= 1;
    yMax += 1;
  }
  const pad = (yMax - yMin) * 0.1;
  yMin -= pad;
  yMax += pad;

  const x = (i: number) => MPAD.l + (i / (n - 1)) * innerW;
  const y = (v: number) => MPAD.t + ((yMax - v) / (yMax - yMin)) * innerH;

  const step = Math.max(1, Math.floor(n / 300));
  const pts: string[] = [];
  for (let i = 0; i < n; i += step) {
    pts.push(`${pts.length === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(values[i]).toFixed(2)}`);
  }
  pts.push(`L ${x(n - 1).toFixed(2)} ${y(values[n - 1]).toFixed(2)}`);

  const yTicks = [yMin + pad, (yMin + yMax) / 2, yMax - pad];

  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3">
      <p className="text-[11px] font-semibold text-[#94a3b8] mb-2 uppercase tracking-wide">{title}</p>
      <svg viewBox={`0 0 ${MW} ${MH}`} width="100%" role="img" aria-label={ariaLabel} style={{ display: "block" }}>
        <rect x={MPAD.l} y={MPAD.t} width={innerW} height={innerH} fill="#0f172a" stroke="#1e293b" strokeWidth={1} />
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={MPAD.l} y1={y(t)} x2={MW - MPAD.r} y2={y(t)} stroke="#1e293b" strokeWidth={1} />
            <text x={MPAD.l - 4} y={y(t) + 3} textAnchor="end" fill="#475569" fontSize={10}>
              {fmt(t, Math.abs(yMax - yMin) >= 5 ? 0 : 2)}
            </text>
          </g>
        ))}
        {[0, Math.floor((n - 1) / 2), n - 1].map((i) => (
          <text key={i} x={x(i)} y={MH - MPAD.b + 12} textAnchor="middle" fill="#475569" fontSize={10}>
            {i + 1}
          </text>
        ))}
        <text x={MPAD.l + innerW / 2} y={MH - 2} textAnchor="middle" fill="#475569" fontSize={10}>
          flip number
        </text>
        {refValue !== undefined && (
          <line
            x1={MPAD.l}
            y1={y(refValue)}
            x2={MW - MPAD.r}
            y2={y(refValue)}
            stroke="var(--color-success)"
            strokeWidth={1.2}
            strokeDasharray="4,3"
          />
        )}
        <path d={pts.join(" ")} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpen: () => void;
}

export default function GamblersFallacyPanel({ open, onOpen }: Props) {
  const { fadeIn } = useGuideMotion();
  const [seedOffset, setSeedOffset] = useState(0);
  const seed = GAMBLER_BASE_SEED + seedOffset;

  const sim = useMemo(
    () => (open ? computeGamblerSeries(seed, GAMBLER_FLIPS) : null),
    [open, seed]
  );

  return (
    <div
      className="rounded-2xl border bg-[#0f172a] p-5 sm:p-6"
      style={{ borderColor: open ? "color-mix(in srgb, var(--color-warning) 35%, transparent)" : "#1e293b" }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] mb-1" style={{ color: "var(--color-warning)" }}>
            Common Misreading
          </p>
          <p className="text-[13px] font-semibold text-white">The Gambler&apos;s Fallacy</p>
          <p className="text-[12px] text-[#475569] mt-1 max-w-[520px] leading-relaxed">
            LLN says the proportion of heads converges. It does not say past deficits get
            corrected, and it does not say the raw counts balance out.
          </p>
        </div>
        <button
          onClick={onOpen}
          aria-expanded={open}
          className="px-4 py-2 rounded-xl text-[12px] font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors self-start sm:self-center"
        >
          {open ? "Panel open" : "Open the demo"}
        </button>
      </div>

      <AnimatePresence>
        {open && sim && (
          <motion.div variants={fadeIn} initial="hidden" animate="visible" exit="hidden" className="mt-5">
            <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[680px]">
              Both charts come from the same simulated run of {GAMBLER_FLIPS.toLocaleString()} fair-coin
              flips (seed {seed}). The proportion of heads settles toward 0.5, yet the absolute
              deviation |heads - n/2| keeps drifting upward: it typically grows on the order of the
              square root of n. The ratio converges because the denominator n grows, not because the
              coin repays its debts.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <MiniChart
                title="Proportion of heads (converges)"
                values={sim.proportions}
                color="var(--color-success)"
                refValue={0.5}
                ariaLabel={`Proportion of heads over ${sim.n} flips, converging toward 0.5. Final proportion ${fmt(sim.proportions[sim.n - 1])}.`}
              />
              <MiniChart
                title="|heads - n/2| (grows)"
                values={sim.absDeviations}
                color="var(--color-warning)"
                ariaLabel={`Absolute deviation of the head count from n over 2, over ${sim.n} flips. It grows rather than shrinking. Final deviation ${fmt(sim.absDeviations[sim.n - 1], 1)}.`}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: `Heads after ${sim.n.toLocaleString()} flips`, value: sim.headsTotal.toLocaleString() },
                { label: "Proportion at n = 100", value: fmt(sim.proportions[99]) },
                { label: `Proportion at n = ${sim.n.toLocaleString()}`, value: fmt(sim.proportions[sim.n - 1]) },
                { label: `|heads - n/2| at n = ${sim.n.toLocaleString()}`, value: fmt(sim.absDeviations[sim.n - 1], 1) },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-[#1e293b] p-3">
                  <p className="text-[10px] text-[#475569] mb-1 leading-snug">{s.label}</p>
                  <p className="text-[15px] font-mono font-bold text-white">{s.value}</p>
                </div>
              ))}
            </div>

            <div
              className="rounded-xl border p-4 mb-4"
              style={{
                borderColor: "color-mix(in srgb, var(--color-warning) 30%, transparent)",
                background: "color-mix(in srgb, var(--color-warning) 6%, transparent)",
              }}
            >
              <p className="text-[12px] leading-relaxed text-[#94a3b8]">
                <span className="font-semibold" style={{ color: "var(--color-warning)" }}>
                  The coin has no memory.
                </span>{" "}
                {sim.streakOpportunities > 0 ? (
                  <>
                    In this run, after every streak of {STREAK_LEN} or more consecutive heads, the very
                    next flip came up heads {sim.streakNextHeads} out of {sim.streakOpportunities} times
                    ({fmt((100 * sim.streakNextHeads) / sim.streakOpportunities, 1)}%). With only{" "}
                    {sim.streakOpportunities} qualifying {sim.streakOpportunities === 1 ? "streak" : "streaks"},
                    that percentage fluctuates around 50%
                    from run to run; flip a few new sequences and it lands above and below. What never
                    appears is a systematic pull below 50%: a streak of heads does not make tails
                    &quot;due&quot;.
                  </>
                ) : (
                  <>
                    This particular run contains no streak of {STREAK_LEN} or more heads, so there is
                    nothing to condition on. Flip a new sequence to find one.
                  </>
                )}
              </p>
            </div>

            <button
              onClick={() => setSeedOffset((s) => s + 1)}
              className="px-4 py-2 rounded-xl text-[12px] font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            >
              Flip a new sequence (seed {seed + 1})
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
