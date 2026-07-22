"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

// Pre-computed training curves (20 epochs)
const EPOCHS = Array.from({ length: 21 }, (_, i) => i);

function noDropoutTrainLoss(epoch: number): number {
  return 0.9 * Math.pow(0.85, epoch);
}
// Validation loss tracks training loss until epoch 10, then a linearly growing
// overfitting penalty dominates the still-shrinking base term, so the curve
// bottoms out at epoch 10 and rises afterwards (0.197 at e=10 -> 0.355 at e=20).
function noDropoutValLoss(epoch: number): number {
  const base = noDropoutTrainLoss(epoch);
  const overfitPenalty = epoch > 10 ? 0.03 * (epoch - 10) : 0;
  return base + 0.02 + overfitPenalty;
}
function withDropoutTrainLoss(epoch: number): number {
  return 0.9 * Math.pow(0.88, epoch);
}
function withDropoutValLoss(epoch: number): number {
  return 0.9 * Math.pow(0.87, epoch);
}

// Chart dimensions
const CW = 280;
const CH = 180;
const PAD = { top: 16, right: 12, bottom: 36, left: 38 };
const innerW = CW - PAD.left - PAD.right;
const innerH = CH - PAD.top - PAD.bottom;

function xScale(epoch: number): number {
  return PAD.left + (epoch / 20) * innerW;
}
function yScale(loss: number): number {
  return PAD.top + innerH - (loss / 1.0) * innerH;
}

function makePath(data: [number, number][]): string {
  return data
    .map(([e, l], i) => `${i === 0 ? "M" : "L"}${xScale(e).toFixed(1)},${yScale(l).toFixed(1)}`)
    .join(" ");
}

const noDropTrain = makePath(EPOCHS.map((e) => [e, noDropoutTrainLoss(e)]));
const noDropVal = makePath(EPOCHS.map((e) => [e, noDropoutValLoss(e)]));
const withDropTrain = makePath(EPOCHS.map((e) => [e, withDropoutTrainLoss(e)]));
const withDropVal = makePath(EPOCHS.map((e) => [e, withDropoutValLoss(e)]));

// Y-axis labels
const Y_TICKS = [0, 0.25, 0.5, 0.75, 1.0];
const X_TICKS = [0, 5, 10, 15, 20];

interface ChartProps {
  title: string;
  trainPath: string;
  valPath: string;
  trainColor: string;
  valColor: string;
  animate: boolean;
  overfitting?: boolean;
}

function LossChart({
  title,
  trainPath,
  valPath,
  trainColor,
  valColor,
  animate,
  overfitting,
}: ChartProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        {overfitting && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ef444420] border border-[#ef444430] text-[#ef4444] font-semibold">
            Overfitting
          </span>
        )}
        {!overfitting && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#22c55e20] border border-[#22c55e30] text-[#22c55e] font-semibold">
            Good fit
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${CW} ${CH}`} className="w-full max-w-[340px]">
        {/* Grid lines */}
        {Y_TICKS.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              y1={yScale(v)}
              x2={CW - PAD.right}
              y2={yScale(v)}
              stroke="#1e293b"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 5}
              y={yScale(v) + 3.5}
              fill="#475569"
              fontSize="10"
              textAnchor="end"
            >
              {v.toFixed(2)}
            </text>
          </g>
        ))}

        {/* X-axis ticks */}
        {X_TICKS.map((e) => (
          <text
            key={e}
            x={xScale(e)}
            y={CH - PAD.bottom + 14}
            fill="#475569"
            fontSize="10"
            textAnchor="middle"
          >
            {e}
          </text>
        ))}

        {/* Axes */}
        <line
          x1={PAD.left}
          y1={PAD.top}
          x2={PAD.left}
          y2={CH - PAD.bottom}
          stroke="#334155"
          strokeWidth="1"
        />
        <line
          x1={PAD.left}
          y1={CH - PAD.bottom}
          x2={CW - PAD.right}
          y2={CH - PAD.bottom}
          stroke="#334155"
          strokeWidth="1"
        />

        {/* Axis labels */}
        <text
          x={CW / 2}
          y={CH - 2}
          fill="#64748b"
          fontSize="10"
          textAnchor="middle"
        >
          Epoch
        </text>
        <text
          x={9}
          y={CH / 2}
          fill="#64748b"
          fontSize="10"
          textAnchor="middle"
          transform={`rotate(-90, 9, ${CH / 2})`}
        >
          Loss
        </text>

        {/* Training loss path */}
        <motion.path
          d={trainPath}
          fill="none"
          stroke={trainColor}
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={animate ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />

        {/* Validation loss path */}
        <motion.path
          d={valPath}
          fill="none"
          stroke={valColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="5,3"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={animate ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut", delay: 0.2 }}
        />
      </svg>
    </div>
  );
}

export default function RegularizationEffect() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div
      ref={ref}
      className="bg-[#1e293b]/60 border border-white/[0.07] rounded-2xl p-6"
    >
      <h3 className="text-lg font-bold text-white mb-1">Does Dropout Actually Help?</h3>
      <p className="text-sm text-[#94a3b8] mb-6">
        Training and validation losses on the same dataset, with and without dropout.
        Illustrative curves showing the typical qualitative pattern, not a logged training run.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <LossChart
          title="Without Dropout"
          trainPath={noDropTrain}
          valPath={noDropVal}
          trainColor="#ef4444"
          valColor="#f97316"
          animate={inView}
          overfitting
        />
        <LossChart
          title="With Dropout (p = 0.5)"
          trainPath={withDropTrain}
          valPath={withDropVal}
          trainColor="#3bb4a4"
          valColor="#a855f7"
          animate={inView}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-5 mt-5 pt-4 border-t border-white/[0.07] text-[11px] text-[#94a3b8]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-[#64748b]" />
          <span>Training Loss (solid)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 border-t-2 border-dashed border-[#64748b]" />
          <span>Validation Loss (dashed)</span>
        </div>
        <div className="ml-auto text-[10px] text-[#475569]">X = epochs · Y = loss (0–1)</div>
      </div>

      {/* Insight */}
      <div className="mt-4 p-3 bg-[#1e5d8a]/15 border border-[#1e5d8a]/30 rounded-xl text-xs text-[#94a3b8] leading-relaxed">
        <span className="font-semibold text-white">Key observation: </span>
        Without dropout, the training loss decreases faster but the validation loss starts to diverge after epoch 10,
        a clear sign of overfitting. With dropout, both curves track closely together, indicating better generalization.
      </div>
    </div>
  );
}
