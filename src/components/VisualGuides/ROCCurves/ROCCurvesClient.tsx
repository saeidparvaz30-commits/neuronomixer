"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Seeded RNG (deterministic: identical on server and client) ────────────────
function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// ── Gaussian helper ────────────────────────────────────────────────────────────
function gaussRand(rand: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ── Model simulation ───────────────────────────────────────────────────────────
interface ModelConfig {
  id: string;
  label: string;
  color: string;
  posCenter: number;  // center of positive class score distribution
  negCenter: number;  // center of negative class score distribution
  spread: number;     // std dev for both
}

// AUC shown next to each label is computed live from the generated samples,
// so the number on the button always matches the curve on the chart.
const MODELS: ModelConfig[] = [
  { id: "excellent", label: "Excellent", color: "#3bb4a4", posCenter: 0.78, negCenter: 0.28, spread: 0.12 },
  { id: "good", label: "Good", color: "#d4af37", posCenter: 0.65, negCenter: 0.38, spread: 0.18 },
  { id: "random", label: "Random baseline", color: "#94a3b8", posCenter: 0.5, negCenter: 0.5, spread: 0.2 },
  { id: "poor", label: "Poor", color: "#f97316", posCenter: 0.58, negCenter: 0.42, spread: 0.2 },
];

interface Sample { actual: 0 | 1; score: number }

function generateSamples(cfg: ModelConfig, seed: number, n = 500): Sample[] {
  const rand = createRng(seed);
  const nPos = Math.round(n * 0.3);
  const samples: Sample[] = [];
  for (let i = 0; i < nPos; i++) {
    samples.push({ actual: 1, score: Math.min(1, Math.max(0, cfg.posCenter + gaussRand(rand) * cfg.spread)) });
  }
  for (let i = 0; i < n - nPos; i++) {
    samples.push({ actual: 0, score: Math.min(1, Math.max(0, cfg.negCenter + gaussRand(rand) * cfg.spread)) });
  }
  return samples;
}

// Build ROC curve: sorted by threshold descending
function buildROC(samples: Sample[]): { fpr: number; tpr: number; threshold: number }[] {
  const sorted = [...samples].sort((a, b) => b.score - a.score);
  const nPos = samples.filter(s => s.actual === 1).length;
  const nNeg = samples.length - nPos;
  const points: { fpr: number; tpr: number; threshold: number }[] = [{ fpr: 0, tpr: 0, threshold: 1 }];
  let tp = 0, fp = 0;
  for (const s of sorted) {
    if (s.actual === 1) tp++;
    else fp++;
    points.push({
      fpr: nNeg > 0 ? fp / nNeg : 0,
      tpr: nPos > 0 ? tp / nPos : 0,
      threshold: s.score,
    });
  }
  return points;
}

function computeAUC(roc: { fpr: number; tpr: number }[]): number {
  let auc = 0;
  for (let i = 1; i < roc.length; i++) {
    const dx = roc[i].fpr - roc[i - 1].fpr;
    const avgY = (roc[i].tpr + roc[i - 1].tpr) / 2;
    auc += dx * avgY;
  }
  return Math.abs(auc);
}

// ── Score distribution (density bars) ─────────────────────────────────────────
function scoreHistogram(samples: Sample[], bins = 30): { bin: number; pos: number; neg: number }[] {
  const hist = Array.from({ length: bins }, (_, i) => ({ bin: (i + 0.5) / bins, pos: 0, neg: 0 }));
  for (const s of samples) {
    const bi = Math.min(bins - 1, Math.floor(s.score * bins));
    if (s.actual === 1) hist[bi].pos++;
    else hist[bi].neg++;
  }
  return hist;
}

// ── SVG constants ─────────────────────────────────────────────────────────────
const RW = 380; const RH = 320; const RP = 48;

function rx(fpr: number) { return RP + fpr * (RW - 2 * RP); }
function ry(tpr: number) { return RH - RP - tpr * (RH - 2 * RP); }

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ROCCurvesClient() {
  const { data: session } = useSession();
  const { fadeIn, card } = useGuideMotion();
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set(["excellent"]));
  const [threshold, setThreshold] = useState(0.5);
  const [modelsExplored, setModelsExplored] = useState<Set<string>>(new Set(["excellent"]));
  const [thresholdChanges, setThresholdChanges] = useState(0);
  const completionFired = useRef(false);

  const allSamples = useMemo(() => {
    const map = new Map<string, Sample[]>();
    MODELS.forEach((m, i) => map.set(m.id, generateSamples(m, 42 + i * 1000)));
    return map;
  }, []);

  const rocData = useMemo(() => {
    const map = new Map<string, { fpr: number; tpr: number; threshold: number }[]>();
    for (const [id, samples] of allSamples) map.set(id, buildROC(samples));
    return map;
  }, [allSamples]);

  const aucData = useMemo(() => {
    const map = new Map<string, number>();
    for (const [id, roc] of rocData) map.set(id, computeAUC(roc));
    return map;
  }, [rocData]);

  function toggleModel(id: string) {
    setSelectedModels(prev => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); }
      else next.add(id);
      return next;
    });
    setModelsExplored(prev => new Set([...prev, id]));
  }

  // For threshold marker: find point in first selected model's ROC nearest to threshold
  const primaryModelId = [...selectedModels][0];
  const primaryROC = rocData.get(primaryModelId) || [];
  const thresholdPoint = useMemo(() => {
    if (primaryROC.length === 0) return { fpr: 0, tpr: 0 };
    let best = primaryROC[0];
    let bestDiff = Infinity;
    for (const pt of primaryROC) {
      const diff = Math.abs(pt.threshold - threshold);
      if (diff < bestDiff) { bestDiff = diff; best = pt; }
    }
    return best;
  }, [primaryROC, threshold]);

  const primaryModel = MODELS.find(m => m.id === primaryModelId)!;
  const primarySamples = allSamples.get(primaryModelId) || [];
  const hist = useMemo(() => scoreHistogram(primarySamples), [primarySamples]);
  const maxHistBin = Math.max(...hist.map(b => b.pos + b.neg));

  // Completion: 3+ models explored AND 5+ threshold changes
  const isComplete = modelsExplored.size >= 3 && thresholdChanges >= 5;

  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "roc-curves", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  // Score distribution SVG
  const DW = 380; const DH = 120; const DP = 30;

  function handleReset() {
    setSelectedModels(new Set(["excellent"]));
    setModelsExplored(new Set(["excellent"]));
    setThreshold(0.5);
    setThresholdChanges(0);
  }

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="roc-curves" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">Visual Guides</Link>
          <span>/</span>
          <span className="text-[#94a3b8]">ROC Curves & AUC: Threshold Tuning</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Machine Learning
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            ROC Curves & AUC:{" "}
            <span className="text-[var(--color-accent)]">Threshold Tuning Visualized</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
            The ROC curve shows every possible tradeoff between false positive rate and true positive rate.
            The AUC summarizes overall performance in a single number. Drag the threshold and compare models.
          </p>
        </section>

        {/* Progress */}
        <div className="mb-8 bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#94a3b8]">Exploration Progress</span>
            <span className="text-sm font-semibold text-white">
              {modelsExplored.size}/3 models · {Math.min(thresholdChanges, 5)}/5 threshold changes
            </span>
          </div>
          <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#1e5d8a] to-[#3bb4a4] rounded-full"
              animate={{ width: `${Math.min(modelsExplored.size, 3) / 3 * 50 + Math.min(thresholdChanges, 5) / 5 * 50}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          {isComplete && (
            <motion.div variants={fadeIn} initial="hidden" animate="visible" className="mt-2 text-xs text-[#3bb4a4] font-semibold">
              Guide complete!
            </motion.div>
          )}
          {!session?.user && (
            <p className="mt-2 text-xs text-[#94a3b8]">
              <Link href="/auth/sign-in" className="text-[var(--color-accent)] hover:underline">Sign in</Link> to save your progress.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
          <div className="flex flex-col gap-5">
            {/* ROC chart */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl overflow-hidden">
              <div className="p-3 border-b border-[#1e293b] text-xs flex items-center gap-4 flex-wrap">
                <span className="text-white font-semibold">ROC Curve</span>
                <span className="text-[#94a3b8]">FPR → x axis · TPR → y axis</span>
                <span className="ml-auto text-[#94a3b8]">threshold = <span className="text-[var(--color-accent)] font-semibold">{threshold.toFixed(2)}</span></span>
              </div>
              <svg viewBox={`0 0 ${RW} ${RH}`} className="w-full">
                {/* Grid */}
                {[0, 0.25, 0.5, 0.75, 1].map(v => (
                  <React.Fragment key={v}>
                    <line x1={rx(v)} y1={ry(0)} x2={rx(v)} y2={ry(1)} stroke="#1e293b" strokeWidth="1" />
                    <line x1={rx(0)} y1={ry(v)} x2={rx(1)} y2={ry(v)} stroke="#1e293b" strokeWidth="1" />
                    {(v === 0 || v === 0.5 || v === 1) && (
                      <text x={rx(v)} y={RH - RP + 16} fill="#94a3b8" fontSize="12" textAnchor="middle">{v}</text>
                    )}
                    {(v === 0 || v === 0.5 || v === 1) && (
                      <text x={RP - 6} y={ry(v) + 4} fill="#94a3b8" fontSize="12" textAnchor="end">{v}</text>
                    )}
                  </React.Fragment>
                ))}
                {/* Diagonal (random baseline) */}
                <line x1={rx(0)} y1={ry(0)} x2={rx(1)} y2={ry(1)} stroke="#334155" strokeWidth="1" strokeDasharray="5 4" />
                <text x={rx(0.6)} y={ry(0.5) - 8} fill="#334155" fontSize="12" textAnchor="middle" transform={`rotate(-45 ${rx(0.6)} ${ry(0.5) - 8})`}>random</text>

                {/* Axis labels */}
                <text x={RW / 2} y={RH - 4} fill="#94a3b8" fontSize="13" textAnchor="middle">False Positive Rate (FPR)</text>
                <text x={13} y={RH / 2} fill="#94a3b8" fontSize="13" textAnchor="middle" transform={`rotate(-90 13 ${RH / 2})`}>True Positive Rate (TPR)</text>

                {/* ROC curves for selected models */}
                {MODELS.filter(m => selectedModels.has(m.id)).map(m => {
                  const roc = rocData.get(m.id) || [];
                  const pts = roc.map(p => `${rx(p.fpr)},${ry(p.tpr)}`).join(" ");
                  const auc = aucData.get(m.id) || 0;
                  return (
                    <g key={m.id}>
                      {/* AUC fill */}
                      <polyline
                        points={`${rx(0)},${ry(0)} ${pts} ${rx(1)},${ry(0)}`}
                        fill={m.color}
                        opacity={0.06}
                      />
                      <polyline
                        points={pts}
                        fill="none"
                        stroke={m.color}
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* AUC label */}
                      <text x={rx(0.6)} y={ry(0.9 - MODELS.indexOf(m) * 0.12)}
                        fill={m.color} fontSize="12" fontWeight="bold">
                        AUC = {auc.toFixed(3)}
                      </text>
                    </g>
                  );
                })}

                {/* Threshold point on primary model */}
                <circle
                  cx={rx(thresholdPoint.fpr)} cy={ry(thresholdPoint.tpr)} r={7}
                  fill={primaryModel.color} stroke="white" strokeWidth="2"
                />
                {/* Crosshairs */}
                <line x1={rx(0)} y1={ry(thresholdPoint.tpr)} x2={rx(thresholdPoint.fpr)} y2={ry(thresholdPoint.tpr)}
                  stroke={primaryModel.color} strokeWidth="1" strokeDasharray="3 3" opacity={0.5} />
                <line x1={rx(thresholdPoint.fpr)} y1={ry(0)} x2={rx(thresholdPoint.fpr)} y2={ry(thresholdPoint.tpr)}
                  stroke={primaryModel.color} strokeWidth="1" strokeDasharray="3 3" opacity={0.5} />

                <text x={thresholdPoint.fpr > 0.5 ? rx(thresholdPoint.fpr) - 8 : rx(thresholdPoint.fpr) + 8}
                  y={ry(thresholdPoint.tpr) - 6}
                  textAnchor={thresholdPoint.fpr > 0.5 ? "end" : "start"}
                  fill={primaryModel.color} fontSize="12" fontWeight="bold">
                  TPR={thresholdPoint.tpr.toFixed(2)} FPR={thresholdPoint.fpr.toFixed(2)}
                </text>
              </svg>
            </div>

            {/* Score distribution */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl overflow-hidden">
              <div className="p-3 border-b border-[#1e293b] text-xs">
                <span className="text-white font-semibold">Score Distribution</span>
                <span className="text-[#94a3b8] ml-2">· {primaryModel.label}</span>
              </div>
              <svg viewBox={`0 0 ${DW} ${DH}`} className="w-full">
                {hist.map((b, i) => {
                  const bw = (DW - 2 * DP) / hist.length;
                  const bx = DP + i * bw;
                  const posH = (b.pos / (maxHistBin + 1)) * (DH - 2 * DP);
                  const negH = (b.neg / (maxHistBin + 1)) * (DH - 2 * DP);
                  return (
                    <g key={i}>
                      {/* Overlaid (not stacked) so the visual overlap matches the real class overlap */}
                      <rect x={bx} y={DH - DP - negH} width={bw - 1} height={negH}
                        fill="var(--color-accent)" opacity={0.5} />
                      <rect x={bx} y={DH - DP - posH} width={bw - 1} height={posH}
                        fill="#3bb4a4" opacity={0.5} />
                    </g>
                  );
                })}
                {/* Threshold line */}
                {(() => {
                  const tx = DP + threshold * (DW - 2 * DP);
                  return (
                    <>
                      <line x1={tx} y1={DP} x2={tx} y2={DH - DP} stroke="var(--color-accent)" strokeWidth="2" />
                      <text x={tx + 3} y={DP + 13} fill="var(--color-accent)" fontSize="12">threshold={threshold.toFixed(2)}</text>
                    </>
                  );
                })()}
                <text x={DP} y={DH - 4} fill="#3bb4a4" fontSize="12">■ Positive class</text>
                <text x={DP + 130} y={DH - 4} fill="var(--color-accent)" fontSize="12">■ Negative class</text>
              </svg>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-4">
            {/* Model selector */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Models (click to toggle)</h3>
              <div className="flex flex-col gap-2">
                {MODELS.map(m => {
                  const selected = selectedModels.has(m.id);
                  return (
                    <button key={m.id} onClick={() => toggleModel(m.id)}
                      aria-pressed={selected}
                      className="px-3 py-2 rounded-lg text-xs font-medium text-left border transition-all flex items-center gap-2"
                      style={{
                        backgroundColor: selected ? `${m.color}15` : "transparent",
                        borderColor: selected ? `${m.color}60` : "#334155",
                        color: selected ? m.color : "#94a3b8",
                      }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.color, opacity: selected ? 1 : 0.3 }} />
                      {m.label} (AUC = {(aucData.get(m.id) || 0).toFixed(2)})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Threshold slider */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-white">Threshold</h3>
                <span className="text-sm font-bold text-[var(--color-accent)]">{threshold.toFixed(2)}</span>
              </div>
              <input
                type="range" min="0.05" max="0.95" step="0.01" value={threshold}
                aria-label="Decision threshold"
                onChange={e => { setThreshold(parseFloat(e.target.value)); setThresholdChanges(p => p + 1); }}
                className="w-full accent-[var(--color-accent)]"
              />
              <div className="mt-3 text-xs space-y-1">
                <div className="flex justify-between text-[#94a3b8]">
                  <span>TPR (Recall)</span>
                  <span className="text-[#3bb4a4] font-mono">{thresholdPoint.tpr.toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-[#94a3b8]">
                  <span>FPR</span>
                  <span className="text-[#f97316] font-mono">{thresholdPoint.fpr.toFixed(3)}</span>
                </div>
              </div>
            </div>

            {/* AUC summary */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">AUC Summary</h3>
              <div className="space-y-2">
                {MODELS.map(m => {
                  const auc = aucData.get(m.id) || 0;
                  return (
                    <div key={m.id} className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                      <span className="text-[#94a3b8] flex-1">{m.id}</span>
                      <span className="font-mono font-semibold" style={{ color: m.color }}>{auc.toFixed(3)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-[#334155] text-[10px] text-[#94a3b8]">
                AUC = 0.5 → random · AUC = 1.0 → perfect
              </div>
            </div>

            <div className="bg-[#1e293b]/60 border border-[#d4af37]/20 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-2">Key Insight</h3>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                AUC is the probability that the model ranks a random positive sample higher than a random negative.
                It&apos;s threshold-independent: a single number for the entire curve.
              </p>
              <p className="text-xs text-[#94a3b8] leading-relaxed mt-2">
                Caveat: with heavily imbalanced classes, ROC curves can look deceptively good because FPR is
                diluted by the large negative class. Precision-recall curves are often more informative there.
                See the <Link href="/visual-guides/class-imbalance" className="text-[var(--color-accent)] hover:underline">class imbalance guide</Link>.
              </p>
            </div>
          </div>
        </div>

        {/* Completion card */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              variants={card}
              initial="hidden"
              animate="visible"
              className="mt-8 rounded-2xl border border-white/[0.08] bg-[#0f172a] overflow-hidden"
            >
              <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-px bg-[var(--color-accent)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[2px] text-[var(--color-accent)]">
                    Guide Complete
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  ROC Curves Mastered!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You compared model curves and explored the threshold tradeoff between TPR and FPR.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Models explored</p>
                    <p className="text-[14px] font-mono font-bold text-[#3bb4a4]">
                      {modelsExplored.size} / {MODELS.length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Threshold changes</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {thresholdChanges}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Best AUC on screen</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {Math.max(...MODELS.map(m => aucData.get(m.id) || 0)).toFixed(3)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;The ROC curve is every threshold at once: AUC tells you how well the model
                    ranks, but the threshold you ship is a business decision about which error hurts
                    more.&quot;
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3">
                <Link
                  href="/visual-guides"
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
                >
                  ← All Guides
                </Link>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
                  >
                    Try Again
                  </button>
                  <Link
                    href="/visual-guides/neural-network"
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
                  >
                    Next Guide →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer nav (pre-completion) */}
        {!isComplete && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link
              href="/visual-guides"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            >
              ← All Guides
            </Link>
            <Link
              href="/visual-guides/neural-network"
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
            >
              Next Guide →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
