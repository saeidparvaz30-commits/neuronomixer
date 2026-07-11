"use client";

import React from "react";
import {
  BETAS,
  EPOCHS_PER_BETA,
  BATCH_SIZE,
  LEARNING_RATE,
  DATASET,
  HIDDEN,
  LATENT,
  PIX,
  totalParamCount,
} from "./vaeMath";

/** Display colors per beta run, always paired with the printed beta value. */
export const BETA_COLORS: readonly string[] = [
  "#1e5d8a",
  "var(--color-accent)",
  "#ef4444",
];

export type TrainPhase = "idle" | "training" | "done";

const W = 320;
const H = 170;
const L = 40;
const R = 8;
const T = 10;
const B = 24;

function chartPath(
  values: readonly number[],
  yMax: number,
  yMin: number
): string {
  const n = EPOCHS_PER_BETA;
  return values
    .map((v, i) => {
      const x = L + (i / (n - 1)) * (W - L - R);
      const y = T + (1 - (v - yMin) / (yMax - yMin)) * (H - T - B);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function LossChart({
  title,
  series,
  unit,
}: {
  title: string;
  series: (readonly number[] | null)[];
  unit: string;
}) {
  let yMax = 0;
  const yMin = 0;
  for (const s of series) {
    if (s) for (const v of s) yMax = Math.max(yMax, v);
  }
  if (yMax === 0) yMax = 1;
  const gridYs = [0, 0.25, 0.5, 0.75, 1];
  return (
    <div className="rounded-xl border border-[#1e293b] p-3">
      <p className="text-[11px] font-semibold text-[#94a3b8] mb-2">{title}</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`${title} per training epoch for each beta value. Final values appear in the metrics table below.`}
      >
        {gridYs.map((g) => {
          const y = T + (1 - g) * (H - T - B);
          return (
            <g key={g}>
              <line
                x1={L}
                y1={y.toFixed(2)}
                x2={W - R}
                y2={y.toFixed(2)}
                stroke="#1e293b"
                strokeWidth="1"
              />
              <text
                x={L - 5}
                y={(y + 3).toFixed(2)}
                textAnchor="end"
                fontSize="8"
                fill="#475569"
              >
                {(yMin + g * (yMax - yMin)).toFixed(0)}
              </text>
            </g>
          );
        })}
        <text x={W - R} y={H - 2} textAnchor="end" fontSize="8" fill="#334155">
          epoch (max {EPOCHS_PER_BETA})
        </text>
        <text x={L} y={H - 2} fontSize="8" fill="#334155">
          {unit}
        </text>
        {series.map(
          (s, i) =>
            s &&
            s.length > 1 && (
              <path
                key={i}
                d={chartPath(s, yMax, yMin)}
                fill="none"
                stroke={BETA_COLORS[i]}
                strokeWidth="1.8"
              />
            )
        )}
      </svg>
    </div>
  );
}

interface Props {
  phase: TrainPhase;
  progress: number;
  live: { beta: number; epoch: number; recon: number; kl: number } | null;
  reconHistories: (readonly number[] | null)[];
  klHistories: (readonly number[] | null)[];
  durationMs: number | null;
  onTrain: () => void;
}

export default function TrainPanel({
  phase,
  progress,
  live,
  reconHistories,
  klHistories,
  durationMs,
  onTrain,
}: Props) {
  const anyHistory = reconHistories.some((h) => h && h.length > 1);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <button
          onClick={onTrain}
          disabled={phase === "training"}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity ${
            phase === "training"
              ? "bg-[#1e293b] text-[#475569] cursor-not-allowed"
              : "bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90"
          }`}
        >
          {phase === "idle"
            ? `Train ${BETAS.length} VAEs`
            : phase === "training"
              ? `Training beta = ${live ? live.beta : BETAS[0]}...`
              : "Retrain (same seeds, same result)"}
        </button>
        {phase === "training" && (
          <div className="flex-1 min-w-[160px] max-w-[320px]">
            <div
              className="h-2 rounded-full bg-[#1e293b] overflow-hidden"
              role="progressbar"
              aria-label="Training progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
            >
              <div
                className="h-full bg-[var(--color-accent)] transition-all"
                style={{ width: `${(progress * 100).toFixed(2)}%` }}
              />
            </div>
            <p className="text-[10px] text-[#475569] mt-1">
              {Math.round(progress * 100)}% of {BETAS.length} x{" "}
              {EPOCHS_PER_BETA} epochs
            </p>
          </div>
        )}
        {live && phase === "training" && (
          <p className="text-[11px] font-mono text-[#475569]">
            epoch {live.epoch}: recon{" "}
            <span className="text-[#3bb4a4]">{live.recon.toFixed(2)}</span>, KL{" "}
            <span className="text-[#a855f7]">{live.kl.toFixed(2)}</span>{" "}
            nats/image
          </p>
        )}
        {phase === "done" && durationMs !== null && (
          <p className="text-[11px] font-mono text-[#475569]">
            trained {BETAS.length} x {EPOCHS_PER_BETA} epochs in{" "}
            {(durationMs / 1000).toFixed(1)}s in this tab
          </p>
        )}
      </div>

      {anyHistory && (
        <div>
          <div className="flex flex-wrap items-center gap-4 mb-2 text-[11px] text-[#94a3b8]">
            {BETAS.map((b, i) => (
              <span key={b} className="flex items-center gap-1.5">
                <svg width="18" height="8" aria-hidden="true">
                  <line
                    x1="0"
                    y1="4"
                    x2="18"
                    y2="4"
                    stroke={BETA_COLORS[i]}
                    strokeWidth="2.5"
                  />
                </svg>
                beta = {b}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LossChart
              title="Reconstruction loss per epoch (training, sampled z)"
              series={reconHistories}
              unit="BCE nats/image"
            />
            <LossChart
              title="KL divergence per epoch (training, sampled z)"
              series={klHistories}
              unit="KL nats/image"
            />
          </div>
        </div>
      )}

      <p className="text-[11px] text-[#475569] leading-relaxed mt-4 max-w-[720px]">
        What runs here: a real VAE (64 &rarr; {HIDDEN} &rarr; {LATENT} latent
        dims &rarr; {HIDDEN} &rarr; {PIX}, {totalParamCount()} parameters)
        trained with Adam (learning rate {LEARNING_RATE}, batch size{" "}
        {BATCH_SIZE}) on the {DATASET.length} images above, minimizing the
        negative ELBO: BCE reconstruction plus beta times the KL divergence,
        with z drawn through the reparameterization trick. Because retraining
        at every slider position would be slow, the guide trains one model per
        beta value ({BETAS.join(", ")}) and the beta slider snaps between
        them. Weight init is Xavier-style uniform (Glorot and Bengio, 2010);
        all seeds are fixed, so every run reproduces these exact curves.
      </p>
    </div>
  );
}
