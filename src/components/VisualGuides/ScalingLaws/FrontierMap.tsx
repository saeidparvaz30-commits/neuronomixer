"use client";

import React, { useMemo } from "react";
import {
  HISTORICAL_MODELS,
  optimalAllocation,
  chinchillaLoss,
  flopsFor,
  formatCount,
  formatFlops,
  type Allocation,
} from "./scalingMath";

interface Props {
  user: Allocation;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const W = 640;
const H = 380;
const ML = 70;
const MR = 14;
const MT = 14;
const MB = 48;
const PW = W - ML - MR;
const PH = H - MT - MB;

const X_MIN = 7.8; // log10 N
const X_MAX = 13.2;
const Y_MIN = 9.0; // log10 D
const Y_MAX = 14.4;

const px = (logN: number) => ML + ((logN - X_MIN) / (X_MAX - X_MIN)) * PW;
const py = (logD: number) => MT + ((Y_MAX - logD) / (Y_MAX - Y_MIN)) * PH;

// Per-model label placement to avoid collisions (Chinchilla and LLaMA 65B
// nearly coincide on the plane).
const LABEL_POS: Record<string, { dx: number; dy: number; anchor: "start" | "end" | "middle" }> = {
  gpt3: { dx: 0, dy: -12, anchor: "middle" },
  gopher: { dx: 0, dy: 24, anchor: "middle" },
  mtnlg: { dx: 9, dy: 7, anchor: "start" },
  chinchilla: { dx: 9, dy: 7, anchor: "start" },
  palm: { dx: 9, dy: 7, anchor: "start" },
  llama65b: { dx: -9, dy: 7, anchor: "end" },
  llama2_70b: { dx: 9, dy: -10, anchor: "start" },
  llama3_405b: { dx: 9, dy: 7, anchor: "start" },
};

export default function FrontierMap({ user, selectedId, onSelect }: Props) {
  const frontierPath = useMemo(() => {
    let d = "";
    for (let logC = 18; logC <= 27.001; logC += 0.25) {
      const { n, d: tokens } = optimalAllocation(Math.pow(10, logC));
      const X = px(Math.log10(n)).toFixed(2);
      const Y = py(Math.log10(tokens)).toFixed(2);
      d += `${d === "" ? "M" : "L"}${X},${Y}`;
    }
    return d;
  }, []);

  const isoLines = useMemo(() => {
    // Iso-FLOP lines: log10 D = logC - log10(6) - log10 N (slope -1 in log-log).
    const log6 = Math.log10(6);
    return [20, 22, 24, 26].map((logC) => {
      // Intersect the line with the plot rectangle.
      const logDAt = (logN: number) => logC - log6 - logN;
      const logNAt = (logD: number) => logC - log6 - logD;
      let x1 = X_MIN;
      let y1 = logDAt(X_MIN);
      if (y1 > Y_MAX) {
        y1 = Y_MAX;
        x1 = logNAt(Y_MAX);
      }
      let x2 = X_MAX;
      let y2 = logDAt(X_MAX);
      if (y2 < Y_MIN) {
        y2 = Y_MIN;
        x2 = logNAt(Y_MIN);
      }
      return {
        logC,
        x1: px(x1).toFixed(2),
        y1: py(y1).toFixed(2),
        x2: px(x2).toFixed(2),
        y2: py(y2).toFixed(2),
      };
    });
  }, []);

  const userLogN = Math.log10(user.n);
  const userLogD = Math.log10(user.d);
  const userClamped =
    userLogN < X_MIN || userLogN > X_MAX || userLogD < Y_MIN || userLogD > Y_MAX;
  const userX = px(Math.min(Math.max(userLogN, X_MIN), X_MAX)).toFixed(2);
  const userY = py(Math.min(Math.max(userLogD, Y_MIN), Y_MAX)).toFixed(2);

  const selected = HISTORICAL_MODELS.find((m) => m.id === selectedId) ?? null;
  const selectedStats = useMemo(() => {
    if (!selected) return null;
    const c = flopsFor(selected.params, selected.tokens);
    const predicted = chinchillaLoss(selected.params, selected.tokens);
    const opt = optimalAllocation(c);
    return { c, predicted, opt, overhead: predicted - opt.loss };
  }, [selected]);

  const xTicks = [8, 9, 10, 11, 12, 13];
  const yTicks = [9, 10, 11, 12, 13, 14];

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Log-log map of parameters versus training tokens showing the compute-optimal frontier, published historical models, and your current allocation. Select a model button below for its full data."
      >
        {/* Grid + axes */}
        {yTicks.map((t) => (
          <g key={`gy${t}`}>
            <line x1={ML} y1={py(t)} x2={ML + PW} y2={py(t)} stroke="#1e293b" strokeWidth={1} />
            <text x={ML - 6} y={py(t) + 6} textAnchor="end" fontSize={20} fill="#475569">
              {formatCount(Math.pow(10, t))}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <g key={`gx${t}`}>
            <line x1={px(t)} y1={MT} x2={px(t)} y2={MT + PH} stroke="#1e293b" strokeWidth={1} />
            <text x={px(t)} y={MT + PH + 22} textAnchor="middle" fontSize={20} fill="#475569">
              {formatCount(Math.pow(10, t))}
            </text>
          </g>
        ))}
        <line x1={ML} y1={MT} x2={ML} y2={MT + PH} stroke="#334155" strokeWidth={1} />
        <line x1={ML} y1={MT + PH} x2={ML + PW} y2={MT + PH} stroke="#334155" strokeWidth={1} />
        <text x={ML + PW / 2} y={H - 4} textAnchor="middle" fontSize={20} fill="#475569">
          Parameters N (log scale)
        </text>
        <text
          x={12}
          y={MT + PH / 2}
          textAnchor="middle"
          fontSize={20}
          fill="#475569"
          transform={`rotate(-90 12 ${MT + PH / 2})`}
        >
          Training tokens D (log scale)
        </text>

        {/* Iso-FLOP guide lines */}
        {isoLines.map((l) => (
          <g key={`iso${l.logC}`}>
            <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#1e5d8a" strokeWidth={1} strokeDasharray="2 5" opacity={0.8} />
            <text
              x={parseFloat(l.x2) - 4}
              y={parseFloat(l.y2) - 5}
              textAnchor="end"
              fontSize={20}
              fill="#1e5d8a"
            >
              1e{l.logC} FLOPs
            </text>
          </g>
        ))}

        {/* Compute-optimal frontier */}
        <path d={frontierPath} fill="none" stroke="var(--color-accent)" strokeWidth={2} />
        <text x={px(9.1)} y={py(10.6) - 8} fontSize={20} fill="var(--color-accent)" fontWeight={600}>
          compute-optimal frontier
        </text>

        {/* Historical models */}
        {HISTORICAL_MODELS.map((m) => {
          const X = px(Math.log10(m.params));
          const Y = py(Math.log10(m.tokens));
          const pos = LABEL_POS[m.id] ?? { dx: 8, dy: 4, anchor: "start" as const };
          const isSel = m.id === selectedId;
          return (
            <g key={m.id}>
              {isSel && (
                <circle cx={X.toFixed(2)} cy={Y.toFixed(2)} r={9} fill="none" stroke="#a855f7" strokeWidth={1.5} />
              )}
              <circle cx={X.toFixed(2)} cy={Y.toFixed(2)} r={isSel ? 5 : 4} fill="#a855f7" />
              <text
                x={(X + pos.dx).toFixed(2)}
                y={(Y + pos.dy).toFixed(2)}
                textAnchor={pos.anchor}
                fontSize={20}
                fill={isSel ? "#f1f5f9" : "#94a3b8"}
                fontWeight={isSel ? 700 : 400}
              >
                {m.name}
              </text>
            </g>
          );
        })}

        {/* User point */}
        <circle cx={userX} cy={userY} r={5} fill="#3bb4a4" stroke="#0f172a" strokeWidth={1.5} />
        <text x={parseFloat(userX) + 9} y={parseFloat(userY) - 8} fontSize={20} fill="#3bb4a4" fontWeight={700}>
          you{userClamped ? " (off chart)" : ""}
        </text>
      </svg>

      {/* Model selector (keyboard accessible equivalent of the dots) */}
      <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide mt-4 mb-2">
        Inspect a model
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {HISTORICAL_MODELS.map((m) => {
          const isSel = m.id === selectedId;
          return (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              aria-pressed={isSel}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                isSel
                  ? "border-[#a855f7] text-[#a855f7] bg-[#a855f7]/10"
                  : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white"
              }`}
            >
              {m.name}
              <span className="ml-1 font-normal text-[#475569]">{m.year}</span>
            </button>
          );
        })}
      </div>

      {/* Detail card */}
      {selected && selectedStats ? (
        <div className="rounded-xl border border-[#a855f7]/30 bg-[#a855f7]/5 p-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
            <p className="text-[13px] font-bold text-white">{selected.name}</p>
            <p className="text-[10px] text-[#475569]">
              Published figures: {selected.source}, arXiv:{selected.arxiv}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Parameters (published)", value: formatCount(selected.params) },
              { label: "Tokens (published)", value: formatCount(selected.tokens) },
              { label: "Compute C = 6ND", value: `${formatFlops(selectedStats.c)} FLOPs` },
              { label: "Fit-predicted loss", value: selectedStats.predicted.toFixed(3) },
              {
                label: "Frontier at same C",
                value: `${formatCount(selectedStats.opt.n)} / ${formatCount(selectedStats.opt.d)}`,
              },
              {
                label: "Loss overhead vs frontier",
                value: `+${selectedStats.overhead.toFixed(3)}`,
              },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-[10px] text-[#475569] mb-0.5">{s.label}</p>
                <p className="text-[12px] font-mono font-bold text-[#a855f7]">{s.value}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#475569] mt-3 leading-relaxed">
            Only the parameter and token counts are published values. Compute,
            predicted loss, and the frontier comparison are computed here from
            the Hoffmann et al. 2022 fit. The predicted loss is what the
            formula says for this (N, D), not the model&apos;s actual reported
            loss: a different tokenizer and dataset shift the constants.
          </p>
        </div>
      ) : (
        <p className="text-[12px] text-[#475569]">
          Select a model above to see its published parameter and token counts,
          its computed budget, and how far the Chinchilla fit places it from
          the compute-optimal frontier.
        </p>
      )}
    </div>
  );
}
