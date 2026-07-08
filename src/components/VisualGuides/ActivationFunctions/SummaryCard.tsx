"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useGuideMotion } from "@/lib/guideMotion";

interface SummaryCardProps {
  onReset: () => void;
}

const NEXT_GUIDE_SLUG = "backpropagation";

export default function SummaryCard({ onReset }: SummaryCardProps) {
  const { card } = useGuideMotion();

  return (
    <motion.div
      variants={card}
      initial="hidden"
      animate="visible"
      className="mt-8 rounded-2xl border border-white/[0.08] bg-[#0f172a] overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-px bg-[var(--color-accent)]" />
          <span className="text-[10px] font-semibold uppercase tracking-[2px] text-[var(--color-accent)]">
            Guide Complete
          </span>
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white">
          Activation Functions Explored!
        </h2>
        <p className="text-sm text-[#94a3b8] mt-1">
          You&apos;ve explored all four major activation functions.
        </p>
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        <p className="text-sm text-[#94a3b8] leading-relaxed mb-4">
          You&apos;ve explored all four major activation functions, ReLU,
          Sigmoid, Tanh, and Leaky ReLU, understanding how each shapes
          gradient flow, convergence speed, and network behavior. These choices
          are some of the most impactful decisions in designing a neural
          network.
        </p>

        {/* Key Takeaway */}
        <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
          <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
            Key Takeaway
          </p>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
            &quot;ReLU dominates modern deep networks for its speed and
            sparsity, but Leaky ReLU is often a safer choice when dead neurons
            are a concern. Sigmoid and Tanh remain useful in specific roles
            (sigmoid for binary output layers and LSTM/GRU gates, tanh for
            bounded hidden and cell states) where bounded outputs matter more
            than training speed.&quot;
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3">
        <Link
          href="/visual-guides"
          className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
        >
          &larr; All Guides
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            Try Again
          </button>
          <Link
            href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Next Guide &rarr;
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
