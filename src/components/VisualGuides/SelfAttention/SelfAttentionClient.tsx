"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Data ───────────────────────────────────────────────────────────────────────
type Sentence = { label: string; tokens: string[]; matrix: number[][] };

const SENTENCES: Sentence[] = [
  {
    label: "The cat sat on the mat",
    tokens: ["The", "cat", "sat", "on", "the", "mat"],
    matrix: [
      [0.50, 0.10, 0.10, 0.10, 0.10, 0.10],
      [0.10, 0.40, 0.30, 0.10, 0.00, 0.10],
      [0.10, 0.30, 0.30, 0.10, 0.10, 0.10],
      [0.20, 0.10, 0.10, 0.40, 0.10, 0.10],
      [0.50, 0.10, 0.00, 0.10, 0.20, 0.10],
      [0.10, 0.10, 0.20, 0.10, 0.10, 0.40],
    ],
  },
  {
    label: "She gave him the book",
    tokens: ["She", "gave", "him", "the", "book"],
    matrix: [
      [0.30, 0.40, 0.10, 0.10, 0.10],
      [0.10, 0.15, 0.35, 0.10, 0.30],
      [0.15, 0.35, 0.25, 0.10, 0.15],
      [0.35, 0.10, 0.10, 0.30, 0.15],
      [0.10, 0.30, 0.15, 0.15, 0.30],
    ],
  },
  {
    label: "The bank near the river",
    tokens: ["The", "bank", "near", "the", "river"],
    matrix: [
      [0.40, 0.20, 0.10, 0.20, 0.10],
      [0.10, 0.10, 0.25, 0.10, 0.45],
      [0.10, 0.30, 0.20, 0.15, 0.25],
      [0.35, 0.15, 0.10, 0.25, 0.15],
      [0.10, 0.40, 0.20, 0.10, 0.20],
    ],
  },
];

// Multi-head mini matrices for the 3rd sentence (static illustration)
const HEAD_MATRICES = [
  // Head 1 — syntactic
  [
    [0.5, 0.1, 0.2, 0.1, 0.1],
    [0.1, 0.4, 0.3, 0.1, 0.1],
    [0.1, 0.2, 0.5, 0.1, 0.1],
    [0.2, 0.1, 0.1, 0.4, 0.2],
    [0.1, 0.1, 0.2, 0.1, 0.5],
  ],
  // Head 2 — semantic (bank→river)
  [
    [0.3, 0.2, 0.1, 0.2, 0.2],
    [0.1, 0.1, 0.2, 0.1, 0.5],
    [0.1, 0.3, 0.2, 0.2, 0.2],
    [0.3, 0.1, 0.1, 0.3, 0.2],
    [0.1, 0.5, 0.1, 0.1, 0.2],
  ],
  // Head 3 — positional (near-neighbour)
  [
    [0.4, 0.3, 0.1, 0.1, 0.1],
    [0.3, 0.3, 0.3, 0.1, 0.0],
    [0.1, 0.2, 0.4, 0.2, 0.1],
    [0.1, 0.1, 0.3, 0.3, 0.2],
    [0.1, 0.0, 0.2, 0.3, 0.4],
  ],
];

// ── Color helpers ──────────────────────────────────────────────────────────────
function lerpHex(t: number): string {
  // 0 → #0f172a (background), 1 → #3bb4a4 (secondary)
  const r = Math.round(15 + t * (59 - 15));
  const g = Math.round(23 + t * (180 - 23));
  const b = Math.round(42 + t * (164 - 42));
  return `rgb(${r},${g},${b})`;
}

function textColorForWeight(w: number): string {
  return w > 0.3 ? "#f1f5f9" : "#94a3b8";
}

