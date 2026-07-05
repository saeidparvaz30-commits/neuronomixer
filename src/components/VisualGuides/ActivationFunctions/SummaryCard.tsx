"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

interface SummaryCardProps {
  onReset: () => void;
}

export default function SummaryCard({ onReset }: SummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="rounded-2xl border border-[#3bb4a4]/30 bg-[#0f172a] overflow-hidden"
    >
      {/* Top accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-[#3bb4a4] via-[#d4af37] to-[#a855f7]" />

      <div className="p-6">
        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#3bb4a4]/15 border border-[#3bb4a4]/30 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-[#3bb4a4]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Activation Functions Explored!
            </h3>
            <p className="text-xs text-[#64748b]">Guide complete</p>
          </div>
        </div>

        {/* Recap */}
        <p className="text-sm text-[#94a3b8] leading-relaxed mb-4">
          You&apos;ve explored all four major activation functions — ReLU,
          Sigmoid, Tanh, and Leaky ReLU — understanding how each shapes
          gradient flow, convergence speed, and network behavior. These choices
          are some of the most impactful decisions in designing a neural
          network.
        </p>

        {/* Key takeaway */}
        <div className="rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/30 px-4 py-3 mb-5">
          <p className="text-[10px] uppercase tracking-wide text-[#d4af37] mb-1 font-semibold">
            Key Takeaway
          </p>
          <p className="text-xs text-[#cbd5e1] leading-relaxed">
            <span className="text-white font-semibold">ReLU</span> dominates
            modern deep networks for its speed and sparsity — but{" "}
            <span className="text-white font-semibold">Leaky ReLU</span> is
            often a safer choice when dead neurons are a concern.{" "}
            <span className="text-white font-semibold">Sigmoid</span> and{" "}
            <span className="text-white font-semibold">Tanh</span> remain
            useful in specific roles (sigmoid for binary output layers and
            LSTM/GRU gates, tanh for bounded hidden and cell states) where
            bounded outputs matter more than training speed.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#334155] text-[#94a3b8] hover:border-[#475569] hover:text-white transition-all"
          >
            Reset Guide
          </button>
          <Link
            href="/visual-guides/neural-network"
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#a855f7]/15 border border-[#a855f7]/40 text-[#a855f7] hover:bg-[#a855f7]/25 transition-all"
          >
            Neural Networks &rarr;
          </Link>
          <Link
            href="/visual-guides"
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#1e293b] border border-[#334155] text-white hover:border-[#475569] transition-all"
          >
            All Guides
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
