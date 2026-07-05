"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PowerAnalysisProps {
  alpha: number;
  power: string;
  onViewed: () => void;
}

const cards = [
  {
    title: "Type I Error (α — False Positive)",
    color: "#ef4444",
    badge: "α",
    badgeBg: "#ef444420",
    body: "Rejecting H₀ when it is actually true. If you set α = 0.05, you accept a 5% chance of falsely detecting an effect. Under the null hypothesis, p-values are uniformly distributed, so exactly α fraction will fall below the threshold by chance.",
  },
  {
    title: "Type II Error (β — False Negative)",
    color: "#f97316",
    badge: "β",
    badgeBg: "#f9731620",
    body: "Failing to reject H₀ when H₁ is actually true. This happens when your sample is too small, the effect is too weak, or α is set too strictly. Type II errors mean you miss real effects — this is why underpowered studies are dangerous.",
  },
  {
    title: "Statistical Power (1 − β)",
    color: "#22c55e",
    badge: "1−β",
    badgeBg: "#22c55e20",
    body: "The probability of correctly detecting a real effect. A power of 0.80 means that if the effect truly exists, you have an 80% chance of detecting it. Conventional minimum is 0.80 (80%). Higher power requires larger n, bigger effect size, or higher α.",
  },
];

const howToIncreasePower = [
  "Increase sample size (n) — the most reliable lever",
  "Increase the true effect size (harder to control in practice)",
  "Raise α from 0.01 to 0.05 (accepts more Type I errors)",
  "Use a one-tailed test if directional hypothesis is justified",
  "Reduce measurement noise (σ) through better experimental design",
  "Use repeated measures or within-subject designs when possible",
];

export default function PowerAnalysis({ alpha, power, onViewed }: PowerAnalysisProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const viewedRef = useRef(false);

  useEffect(() => {
    if (!open || viewedRef.current) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          viewedRef.current = true;
          onViewed();
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [open, onViewed]);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8]">
            Understanding Power and Errors
          </span>
          <span className="text-[10px] font-mono text-[#d4af37] bg-[#d4af37]/10 px-1.5 py-0.5 rounded">
            α={alpha.toFixed(2)} / Power≈{power}
          </span>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-[#475569] text-[12px]"
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            ref={ref}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-5 pb-5 pt-1">
              {/* Info cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                {cards.map(({ title, color, badge, badgeBg, body }) => (
                  <div
                    key={title}
                    className="rounded-xl border p-4"
                    style={{ borderColor: color + "40", background: color + "08" }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: badgeBg, color }}
                      >
                        {badge}
                      </span>
                      <p className="text-[10px] font-semibold text-white leading-tight">{title}</p>
                    </div>
                    <p className="text-[11px] text-[#94a3b8] leading-relaxed">{body}</p>
                  </div>
                ))}
              </div>

              {/* How to increase power */}
              <div className="rounded-xl border border-[#1e293b] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#3bb4a4] mb-3">
                  How to Increase Statistical Power
                </p>
                <ul className="space-y-1.5">
                  {howToIncreasePower.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#d4af37] text-[10px] mt-0.5">→</span>
                      <span className="text-[11px] text-[#94a3b8] leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tradeoff note */}
              <p className="mt-4 text-[11px] text-[#475569] leading-relaxed">
                <span className="text-[#d4af37] font-semibold">Key tradeoff:</span> Lowering α reduces Type I errors but increases Type II errors (lower power). Note that the Type I error rate is fixed by your choice of α no matter how large the sample gets. What a bigger n buys you is a lower β at the same α, or room to choose a stricter α without sacrificing power.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
