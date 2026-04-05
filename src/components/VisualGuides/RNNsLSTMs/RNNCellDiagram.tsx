"use client";

import { motion } from "framer-motion";
import { RNN_SEQUENCE } from "./sequenceData";

interface Props {
  step: number;
}

export default function RNNCellDiagram({ step }: Props) {
  const seq = RNN_SEQUENCE[step];
  const h = seq.hiddenState;
  // Use first hidden state value as an overall "activation level" 0-1
  const activation = h[0];

  // Interpolate color based on activation
  const arrowColor = `rgba(30,93,138,${0.5 + activation * 0.5})`;
  const blockColor = `rgba(30,93,138,${0.4 + activation * 0.4})`;

  return (
    <div className="w-full bg-[#0f172a] rounded-xl overflow-hidden border border-[#1e293b]">
      <div className="px-4 py-2 border-b border-[#1e293b] flex items-center gap-2">
        <span className="text-xs font-semibold text-white">RNN Cell — step {step + 1}: "{seq.inputToken}"</span>
        <span className="ml-auto text-[10px] text-[#475569]">h state: [{h.map((v) => v.toFixed(2)).join(", ")}]</span>
      </div>
      <svg viewBox="0 0 400 220" className="w-full" style={{ height: 200 }}>
        {/* Grid lines for readability */}
        {/* --- Labels --- */}

        {/* Input x — blue arrow from bottom */}
        {/* Arrow: (200, 210) → (200, 145) */}
        <motion.g
          key={`x-arrow-${step}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <line x1="200" y1="210" x2="200" y2="150" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrowBlue)" />
          <text x="200" y="218" fill="#3b82f6" fontSize="11" textAnchor="middle" fontWeight="600">
            xₜ = &quot;{seq.inputToken}&quot;
          </text>
        </motion.g>

        {/* Previous hidden state — turquoise arrow from left */}
        {/* Arrow: (30, 110) → (110, 110) */}
        <motion.g
          key={`hprev-arrow-${step}`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <line x1="30" y1="110" x2="108" y2="110" stroke="#3bb4a4" strokeWidth="2" markerEnd="url(#arrowTeal)" />
          <text x="22" y="107" fill="#3bb4a4" fontSize="11" textAnchor="middle" fontWeight="500">hₜ₋₁</text>
        </motion.g>

        {/* Tanh block (center) */}
        <motion.rect
          key={`block-${step}`}
          x="110" y="80" width="180" height="60"
          rx="8"
          fill={blockColor}
          stroke="#1e5d8a"
          strokeWidth="2"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        />
        <text x="200" y="108" fill="white" fontSize="14" textAnchor="middle" fontWeight="700">tanh</text>
        <text x="200" y="126" fill="#94a3b8" fontSize="9" textAnchor="middle">Wₓxₜ + Wₕhₜ₋₁ + b</text>

        {/* Output hidden state — arrow right */}
        {/* Arrow: (290, 110) → (370, 110) */}
        <motion.g
          key={`h-out-arrow-${step}`}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <line x1="290" y1="110" x2="368" y2="110" stroke={arrowColor} strokeWidth="2.5" markerEnd="url(#arrowPrimary)" />
          <text x="378" y="114" fill="#1e5d8a" fontSize="11" textAnchor="start" fontWeight="600">hₜ</text>
        </motion.g>

        {/* Output y — arrow up from block */}
        {/* Arrow: (200, 80) → (200, 20) */}
        <motion.g
          key={`y-arrow-${step}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <line x1="200" y1="80" x2="200" y2="22" stroke="#d4af37" strokeWidth="2" markerEnd="url(#arrowGold)" />
          <text x="200" y="14" fill="#d4af37" fontSize="11" textAnchor="middle" fontWeight="600">yₜ = Wᵧhₜ</text>
        </motion.g>

        {/* Recurrent loop — curved arrow from right back to left */}
        {/* Path: from (370, 110) curves down and left to (30, 140) */}
        <motion.path
          key={`loop-${step}`}
          d="M 370 125 C 390 170, 390 170, 200 185 C 10 170, 10 160, 30 125"
          fill="none"
          stroke="#3bb4a4"
          strokeWidth="1.8"
          strokeDasharray="5 3"
          markerEnd="url(#arrowTeal)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.8 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        />
        <text x="200" y="198" fill="#3bb4a4" fontSize="9" textAnchor="middle">recurrent connection</text>

        {/* Arrow marker definitions */}
        <defs>
          <marker id="arrowBlue" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#3b82f6" />
          </marker>
          <marker id="arrowTeal" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#3bb4a4" />
          </marker>
          <marker id="arrowGold" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#d4af37" />
          </marker>
          <marker id="arrowPrimary" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#1e5d8a" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
