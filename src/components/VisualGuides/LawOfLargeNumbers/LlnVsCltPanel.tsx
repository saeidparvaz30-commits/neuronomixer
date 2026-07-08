"use client";

import React from "react";
import Link from "next/link";

export default function LlnVsCltPanel() {
  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--color-accent)] mb-1">
        Two Theorems, One Sample Mean
      </p>
      <p className="text-[13px] font-semibold text-white mb-4">LLN vs CLT</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[11px] font-semibold mb-2" style={{ color: "var(--color-success)" }}>
            Law of Large Numbers
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed">
            Answers WHERE the sample mean goes: to the population mean. It is a statement about
            the destination of the running average, and it says nothing about the shape of the
            wobble along the way.
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[11px] font-semibold mb-2 text-[#a855f7]">Central Limit Theorem</p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed">
            Answers what SHAPE the fluctuations around that target take: rescaled by the square
            root of n, the sample mean&apos;s deviations from the population mean look
            approximately normal (given a finite variance).
          </p>
        </div>
      </div>

      <p className="text-[12px] text-[#94a3b8] leading-relaxed">
        In the chart above, LLN is the line settling onto the dashed target. CLT describes the
        statistics of the shrinking band it wiggles inside. Both need finite moments, which is
        exactly what the Cauchy panel takes away. See the fluctuations for yourself in the{" "}
        <Link
          href="/visual-guides/central-limit-theorem"
          className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
        >
          Central Limit Theorem guide
        </Link>
        .
      </p>
    </div>
  );
}
