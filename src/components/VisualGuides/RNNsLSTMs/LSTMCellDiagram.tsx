"use client";

import { motion } from "framer-motion";
import type { SequenceStep } from "./types";

interface Props {
  step: number;
  sequence: SequenceStep;
}

// Helper to map 0-1 value to a red→green color
function valueToColor(v: number): string {
  const r = Math.round(220 - v * 150);
  const g = Math.round(60 + v * 160);
  const b = Math.round(60);
  return `rgb(${r},${g},${b})`;
}

// Gate activation bar: 4 mini rectangles
function GateBar({ values, color }: { values: number[]; color: string }) {
  return (
    <div className="flex gap-0.5 mt-1">
      {values.map((v, i) => (
        <div
          key={i}
          className="h-2 flex-1 rounded-sm transition-all duration-500"
          style={{ background: valueToColor(v), opacity: 0.85 }}
          title={`${v.toFixed(2)}`}
        />
      ))}
    </div>
  );
}

export default function LSTMCellDiagram({ step, sequence }: Props) {
  const gates = sequence.gateValues!;

  return (
    <div className="w-full bg-[#0f172a] rounded-xl overflow-hidden border border-[#1e293b]">
      <div className="px-4 py-2 border-b border-[#1e293b] flex items-center gap-2">
        <span className="text-xs font-semibold text-white">LSTM Cell — step {step + 1}: &quot;{sequence.inputToken}&quot;</span>
        <span className="ml-auto text-[10px] text-[#475569]">gates: f / i / o</span>
      </div>

      {/* SVG diagram */}
      <svg viewBox="0 0 520 300" className="w-full" style={{ height: 280 }}>
        <defs>
          <marker id="lstmArrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L7,3.5 z" fill="#475569" />
          </marker>
          <marker id="lstmArrowWhite" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L7,3.5 z" fill="#94a3b8" />
          </marker>
          <marker id="lstmArrowGold" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L7,3.5 z" fill="#d4af37" />
          </marker>
          <marker id="lstmArrowPurple" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L7,3.5 z" fill="#a855f7" />
          </marker>
        </defs>

        {/* ─── Cell state "highway" ─── */}
        {/* Thick horizontal line at y=55, from x=20 to x=500 */}
        <motion.line
          key={`highway-${step}`}
          x1="20" y1="55" x2="500" y2="55"
          stroke="#d4af37"
          strokeWidth="4"
          opacity="0.7"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ duration: 0.4 }}
        />
        <text x="20" y="48" fill="#d4af37" fontSize="9" textAnchor="start">Cₜ₋₁</text>
        <text x="508" y="50" fill="#d4af37" fontSize="9" textAnchor="start">Cₜ</text>
        <text x="256" y="42" fill="#d4af37" fontSize="8" textAnchor="middle">Cell State (memory highway)</text>

        {/* ─── Forget Gate (f) ─── */}
        {/* Block at x=80, y=100, colored red-tinted */}
        <motion.rect
          key={`fg-${step}`}
          x="55" y="100" width="60" height="50"
          rx="6"
          fill={`rgba(239,68,68,${0.15 + gates.forget[0] * 0.25})`}
          stroke={`rgba(239,68,68,${0.4 + gates.forget[0] * 0.4})`}
          strokeWidth="1.5"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35 }}
        />
        <text x="85" y="120" fill="white" fontSize="11" textAnchor="middle" fontWeight="700">σ</text>
        <text x="85" y="134" fill="#fca5a5" fontSize="9" textAnchor="middle">Forget</text>
        {/* Forget gate activation bar (under block) */}
        <text x="85" y="165" fill="#fca5a5" fontSize="8" textAnchor="middle">
          f={gates.forget[0].toFixed(2)}
        </text>

        {/* Line from forget gate up to ⊙ on highway */}
        <line x1="85" y1="100" x2="85" y2="73" stroke="#ef4444" strokeWidth="1.5" opacity="0.7" markerEnd="url(#lstmArrow)" />
        {/* ⊙ multiply symbol on highway */}
        <circle cx="85" cy="55" r="9" fill="#1e293b" stroke="#ef4444" strokeWidth="1.5" />
        <text x="85" y="59" fill="#ef4444" fontSize="10" textAnchor="middle" fontWeight="700">⊙</text>

        {/* ─── Input Gate (i) ─── */}
        <motion.rect
          key={`ig-${step}`}
          x="185" y="100" width="60" height="50"
          rx="6"
          fill={`rgba(34,197,94,${0.15 + gates.input[0] * 0.25})`}
          stroke={`rgba(34,197,94,${0.4 + gates.input[0] * 0.4})`}
          strokeWidth="1.5"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        />
        <text x="215" y="120" fill="white" fontSize="11" textAnchor="middle" fontWeight="700">σ</text>
        <text x="215" y="134" fill="#86efac" fontSize="9" textAnchor="middle">Input</text>
        <text x="215" y="165" fill="#86efac" fontSize="8" textAnchor="middle">
          i={gates.input[0].toFixed(2)}
        </text>

        {/* Cell candidate tanh block */}
        <motion.rect
          key={`cand-${step}`}
          x="255" y="100" width="60" height="50"
          rx="6"
          fill="rgba(59,180,164,0.15)"
          stroke="#3bb4a4"
          strokeWidth="1.5"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        />
        <text x="285" y="120" fill="white" fontSize="11" textAnchor="middle" fontWeight="700">tanh</text>
        <text x="285" y="134" fill="#3bb4a4" fontSize="9" textAnchor="middle">C̃ cand.</text>
        <text x="285" y="165" fill="#3bb4a4" fontSize="8" textAnchor="middle">
          c̃={gates.cell[0].toFixed(2)}
        </text>

        {/* i ⊙ C̃ multiply node, below the highway */}
        <circle cx="240" cy="84" r="9" fill="#1e293b" stroke="#22c55e" strokeWidth="1.5" />
        <text x="240" y="88" fill="#22c55e" fontSize="10" textAnchor="middle" fontWeight="700">⊙</text>

        {/* Lines from i and C̃ into ⊙ */}
        <line x1="215" y1="100" x2="233" y2="91" stroke="#22c55e" strokeWidth="1.5" opacity="0.7" markerEnd="url(#lstmArrow)" />
        <line x1="285" y1="100" x2="247" y2="91" stroke="#3bb4a4" strokeWidth="1.5" opacity="0.7" markerEnd="url(#lstmArrow)" />

        {/* ⊕ add node on the highway, directly above ⊙ */}
        <circle cx="240" cy="55" r="9" fill="#1e293b" stroke="#d4af37" strokeWidth="1.5" />
        <text x="240" y="59" fill="#d4af37" fontSize="10" textAnchor="middle" fontWeight="700">⊕</text>
        {/* i·C̃ flows upward into ⊕, joining the left-to-right highway */}
        <line x1="240" y1="75" x2="240" y2="66" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#lstmArrow)" />

        {/* ─── Output Gate (o) ─── */}
        <motion.rect
          key={`og-${step}`}
          x="365" y="100" width="60" height="50"
          rx="6"
          fill={`rgba(168,85,247,${0.15 + gates.output[0] * 0.2})`}
          stroke={`rgba(168,85,247,${0.4 + gates.output[0] * 0.4})`}
          strokeWidth="1.5"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.15 }}
        />
        <text x="395" y="120" fill="white" fontSize="11" textAnchor="middle" fontWeight="700">σ</text>
        <text x="395" y="134" fill="#d8b4fe" fontSize="9" textAnchor="middle">Output</text>
        <text x="395" y="165" fill="#d8b4fe" fontSize="8" textAnchor="middle">
          o={gates.output[0].toFixed(2)}
        </text>

        {/* tanh of cell state */}
        <motion.rect
          key={`tanh-c-${step}`}
          x="435" y="100" width="50" height="50"
          rx="6"
          fill="rgba(30,93,138,0.2)"
          stroke="#1e5d8a"
          strokeWidth="1.5"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.2 }}
        />
        <text x="460" y="120" fill="white" fontSize="10" textAnchor="middle" fontWeight="700">tanh</text>
        <text x="460" y="134" fill="#94a3b8" fontSize="8" textAnchor="middle">(Cₜ)</text>

        {/* ⊙ for output gate */}
        <circle cx="430" cy="55" r="9" fill="#1e293b" stroke="#a855f7" strokeWidth="1.5" />
        <text x="430" y="59" fill="#a855f7" fontSize="10" textAnchor="middle" fontWeight="700">⊙</text>

        {/* Lines from o and tanh(C) up to ⊙ */}
        <line x1="395" y1="100" x2="395" y2="75" stroke="#a855f7" strokeWidth="1.5" opacity="0.7" />
        <line x1="395" y1="75" x2="425" y2="64" stroke="#a855f7" strokeWidth="1.5" opacity="0.7" markerEnd="url(#lstmArrow)" />
        <line x1="460" y1="100" x2="460" y2="80" stroke="#1e5d8a" strokeWidth="1.5" opacity="0.7" />
        <line x1="460" y1="80" x2="438" y2="64" stroke="#1e5d8a" strokeWidth="1.5" opacity="0.7" markerEnd="url(#lstmArrow)" />

        {/* Output hₜ arrow down from ⊙(o*tanh(C)) */}
        <motion.line
          key={`hout-${step}`}
          x1="430" y1="46" x2="430" y2="22"
          stroke="#a855f7"
          strokeWidth="2"
          markerEnd="url(#lstmArrowPurple)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        />
        <text x="430" y="16" fill="#a855f7" fontSize="10" textAnchor="middle" fontWeight="700">hₜ</text>

        {/* Inputs [h, x] from bottom */}
        <motion.g
          key={`inputs-${step}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <line x1="200" y1="280" x2="200" y2="155" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 2" markerEnd="url(#lstmArrow)" />
          <text x="200" y="292" fill="#3b82f6" fontSize="10" textAnchor="middle">[h, xₜ=&quot;{sequence.inputToken}&quot;]</text>
        </motion.g>

        {/* Input fork lines to each gate */}
        <line x1="200" y1="220" x2="85" y2="155" stroke="#3b82f6" strokeWidth="1" opacity="0.4" strokeDasharray="3 2" />
        <line x1="200" y1="220" x2="215" y2="155" stroke="#3b82f6" strokeWidth="1" opacity="0.4" strokeDasharray="3 2" />
        <line x1="200" y1="220" x2="285" y2="155" stroke="#3b82f6" strokeWidth="1" opacity="0.4" strokeDasharray="3 2" />
        <line x1="200" y1="220" x2="395" y2="155" stroke="#3b82f6" strokeWidth="1" opacity="0.4" strokeDasharray="3 2" />
      </svg>
    </div>
  );
}
