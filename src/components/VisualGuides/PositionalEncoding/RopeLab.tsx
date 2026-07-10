"use client";

import React, { useMemo } from "react";
import {
  Q_VEC,
  K_VEC,
  ROPE_MAX_POS,
  CURVE_MAX_GAP,
  ropeThetas,
  ropeRotate,
  ropeScore,
  pairContribution,
  scoreCurve,
} from "./peMath";

export interface ShiftRecord {
  fromM: number;
  fromN: number;
  toM: number;
  toN: number;
  before: number;
  after: number;
}

interface Props {
  m: number;
  n: number;
  onMChange: (v: number) => void;
  onNChange: (v: number) => void;
  onShift: (delta: number) => void;
  lastShift: ShiftRecord | null;
}

const THETAS = ropeThetas();
const CURVE = scoreCurve(Q_VEC, K_VEC, THETAS, CURVE_MAX_GAP);

const CIRCLE_SIZE = 170;
const CIRCLE_C = CIRCLE_SIZE / 2;
const CIRCLE_R = 62;

const CURVE_W = 600;
const CURVE_H = 220;
const CURVE_PAD = { top: 16, right: 16, bottom: 28, left: 44 };

function fmt(v: number, digits = 3): string {
  return (v >= 0 ? "+" : "") + v.toFixed(digits);
}

/** One rotating 2D pair: q and k arrows on a unit circle. Decorative; the
 * numeric readouts next to it carry the same information as text. */
