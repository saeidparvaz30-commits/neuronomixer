"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MEASURES = [
  {
    name: "Euclidean Distance",
    symbol: "L2",
    color: "#3bb4a4",
    formula: "d(p,q) = √Σ(pᵢ − qᵢ)²",
    useCase: "KNN, K-means, PCA distance matrix. Best when all features are on the same scale.",
    example: {
      desc: "Points (1, 2) and (4, 6):",
      calc: "√((4−1)² + (6−2)²) = √(9 + 16) = √25 = 5",
    },
    note: "Sensitive to scale differences: always standardize first.",
    icon: (
      <svg viewBox="0 0 32 32" width={20} height={20} fill="none">
        <circle cx={8} cy={24} r={3} fill="#3bb4a4" fillOpacity={0.7} />
        <circle cx={24} cy={8} r={3} fill="#3bb4a4" fillOpacity={0.7} />
        <line x1={8} y1={24} x2={24} y2={8} stroke="#3bb4a4" strokeWidth={2} />
      </svg>
    ),
  },
  {
    name: "Manhattan Distance",
    symbol: "L1",
    color: "#d4af37",
    formula: "d(p,q) = Σ|pᵢ − qᵢ|",
    useCase: "Robust to outliers. Used in LASSO regression, city-block navigation, and high-dim feature spaces.",
    example: {
      desc: "Points (1, 2) and (4, 6):",
      calc: "|4−1| + |6−2| = 3 + 4 = 7",
    },
    note: "Less affected by the curse of dimensionality than Euclidean.",
    icon: (
      <svg viewBox="0 0 32 32" width={20} height={20} fill="none">
        <circle cx={8} cy={24} r={3} fill="var(--color-accent)" fillOpacity={0.7} />
        <circle cx={24} cy={8} r={3} fill="var(--color-accent)" fillOpacity={0.7} />
        <polyline points="8,24 24,24 24,8" stroke="var(--color-accent)" strokeWidth={2} fill="none" />
      </svg>
    ),
  },
  {
    name: "Cosine Similarity",
    symbol: "cos θ",
    color: "#a855f7",
    formula: "cos(θ) = (A·B) / (‖A‖·‖B‖)",
    useCase: "Text/document similarity, NLP embeddings, recommendation systems. Ignores magnitude.",
    example: {
      desc: "A = (3, 4), B = (4, 3):",
      calc: "(3·4 + 4·3) / (5 × 5) = 24/25 = 0.96",
    },
    note: "Direction matters, not scale: perfect for sparse high-dim vectors.",
    icon: (
      <svg viewBox="0 0 32 32" width={20} height={20} fill="none">
        <circle cx={16} cy={16} r={10} stroke="#a855f7" strokeWidth={1} strokeDasharray="3,2" />
        <line x1={16} y1={16} x2={26} y2={8} stroke="#a855f7" strokeWidth={2} />
        <line x1={16} y1={16} x2={10} y2={6} stroke="#a855f7" strokeWidth={2} strokeDasharray="3,2" />
        <text x={14} y={22} fill="#a855f7" fontSize={9}>θ</text>
      </svg>
    ),
  },
  {
    name: "Mahalanobis Distance",
    symbol: "D_M",
    color: "#ef4444",
    formula: "D_M(x) = √((x−μ)ᵀ S⁻¹ (x−μ))",
    useCase: "Anomaly detection, accounts for correlations between features. Scale-invariant by design.",
    example: {
      desc: "Uses inverse covariance matrix S⁻¹:",
      calc: "Accounts for correlated features: 'how many standard deviations away?'",
    },
    note: "Reduces to Euclidean when features are uncorrelated and unit variance.",
    icon: (
      <svg viewBox="0 0 32 32" width={20} height={20} fill="none">
        <ellipse cx={16} cy={16} rx={12} ry={7} stroke="#ef4444" strokeWidth={1.5} />
        <ellipse cx={16} cy={16} rx={7} ry={4} stroke="#ef4444" strokeWidth={1} strokeDasharray="2,2" />
        <circle cx={16} cy={16} r={2} fill="#ef4444" />
      </svg>
    ),
  },
];

export default function DistanceMeasures() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
      <h2 className="text-xl font-bold text-white mb-1">Distance Measures</h2>
      <p className="text-sm text-[#94a3b8] mb-5 leading-relaxed">
        How you measure &ldquo;distance&rdquo; fundamentally changes what an algorithm learns.
        Each metric has assumptions. Choose wisely.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {MEASURES.map((m, i) => (
          <div
            key={i}
            className="rounded-xl border bg-[#0a0e1a] overflow-hidden cursor-pointer hover:border-opacity-60 transition-all"
            style={{ borderColor: `${m.color}35` }}
            onClick={() => setExpanded(expanded === i ? null : i)}
          >
            {/* Left colored border accent */}
            <div className="flex">
              <div className="w-1 flex-shrink-0" style={{ background: m.color }} />
              <div className="flex-1 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {m.icon}
                    <div>
                      <p className="text-sm font-bold text-white leading-tight">{m.name}</p>
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold"
                        style={{ color: m.color, background: `${m.color}15` }}
                      >
                        {m.symbol}
                      </span>
                    </div>
                  </div>
                  <svg
                    className={`w-4 h-4 transition-transform ${expanded === i ? "rotate-180" : ""}`}
                    style={{ color: m.color }}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                <p className="text-[11px] font-mono text-white/80 bg-[#1e293b]/50 px-2 py-1.5 rounded mb-2">
                  {m.formula}
                </p>

                <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                  {m.useCase}
                </p>

                <AnimatePresence>
                  {expanded === i && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-[#1e293b]">
                        <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide mb-1">
                          Example
                        </p>
                        <p className="text-[11px] text-[#94a3b8]">{m.example.desc}</p>
                        <p
                          className="text-[11px] font-mono mt-1 px-2 py-1 rounded"
                          style={{ color: m.color, background: `${m.color}10` }}
                        >
                          {m.example.calc}
                        </p>
                        <div
                          className="mt-2 rounded-lg px-3 py-2 border text-[10px]"
                          style={{ borderColor: `${m.color}25`, background: `${m.color}08`, color: m.color }}
                        >
                          <span className="font-semibold">Note: </span>
                          <span style={{ color: "#94a3b8" }}>{m.note}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Curse of dimensionality note */}
      <div className="rounded-xl border border-[#d4af37]/25 bg-[#d4af37]/5 p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1">
              Curse of Dimensionality Affects All Distances
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              In high dimensions, the ratio of max-to-min distance between points approaches 1: all points
              become nearly equidistant. Euclidean distance suffers most; Manhattan is more robust;
              Cosine similarity is often preferred for high-dim sparse data like text.
            </p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-[#475569] mt-3">
        Click any card to see worked examples.
      </p>
    </div>
  );
}
