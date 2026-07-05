"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Scenario definitions ───────────────────────────────────────────────────────
interface Scenario {
  id: string;
  label: string;
  positive: string;  // "cancer", "spam", etc.
  negative: string;
  icon: string;
  defaultThreshold: number;
  desc: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: "medical",
    label: "Medical Diagnosis",
    positive: "Cancer",
    negative: "Healthy",
    icon: "🩺",
    defaultThreshold: 0.5,
    desc: "False negatives (missed cancer) are more dangerous than false positives (unnecessary tests).",
  },
  {
    id: "spam",
    label: "Spam Filter",
    positive: "Spam",
    negative: "Legit Email",
    icon: "📧",
    defaultThreshold: 0.7,
    desc: "False positives (blocking legit email) are worse than false negatives (letting spam through).",
  },
  {
    id: "fraud",
    label: "Fraud Detection",
    positive: "Fraud",
    negative: "Legit Transaction",
    icon: "💳",
    defaultThreshold: 0.3,
    desc: "Balance: false negatives lose money, false positives frustrate real customers.",
  },
];

// ── Simulate predictions ───────────────────────────────────────────────────────
function gaussRand() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

interface Sample { actual: 0 | 1; score: number }

function generateSamples(n: number, prevalence: number, auc = 0.85): Sample[] {
  // Positive class: scores from Normal(0.65, 0.18), Negative: Normal(0.35, 0.18)
  const samples: Sample[] = [];
  const nPos = Math.round(n * prevalence);
  for (let i = 0; i < nPos; i++) {
    const score = Math.min(1, Math.max(0, 0.65 + gaussRand() * 0.18));
    samples.push({ actual: 1, score });
  }
  for (let i = 0; i < n - nPos; i++) {
    const score = Math.min(1, Math.max(0, 0.35 + gaussRand() * 0.18));
    samples.push({ actual: 0, score });
  }
  return samples;
}

function computeMatrix(samples: Sample[], threshold: number) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const s of samples) {
    const predicted = s.score >= threshold ? 1 : 0;
    if (s.actual === 1 && predicted === 1) tp++;
    else if (s.actual === 0 && predicted === 1) fp++;
    else if (s.actual === 0 && predicted === 0) tn++;
    else fn++;
  }
  return { tp, fp, tn, fn };
}

function metrics(tp: number, fp: number, tn: number, fn: number) {
  const total = tp + fp + tn + fn;
  const accuracy = total > 0 ? (tp + tn) / total : 0;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;  // sensitivity / TPR
  const specificity = tn + fp > 0 ? tn / (tn + fp) : 0;
  const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
  const fpr = fp + tn > 0 ? fp / (fp + tn) : 0;
  return { accuracy, precision, recall, specificity, f1, fpr };
}

