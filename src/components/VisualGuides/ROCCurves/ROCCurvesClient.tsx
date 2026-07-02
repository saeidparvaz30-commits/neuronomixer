"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Gaussian helper ────────────────────────────────────────────────────────────
function gaussRand() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
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

const MODELS: ModelConfig[] = [
  { id: "excellent", label: "Excellent (AUC ≈ 0.95)", color: "#3bb4a4", posCenter: 0.78, negCenter: 0.28, spread: 0.12 },
  { id: "good", label: "Good (AUC ≈ 0.82)", color: "#d4af37", posCenter: 0.65, negCenter: 0.38, spread: 0.18 },
  { id: "random", label: "Random (AUC ≈ 0.50)", color: "#94a3b8", posCenter: 0.5, negCenter: 0.5, spread: 0.2 },
  { id: "poor", label: "Poor (AUC ≈ 0.65)", color: "#f97316", posCenter: 0.58, negCenter: 0.42, spread: 0.2 },
];

interface Sample { actual: 0 | 1; score: number }

function generateSamples(cfg: ModelConfig, n = 500): Sample[] {
  const nPos = Math.round(n * 0.3);
  const samples: Sample[] = [];
  for (let i = 0; i < nPos; i++) {
    samples.push({ actual: 1, score: Math.min(1, Math.max(0, cfg.posCenter + gaussRand() * cfg.spread)) });
  }
  for (let i = 0; i < n - nPos; i++) {
    samples.push({ actual: 0, score: Math.min(1, Math.max(0, cfg.negCenter + gaussRand() * cfg.spread)) });
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
const RW = 380; const RH = 320; const RP = 40;

function rx(fpr: number) { return RP + fpr * (RW - 2 * RP); }
function ry(tpr: number) { return RH - RP - tpr * (RH - 2 * RP); }

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ROCCurvesClient() {
  const { data: session } = useSession();
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set(["excellent"]));
  const [threshold, setThreshold] = useState(0.5);
  const [modelsExplored, setModelsExplored] = useState<Set<string>>(new Set(["excellent"]));
  const [thresholdChanges, setThresholdChanges] = useState(0);
  const completionFired = useRef(false);

  const allSamples = useMemo(() => {
    const map = new Map<string, Sample[]>();
    for (const m of MODELS) map.set(m.id, generateSamples(m));
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
          body: JSON.stringify({ guideSlug: "roc-curves", score: 8 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  // Score distribution SVG
  const DW = 380; const DH = 120; const DP = 30;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <GuideCompletion isComplete={isComplete} guideSlug="roc-curves" score={8} />
      <div className="max-w-[1300px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span>/</span>
          <span className="text-white">ROC Curves & AUC: Threshold Tuning</span>
        </nav>

        {/* Hero */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-[#1e5d8a]/20 border border-[#1e5d8a]/40 rounded-full px-3 py-1 mb-4">
            <span className="text-xs font-semibold text-[#3bb4a4] uppercase tracking-wider">Machine Learning</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            ROC Curves & AUC: Threshold Tuning Visualized
          </h1>
          <p className="text-[#94a3b8] text-base max-w-2xl">
            The ROC curve shows every possible tradeoff between false positive rate and true positive rate.
            The AUC summarizes overall performance in a single number. Drag the threshold and compare models.
          </p>
        </div>

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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-xs text-[#3bb4a4] font-semibold">
              Guide complete!
            </motion.div>
          )}
          {!session?.user && (
            <p className="mt-2 text-xs text-[#94a3b8]">
              <Link href="/auth/sign-in" className="text-[#d4af37] hover:underline">Sign in</Link> to save your progress.
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
                <span className="ml-auto text-[#94a3b8]">threshold = <span className="text-[#d4af37] font-semibold">{threshold.toFixed(2)}</span></span>
              </div>
              <svg viewBox={`0 0 ${RW} ${RH}`} className="w-full">
                {/* Grid */}
                {[0, 0.25, 0.5, 0.75, 1].map(v => (
                  <React.Fragment key={v}>
                    <line x1={rx(v)} y1={ry(0)} x2={rx(v)} y2={ry(1)} stroke="#1e293b" strokeWidth="1" />
                    <line x1={rx(0)} y1={ry(v)} x2={rx(1)} y2={ry(v)} stroke="#1e293b" strokeWidth="1" />
                    <text x={rx(v)} y={RH - RP + 14} fill="#94a3b8" fontSize="9" textAnchor="middle">{v}</text>
                    <text x={RP - 6} y={ry(v) + 3} fill="#94a3b8" fontSize="9" textAnchor="end">{v}</text>
                  </React.Fragment>
                ))}
                {/* Diagonal (random baseline) */}
                <line x1={rx(0)} y1={ry(0)} x2={rx(1)} y2={ry(1)} stroke="#334155" strokeWidth="1" strokeDasharray="5 4" />
                <text x={rx(0.6)} y={ry(0.5) - 8} fill="#334155" fontSize="9" textAnchor="middle" transform={`rotate(-45 ${rx(0.6)} ${ry(0.5) - 8})`}>random</text>

                {/* Axis labels */}
                <text x={RW / 2} y={RH - 5} fill="#94a3b8" fontSize="10" textAnchor="middle">False Positive Rate (FPR)</text>
                <text x={12} y={RH / 2} fill="#94a3b8" fontSize="10" textAnchor="middle" transform={`rotate(-90 12 ${RH / 2})`}>True Positive Rate (TPR)</text>

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
                        fill={m.color} fontSize="10" fontWeight="bold">
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

                <text x={rx(thresholdPoint.fpr) + 8} y={ry(thresholdPoint.tpr) - 6}
                  fill={primaryModel.color} fontSize="9" fontWeight="bold">
                  TPR={thresholdPoint.tpr.toFixed(2)} FPR={thresholdPoint.fpr.toFixed(2)}
                </text>
              </svg>
            </div>

            {/* Score distribution */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl overflow-hidden">
              <div className="p-3 border-b border-[#1e293b] text-xs">
                <span className="text-white font-semibold">Score Distribution</span>
                <span className="text-[#94a3b8] ml-2">— {primaryModel.label}</span>
              </div>
              <svg viewBox={`0 0 ${DW} ${DH}`} className="w-full">
                {hist.map((b, i) => {
                  const bw = (DW - 2 * DP) / hist.length;
                  const bx = DP + i * bw;
                  const posH = (b.pos / (maxHistBin + 1)) * (DH - 2 * DP);
                  const negH = (b.neg / (maxHistBin + 1)) * (DH - 2 * DP);
                  return (
                    <g key={i}>
                      <rect x={bx} y={DH - DP - negH} width={bw - 1} height={negH}
                        fill="#d4af37" opacity={0.6} />
                      <rect x={bx} y={DH - DP - negH - posH} width={bw - 1} height={posH}
                        fill="#3bb4a4" opacity={0.7} />
                    </g>
                  );
                })}
                {/* Threshold line */}
                {(() => {
                  const tx = DP + threshold * (DW - 2 * DP);
                  return (
                    <>
                      <line x1={tx} y1={DP} x2={tx} y2={DH - DP} stroke="#d4af37" strokeWidth="2" />
                      <text x={tx + 3} y={DP + 12} fill="#d4af37" fontSize="9">threshold={threshold.toFixed(2)}</text>
                    </>
                  );
                })()}
                <text x={DP} y={DH - 5} fill="#3bb4a4" fontSize="9">■ Positive class</text>
                <text x={DP + 100} y={DH - 5} fill="#d4af37" fontSize="9">■ Negative class</text>
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
                      className="px-3 py-2 rounded-lg text-xs font-medium text-left border transition-all flex items-center gap-2"
                      style={{
                        backgroundColor: selected ? `${m.color}15` : "transparent",
                        borderColor: selected ? `${m.color}60` : "#334155",
                        color: selected ? m.color : "#94a3b8",
                      }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.color, opacity: selected ? 1 : 0.3 }} />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Threshold slider */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-white">Threshold</h3>
                <span className="text-sm font-bold text-[#d4af37]">{threshold.toFixed(2)}</span>
              </div>
              <input
                type="range" min="0.05" max="0.95" step="0.01" value={threshold}
                onChange={e => { setThreshold(parseFloat(e.target.value)); setThresholdChanges(p => p + 1); }}
                className="w-full accent-[#d4af37]"
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
              <h3 className="text-xs font-semibold text-[#d4af37] uppercase tracking-wide mb-2">Key Insight</h3>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                AUC is the probability that the model ranks a random positive sample higher than a random negative.
                It's threshold-independent — a single number for the entire curve.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-[#1e293b]">
          <Link href="/visual-guides/confusion-matrix" className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors">
            <span>←</span><span>Confusion Matrix</span>
          </Link>
          <Link href="/visual-guides" className="text-sm text-[#94a3b8] hover:text-white transition-colors">All Guides</Link>
          <Link href="/visual-guides/neural-network" className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors">
            <span>Neural Network</span><span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