// ── QKV step data ──────────────────────────────────────────────────────────────
const QKV_STEPS = [
  {
    id: "Q",
    label: "Query (Q)",
    color: "#1e5d8a",
    borderColor: "#3b82f6",
    textColor: "#93c5fd",
    question: "What am I looking for?",
    formula: "Q = X · W_Q",
    desc: 'Each token projects itself into "query space", essentially asking: what context do I need to understand myself?',
  },
  {
    id: "K",
    label: "Key (K)",
    color: "#7c5a0a",
    borderColor: "#d4af37",
    textColor: "#fcd34d",
    question: "What do I contain?",
    formula: "K = X · W_K",
    desc: "Each token also projects into \"key space\", announcing what information it holds, ready to be matched against queries.",
  },
  {
    id: "V",
    label: "Value (V)",
    color: "#0f4a44",
    borderColor: "#3bb4a4",
    textColor: "#6ee7e7",
    question: "What information do I pass on?",
    formula: "score(q,k) = (Q · K^T) / √d_k  →  softmax  →  weighted sum of V",
    desc: "After computing attention weights via Q·K dot-products scaled by √d_k, the output is a weighted sum of Value vectors: the actual content transferred.",
  },
];

// ── Main Component ─────────────────────────────────────────────────────────────
export default function SelfAttentionClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const [selectedSentence, setSelectedSentence] = useState(0);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [activeQKV, setActiveQKV] = useState<number>(0);
  const [visitedSentences, setVisitedSentences] = useState<Set<number>>(new Set([0]));
  const [visitedQKV, setVisitedQKV] = useState<Set<number>>(new Set([0]));
  const completionFired = useRef(false);

  const sentence = SENTENCES[selectedSentence];

  function selectSentence(idx: number) {
    setSelectedSentence(idx);
    setSelectedRow(null);
    setVisitedSentences(prev => new Set([...prev, idx]));
  }

  function selectQKV(idx: number) {
    setActiveQKV(idx);
    setVisitedQKV(prev => new Set([...prev, idx]));
  }

  function handleReset() {
    setSelectedSentence(0);
    setHoveredCell(null);
    setSelectedRow(null);
    setActiveQKV(0);
    setVisitedSentences(new Set([0]));
    setVisitedQKV(new Set([0]));
  }

  const isComplete = visitedSentences.size >= 3 && visitedQKV.size >= 3;
  const progressPct = Math.round((visitedSentences.size / 3) * 50 + (visitedQKV.size / 3) * 50);

  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "self-attention", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  // Cell color: highlight selected row, else normal weight
  function cellBg(row: number, col: number, w: number): string {
    if (selectedRow !== null && row === selectedRow) {
      return lerpHex(w * 1.2 > 1 ? 1 : w * 1.2);
    }
    if (hoveredCell?.row === row && hoveredCell?.col === col) {
      return "var(--color-accent)";
    }
    return lerpHex(w);
  }

  function cellOpacity(row: number): number {
    if (selectedRow === null) return 1;
    return row === selectedRow ? 1 : 0.4;
  }

  const step = QKV_STEPS[activeQKV];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="self-attention" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">Self-Attention: How Transformers Focus</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              LLMs
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Self-Attention: How Transformers <span className="text-[var(--color-accent)]">Focus</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
            Select a sentence and watch the attention heatmap light up. Step through Query, Key, and
            Value vectors to see how transformers resolve word ambiguity through context.
          </p>
        </section>

        {/* Progress bar */}
        <div className="mb-8 bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#94a3b8]">Exploration Progress</span>
            <span className="text-sm font-semibold text-white">
              {visitedSentences.size}/3 sentences · {visitedQKV.size}/3 QKV steps
            </span>
          </div>
          <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#ef4444] to-[#3bb4a4] rounded-full"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          {isComplete && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-xs text-[var(--color-success)] font-semibold">
              Guide complete! Progress saved.
            </motion.div>
          )}
          {!session?.user && (
            <p className="mt-2 text-[11px] text-[#475569]">Sign in to save progress</p>
          )}
        </div>

        {/* Section 1: Choose a sentence */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">1. Choose a Sentence</h2>
          <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Example sentence">
            {SENTENCES.map((s, i) => (
              <button
                key={i}
                role="radio"
                aria-checked={selectedSentence === i}
                onClick={() => selectSentence(i)}
                className="px-4 py-2 rounded-lg text-sm font-medium border transition-all"
                style={{
                  borderColor: selectedSentence === i ? "#ef4444" : "#334155",
                  backgroundColor: selectedSentence === i ? "rgba(239,68,68,0.12)" : "rgba(30,41,59,0.6)",
                  color: selectedSentence === i ? "#f1f5f9" : "#94a3b8",
                  boxShadow: selectedSentence === i ? "0 0 0 1px #ef4444" : "none",
                }}
              >
                &ldquo;{s.label}&rdquo;
              </button>
            ))}
          </div>
        </section>

        {/* Section 2: Attention Heatmap */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-1">2. Attention Heatmap</h2>
          <p className="text-xs text-[#94a3b8] mb-4">
            Click a row to highlight that token&apos;s attention pattern. Tap or hover a cell to inspect the weight.
          </p>
          <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl p-5 overflow-x-auto">

            {/* Tooltip */}
            <div className="h-6 mb-3">
              {hoveredCell && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-[var(--color-accent)] font-mono"
                >
                  &ldquo;{sentence.tokens[hoveredCell.row]}&rdquo; attends to &ldquo;{sentence.tokens[hoveredCell.col]}&rdquo; with weight{" "}
                  {(sentence.matrix[hoveredCell.row][hoveredCell.col] * 100).toFixed(0)}%
                </motion.p>
              )}
            </div>

            <div className="inline-block min-w-max">
              {/* Column headers (from tokens) */}
              <div className="flex mb-1 ml-14">
                {sentence.tokens.map((t, ci) => (
                  <div key={ci} className="w-12 text-center text-[10px] text-[#94a3b8] font-semibold truncate">
                    {t}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {sentence.matrix.map((row, ri) => (
                <div
                  key={ri}
                  className="flex items-center mb-0.5 cursor-pointer rounded"
                  style={{ opacity: cellOpacity(ri) }}
                  onClick={() => setSelectedRow(selectedRow === ri ? null : ri)}
                >
                  {/* Row label */}
                  <div className="w-14 text-right pr-2 text-[10px] text-[#94a3b8] font-semibold shrink-0">
                    {sentence.tokens[ri]}
                  </div>
                  {/* Cells */}
                  {row.map((w, ci) => (
                    <motion.div
                      key={ci}
                      className="w-12 h-10 flex items-center justify-center text-[10px] font-mono rounded mx-0.5 cursor-pointer transition-all"
                      style={{
                        backgroundColor: cellBg(ri, ci, w),
                        color: hoveredCell?.row === ri && hoveredCell?.col === ci ? "#0f172a" : textColorForWeight(w),
                      }}
                      onMouseEnter={() => setHoveredCell({ row: ri, col: ci })}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => setHoveredCell({ row: ri, col: ci })}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {(w * 100).toFixed(0)}%
                    </motion.div>
                  ))}
                </div>
              ))}

              {/* X-axis label */}
              <div className="flex ml-14 mt-2">
                <span className="text-[10px] text-[#475569]">← attended-to tokens (Keys)</span>
              </div>
            </div>

            <p className="text-[10px] text-[#475569] mt-3">
              Y-axis: attending token (Query) · X-axis: attended-to token (Key) · Color intensity = attention weight
            </p>
          </div>
        </section>

        {/* Section 3: Q, K, V Explained */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">3. Q, K, V Explained</h2>
          <div className="flex gap-3 mb-5 flex-wrap" role="radiogroup" aria-label="Attention component">
            {QKV_STEPS.map((s, i) => (
              <button
                key={s.id}
                role="radio"
                aria-checked={activeQKV === i}
                onClick={() => selectQKV(i)}
                className="px-5 py-2 rounded-lg text-sm font-bold border transition-all"
                style={{
                  borderColor: activeQKV === i ? s.borderColor : "#334155",
                  backgroundColor: activeQKV === i ? `${s.color}60` : "rgba(30,41,59,0.6)",
                  color: activeQKV === i ? s.textColor : "#94a3b8",
                  boxShadow: activeQKV === i ? `0 0 0 1px ${s.borderColor}` : "none",
                }}
              >
                [{s.id}]
              </button>
            ))}
          </div>

          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-[#1e293b]/60 border rounded-2xl p-6"
            style={{ borderColor: step.borderColor + "55" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span
                className="text-2xl font-black font-mono"
                style={{ color: step.textColor }}
              >
                {step.id}
              </span>
              <div>
                <p className="text-white font-semibold text-sm">{step.label}</p>
                <p className="text-[#94a3b8] text-xs">{step.question}</p>
              </div>
            </div>
            <div
              className="inline-block px-4 py-2 rounded-lg font-mono text-sm mb-4"
              style={{ backgroundColor: "rgba(30,41,59,0.6)", border: `1px solid ${step.borderColor}44`, color: "#93c5fd" }}
            >
              {step.formula}
            </div>
            <p className="text-[#94a3b8] text-sm leading-relaxed">{step.desc}</p>
          </motion.div>

          {/* Score formula reminder */}
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <div className="bg-[#1e293b]/60 border border-[#334155] rounded-lg px-4 py-2 font-mono text-xs text-[#93c5fd]">
              Attention(Q, K, V) = softmax(QK&#7488; / &radic;d&#8342;) &middot; V
            </div>
            <p className="text-xs text-[#94a3b8]">
              Scaling by &radic;d&#8342; prevents vanishing gradients in high dimensions.
            </p>
          </div>
        </section>

        {/* Section 4: Multi-Head Attention */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-2">4. Multi-Head Attention</h2>
          <p className="text-xs text-[#94a3b8] mb-4">
            Multiple heads run in parallel, each learning different relationship types simultaneously.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {HEAD_MATRICES.map((mat, hi) => {
              const headLabels = ["Head 1: Syntactic", "Head 2: Semantic", "Head 3: Positional"];
              const headColors = ["#3b82f6", "var(--color-accent)", "#3bb4a4"];
              const toks = SENTENCES[2].tokens;
              return (
                <div key={hi} className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-3">
                  <p className="text-[11px] font-semibold mb-2" style={{ color: headColors[hi] }}>
                    {headLabels[hi]}
                  </p>
                  <div className="inline-block">
                    {/* Mini col headers */}
                    <div className="flex mb-0.5 ml-8">
                      {toks.map((t, ci) => (
                        <div key={ci} className="w-7 text-center text-[8px] text-[#475569] truncate">{t}</div>
                      ))}
                    </div>
                    {mat.map((row, ri) => (
                      <div key={ri} className="flex items-center mb-0.5">
                        <div className="w-8 text-right pr-1 text-[8px] text-[#475569] shrink-0">{toks[ri]}</div>
                        {row.map((w, ci) => (
                          <div
                            key={ci}
                            className="w-7 h-5 flex items-center justify-center text-[8px] font-mono rounded mx-px"
                            style={{
                              backgroundColor: lerpHex(w),
                              color: w > 0.3 ? "#f1f5f9" : "#475569",
                            }}
                          >
                            {(w * 100).toFixed(0)}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-[#94a3b8] mt-3 italic">
            Multiple heads capture different relationships simultaneously.
          </p>
        </section>

        {/* Gold insight box */}
        <div className="mb-8 bg-[#0f172a] border border-[#d4af37]/30 rounded-xl p-5">
          <h3 className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-2">Key Insight</h3>
          <p className="text-sm text-[#94a3b8] leading-relaxed">
            The attention mechanism runs in{" "}
            <span className="text-white font-semibold">O(n²) time</span>: processing a 10K token
            sequence requires 100M attention computations. This is why context window scaling is
            challenging.
          </p>
        </div>

        {/* Completion card */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              variants={card}
              initial="hidden"
              animate="visible"
              exit="hidden"
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
                  Attention Understood!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You explored all three sentences and all three attention components.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Heatmaps</p>
                    <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                      Attention weights show which tokens each word looks at for context.
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Q, K, V</p>
                    <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                      Queries ask, Keys advertise, and Values carry the content that flows.
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Multi-Head</p>
                    <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                      Parallel heads capture syntactic, semantic, and positional patterns.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Self-attention lets every token weigh every other token: the word
                    bank decides between money and river by looking at its neighbours,
                    and multiple heads do this for different relationships at once.&quot;
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
                    href="/visual-guides/transformer-architecture"
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
              href="/visual-guides/transformer-architecture"
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
            >
              Transformer Architecture →
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
