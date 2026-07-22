"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TRAINING_CURVES } from "./batchNormLogic";

const W = 480;
const H = 220;
const PAD = { top: 20, right: 20, bottom: 40, left: 64 };

const CHART_W = W - PAD.left - PAD.right;
const CHART_H = H - PAD.top - PAD.bottom;

const MAX_EPOCH = 20;
const MAX_LOSS = 1.0;

function epochToX(epoch: number) {
  return PAD.left + ((epoch - 1) / (MAX_EPOCH - 1)) * CHART_W;
}

function lossToY(loss: number) {
  return PAD.top + (1 - loss / MAX_LOSS) * CHART_H;
}

function pointsToPath(points: { epoch: number; loss: number }[]) {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${epochToX(p.epoch).toFixed(1)} ${lossToY(p.loss).toFixed(1)}`)
    .join(" ");
}

const bnPath = pointsToPath(TRAINING_CURVES.map((p) => ({ epoch: p.epoch, loss: p.withBN })));
const noBnPath = pointsToPath(TRAINING_CURVES.map((p) => ({ epoch: p.epoch, loss: p.withoutBN })));

// Compare epochs needed to reach a common loss threshold, computed from the
// plotted curves themselves.
const LOSS_THRESHOLD = 0.25;
const bnIdx = TRAINING_CURVES.findIndex((p) => p.withBN <= LOSS_THRESHOLD);
const noBnIdx = TRAINING_CURVES.findIndex((p) => p.withoutBN <= LOSS_THRESHOLD);
const bnEpochAtThreshold = bnIdx >= 0 ? TRAINING_CURVES[bnIdx].epoch : null;
const noBnEpochAtThreshold = noBnIdx >= 0 ? TRAINING_CURVES[noBnIdx].epoch : null;
const badgeText =
  bnEpochAtThreshold !== null && noBnEpochAtThreshold !== null
    ? `Loss ${LOSS_THRESHOLD}: epoch ${bnEpochAtThreshold} vs ${noBnEpochAtThreshold} (${noBnEpochAtThreshold - bnEpochAtThreshold} epochs faster)`
    : bnEpochAtThreshold !== null
    ? `Only BatchNorm reaches loss ${LOSS_THRESHOLD} (epoch ${bnEpochAtThreshold}) within 20 epochs`
    : `Neither curve reaches loss ${LOSS_THRESHOLD} in 20 epochs`;

const Y_TICKS = [0, 0.25, 0.5, 0.75, 1.0];
const X_TICKS = [1, 5, 10, 15, 20];

export default function TrainingRaceChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimated(true);
          obs.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="bg-[#1e293b]/60 border border-white/[0.07] rounded-2xl p-5 sm:p-6"
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-bold text-white">Training Speed Comparison (Illustrative)</h3>
        <span className="text-xs bg-[#3bb4a4]/15 border border-[#3bb4a4]/30 text-[#3bb4a4] px-2.5 py-0.5 rounded-full font-semibold">
          {badgeText}
        </span>
      </div>
      <p className="text-xs text-[#94a3b8] mb-4">
        Stylized loss curves illustrating the typical effect of BatchNorm; both
        start at the same loss. The badge above is computed from these plotted curves.
      </p>

      {/* SVG chart */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full max-w-[480px] mx-auto"
          aria-label="Training loss curves for with and without BatchNorm"
        >
          {/* Grid lines */}
          {Y_TICKS.map((t) => (
            <line
              key={t}
              x1={PAD.left}
              y1={lossToY(t)}
              x2={W - PAD.right}
              y2={lossToY(t)}
              stroke="#1e293b"
              strokeWidth={1}
            />
          ))}

          {/* Y-axis labels */}
          {Y_TICKS.map((t) => (
            <text
              key={t}
              x={PAD.left - 6}
              y={lossToY(t) + 5}
              textAnchor="end"
              fill="#475569"
              fontSize={15}
            >
              {t.toFixed(2)}
            </text>
          ))}

          {/* X-axis labels */}
          {X_TICKS.map((t) => (
            <text
              key={t}
              x={epochToX(t)}
              y={H - PAD.bottom + 16}
              textAnchor="middle"
              fill="#475569"
              fontSize={15}
            >
              {t}
            </text>
          ))}

          {/* Axis labels */}
          <text
            x={PAD.left - 50}
            y={PAD.top + CHART_H / 2}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize={15}
            transform={`rotate(-90, ${PAD.left - 50}, ${PAD.top + CHART_H / 2})`}
          >
            Loss
          </text>
          <text
            x={PAD.left + CHART_W / 2}
            y={H - 2}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize={15}
          >
            Epoch
          </text>

          {/* Without BN line */}
          {animated && (
            <motion.path
              d={noBnPath}
              fill="none"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />
          )}

          {/* With BN line */}
          {animated && (
            <motion.path
              d={bnPath}
              fill="none"
              stroke="#3bb4a4"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />
          )}

          {/* End-point dots */}
          {animated && (
            <>
              <motion.circle
                cx={epochToX(20)}
                cy={lossToY(TRAINING_CURVES[19].withBN)}
                r={4}
                fill="#3bb4a4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 2, duration: 0.3 }}
              />
              <motion.circle
                cx={epochToX(20)}
                cy={lossToY(TRAINING_CURVES[19].withoutBN)}
                r={4}
                fill="#94a3b8"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 2, duration: 0.3 }}
              />
            </>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-3 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-[#3bb4a4] rounded" />
          <span className="text-xs text-[#94a3b8]">With BatchNorm</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-[#94a3b8] rounded" />
          <span className="text-xs text-[#94a3b8]">Without BatchNorm</span>
        </div>
      </div>
    </div>
  );
}
