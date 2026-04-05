"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { ConfidenceLevel, CIRecord, run100Experiments, TRUE_MEAN, Z_SCORES, SAMPLE_N } from "./types";

// ── Interval Visualization ───────────────────────────────────────────────────
const BAR_H = 5, BAR_GAP = 2;
const VW = 520, VPADY = 8, VPADX = { l: 36, r: 16 };

function IntervalVisualization({
  intervals, expandedId, onExpand,
}: {
  intervals: CIRecord[];
  expandedId: number | null;
  onExpand: (id: number) => void;
}) {
  if (intervals.length === 0) return (
    <div className="flex items-center justify-center h-40">
      <p className="text-[12px] text-[#475569]">Click "Generate 100 Samples" to begin</p>
    </div>
  );

  const allLo = intervals.map(i => i.lower), allHi = intervals.map(i => i.upper);
  const xMin = Math.min(...allLo) - 2, xMax = Math.max(...allHi) + 2;
  const xRange = xMax - xMin;
  const IW = VW - VPADX.l - VPADX.r;
  const tx = (v: number) => VPADX.l + ((v - xMin) / xRange) * IW;
  const trueLine = tx(TRUE_MEAN);
  const totalH = intervals.length * (BAR_H + BAR_GAP) + VPADY * 2;

  return (
    <div className="overflow-y-auto" style={{ maxHeight: 520 }}>
      <svg viewBox={`0 0 ${VW} ${totalH}`} width="100%" style={{ minHeight: totalH }}>
        {/* True mean line */}
        <line x1={trueLine} y1={VPADY} x2={trueLine} y2={totalH - VPADY}
          stroke="#d4af37" strokeWidth="1.5" />
        <text x={trueLine + 3} y={VPADY + 8} fill="#d4af37" fontSize="8" fontWeight="600">
          μ=100
        </text>

        {intervals.map((ci, idx) => {
          const y = VPADY + idx * (BAR_H + BAR_GAP);
          const x1 = tx(ci.lower), x2 = tx(ci.upper);
          const color = ci.containsTruth ? "#3bb4a4" : "#ef4444";
          const isSelected = expandedId === ci.id;
          return (
            <g key={ci.id} style={{ cursor: "pointer" }} onClick={() => onExpand(ci.id)}>
              <rect x={x1} y={y - 1} width={x2 - x1} height={BAR_H + 2}
                fill={color} opacity={isSelected ? 1 : 0.7} rx="1" />
              <circle cx={tx(ci.sampleMean)} cy={y + BAR_H / 2} r={2.5}
                fill="white" opacity="0.9" />
              {isSelected && (
                <rect x={VPADX.l} y={y - 2} width={IW} height={BAR_H + 4}
                  fill="transparent" stroke="#d4af37" strokeWidth="1" rx="1" />
              )}
            </g>
          );
        })}

        {/* X-axis */}
        <line x1={VPADX.l} y1={totalH - VPADY} x2={VW - VPADX.r} y2={totalH - VPADY}
          stroke="#334155" strokeWidth="1" />
        {[xMin, (xMin + xMax) / 2, xMax].map((v, i) => (
          <text key={i} x={tx(v)} y={totalH - 2} textAnchor="middle" fill="#475569" fontSize="7">
            {v.toFixed(0)}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ── Sample Breakdown ─────────────────────────────────────────────────────────
function SampleBreakdown({ ci, cl }: { ci: CIRecord; cl: ConfidenceLevel }) {
  const z = Z_SCORES[cl];
  const se = ci.sampleSD / Math.sqrt(SAMPLE_N);
  const me = z * se;
  const borderColor = ci.containsTruth ? "#3bb4a4" : "#ef4444";

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      <div className="rounded-2xl border p-5 mt-2" style={{ borderColor: borderColor + "50" }}>
        <p className="text-[12px] font-bold text-white mb-3">Sample #{ci.id} Breakdown</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {[
            ["Sample Mean", ci.sampleMean.toFixed(3)],
            ["Sample SD", ci.sampleSD.toFixed(3)],
            ["Standard Error", se.toFixed(3)],
            ["Z-score", z.toFixed(3)],
            ["Margin of Error", me.toFixed(3)],
            ["Interval Width", (me * 2).toFixed(3)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-[#1e293b] p-2.5">
              <p className="text-[9px] text-[#475569] uppercase mb-1">{k}</p>
              <p className="text-[13px] font-black font-mono text-white">{v}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl p-3 mb-3" style={{ background: borderColor + "10", border: `1px solid ${borderColor}30` }}>
          <p className="text-[11px] font-bold" style={{ color: borderColor }}>
            [{ci.lower.toFixed(2)}, {ci.upper.toFixed(2)}]
          </p>
          <p className="text-[10px] text-[#94a3b8] mt-1">
            Does this contain μ = {TRUE_MEAN}?{" "}
            <strong style={{ color: borderColor }}>{ci.containsTruth ? "✓ YES" : "✗ NO"}</strong>
          </p>
        </div>
        <p className="text-[10px] text-[#475569]">
          Sample data (first 5): {ci.sampleData.slice(0, 5).map(v => v.toFixed(1)).join(", ")}…
        </p>
      </div>
    </motion.div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ConfidenceIntervalsClient() {
  const { data: session } = useSession();
  const [cl, setCl] = useState<ConfidenceLevel>(95);
  const [intervals, setIntervals] = useState<CIRecord[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [samplesExplored, setSamplesExplored] = useState<Set<number>>(new Set());
  const [totalGenerated, setTotalGenerated] = useState(0);
  const completionFired = useRef(false);

  const coverCount = intervals.filter(i => i.containsTruth).length;
  const avgWidth = intervals.length > 0
    ? intervals.reduce((a, i) => a + (i.upper - i.lower), 0) / intervals.length
    : 0;

  const allComplete = totalGenerated >= 50 && samplesExplored.size >= 3;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "confidence-intervals", score: 8 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  function generate() {
    const newIntervals = run100Experiments(cl);
    setIntervals(newIntervals);
    setExpandedId(null);
    setTotalGenerated(prev => prev + 100);
  }

  function handleExpand(id: number) {
    setExpandedId(prev => prev === id ? null : id);
    setSamplesExplored(prev => new Set([...prev, id]));
  }

  function handleCLChange(newCL: ConfidenceLevel) {
    setCl(newCL);
    if (intervals.length > 0) {
      setIntervals(run100Experiments(newCL));
      setTotalGenerated(prev => prev + 100);
    }
  }

  const expandedCI = intervals.find(i => i.id === expandedId) ?? null;

  const progress = [
    { label: `Intervals generated: ${totalGenerated}/50`, done: totalGenerated >= 50 },
    { label: `Samples explored: ${samplesExplored.size}/3`, done: samplesExplored.size >= 3 },
  ];

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Confidence Intervals</span>
        </nav>

        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">Statistics</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Confidence Intervals:{" "}
            <span className="text-[var(--color-accent)]">What They Actually Mean</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            Run 100 repeated experiments. Each draws a sample and computes a confidence interval.
            Watch how many capture the true population mean — and how interval width changes with confidence level.
          </p>
        </section>

        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progress.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full transition-colors ${done ? "bg-[#3bb4a4]" : "bg-[#1e293b]"}`} />
              <span className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}>{label}</span>
            </div>
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link href="/auth/sign-in" className="underline underline-offset-2 hover:text-[#94a3b8]">Sign in</Link>{" "}to track progress
            </p>
          )}
          <AnimatePresence>
            {allComplete && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="ml-auto text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="flex gap-2">
            {([90, 95, 99] as ConfidenceLevel[]).map(level => (
              <button key={level} onClick={() => handleCLChange(level)}
                className="px-4 py-2 rounded-xl text-[12px] font-semibold border transition-colors"
                style={{
                  borderColor: cl === level ? "#d4af37" : "#1e293b",
                  color: cl === level ? "#d4af37" : "#475569",
                  background: cl === level ? "#d4af3720" : "transparent",
                }}>
                {level}% CI
              </button>
            ))}
          </div>
          <button onClick={generate}
            className="px-5 py-2 rounded-xl text-[12px] font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity">
            Generate 100 Samples
          </button>
          <span className="text-[11px] text-[#475569]">Click any interval bar to expand details</span>
        </div>

        {/* Main */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[12px] font-bold text-white mb-1">100 Confidence Intervals from Repeated Sampling</p>
              {intervals.length > 0 && (
                <p className="text-[11px] text-[#94a3b8] mb-3">
                  <span className="text-[#3bb4a4] font-bold">{coverCount}</span> of 100 intervals capture μ=100
                  {" "}(expected ~{cl} for a {cl}% CI).
                  {" "}<span className="text-[#ef4444] font-bold">{100 - coverCount}</span> miss.
                </p>
              )}
              <IntervalVisualization
                intervals={intervals} expandedId={expandedId} onExpand={handleExpand}
              />
            </div>

            <AnimatePresence>
              {expandedCI && (
                <SampleBreakdown ci={expandedCI} cl={cl} />
              )}
            </AnimatePresence>
          </div>

          {/* Stats panel */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-4">Summary</p>
              {intervals.length > 0 ? (
                <div className="space-y-3">
                  {[
                    { label: "Confidence Level", val: `${cl}%`, color: "#d4af37" },
                    { label: "Sample Size", val: `n = ${SAMPLE_N}`, color: "#94a3b8" },
                    { label: "Coverage", val: `${coverCount}/100`, color: coverCount >= cl - 5 ? "#3bb4a4" : "#f97316" },
                    { label: "Miss Rate", val: `${100 - coverCount}%`, color: 100 - coverCount <= 100 - cl + 5 ? "#3bb4a4" : "#ef4444" },
                    { label: "Avg Width", val: avgWidth.toFixed(2), color: "#94a3b8" },
                    { label: "Z-score", val: Z_SCORES[cl].toFixed(3), color: "#94a3b8" },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-[10px] text-[#475569]">{label}</span>
                      <span className="text-[13px] font-black font-mono" style={{ color }}>{val}</span>
                    </div>
                  ))}

                  <div className="rounded-lg border-l-4 border-[#3bb4a4] bg-[#3bb4a4]/05 p-3 mt-2">
                    <p className="text-[10px] text-[#94a3b8] leading-relaxed">
                      {coverCount >= cl - 3 && coverCount <= cl + 3
                        ? `Perfect! About ${cl}% of CIs captured the truth — exactly as expected.`
                        : coverCount > cl
                        ? `${coverCount}% coverage is above ${cl}% — normal variation across runs.`
                        : `${coverCount}% coverage is below ${cl}% — this can happen by chance.`}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-[#334155]">Generate samples to see statistics.</p>
              )}
            </div>

            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#475569] mb-2">Key Insight</p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                A 95% CI does NOT mean "95% probability the true mean is in this interval."
                It means: if you repeated this experiment many times, ~95% of the CIs you compute
                would contain the true mean.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link href="/visual-guides/p-values"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
            ← Previous Guide
          </Link>
          <Link href="/visual-guides"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
            All Guides →
          </Link>
        </div>
      </div>
    </div>
  );
}
