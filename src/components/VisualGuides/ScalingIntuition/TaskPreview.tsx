"use client";

import React from "react";
import {
  MASTER_TRAIN_SET,
  TRUE_FORMULA,
  NOISE_SIGMA,
  DATA_SIZES,
  trueFn,
} from "./scalingMath";

/**
 * Static SVG preview of the task: the true function as a diverging field
 * over [-1, 1]^2 plus the nested training points. Everything here is
 * derived deterministically from scalingMath at module load, and every
 * float-derived attribute is quantized with toFixed, so SSR and client
 * markup agree byte for byte.
 */

const RES = 28;
const SIZE = 260;
const CELL = SIZE / RES;

interface FieldCell {
  x: string;
  y: string;
  fill: string;
}

function buildField(): FieldCell[] {
  const raw: { x: number; y: number; v: number }[] = [];
  let maxAbs = 0;
  for (let r = 0; r < RES; r++) {
    const x2 = -1 + (2 * (r + 0.5)) / RES;
    for (let c = 0; c < RES; c++) {
      const x1 = -1 + (2 * (c + 0.5)) / RES;
      const v = trueFn(x1, x2);
      maxAbs = Math.max(maxAbs, Math.abs(v));
      raw.push({ x: c * CELL, y: r * CELL, v });
    }
  }
  return raw.map(({ x, y, v }) => {
    const a = (0.08 + 0.72 * (Math.abs(v) / maxAbs)).toFixed(3);
    const fill =
      v >= 0 ? `rgba(59,180,164,${a})` : `rgba(168,85,247,${a})`;
    return { x: x.toFixed(2), y: y.toFixed(2), fill };
  });
}

const FIELD = buildField();

const POINTS = MASTER_TRAIN_SET.map((s, i) => ({
  cx: (((s.x[0] + 1) / 2) * SIZE).toFixed(2),
  cy: (((s.x[1] + 1) / 2) * SIZE).toFixed(2),
  smallBudget: i < DATA_SIZES[0],
}));

export default function TaskPreview() {
  return (
    <div className="flex flex-col lg:flex-row gap-5">
      <div className="shrink-0">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="w-full max-w-[260px] rounded-xl border border-[#1e293b]"
          role="img"
          aria-label={`The true function ${TRUE_FORMULA} shown as a color field over the input square, teal where the value is positive and purple where it is negative, with all ${DATA_SIZES[3]} training point locations overlaid as dots and the first ${DATA_SIZES[0]} points highlighted in gold.`}
        >
          {FIELD.map((cell, i) => (
            <rect
              key={i}
              x={cell.x}
              y={cell.y}
              width={CELL.toFixed(2)}
              height={CELL.toFixed(2)}
              fill={cell.fill}
            />
          ))}
          {POINTS.filter((p) => !p.smallBudget).map((p, i) => (
            <circle
              key={`p${i}`}
              cx={p.cx}
              cy={p.cy}
              r="1.4"
              fill="#f1f5f9"
              opacity="0.5"
            />
          ))}
          {POINTS.filter((p) => p.smallBudget).map((p, i) => (
            <circle
              key={`s${i}`}
              cx={p.cx}
              cy={p.cy}
              r="3.5"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="1.5"
            />
          ))}
        </svg>
        <p className="text-[10px] text-[#475569] mt-2 max-w-[260px] leading-relaxed">
          Teal: positive, purple: negative (paired with the sign in the
          formula, not color alone). Gold rings: the 8-point budget. White
          dots: the rest of the 512-point pool.
        </p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
          The one task every network trains on
        </p>
        <pre className="rounded-lg bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[12px] px-3 py-2 mb-3 overflow-x-auto">
          {TRUE_FORMULA}
        </pre>
        <ul className="space-y-2 text-[12px] text-[#94a3b8] leading-relaxed">
          <li>
            <span className="text-white font-semibold">Noisy labels.</span>{" "}
            Training targets carry Gaussian noise with sigma ={" "}
            {NOISE_SIGMA}, so a perfect training fit means memorizing noise
            (the noise floor on train MSE is sigma squared ={" "}
            {(NOISE_SIGMA * NOISE_SIGMA).toFixed(4)}).
          </li>
          <li>
            <span className="text-white font-semibold">Nested budgets.</span>{" "}
            The four training sets of {DATA_SIZES.join(", ")} points are
            prefixes of one fixed pool: every larger budget contains the
            smaller ones. More data really means the same task, more
            evidence.
          </li>
          <li>
            <span className="text-white font-semibold">
              Honest validation.
            </span>{" "}
            Validation loss is measured against the noise-free true function
            on a held-out 16 by 16 grid, so it scores how well each network
            recovered the signal rather than the label noise.
          </li>
        </ul>
      </div>
    </div>
  );
}
