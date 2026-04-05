"use client";

import { motion } from "framer-motion";
import { RNN_GRADIENT_FLOW, LSTM_GRADIENT_FLOW } from "./sequenceData";

const W = 500;
const H = 160;
const PAD = { top: 20, right: 20, bottom: 38, left: 44 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;
const N = 6;

function xPos(i: number) {
  return PAD.left + (i / (N - 1)) * INNER_W;
}

function yPos(magnitude: number) {
  return PAD.top + (1 - magnitude) * INNER_H;
}

function buildPath(data: { step: number; magnitude: number }[]): string {
  return data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xPos(d.step)} ${yPos(d.magnitude)}`)
    .join(" ");
}

export default function GradientFlowChart() {
  const rnnPath = buildPath(RNN_GRADIENT_FLOW);
  const lstmPath = buildPath(LSTM_GRADIENT_FLOW);

  // Shaded area under RNN (vanishing zone)
  const rnnAreaPath =
    `M ${xPos(0)} ${yPos(0)} ` +
    RNN_GRADIENT_FLOW.map((d) => `L ${xPos(d.step)} ${yPos(d.magnitude)}`).join(" ") +
    ` L ${xPos(N - 1)} ${yPos(0)} Z`;

  const vanishingY = yPos(0.1);

  return (
    <div className="w-full bg-[#0f172a] rounded-xl overflow-hidden border border-[#1e293b]">
      <div className="px-4 py-2 border-b border-[#1e293b] flex items-center gap-3">
        <span className="text-xs font-semibold text-white">
          Gradient Magnitude During Backpropagation
        </span>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 bg-[#1e5d8a]" />
            <span className="text-[10px] text-[#94a3b8]">RNN</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 bg-[#a855f7]" />
            <span className="text-[10px] text-[#94a3b8]">LSTM</span>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[340px]" style={{ height: 180 }}>
          {/* Vanishing gradient zone shading */}
          <rect
            x={PAD.left}
            y={vanishingY}
            width={INNER_W}
            height={H - PAD.bottom - vanishingY}
            fill="rgba(239,68,68,0.08)"
          />
          <line
            x1={PAD.left}
            y1={vanishingY}
            x2={PAD.left + INNER_W}
            y2={vanishingY}
            stroke="#ef4444"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity="0.4"
          />
          <text
            x={PAD.left + 4}
            y={vanishingY - 3}
            fill="#ef4444"
            fontSize="8"
            opacity="0.7"
          >
            vanishing gradient zone
          </text>

          {/* Y axis gridlines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                y1={yPos(v)}
                x2={PAD.left + INNER_W}
                y2={yPos(v)}
                stroke="#1e293b"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 4}
                y={yPos(v) + 3}
                fill="#475569"
                fontSize="8"
                textAnchor="end"
              >
                {v.toFixed(2)}
              </text>
            </g>
          ))}

          {/* X axis */}
          <line
            x1={PAD.left}
            y1={H - PAD.bottom}
            x2={PAD.left + INNER_W}
            y2={H - PAD.bottom}
            stroke="#334155"
            strokeWidth="1"
          />
          {/* X axis labels */}
          {Array.from({ length: N }, (_, i) => (
            <text
              key={i}
              x={xPos(i)}
              y={H - PAD.bottom + 12}
              fill="#475569"
              fontSize="9"
              textAnchor="middle"
            >
              t={i + 1}
            </text>
          ))}
          <text
            x={PAD.left + INNER_W / 2}
            y={H - 4}
            fill="#334155"
            fontSize="8"
            textAnchor="middle"
          >
            timestep (backprop flows ←)
          </text>

          {/* Y axis label */}
          <text
            x={8}
            y={PAD.top + INNER_H / 2}
            fill="#475569"
            fontSize="8"
            textAnchor="middle"
            transform={`rotate(-90, 8, ${PAD.top + INNER_H / 2})`}
          >
            gradient magnitude
          </text>

          {/* RNN area fill */}
          <path d={rnnAreaPath} fill="rgba(30,93,138,0.12)" />

          {/* RNN line */}
          <motion.path
            d={rnnPath}
            fill="none"
            stroke="#1e5d8a"
            strokeWidth="2.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />

          {/* LSTM line */}
          <motion.path
            d={lstmPath}
            fill="none"
            stroke="#a855f7"
            strokeWidth="2.5"
            strokeDasharray="0"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          />

          {/* Data points */}
          {RNN_GRADIENT_FLOW.map((d) => (
            <circle
              key={`rnn-pt-${d.step}`}
              cx={xPos(d.step)}
              cy={yPos(d.magnitude)}
              r={3}
              fill="#1e5d8a"
              stroke="#0f172a"
              strokeWidth="1.5"
            />
          ))}
          {LSTM_GRADIENT_FLOW.map((d) => (
            <circle
              key={`lstm-pt-${d.step}`}
              cx={xPos(d.step)}
              cy={yPos(d.magnitude)}
              r={3}
              fill="#a855f7"
              stroke="#0f172a"
              strokeWidth="1.5"
            />
          ))}

          {/* Annotation for RNN last point */}
          <text
            x={xPos(5) + 6}
            y={yPos(RNN_GRADIENT_FLOW[5].magnitude) - 4}
            fill="#1e5d8a"
            fontSize="8"
          >
            {RNN_GRADIENT_FLOW[5].magnitude.toFixed(3)}
          </text>
        </svg>
      </div>
    </div>
  );
}
