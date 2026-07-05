"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Types ──────────────────────────────────────────────────────────────────

type Strategy = "fixed" | "recursive" | "document";

interface Chunk {
  text: string;
  isOverlap?: boolean;
  label?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const SAMPLE_TEXT = `The transformer architecture revolutionized natural language processing. Before transformers, recurrent neural networks struggled with long-range dependencies. The attention mechanism allows each token to directly attend to all other tokens.

This breakthrough enabled models like BERT and GPT to achieve state-of-the-art results. BERT uses bidirectional attention for understanding tasks. GPT uses autoregressive generation for creative and generative tasks.

Transfer learning became standard practice. Pre-training on large corpora, then fine-tuning on specific tasks, dramatically reduced the data requirements.`;

const CHUNK_COLORS = [
  { bg: "#1e5d8a22", border: "#1e5d8a66", text: "#60a5fa" },
  { bg: "#3bb4a422", border: "#3bb4a466", text: "#3bb4a4" },
  { bg: "#d4af3722", border: "#d4af3766", text: "#d4af37" },
  { bg: "#a855f722", border: "#a855f766", text: "#c084fc" },
  { bg: "#ec489922", border: "#ec489966", text: "#f472b6" },
];

const STRATEGIES: { id: Strategy; label: string; description: string }[] = [
  {
    id: "fixed",
    label: "Fixed-Size",
    description: "Split every N characters with optional overlap",
  },
  {
    id: "recursive",
    label: "Recursive",
    description: "Split on paragraph, then sentence boundaries, until each chunk fits a size budget",
  },
  {
    id: "document",
    label: "Document-Structure",
    description: "Respect headers, paragraphs, code blocks",
  },
];

const USE_CASES = [
  {
    useCase: "Customer support docs",
    strategy: "Recursive",
    reason: "Keeps paragraphs and sentences intact without requiring document markup",
    color: "#3bb4a4",
  },
  {
    useCase: "Legal contracts",
    strategy: "Document-Structure",
    reason: "Clauses and numbered sections are the meaningful retrieval units; splitting mid-clause destroys meaning",
    color: "#1e5d8a",
  },
  {
    useCase: "Chat logs / transcripts",
    strategy: "Fixed-Size",
    reason: "Little inherent structure, so uniform windows with overlap are a reasonable default",
    color: "#d4af37",
  },
  {
    useCase: "Code documentation",
    strategy: "Document-Structure",
    reason: "Respects functions, classes, and section hierarchy",
    color: "#ec4899",
  },
];

// ── Chunking functions ─────────────────────────────────────────────────────

function fixedChunk(text: string, size: number, overlap: number): Chunk[] {
  const chunks: Chunk[] = [];
  let start = 0;
  const step = Math.max(1, size - overlap);
  while (start < text.length) {
    chunks.push({ text: text.slice(start, start + size) });
    start += step;
    if (start >= text.length) break;
  }
  return chunks;
}

// Recursive character splitting, faithful to the real algorithm: try the
// coarsest separator first (paragraphs); any piece over the size budget is
// split at the next separator level (sentences) and greedily re-packed so
// every chunk fits the budget.
const RECURSIVE_MAX_CHARS = 220;

function recursiveChunk(text: string, maxLen: number = RECURSIVE_MAX_CHARS): Chunk[] {
  const chunks: Chunk[] = [];
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  for (const para of paragraphs) {
    const p = para.trim();
    if (p.length <= maxLen) {
      chunks.push({ text: p });
      continue;
    }
    const sentences = p.split(/(?<=[.!?])\s+/).filter(Boolean);
    let buffer = "";
    for (const s of sentences) {
      if (buffer && buffer.length + 1 + s.length > maxLen) {
        chunks.push({ text: buffer });
        buffer = s;
      } else {
        buffer = buffer ? `${buffer} ${s}` : s;
      }
    }
    if (buffer) chunks.push({ text: buffer });
  }
  return chunks;
}

function documentChunk(text: string): Chunk[] {
  const lines = text.split("\n");
  const sections: { label: string; content: string[] }[] = [];
  let current: { label: string; content: string[] } = {
    label: "Introduction",
    content: [],
  };

  for (const line of lines) {
    if (/^##\s/.test(line)) {
      if (current.content.length > 0) sections.push(current);
      current = { label: line.replace(/^##\s/, ""), content: [] };
    } else if (line.trim()) {
      current.content.push(line);
    }
  }
  if (current.content.length > 0) sections.push(current);

  if (sections.length === 0) {
    const paragraphs = text.split(/\n\n+/).filter(Boolean);
    return paragraphs.map((p, i) => ({
      text: p.trim(),
      label: `Section ${i + 1}`,
    }));
  }

  return sections.map((s) => ({
    text: s.content.join(" ").trim(),
    label: s.label,
  }));
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

// ── SVG Trade-off Chart ────────────────────────────────────────────────────

function TradeoffChart() {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 400);
    return () => clearTimeout(t);
  }, []);

  const W = 480;
  const H = 200;
  const PAD = { top: 20, right: 20, bottom: 36, left: 44 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  // precision: high→low as chunk size grows
  const precisionPoints = Array.from({ length: 50 }, (_, i) => {
    const x = i / 49;
    const y = 1 - Math.pow(x, 0.7) * 0.85;
    return { x: PAD.left + x * iW, y: PAD.top + (1 - y) * iH };
  });

  // coherence: low→high as chunk size grows
  const coherencePoints = Array.from({ length: 50 }, (_, i) => {
    const x = i / 49;
    const y = Math.pow(x, 0.6) * 0.9;
    return { x: PAD.left + x * iW, y: PAD.top + (1 - y) * iH };
  });

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  // Optimal zone: ~35-60% of x range
  const zoneX1 = PAD.left + iW * 0.3;
  const zoneX2 = PAD.left + iW * 0.62;

  const xLabels = ["Small", "256", "512", "1024", "Large"];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full max-w-[480px]"
      style={{ overflow: "visible" }}
    >
      {/* Optimal zone */}
      <rect
        x={zoneX1}
        y={PAD.top}
        width={zoneX2 - zoneX1}
        height={iH}
        fill="#d4af3710"
        stroke="#d4af3740"
        strokeWidth={1}
        rx={4}
      />
      <text
        x={(zoneX1 + zoneX2) / 2}
        y={PAD.top - 6}
        textAnchor="middle"
        fill="#d4af37"
        fontSize={10}
      >
        Optimal Zone
      </text>

      {/* Y axis */}
      <line
        x1={PAD.left}
        y1={PAD.top}
        x2={PAD.left}
        y2={PAD.top + iH}
        stroke="#334155"
        strokeWidth={1}
      />
      {/* X axis */}
      <line
        x1={PAD.left}
        y1={PAD.top + iH}
        x2={PAD.left + iW}
        y2={PAD.top + iH}
        stroke="#334155"
        strokeWidth={1}
      />

      {/* Y labels */}
      <text x={PAD.left - 6} y={PAD.top + 4} textAnchor="end" fill="#94a3b8" fontSize={9}>100%</text>
      <text x={PAD.left - 6} y={PAD.top + iH / 2 + 4} textAnchor="end" fill="#94a3b8" fontSize={9}>50%</text>
      <text x={PAD.left - 6} y={PAD.top + iH + 4} textAnchor="end" fill="#94a3b8" fontSize={9}>0%</text>

      {/* X labels */}
      {xLabels.map((lbl, i) => (
        <text
          key={lbl}
          x={PAD.left + (i / (xLabels.length - 1)) * iW}
          y={PAD.top + iH + 16}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={9}
        >
          {lbl}
        </text>
      ))}

      {/* Precision curve */}
      <motion.path
        d={toPath(precisionPoints)}
        fill="none"
        stroke="#3bb4a4"
        strokeWidth={2.5}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={animated ? { pathLength: 1, opacity: 1 } : {}}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />

      {/* Coherence curve */}
      <motion.path
        d={toPath(coherencePoints)}
        fill="none"
        stroke="#ec4899"
        strokeWidth={2.5}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={animated ? { pathLength: 1, opacity: 1 } : {}}
        transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
      />

      {/* Legend */}
      <circle cx={PAD.left + 8} cy={PAD.top + iH + 30} r={4} fill="#3bb4a4" />
      <text x={PAD.left + 16} y={PAD.top + iH + 34} fill="#94a3b8" fontSize={10}>Retrieval precision</text>
      <circle cx={PAD.left + 130} cy={PAD.top + iH + 30} r={4} fill="#ec4899" />
      <text x={PAD.left + 138} y={PAD.top + iH + 34} fill="#94a3b8" fontSize={10}>Context coherence</text>
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function ChunkingStrategiesClient() {
  const { data: session } = useSession();

  const [strategy, setStrategy] = useState<Strategy>("fixed");
  const [chunkSize, setChunkSize] = useState(120);
  const [overlapSize, setOverlapSize] = useState(20);
  const [overlapPct, setOverlapPct] = useState(15);

  const [isComplete, setIsComplete] = useState(false);
  
  const triedStrategies = useRef<Set<Strategy>>(new Set(["fixed"]));
  const movedSlider = useRef(false);
  const completionFired = useRef(false);

  const chunks: Chunk[] = (() => {
    if (strategy === "fixed") return fixedChunk(SAMPLE_TEXT, chunkSize, overlapSize);
    if (strategy === "recursive") return recursiveChunk(SAMPLE_TEXT);
    return documentChunk(SAMPLE_TEXT);
  })();

  const avgTokens =
    chunks.length > 0
      ? Math.round(chunks.reduce((s, c) => s + estimateTokens(c.text), 0) / chunks.length)
      : 0;

  const overlapDiagram = useCallback(() => {
    const step = Math.round(100 * (1 - overlapPct / 100));
    const overlap = 100 - step;
    const items = [
      { start: 1, end: 100 },
      { start: step + 1, end: step + 100 },
      { start: step * 2 + 1, end: step * 2 + 100 },
    ];
    return { items, overlap };
  }, [overlapPct]);

  const handleStrategyChange = (s: Strategy) => {
    setStrategy(s);
    triedStrategies.current.add(s);
    maybeComplete();
  };

  const handleSlider = (setter: (v: number) => void, val: number) => {
    setter(val);
    movedSlider.current = true;
    maybeComplete();
  };

  function maybeComplete() {
    if (completionFired.current) return;
    if (triedStrategies.current.size >= 3 && movedSlider.current) {
      completionFired.current = true;
      setIsComplete(true);
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "chunking-strategies", score: 100 }),
        }).catch(() => {});
      }
    }
  }

  useEffect(() => {
    if (triedStrategies.current.size >= 3 && movedSlider.current) {
      maybeComplete();
    }
  }, [session?.user]); // eslint-disable-line react-hooks/exhaustive-deps

  const progress = Math.min(
    100,
    Math.round(
      (triedStrategies.current.size / 3) * 70 + (movedSlider.current ? 30 : 0)
    )
  );

  const { items: overlapItems, overlap } = overlapDiagram();

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="chunking-strategies" score={100} />
      <div className="max-w-[860px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
            style={{ background: "#ec489922", color: "#ec4899" }}
          >
            Applied AI
          </span>
          <span className="text-white/20">/</span>
          <span className="text-white">Chunking Strategies for RAG</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#ec4899]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#ec4899]">
              Applied AI
            </span>
            <span className="w-6 h-px bg-[#ec4899]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Chunking Strategies{" "}
            <span className="text-[var(--color-accent)]">for RAG</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
            Before retrieval can work, documents must be split into chunks. See how
            fixed-size, recursive, and document-structure chunking behave on the same
            text — and how overlap affects retrieval quality.
          </p>
        </section>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="relative h-1.5 rounded-full bg-[#1e293b] overflow-hidden">
            <motion.div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #1e5d8a, #3bb4a4, #d4af37)" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[12px] text-[#94a3b8]">
              {triedStrategies.current.size} / 3 strategies tried
              {movedSlider.current ? " · slider adjusted" : ""}
            </p>
            {!session?.user && (
              <p className="text-[11px] text-[#475569]">Sign in to save progress</p>
            )}
          </div>
        </div>

        {/* ── Section 1: Choose a Strategy ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-1">Choose a Strategy</h2>
          <p className="text-[13px] text-[#94a3b8] mb-4">
            Select a chunking method to see it applied live to the sample text below.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {STRATEGIES.map((s) => {
              const active = strategy === s.id;
              return (
                <motion.button
                  key={s.id}
                  onClick={() => handleStrategyChange(s.id)}
                  whileTap={{ scale: 0.97 }}
                  className="relative rounded-2xl p-4 text-left transition-all border"
                  style={{
                    background: active ? "#ec489915" : "#1e293b",
                    borderColor: active ? "#ec4899" : "#ffffff1a",
                  }}
                >
                  {active && (
                    <motion.div
                      layoutId="strategy-highlight"
                      className="absolute inset-0 rounded-2xl"
                      style={{ background: "#ec489910", border: "1px solid #ec4899" }}
                      transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
                    />
                  )}
                  <p
                    className="text-[13px] font-bold mb-1 relative"
                    style={{ color: active ? "#ec4899" : "#e2e8f0" }}
                  >
                    {s.label}
                  </p>
                  <p className="text-[11px] text-[#94a3b8] relative">{s.description}</p>
                </motion.button>
              );
            })}
          </div>

          {/* Strategy pros/cons */}
          <AnimatePresence mode="wait">
            <motion.div
              key={strategy}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-white/10 bg-[#1e293b] p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-[12px]"
            >
              {strategy === "fixed" && (
                <>
                  <div>
                    <p className="text-[#3bb4a4] font-semibold mb-1">Pros</p>
                    <p className="text-[#94a3b8]">Simple, predictable chunk sizes — easy to implement at scale</p>
                  </div>
                  <div>
                    <p className="text-[#ef4444] font-semibold mb-1">Cons</p>
                    <p className="text-[#94a3b8]">May split mid-sentence, losing context across boundaries</p>
                  </div>
                  <div>
                    <p className="text-[#d4af37] font-semibold mb-1">Best For</p>
                    <p className="text-[#94a3b8]">Uniform documents, large-scale ingestion pipelines</p>
                  </div>
                </>
              )}
              {strategy === "recursive" && (
                <>
                  <div>
                    <p className="text-[#3bb4a4] font-semibold mb-1">Pros</p>
                    <p className="text-[#94a3b8]">Preserves sentence and paragraph integrity for cleaner chunks</p>
                  </div>
                  <div>
                    <p className="text-[#ef4444] font-semibold mb-1">Cons</p>
                    <p className="text-[#94a3b8]">Variable chunk sizes make batch processing less predictable</p>
                  </div>
                  <div>
                    <p className="text-[#d4af37] font-semibold mb-1">Best For</p>
                    <p className="text-[#94a3b8]">Articles, documentation, books, and general prose</p>
                  </div>
                </>
              )}
              {strategy === "document" && (
                <>
                  <div>
                    <p className="text-[#3bb4a4] font-semibold mb-1">Pros</p>
                    <p className="text-[#94a3b8]">Preserves document structure and logical section hierarchy</p>
                  </div>
                  <div>
                    <p className="text-[#ef4444] font-semibold mb-1">Cons</p>
                    <p className="text-[#94a3b8]">Complex to implement consistently across varied document formats</p>
                  </div>
                  <div>
                    <p className="text-[#d4af37] font-semibold mb-1">Best For</p>
                    <p className="text-[#94a3b8]">Markdown, HTML, technical docs, and structured reports</p>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </section>

        {/* ── Section 2: Live Visualization ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-1">Live Visualization</h2>
          <p className="text-[13px] text-[#94a3b8] mb-4">
            Each color block is one chunk. Adjust the sliders to see boundaries shift in real time.
          </p>

          {/* Sliders — only for fixed */}
          {strategy === "fixed" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 p-4 rounded-2xl border border-white/10 bg-[#1e293b]">
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-[12px] text-[#94a3b8]">Chunk size</label>
                  <span className="text-[12px] font-semibold text-white">{chunkSize} chars</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={200}
                  value={chunkSize}
                  onChange={(e) => handleSlider(setChunkSize, Number(e.target.value))}
                  className="w-full accent-[#ec4899]"
                />
                <div className="flex justify-between text-[10px] text-[#475569] mt-0.5">
                  <span>50</span><span>200</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-[12px] text-[#94a3b8]">Overlap</label>
                  <span className="text-[12px] font-semibold text-white">{overlapSize} chars</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={overlapSize}
                  onChange={(e) => handleSlider(setOverlapSize, Number(e.target.value))}
                  className="w-full accent-[#3bb4a4]"
                />
                <div className="flex justify-between text-[10px] text-[#475569] mt-0.5">
                  <span>0</span><span>50</span>
                </div>
              </div>
            </div>
          )}

          {/* Chunk display */}
          <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-4 space-y-2">
            <AnimatePresence mode="popLayout">
              {chunks.map((chunk, i) => {
                const col = CHUNK_COLORS[i % CHUNK_COLORS.length];
                const isMidSentence =
                  strategy === "fixed" &&
                  chunk.text.length > 0 &&
                  !/[.!?]\s*$/.test(chunk.text.trim());
                return (
                  <motion.div
                    key={`${strategy}-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2, delay: i * 0.04 }}
                    className="rounded-xl p-3 border text-[12px] font-mono leading-relaxed relative"
                    style={{ background: col.bg, borderColor: col.border }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                        style={{ background: col.border, color: col.text }}
                      >
                        {chunk.label ?? `Chunk ${i + 1}`}
                      </span>
                      <span className="text-[10px] text-[#475569]">
                        ~{estimateTokens(chunk.text)} tokens
                      </span>
                      {isMidSentence && (
                        <span className="text-[10px] font-semibold text-[#ef4444] ml-auto">
                          mid-sentence split
                        </span>
                      )}
                    </div>
                    <p className="text-[#cbd5e1] break-words">{chunk.text}</p>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Stats */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-[#94a3b8]">
            <span>
              <span className="text-white font-semibold">{chunks.length}</span> chunks created
            </span>
            <span className="text-white/20">|</span>
            <span>
              Avg chunk size:{" "}
              <span className="text-white font-semibold">{avgTokens}</span> tokens
            </span>
            {strategy === "fixed" && (
              <>
                <span className="text-white/20">|</span>
                <span>
                  Overlap:{" "}
                  <span className="text-[#3bb4a4] font-semibold">
                    {chunkSize > 0 ? Math.round((overlapSize / chunkSize) * 100) : 0}%
                  </span>
                </span>
              </>
            )}
          </div>
        </section>

        {/* ── Section 3: Chunk Size Trade-offs ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-1">Chunk Size Trade-offs</h2>
          <p className="text-[13px] text-[#94a3b8] mb-5">
            Small chunks improve retrieval precision but lose context. Large chunks carry
            more context but reduce precision. For many general text corpora, 256–512 tokens
            is a common starting range, but the right size depends on your documents,
            queries, and embedding model, and should be tuned with retrieval evals.
          </p>

          <div className="rounded-2xl border border-white/10 bg-[#1e293b] p-5 flex justify-center">
            <TradeoffChart />
          </div>
        </section>

        {/* ── Section 4: Overlap Explained ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-1">Overlap Explained</h2>
          <p className="text-[13px] text-[#94a3b8] mb-4">
            Overlap ensures that context near a chunk boundary appears in both adjacent
            chunks, reducing information loss at split points.
          </p>

          <div className="rounded-2xl border border-white/10 bg-[#1e293b] p-5">
            <div className="flex items-center gap-3 mb-4">
              <label className="text-[12px] text-[#94a3b8] shrink-0">Overlap</label>
              <input
                type="range"
                min={0}
                max={30}
                value={overlapPct}
                onChange={(e) => handleSlider(setOverlapPct, Number(e.target.value))}
                className="flex-1 accent-[#d4af37]"
              />
              <span className="text-[12px] font-semibold text-[#d4af37] w-8 text-right">
                {overlapPct}%
              </span>
            </div>

            <div className="space-y-2 font-mono text-[12px]">
              {overlapItems.map((item, i) => {
                const totalSpan = overlapItems[overlapItems.length - 1].end - overlapItems[0].start;
                const leftPct = ((item.start - 1) / totalSpan) * 100;
                const widthPct = (100 / totalSpan) * 100;
                const color = CHUNK_COLORS[i % CHUNK_COLORS.length];
                return (
                  <div key={i} className="relative h-8">
                    <motion.div
                      className="absolute h-full rounded-lg flex items-center px-2 border text-[10px] font-bold overflow-hidden whitespace-nowrap"
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        background: color.bg,
                        borderColor: color.border,
                        color: color.text,
                      }}
                      animate={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      Chunk {i + 1}: tokens {item.start}–{item.end}
                    </motion.div>
                  </div>
                );
              })}
            </div>

            {overlap > 0 && (
              <p className="mt-3 text-[11px] text-[#94a3b8]">
                <span className="text-[#d4af37] font-semibold">{overlap} tokens</span> shared
                between adjacent chunks
              </p>
            )}
            {overlap === 0 && (
              <p className="mt-3 text-[11px] text-[#475569]">No overlap — chunks are fully independent</p>
            )}
          </div>
        </section>

        {/* ── Section 5: Choosing the Right Strategy ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-1">Choosing the Right Strategy</h2>
          <p className="text-[13px] text-[#94a3b8] mb-4">
            Match the chunking approach to your document type for the best retrieval results.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {USE_CASES.map((uc, i) => (
              <motion.div
                key={uc.useCase}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="rounded-2xl p-4 border"
                style={{
                  background: `${uc.color}0d`,
                  borderColor: `${uc.color}33`,
                }}
              >
                <p className="text-[11px] font-bold uppercase tracking-widest mb-2 text-[#94a3b8]">
                  {uc.useCase}
                </p>
                <p
                  className="text-[15px] font-bold mb-1.5"
                  style={{ color: uc.color }}
                >
                  {uc.strategy}
                </p>
                <p className="text-[12px] text-[#94a3b8] leading-relaxed">{uc.reason}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Gold insight box */}
        <div className="mb-10 rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/5 px-6 py-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#d4af37] mb-2">
            Insight
          </p>
          <p className="text-[14px] text-[#94a3b8] leading-relaxed">
            Small chunks (128 tokens) = precise retrieval but may lack context. Large
            chunks (1024 tokens) = rich context but retrieval is less precise. A common
            starting point is{" "}
            <span className="text-white font-semibold">around 512 tokens with ~10% overlap</span>;
            from there, measure retrieval quality on your own data and adjust.
          </p>
        </div>

        {/* Summary card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-2xl border border-white/10 bg-[#1e293b] p-6"
        >
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#3bb4a4] mb-1">
            Up Next
          </p>
          <h3 className="text-lg font-bold text-white mb-2">
            Prompt Engineering
          </h3>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed mb-4">
            Once your documents are chunked and retrieved, how you structure the prompt
            determines whether the LLM uses that context well. Explore the techniques.
          </p>
          <Link
            href="/visual-guides/prompt-engineering"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-[#0f172a] bg-[#3bb4a4] hover:bg-[#4fcfbe] transition-colors"
          >
            Explore Prompt Engineering →
          </Link>
        </motion.div>

      </div>
    </div>
  );
}