// ── Cell color ─────────────────────────────────────────────────────────────────
const CELL_CONFIG: Record<string, { label: string; abbr: string; color: string; textDesc: string }> = {
  tp: { label: "True Positive", abbr: "TP", color: "#3bb4a4", textDesc: "Correctly predicted positive" },
  fp: { label: "False Positive", abbr: "FP", color: "#f97316", textDesc: "Predicted positive, actually negative" },
  fn: { label: "False Negative", abbr: "FN", color: "#ef4444", textDesc: "Predicted negative, actually positive" },
  tn: { label: "True Negative", abbr: "TN", color: "#1e5d8a", textDesc: "Correctly predicted negative" },
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ConfusionMatrixClient() {
  const { data: session } = useSession();
  const { fadeIn, card } = useGuideMotion();
  const [scenarioId, setScenarioId] = useState("medical");
  const [threshold, setThreshold] = useState(0.5);
  const [prevalence, setPrevalence] = useState(0.2);
  const [samples] = useState<Sample[]>(() => generateSamples(200, 0.2));
  const [scenarioSamples, setScenarioSamples] = useState<Sample[]>(() => generateSamples(200, 0.2));
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [scenariosExplored, setScenariosExplored] = useState<Set<string>>(new Set(["medical"]));
  const [thresholdMoves, setThresholdMoves] = useState(0);
  const completionFired = useRef(false);

  const scenario = SCENARIOS.find(s => s.id === scenarioId)!;

  const { tp, fp, tn, fn } = useMemo(() => computeMatrix(scenarioSamples, threshold), [scenarioSamples, threshold]);
  const { accuracy, precision, recall, specificity, f1, fpr } = useMemo(() => metrics(tp, fp, tn, fn), [tp, fp, tn, fn]);

  function loadScenario(id: string) {
    const sc = SCENARIOS.find(s => s.id === id)!;
    setScenarioId(id);
    setThreshold(sc.defaultThreshold);
    setScenarioSamples(generateSamples(200, id === "medical" ? 0.2 : id === "spam" ? 0.4 : 0.1));
    setScenariosExplored(prev => new Set([...prev, id]));
  }

  // Completion: 3 scenarios explored AND 5+ threshold moves
  const isComplete = scenariosExplored.size >= 3 && thresholdMoves >= 5;

  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "confusion-matrix", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  const total = tp + fp + tn + fn;
  const cells = [
    { key: "tn", value: tn, row: 0, col: 0 },
    { key: "fp", value: fp, row: 0, col: 1 },
    { key: "fn", value: fn, row: 1, col: 0 },
    { key: "tp", value: tp, row: 1, col: 1 },
  ];

  function handleReset() {
    setScenarioId("medical");
    setThreshold(0.5);
    setScenarioSamples(generateSamples(200, 0.2));
    setScenariosExplored(new Set(["medical"]));
    setThresholdMoves(0);
    setHoveredCell(null);
  }

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="confusion-matrix" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">Visual Guides</Link>
          <span>/</span>
          <span className="text-[#94a3b8]">The Confusion Matrix Decoded</span>
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
            The Confusion Matrix{" "}
            <span className="text-[var(--color-accent)]">Decoded</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
            Accuracy alone doesn't tell the whole story. Explore how the confusion matrix reveals
            what kinds of mistakes your classifier makes, and why that matters differently in each domain.
          </p>
        </section>

        {/* Progress */}
        <div className="mb-8 bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#94a3b8]">Exploration Progress</span>
            <span className="text-sm font-semibold text-white">
              {scenariosExplored.size}/3 scenarios · {Math.min(thresholdMoves, 5)}/5 threshold changes
            </span>
          </div>
          <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#1e5d8a] to-[#3bb4a4] rounded-full"
              animate={{ width: `${scenariosExplored.size / 3 * 50 + Math.min(thresholdMoves, 5) / 5 * 50}%` }}
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

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          {/* Main: matrix + metrics */}
          <div className="flex flex-col gap-5">
            {/* Scenario context */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{scenario.icon}</span>
                <span className="text-sm font-semibold text-white">{scenario.label}</span>
              </div>
              <p className="text-xs text-[#94a3b8]">{scenario.desc}</p>
            </div>

            {/* Confusion matrix */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Confusion Matrix at threshold = {threshold.toFixed(2)}</h3>

              {/* Column labels */}
              <div className="grid grid-cols-[80px_1fr_1fr] gap-2 mb-2">
                <div />
                <div className="text-center text-xs text-[#94a3b8] font-semibold">Predicted: {scenario.negative}</div>
                <div className="text-center text-xs text-[#94a3b8] font-semibold">Predicted: {scenario.positive}</div>
              </div>

              {[[0, 1]].map(rowGroup => (
                [0, 1].map(rowIdx => (
                  <div key={rowIdx} className="grid grid-cols-[80px_1fr_1fr] gap-2 mb-2">
                    <div className="flex items-center text-xs text-[#94a3b8] font-semibold">
                      Actual: {rowIdx === 0 ? scenario.negative : scenario.positive}
                    </div>
                    {[0, 1].map(colIdx => {
                      const cell = cells.find(c => c.row === rowIdx && c.col === colIdx)!;
                      const cfg = CELL_CONFIG[cell.key];
                      const pct = total > 0 ? (cell.value / total * 100) : 0;
                      const isHovered = hoveredCell === cell.key;
                      return (
                        <motion.div
                          key={colIdx}
                          onMouseEnter={() => setHoveredCell(cell.key)}
                          onMouseLeave={() => setHoveredCell(null)}
                          className="rounded-xl p-4 cursor-pointer flex flex-col items-center justify-center min-h-[100px] border transition-all"
                          style={{
                            backgroundColor: `${cfg.color}${isHovered ? "25" : "15"}`,
                            borderColor: `${cfg.color}${isHovered ? "80" : "30"}`,
                          }}
                          whileHover={{ scale: 1.03 }}
                        >
                          <motion.div
                            className="text-3xl font-bold mb-1"
                            style={{ color: cfg.color }}
                            key={cell.value}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            {cell.value}
                          </motion.div>
                          <div className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.abbr}</div>
                          <div className="text-[10px] text-[#94a3b8] mt-0.5">{pct.toFixed(1)}%</div>
                        </motion.div>
                      );
                    })}
                  </div>
                ))
              ))}

              {/* Hovered cell description */}
              <AnimatePresence>
                {hoveredCell && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="mt-3 p-3 bg-[#0f172a]/60 rounded-lg text-xs"
                  >
                    <span className="font-semibold" style={{ color: CELL_CONFIG[hoveredCell].color }}>
                      {CELL_CONFIG[hoveredCell].label}
                    </span>
                    {" "}<span className="text-[#94a3b8]">: {CELL_CONFIG[hoveredCell].textDesc}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Accuracy", value: accuracy, desc: "(TP+TN)/Total", color: "#3bb4a4" },
                { label: "Precision", value: precision, desc: "TP/(TP+FP)", color: "var(--color-accent)" },
                { label: "Recall (TPR)", value: recall, desc: "TP/(TP+FN)", color: "#ef4444" },
                { label: "Specificity", value: specificity, desc: "TN/(TN+FP)", color: "#1e5d8a" },
                { label: "F1 Score", value: f1, desc: "2·P·R/(P+R)", color: "#a855f7" },
                { label: "FPR", value: fpr, desc: "FP/(FP+TN)", color: "#f97316" },
              ].map(({ label, value, desc, color }) => (
                <div key={label} className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-3">
                  <div className="text-[10px] text-[#94a3b8] uppercase tracking-wide mb-1">{label}</div>
                  <motion.div
                    className="text-2xl font-bold mb-0.5"
                    style={{ color }}
                    key={value.toFixed(3)}
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 1 }}
                  >
                    {(value * 100).toFixed(1)}%
                  </motion.div>
                  <div className="text-[10px] text-[#94a3b8] font-mono">{desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-4">
            {/* Scenario selector */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Scenario</h3>
              <div className="flex flex-col gap-2" role="radiogroup" aria-label="Classification scenario">
                {SCENARIOS.map(sc => (
                  <button key={sc.id} onClick={() => loadScenario(sc.id)}
                    role="radio"
                    aria-checked={scenarioId === sc.id}
                    className={`px-3 py-2 rounded-lg text-xs font-medium text-left border transition-all flex items-center gap-2 ${scenarioId === sc.id ? "bg-[#1e5d8a]/20 border-[#1e5d8a]/60 text-white" : "border-[#334155] text-[#94a3b8] hover:border-[#475569]"}`}
                  >
                    <span>{sc.icon}</span>{sc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Threshold slider */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-white">Classification Threshold</h3>
                <span className="text-sm font-bold text-[var(--color-accent)]">{threshold.toFixed(2)}</span>
              </div>
              <p className="text-xs text-[#94a3b8] mb-3">
                Samples with score ≥ threshold are predicted positive.
                Lower threshold → more positives predicted.
              </p>
              <input
                type="range" min="0.05" max="0.95" step="0.01" value={threshold}
                aria-label="Classification threshold"
                onChange={e => { setThreshold(parseFloat(e.target.value)); setThresholdMoves(p => p + 1); }}
                className="w-full accent-[var(--color-accent)]"
              />
              <div className="flex justify-between text-[10px] text-[#94a3b8] mt-1">
                <span>0.05 (predict +)</span><span>0.95 (predict −)</span>
              </div>
              <div className="flex gap-2 mt-3">
                {[0.3, 0.5, 0.7].map(t => (
                  <button key={t} onClick={() => { setThreshold(t); setThresholdMoves(p => p + 1); }}
                    aria-pressed={Math.abs(threshold - t) < 0.02}
                    className={`flex-1 px-2 py-1 rounded text-xs border transition-all ${Math.abs(threshold - t) < 0.02 ? "bg-[#d4af37]/20 border-[#d4af37]/60 text-[var(--color-accent)]" : "border-[#334155] text-[#94a3b8]"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Tradeoff diagram */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Threshold Tradeoff</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-16 text-[#94a3b8] flex-shrink-0">↓ threshold</div>
                  <div className="flex-1">
                    <div className="text-[#3bb4a4]">↑ Recall (catch more positives)</div>
                    <div className="text-[#f97316]">↑ FP rate (more false alarms)</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 text-[#94a3b8] flex-shrink-0">↑ threshold</div>
                  <div className="flex-1">
                    <div className="text-[var(--color-accent)]">↑ Precision (fewer false alarms)</div>
                    <div className="text-[#ef4444]">↓ Recall (miss more positives)</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#1e293b]/60 border border-[#d4af37]/20 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-2">Key Insight</h3>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                In <span className="text-white">medical screening</span>, a missed cancer (FN) can be fatal,
                so you lower the threshold to maximize recall, accepting more false alarms.
                In <span className="text-white">spam filtering</span>, you'd rather let spam through than block a job offer.
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
                  Confusion Matrix Decoded!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You explored all three scenarios and saw how the threshold trades one error type
                  for the other.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Scenarios explored</p>
                    <p className="text-[14px] font-mono font-bold text-[#3bb4a4]">
                      {scenariosExplored.size} / {SCENARIOS.length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Threshold changes</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {thresholdMoves}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Current F1 score</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {(f1 * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Accuracy hides which mistakes you make. The confusion matrix shows them,
                    and the right threshold depends on which error costs more in your domain.&quot;
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
                    href="/visual-guides/roc-curves"
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
              href="/visual-guides/roc-curves"
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
