"use client";

import { motion } from "framer-motion";

// ILLUSTRATIVE accuracy values chosen to show the typical qualitative pattern
// (transfer > scratch at low data; gap narrows with more data). Not taken from
// a specific published benchmark; the client renders a visible caption saying so.
// X-axis: [100 samples, 1K, 10K, 100K]
const DATA_POINTS = [
  { label: "100", fromScratch: 38, transfer: 71 },
  { label: "1K", fromScratch: 54, transfer: 80 },
  { label: "10K", fromScratch: 70, transfer: 87 },
  { label: "100K", fromScratch: 85, transfer: 91 },
];

const W = 640;
const H = 260;
const PAD_L = 70;
const PAD_R = 24;
const PAD_T = 20;
const PAD_B = 50;

const chartW = W - PAD_L - PAD_R;
const chartH = H - PAD_T - PAD_B;

const groupW = chartW / DATA_POINTS.length;
const barW = (groupW * 0.35);

function yPos(val: number): number {
  return PAD_T + chartH - (val / 100) * chartH;
}

function xCenter(i: number): number {
  return PAD_L + i * groupW + groupW / 2;
}

interface Props {
  animate?: boolean;
}

export default function DataComparisonChart({ animate = true }: Props) {
  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[420px]" style={{ maxHeight: H }}>
        {/* Y-axis gridlines */}
        {[0, 25, 50, 75, 100].map((v) => {
          const y = yPos(v);
          return (
            <g key={v}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                stroke="#1e293b" strokeWidth={1} />
              <text x={PAD_L - 6} y={y + 6} fill="#475569" fontSize={20} textAnchor="end">
                {v}%
              </text>
            </g>
          );
        })}

        {/* Y-axis label */}
        <text
          x={10} y={H / 2}
          fill="#94a3b8" fontSize={20} textAnchor="middle"
          transform={`rotate(-90, 10, ${H / 2})`}
        >
          Accuracy
        </text>

        {/* Bars */}
        {DATA_POINTS.map((d, i) => {
          const cx = xCenter(i);
          const xScratch = cx - barW - 2;
          const xTransfer = cx + 2;

          const hScratch = (d.fromScratch / 100) * chartH;
          const hTransfer = (d.transfer / 100) * chartH;

          return (
            <g key={d.label}>
              {/* From Scratch bar */}
              <motion.rect
                x={xScratch} y={yPos(d.fromScratch)} width={barW} height={hScratch}
                rx={3} fill="#475569"
                initial={animate ? { scaleY: 0, originY: "100%" } : {}}
                animate={{ scaleY: 1 }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
                style={{ transformOrigin: `${xScratch + barW / 2}px ${PAD_T + chartH}px` }}
              />
              <motion.text
                x={xScratch + barW / 2} y={yPos(d.fromScratch) - 4}
                fill="#94a3b8" fontSize={20} textAnchor="middle"
                initial={animate ? { opacity: 0 } : {}}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 + i * 0.1 }}
              >
                {d.fromScratch}%
              </motion.text>

              {/* Transfer Learning bar */}
              <motion.rect
                x={xTransfer} y={yPos(d.transfer)} width={barW} height={hTransfer}
                rx={3} fill="#3bb4a4"
                initial={animate ? { scaleY: 0 } : {}}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.05 + i * 0.1, duration: 0.5, ease: "easeOut" }}
                style={{ transformOrigin: `${xTransfer + barW / 2}px ${PAD_T + chartH}px` }}
              />
              <motion.text
                x={xTransfer + barW / 2} y={yPos(d.transfer) - 4}
                fill="#3bb4a4" fontSize={20} textAnchor="middle"
                initial={animate ? { opacity: 0 } : {}}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 + i * 0.1 }}
              >
                {d.transfer}%
              </motion.text>

              {/* Gap annotation arrow for first group */}
              {i === 0 && (
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <line
                    x1={cx + barW / 2 + 4} y1={yPos(d.fromScratch)}
                    x2={cx + barW / 2 + 4} y2={yPos(d.transfer)}
                    stroke="var(--color-accent)" strokeWidth={1.5} strokeDasharray="3 2"
                  />
                  <text
                    x={cx + barW / 2 + 14} y={(yPos(d.fromScratch) + yPos(d.transfer)) / 2 + 4}
                    fill="var(--color-accent)" fontSize={20} fontWeight="600"
                  >
                    +{d.transfer - d.fromScratch}%
                  </text>
                </motion.g>
              )}

              {/* X-axis label */}
              <text x={cx} y={H - PAD_B + 22} fill="#94a3b8" fontSize={20} textAnchor="middle">
                {d.label}
              </text>
            </g>
          );
        })}

        {/* X-axis line */}
        <line x1={PAD_L} y1={PAD_T + chartH} x2={W - PAD_R} y2={PAD_T + chartH}
          stroke="#334155" strokeWidth={1.5} />

        {/* X-axis label */}
        <text x={W / 2} y={H - 4} fill="#94a3b8" fontSize={20} textAnchor="middle">
          Training Samples
        </text>

      </svg>

      {/* Legend (HTML so it stays legible at any width) */}
      <div className="flex items-center gap-4 mt-1 px-1">
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#475569]" />
          From Scratch
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#3bb4a4]" />
          Transfer Learning
        </span>
      </div>
    </div>
  );
}