function PairCircle({
  pairIdx,
  m,
  n,
}: {
  pairIdx: number;
  m: number;
  n: number;
}) {
  const theta = THETAS[pairIdx];
  const [qx, qy] = [
    ropeRotate(Q_VEC, m, THETAS)[2 * pairIdx],
    ropeRotate(Q_VEC, m, THETAS)[2 * pairIdx + 1],
  ];
  const [kx, ky] = [
    ropeRotate(K_VEC, n, THETAS)[2 * pairIdx],
    ropeRotate(K_VEC, n, THETAS)[2 * pairIdx + 1],
  ];
  const contrib = pairContribution(Q_VEC, K_VEC, pairIdx, m, n, THETAS);

  const px = (v: number) => (CIRCLE_C + v * CIRCLE_R).toFixed(2);
  const py = (v: number) => (CIRCLE_C - v * CIRCLE_R).toFixed(2);

  return (
    <div className="rounded-xl border border-[#1e293b] p-4 flex-1 min-w-[240px]">
      <p className="text-[11px] font-semibold text-white mb-1">
        Pair {pairIdx + 1}: theta = {theta.toFixed(2)} rad/position (
        {pairIdx === 0 ? "fast" : "slow"})
      </p>
      <div className="flex items-center gap-3">
        <svg
          viewBox={`0 0 ${CIRCLE_SIZE} ${CIRCLE_SIZE}`}
          className="w-[130px] h-[130px] shrink-0"
          aria-hidden="true"
        >
          <circle
            cx={CIRCLE_C}
            cy={CIRCLE_C}
            r={CIRCLE_R}
            fill="none"
            stroke="#334155"
            strokeWidth="1"
          />
          <line
            x1={CIRCLE_C - CIRCLE_R}
            y1={CIRCLE_C}
            x2={CIRCLE_C + CIRCLE_R}
            y2={CIRCLE_C}
            stroke="#1e293b"
            strokeWidth="1"
          />
          <line
            x1={CIRCLE_C}
            y1={CIRCLE_C - CIRCLE_R}
            x2={CIRCLE_C}
            y2={CIRCLE_C + CIRCLE_R}
            stroke="#1e293b"
            strokeWidth="1"
          />
          {/* q arrow */}
          <line
            x1={CIRCLE_C}
            y1={CIRCLE_C}
            x2={px(qx)}
            y2={py(qy)}
            stroke="var(--color-accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx={px(qx)} cy={py(qy)} r="4" fill="var(--color-accent)" />
          <text
            x={px(qx * 1.22)}
            y={py(qy * 1.22)}
            fill="var(--color-accent)"
            fontSize="11"
            fontWeight="700"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            q
          </text>
          {/* k arrow */}
          <line
            x1={CIRCLE_C}
            y1={CIRCLE_C}
            x2={px(kx)}
            y2={py(ky)}
            stroke="#3bb4a4"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx={px(kx)} cy={py(ky)} r="4" fill="#3bb4a4" />
          <text
            x={px(kx * 1.22)}
            y={py(ky * 1.22)}
            fill="#3bb4a4"
            fontSize="11"
            fontWeight="700"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            k
          </text>
        </svg>
        <div className="text-[11px] font-mono leading-relaxed min-w-0">
          <p className="text-[var(--color-accent)]">
            q turned {(m * theta).toFixed(2)} rad
          </p>
          <p className="text-[var(--color-accent)] mb-1">
            ({fmt(qx)}, {fmt(qy)})
          </p>
          <p className="text-[#3bb4a4]">k turned {(n * theta).toFixed(2)} rad</p>
          <p className="text-[#3bb4a4] mb-1">
            ({fmt(kx)}, {fmt(ky)})
          </p>
          <p className="text-[#94a3b8]">
            dot = <span className="text-white">{fmt(contrib)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RopeLab({
  m,
  n,
  onMChange,
  onNChange,
  onShift,
  lastShift,
}: Props) {
  const score = useMemo(() => ropeScore(Q_VEC, K_VEC, m, n, THETAS), [m, n]);
  const gap = m - n;

  // Curve geometry
  const { pathD, xFor, yFor } = useMemo(() => {
    const scores = CURVE.map((p) => p.score);
    const yMin = Math.min(...scores);
    const yMax = Math.max(...scores);
    const span = yMax - yMin || 1;
    const innerW = CURVE_W - CURVE_PAD.left - CURVE_PAD.right;
    const innerH = CURVE_H - CURVE_PAD.top - CURVE_PAD.bottom;
    const xFn = (g: number) =>
      CURVE_PAD.left + ((g + CURVE_MAX_GAP) / (2 * CURVE_MAX_GAP)) * innerW;
    const yFn = (s: number) =>
      CURVE_PAD.top + (1 - (s - yMin) / span) * innerH;
    const d = CURVE.map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${xFn(p.gap).toFixed(2)},${yFn(p.score).toFixed(2)}`
    ).join(" ");
    return { pathD: d, xFor: xFn, yFor: yFn };
  }, []);

  const shiftUpOk = m + 1 <= ROPE_MAX_POS && n + 1 <= ROPE_MAX_POS;
  const shiftDownOk = m - 1 >= 0 && n - 1 >= 0;
  const shiftDelta = lastShift
    ? Math.abs(lastShift.after - lastShift.before)
    : null;

  return (
    <div>
      {/* Fixed vectors */}
      <p className="text-[11px] text-[#94a3b8] leading-relaxed mb-3">
        Fixed head vectors (two 2D pairs each), authored for this demo and
        rotated live below:{" "}
        <span className="font-mono text-[var(--color-accent)]">
          q = [{Q_VEC.join(", ")}]
        </span>
        ,{" "}
        <span className="font-mono text-[#3bb4a4]">
          k = [{K_VEC.join(", ")}]
        </span>
        .
      </p>

      {/* Position sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label
            htmlFor="rope-m"
            className="block text-[11px] font-semibold text-[#94a3b8] mb-1"
          >
            Query position m:{" "}
            <span className="text-white font-mono">{m}</span>
          </label>
          <input
            id="rope-m"
            type="range"
            min={0}
            max={ROPE_MAX_POS}
            step={1}
            value={m}
            onChange={(e) => onMChange(Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]"
          />
        </div>
        <div>
          <label
            htmlFor="rope-n"
            className="block text-[11px] font-semibold text-[#94a3b8] mb-1"
          >
            Key position n: <span className="text-white font-mono">{n}</span>
          </label>
          <input
            id="rope-n"
            type="range"
            min={0}
            max={ROPE_MAX_POS}
            step={1}
            value={n}
            onChange={(e) => onNChange(Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]"
          />
        </div>
      </div>

      {/* Rotating pairs */}
      <div className="flex flex-wrap gap-4 mb-4">
        <PairCircle pairIdx={0} m={m} n={n} />
        <PairCircle pairIdx={1} m={m} n={n} />
      </div>

      {/* Score readout */}
      <div className="rounded-xl border border-[#1e293b] bg-[#162032] p-4 mb-4">
        <p className="text-[12px] text-[#94a3b8]">
          Attention score = pair 1 dot + pair 2 dot ={" "}
          <span className="font-mono font-bold text-white text-[14px]">
            {fmt(score)}
          </span>{" "}
          at relative offset m - n ={" "}
          <span className="font-mono font-bold text-[var(--color-accent)] text-[14px]">
            {gap}
          </span>
        </p>
      </div>

      {/* Score vs offset curve */}
      <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3 mb-4 overflow-x-auto">
        <p className="text-[11px] font-semibold text-white mb-2 px-1">
          Score against relative offset: the gold marker is your live (m, n)
          score, plotted at its offset. It always lands on the curve.
        </p>
        <svg
          viewBox={`0 0 ${CURVE_W} ${CURVE_H}`}
          className="w-full h-auto block"
          role="img"
          aria-label={`Attention score as a function of relative offset m minus n, from -${CURVE_MAX_GAP} to ${CURVE_MAX_GAP}. Current offset ${gap} gives score ${score.toFixed(3)}, exactly on the curve.`}
        >
          {/* zero line */}
          <line
            x1={CURVE_PAD.left}
            y1={yFor(0).toFixed(2)}
            x2={CURVE_W - CURVE_PAD.right}
            y2={yFor(0).toFixed(2)}
            stroke="#1e293b"
            strokeWidth="1"
          />
          {/* offset 0 vertical */}
          <line
            x1={xFor(0).toFixed(2)}
            y1={CURVE_PAD.top}
            x2={xFor(0).toFixed(2)}
            y2={CURVE_H - CURVE_PAD.bottom}
            stroke="#1e293b"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <path d={pathD} fill="none" stroke="#93c5fd" strokeWidth="2" />
          {/* live point */}
          <circle
            cx={xFor(gap).toFixed(2)}
            cy={yFor(score).toFixed(2)}
            r="5.5"
            fill="var(--color-accent)"
            stroke="#0f172a"
            strokeWidth="2"
          />
          {/* axis labels */}
          <text
            x={xFor(-CURVE_MAX_GAP).toFixed(2)}
            y={CURVE_H - 8}
            fill="#475569"
            fontSize="10"
            textAnchor="start"
          >
            -{CURVE_MAX_GAP}
          </text>
          <text
            x={xFor(0).toFixed(2)}
            y={CURVE_H - 8}
            fill="#475569"
            fontSize="10"
            textAnchor="middle"
          >
            0
          </text>
          <text
            x={xFor(CURVE_MAX_GAP).toFixed(2)}
            y={CURVE_H - 8}
            fill="#475569"
            fontSize="10"
            textAnchor="end"
          >
            +{CURVE_MAX_GAP}
          </text>
          <text
            x="10"
            y={CURVE_PAD.top + 8}
            fill="#475569"
            fontSize="10"
            textAnchor="start"
          >
            score
          </text>
        </svg>
      </div>

      {/* Shift both */}
      <div className="rounded-xl border border-[#1e293b] p-4">
        <p className="text-[12px] font-semibold text-white mb-1">
          The proof: slide the whole pair along the sequence
        </p>
        <p className="text-[11px] text-[#94a3b8] leading-relaxed mb-3">
          Shift m and n together and both vectors rotate by the same extra
          angle, so their relative angle, and therefore the score, cannot
          change. Watch the marker stay put.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onShift(-1)}
            disabled={!shiftDownOk}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors disabled:opacity-40 disabled:hover:border-[#1e293b] disabled:hover:text-white"
          >
            Shift both -1
          </button>
          <button
            type="button"
            onClick={() => onShift(1)}
            disabled={!shiftUpOk}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors disabled:opacity-40 disabled:hover:border-[#1e293b] disabled:hover:text-white"
          >
            Shift both +1
          </button>
          {lastShift && shiftDelta !== null && (
            <p className="text-[11px] text-[#94a3b8] font-mono">
              ({lastShift.fromM}, {lastShift.fromN}) to ({lastShift.toM},{" "}
              {lastShift.toN}): score {lastShift.before.toFixed(4)} to{" "}
              {lastShift.after.toFixed(4)},{" "}
              <span className="text-[var(--color-success)]">
                |change| ={" "}
                {shiftDelta < 1e-12 ? "0 (machine precision)" : shiftDelta.toExponential(2)}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
