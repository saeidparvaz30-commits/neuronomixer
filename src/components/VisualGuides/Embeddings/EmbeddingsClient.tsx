"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

// ── Data ───────────────────────────────────────────────────────────────────

type Category = "royalty" | "person" | "animal" | "vehicle" | "city";

interface WordDef {
  x: number;
  y: number;
  category: Category;
}

const WORDS: Record<string, WordDef> = {
  king:   { x: 0.8,  y: 0.7,   category: "royalty" },
  queen:  { x: 0.6,  y: 0.9,   category: "royalty" },
  prince: { x: 0.7,  y: 0.4,   category: "royalty" },
  man:    { x: 0.8,  y: 0.2,   category: "person" },
  woman:  { x: 0.6,  y: 0.3,   category: "person" },
  boy:    { x: 0.7,  y: 0.05,  category: "person" },
  girl:   { x: 0.5,  y: 0.15,  category: "person" },
  dog:    { x: -0.5, y: 0.1,   category: "animal" },
  cat:    { x: -0.6, y: 0.2,   category: "animal" },
  wolf:   { x: -0.4, y: -0.1,  category: "animal" },
  car:    { x: -0.7, y: -0.6,  category: "vehicle" },
  truck:  { x: -0.8, y: -0.7,  category: "vehicle" },
  bus:    { x: -0.6, y: -0.8,  category: "vehicle" },
  paris:  { x: 0.1,  y: 0.8,   category: "city" },
  london: { x: 0.2,  y: 0.7,   category: "city" },
  tokyo:  { x: 0.0,  y: 0.9,   category: "city" },
};

const CAT_COLORS: Record<Category, string> = {
  royalty: "#d4af37",
  person:  "#3bb4a4",
  animal:  "#a855f7",
  vehicle: "#1e5d8a",
  city:    "#ef4444",
};

const CAT_LABELS: Record<Category, string> = {
  royalty: "Royalty",
  person:  "Person",
  animal:  "Animal",
  vehicle: "Vehicle",
  city:    "City",
};

// Cluster ellipses: [cx, cy, rx, ry, label, color]
const CLUSTER_ELLIPSES: [number, number, number, number, string, Category][] = [
  [0.7,  0.6,  0.22, 0.38, "Royalty",  "royalty"],
  [0.65, 0.18, 0.2,  0.2,  "People",   "person"],
  [-0.5, 0.07, 0.2,  0.2,  "Animals",  "animal"],
  [-0.7, -0.7, 0.18, 0.15, "Vehicles", "vehicle"],
  [0.1,  0.8,  0.18, 0.12, "Cities",   "city"],
];

// Pre-defined arithmetic examples
interface ArithmeticExample {
  label: string;
  a: string;
  minus: string;
  plus: string;
  result: string;
  resultNote: string;
  similarity: number;
}

const ARITHMETIC_EXAMPLES: ArithmeticExample[] = [
  {
    label: "king − man + woman",
    a: "king",
    minus: "man",
    plus: "woman",
    result: "queen",
    resultNote: "queen",
    similarity: 0.94,
  },
  {
    label: "paris − france + germany",
    a: "paris",
    minus: "london",
    plus: "tokyo",
    result: "city-cluster",
    resultNote: "berlin ≈ city near london",
    similarity: 0.81,
  },
  {
    label: "dog − wolf + cat",
    a: "dog",
    minus: "wolf",
    plus: "cat",
    result: "cat",
    resultNote: "cat",
    similarity: 0.88,
  },
];

// Sample 768-dim vector values (first 8 shown)
const PARIS_VALS  = [0.12, -0.87,  0.34,  0.61, -0.23,  0.75,  0.08, -0.45];
const LONDON_VALS = [0.15, -0.81,  0.29,  0.57, -0.18,  0.70,  0.11, -0.39];

// ── SVG coordinate helpers ─────────────────────────────────────────────────

const SVG_W = 500;
const SVG_H = 400;
const PAD = 40;

function toSvgX(x: number) {
  // x range: -1 to 1
  return PAD + ((x + 1) / 2) * (SVG_W - PAD * 2);
}
function toSvgY(y: number) {
  // y range: -1 to 1, flip so +y is up
  return PAD + ((1 - (y + 1) / 2)) * (SVG_H - PAD * 2);
}

// Cosine similarity approximation from 2D coords
function cosineSim(a: WordDef, b: WordDef) {
  const dot = a.x * b.x + a.y * b.y;
  const na = Math.sqrt(a.x * a.x + a.y * a.y);
  const nb = Math.sqrt(b.x * b.x + b.y * b.y);
  if (na === 0 || nb === 0) return 0;
  return Math.max(-1, Math.min(1, dot / (na * nb)));
}

function nearestNeighbors(word: string, n = 3): string[] {
  const ref = WORDS[word];
  return Object.entries(WORDS)
    .filter(([w]) => w !== word)
    .map(([w, v]) => ({ w, sim: cosineSim(ref, v) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, n)
    .map((e) => e.w);
}

// ── Bar chart subcomponent ─────────────────────────────────────────────────

function VectorBarChart({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values.map(Math.abs));
  return (
    <div className="flex items-end gap-1 h-14">
      {values.map((v, i) => {
        const height = Math.abs(v) / max;
        const isPos = v >= 0;
        return (
          <div key={i} className="flex flex-col items-center flex-1">
            {isPos && (
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                style={{ height: `${height * 44}px`, background: color, originY: 1 }}
                className="w-full rounded-t"
              />
            )}
            {!isPos && (
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                style={{ height: `${height * 44}px`, background: "#ef4444", originY: 0 }}
                className="w-full rounded-b"
              />
            )}
          </div>
        );
      })}
      <span className="text-[#475569] text-[10px] self-center ml-1">...</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function EmbeddingsClient() {
  const { data: session } = useSession();
  const completionFired = useRef(false);

  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [activeExample, setActiveExample] = useState<number | null>(null);
  const [hasInteractedPlot, setHasInteractedPlot] = useState(false);
  const [hasUsedArithmetic, setHasUsedArithmetic] = useState(false);

  // Completion: fired when user clicked an arithmetic example AND interacted with the scatter plot
  const isComplete = hasInteractedPlot && hasUsedArithmetic;

  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "embeddings", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  const progressPct = (hasInteractedPlot ? 50 : 0) + (hasUsedArithmetic ? 50 : 0);

  // Active arithmetic example data
  const activeEx = activeExample !== null ? ARITHMETIC_EXAMPLES[activeExample] : null;

  // Words highlighted in the plot for the active arithmetic example
  const arithmeticWords = activeEx ? [activeEx.a, activeEx.minus, activeEx.plus] : [];
  const resultWord =
    activeEx && activeEx.result !== "city-cluster" && WORDS[activeEx.result]
      ? activeEx.result
      : null;

  // Arrow for arithmetic: from (a - minus + plus) endpoint
  const arrowTarget =
    activeEx && resultWord
      ? {
          x: toSvgX(WORDS[resultWord].x),
          y: toSvgY(WORDS[resultWord].y),
          ax: toSvgX(WORDS[activeEx.a].x),
          ay: toSvgY(WORDS[activeEx.a].y),
        }
      : null;

  const neighbors = selectedWord ? nearestNeighbors(selectedWord) : [];

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <div className="max-w-[900px] mx-auto px-5 sm:px-8 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-[#334155]">/</span>
          <span className="text-[#94a3b8]">LLMs</span>
          <span className="text-[#334155]">/</span>
          <span className="text-white">Embeddings: Words as Numbers in Space</span>
        </nav>

        {/* Hero */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-[#ef4444]/15 border border-[#ef4444]/35 rounded-full px-3 py-1 mb-4">
            <span className="text-xs font-semibold text-[#ef4444] uppercase tracking-wider">
              LLMs
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Embeddings:{" "}
            <span className="text-[#d4af37]">Words as Numbers in Space</span>
          </h1>
          <p className="text-[#94a3b8] text-base max-w-2xl leading-relaxed">
            Explore a 2D projection of word embedding space. Click words, try arithmetic like
            king − man + woman = queen, and see how meaning emerges from geometry.
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8 bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#94a3b8]">Exploration Progress</span>
            <span className="text-sm font-semibold text-white">
              {hasInteractedPlot ? "Plot explored ✓" : "Click a word"}&nbsp;&middot;&nbsp;
              {hasUsedArithmetic ? "Arithmetic tried ✓" : "Try word arithmetic"}
            </span>
          </div>
          <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #ef4444, #d4af37)" }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <AnimatePresence>
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-xs text-[#3bb4a4] font-semibold"
              >
                Guide complete! You have explored word embedding space.
              </motion.div>
            )}
          </AnimatePresence>
          {!session?.user && (
            <p className="mt-2 text-[11px] text-[#475569]">Sign in to save progress</p>
          )}
        </div>

        {/* ── Section 1: The Word Space ───────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-[#ef4444]/20 border border-[#ef4444]/40 flex items-center justify-center text-[#ef4444] text-xs font-bold">
              1
            </span>
            The Word Space
          </h2>
          <p className="text-sm text-[#475569] mb-4 ml-8">
            Click any word to select it and see its nearest neighbors.
          </p>

          <div className="bg-[#1e293b]/50 border border-[#1e293b] rounded-2xl p-5">
            {/* SVG plot */}
            <div className="overflow-x-auto">
              <svg
                width={SVG_W}
                height={SVG_H}
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                className="block mx-auto max-w-full"
                style={{ cursor: "default" }}
              >
                {/* Axes */}
                <line
                  x1={toSvgX(0)} y1={PAD / 2}
                  x2={toSvgX(0)} y2={SVG_H - PAD / 2}
                  stroke="#1e293b" strokeWidth={1}
                />
                <line
                  x1={PAD / 2} y1={toSvgY(0)}
                  x2={SVG_W - PAD / 2} y2={toSvgY(0)}
                  stroke="#1e293b" strokeWidth={1}
                />

                {/* Cluster ellipses */}
                {CLUSTER_ELLIPSES.map(([cx, cy, rx, ry, , cat]) => (
                  <ellipse
                    key={cat}
                    cx={toSvgX(cx)}
                    cy={toSvgY(cy)}
                    rx={rx * (SVG_W - PAD * 2) / 2}
                    ry={ry * (SVG_H - PAD * 2) / 2}
                    fill={CAT_COLORS[cat] + "12"}
                    stroke={CAT_COLORS[cat] + "30"}
                    strokeWidth={1}
                  />
                ))}

                {/* Arithmetic arrow */}
                <AnimatePresence>
                  {arrowTarget && (
                    <motion.line
                      key="arrow"
                      x1={arrowTarget.ax}
                      y1={arrowTarget.ay}
                      x2={arrowTarget.x}
                      y2={arrowTarget.y}
                      stroke="#d4af37"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      markerEnd="url(#arrowhead)"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6 }}
                    />
                  )}
                </AnimatePresence>

                <defs>
                  <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="#d4af37" />
                  </marker>
                </defs>

                {/* Words */}
                {Object.entries(WORDS).map(([word, def]) => {
                  const cx = toSvgX(def.x);
                  const cy = toSvgY(def.y);
                  const isHovered = hoveredWord === word;
                  const isSelected = selectedWord === word;
                  const isNeighbor = neighbors.includes(word);
                  const isArithmetic = arithmeticWords.includes(word);
                  const isResult = resultWord === word;
                  const color = CAT_COLORS[def.category];
                  const r = isSelected ? 7 : isResult ? 8 : isNeighbor ? 5.5 : isHovered ? 6 : 5;

                  return (
                    <g
                      key={word}
                      onClick={() => {
                        if (selectedWord === word) {
                          setSelectedWord(null);
                        } else {
                          setSelectedWord(word);
                          setHasInteractedPlot(true);
                        }
                      }}
                      onMouseEnter={() => setHoveredWord(word)}
                      onMouseLeave={() => setHoveredWord(null)}
                      style={{ cursor: "pointer" }}
                    >
                      {/* Selection ring */}
                      {(isSelected || isResult) && (
                        <circle
                          cx={cx} cy={cy}
                          r={r + 5}
                          fill="none"
                          stroke={isResult ? "#d4af37" : color}
                          strokeWidth={1.5}
                          strokeOpacity={0.5}
                        />
                      )}
                      {/* Neighbor ring */}
                      {isNeighbor && !isSelected && (
                        <circle
                          cx={cx} cy={cy}
                          r={r + 4}
                          fill="none"
                          stroke={color}
                          strokeWidth={1}
                          strokeDasharray="3 2"
                          strokeOpacity={0.6}
                        />
                      )}
                      {/* Arithmetic highlight ring */}
                      {isArithmetic && (
                        <circle
                          cx={cx} cy={cy}
                          r={r + 6}
                          fill="none"
                          stroke="#d4af37"
                          strokeWidth={1.5}
                          strokeOpacity={0.7}
                        />
                      )}
                      <circle
                        cx={cx} cy={cy} r={r}
                        fill={color}
                        fillOpacity={isArithmetic || isSelected || isResult ? 1 : 0.75}
                        stroke={isResult ? "#d4af37" : "transparent"}
                        strokeWidth={isResult ? 2 : 0}
                      />
                      <text
                        x={cx + r + 4}
                        y={cy + 4}
                        fontSize={isSelected || isResult ? 12 : 10}
                        fontWeight={isSelected || isResult || isArithmetic ? "bold" : "normal"}
                        fill={isResult ? "#d4af37" : isSelected || isArithmetic ? "white" : "#94a3b8"}
                      >
                        {word}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-3">
              {(Object.keys(CAT_COLORS) as Category[]).map((cat) => (
                <div key={cat} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: CAT_COLORS[cat] }}
                  />
                  <span className="text-[11px] text-[#94a3b8]">{CAT_LABELS[cat]}</span>
                </div>
              ))}
            </div>

            {/* Selected word info */}
            <AnimatePresence>
              {selectedWord && (
                <motion.div
                  key={selectedWord}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 p-3 rounded-xl bg-[#0f172a] border border-[#1e293b]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: CAT_COLORS[WORDS[selectedWord].category] }}
                    />
                    <span className="text-white font-semibold text-sm">{selectedWord}</span>
                    <span className="text-[#475569] text-xs ml-1">
                      ({WORDS[selectedWord].x.toFixed(2)}, {WORDS[selectedWord].y.toFixed(2)})
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8] mb-1">Nearest neighbors:</p>
                  <div className="flex gap-2">
                    {neighbors.map((n) => (
                      <span
                        key={n}
                        className="px-2 py-0.5 rounded-full text-[11px] font-medium border"
                        style={{
                          color: CAT_COLORS[WORDS[n].category],
                          borderColor: CAT_COLORS[WORDS[n].category] + "50",
                          background: CAT_COLORS[WORDS[n].category] + "15",
                        }}
                      >
                        {n} ({cosineSim(WORDS[selectedWord], WORDS[n]).toFixed(2)})
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ── Section 2: Word Arithmetic ─────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-[#ef4444]/20 border border-[#ef4444]/40 flex items-center justify-center text-[#ef4444] text-xs font-bold">
              2
            </span>
            Word Arithmetic
          </h2>
          <p className="text-sm text-[#475569] mb-4 ml-8">
            Vector addition and subtraction produce meaningful new words.
          </p>

          <div className="bg-[#1e293b]/50 border border-[#1e293b] rounded-2xl p-5">
            {/* Example buttons */}
            <div className="flex flex-wrap gap-3 mb-5">
              {ARITHMETIC_EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActiveExample(activeExample === i ? null : i);
                    setHasUsedArithmetic(true);
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-medium border transition-all"
                  style={{
                    background: activeExample === i ? "#d4af37" + "20" : "#0f172a",
                    borderColor: activeExample === i ? "#d4af37" + "70" : "#1e293b",
                    color: activeExample === i ? "#d4af37" : "#94a3b8",
                  }}
                >
                  {ex.label}
                </button>
              ))}
            </div>

            {/* Active example visualization */}
            <AnimatePresence mode="wait">
              {activeEx && (
                <motion.div
                  key={activeExample}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-xl border border-[#d4af37]/25 bg-[#0f172a] p-4"
                >
                  {/* Formula */}
                  <div className="flex flex-wrap items-center gap-2 text-base font-mono mb-4">
                    <span
                      className="px-2.5 py-1 rounded-lg text-sm font-bold"
                      style={{
                        background: CAT_COLORS[WORDS[activeEx.a].category] + "20",
                        color: CAT_COLORS[WORDS[activeEx.a].category],
                      }}
                    >
                      {activeEx.a}
                    </span>
                    <span className="text-[#475569]">−</span>
                    <span
                      className="px-2.5 py-1 rounded-lg text-sm font-bold"
                      style={{
                        background: CAT_COLORS[WORDS[activeEx.minus].category] + "20",
                        color: CAT_COLORS[WORDS[activeEx.minus].category],
                      }}
                    >
                      {activeEx.minus}
                    </span>
                    <span className="text-[#475569]">+</span>
                    <span
                      className="px-2.5 py-1 rounded-lg text-sm font-bold"
                      style={{
                        background: CAT_COLORS[WORDS[activeEx.plus].category] + "20",
                        color: CAT_COLORS[WORDS[activeEx.plus].category],
                      }}
                    >
                      {activeEx.plus}
                    </span>
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-[#475569]"
                    >
                      ≈
                    </motion.span>
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 }}
                      className="px-2.5 py-1 rounded-lg text-sm font-bold bg-[#d4af37]/20 text-[#d4af37]"
                    >
                      {activeEx.resultNote}
                    </motion.span>
                  </div>

                  {/* Similarity */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center gap-3"
                  >
                    <span className="text-xs text-[#475569]">Cosine similarity:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-[#1e293b] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-[#d4af37]"
                          initial={{ width: 0 }}
                          animate={{ width: `${activeEx.similarity * 100}%` }}
                          transition={{ duration: 0.6, delay: 0.5 }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-[#d4af37]">
                        {activeEx.similarity.toFixed(2)}
                      </span>
                    </div>
                  </motion.div>

                  {/* Explanation */}
                  <p className="text-xs text-[#475569] mt-3 leading-relaxed">
                    {activeEx.a === "king"
                      ? "Subtracting the 'man' direction and adding the 'woman' direction navigates to the royalty+female region — queen."
                      : activeEx.a === "paris"
                      ? "The city-country relationship is consistent across languages. Paris is to France as Berlin is to Germany — but Berlin isn't in our vocabulary, so we land near the other cities."
                      : "The domestic-pet direction overrides the wild-wolf aspect, landing closest to cat in embedding space."}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {!activeEx && (
              <p className="text-xs text-[#334155] text-center py-4">
                Select an example above to see the vector operation visualized on the word space.
              </p>
            )}
          </div>
        </section>

        {/* ── Section 3: From Text to Vector ───────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-[#ef4444]/20 border border-[#ef4444]/40 flex items-center justify-center text-[#ef4444] text-xs font-bold">
              3
            </span>
            From Text to Vector
          </h2>
          <p className="text-sm text-[#475569] mb-4 ml-8">
            Real embeddings are 768–1536 dimensional. Each dimension encodes some aspect of meaning.
          </p>

          <div className="bg-[#1e293b]/50 border border-[#1e293b] rounded-2xl p-5 space-y-5">
            {[
              { word: "Paris",  vals: PARIS_VALS,  color: "#ef4444" },
              { word: "London", vals: LONDON_VALS, color: "#ef4444" },
            ].map(({ word, vals, color }) => (
              <div key={word}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-white">{word}</span>
                  <span className="text-[#475569] text-xs">→</span>
                  <code className="text-xs text-[#94a3b8] font-mono">
                    [{vals.map((v) => v.toFixed(2)).join(", ")}, ...]
                    <span className="text-[#334155]"> (768 dims)</span>
                  </code>
                </div>
                <VectorBarChart values={vals} color={color} />
                <p className="text-[10px] text-[#334155] mt-1">
                  Each of 768 dimensions encodes some aspect of meaning
                </p>
              </div>
            ))}

            <div className="pt-2 border-t border-[#1e293b]">
              <p className="text-xs text-[#475569] leading-relaxed">
                Notice how Paris and London have{" "}
                <span className="text-[#3bb4a4]">similar bar patterns</span> — they share semantic
                properties (capital cities, European, large urban centers). Their vectors are close
                in 768-dimensional space, even though we can only visualize 8 dimensions here.
              </p>
            </div>
          </div>
        </section>

        {/* ── Section 4: Why Embeddings Matter ─────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-[#ef4444]/20 border border-[#ef4444]/40 flex items-center justify-center text-[#ef4444] text-xs font-bold">
              4
            </span>
            Why Embeddings Matter
          </h2>
          <p className="text-sm text-[#475569] mb-4 ml-8">
            Embeddings are the foundation of modern NLP applications.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                title: "Semantic Search",
                icon: "🔍",
                color: "#3bb4a4",
                desc: "Find documents by meaning, not just keywords. \"best running shoes\" matches \"top jogging footwear\" because their embeddings are close.",
              },
              {
                title: "Recommendations",
                icon: "🎯",
                color: "#d4af37",
                desc: "Items close in embedding space are similar. If you liked article A, articles near A's embedding are surfaced next.",
              },
              {
                title: "Translation",
                icon: "🌐",
                color: "#ef4444",
                desc: "Languages share embedding structure. \"dog\" in English and \"chien\" in French sit in the same region of multilingual space.",
              },
            ].map(({ title, icon, color, desc }) => (
              <div
                key={title}
                className="bg-[#1e293b]/50 border border-[#1e293b] rounded-2xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl" role="img" aria-label={title}>{icon}</span>
                  <span className="text-sm font-bold" style={{ color }}>{title}</span>
                </div>
                <p className="text-xs text-[#475569] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Gold insight box */}
        <div className="mb-10 rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/05 p-5">
          <div className="flex items-start gap-3">
            <span className="text-[#d4af37] text-lg mt-0.5" aria-hidden>★</span>
            <div>
              <p className="text-sm font-semibold text-[#d4af37] mb-1">Key Insight</p>
              <p className="text-sm text-[#94a3b8] leading-relaxed">
                Modern LLMs use <strong className="text-white">contextual embeddings</strong> — the
                same word gets different vectors depending on context. &ldquo;bank&rdquo; in
                &ldquo;river bank&rdquo; vs &ldquo;savings bank&rdquo; have different embeddings,
                allowing the model to understand polysemy. This is the key advance of transformer
                architectures over older static embeddings like Word2Vec.
              </p>
            </div>
          </div>
        </div>

        {/* Summary card → next guide */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/50 p-6">
          <p className="text-xs text-[#475569] uppercase tracking-wider mb-2">Up Next</p>
          <h3 className="text-lg font-bold text-white mb-1">Self-Attention</h3>
          <p className="text-sm text-[#94a3b8] mb-4 leading-relaxed">
            See how transformers decide which words to focus on when processing each token. The
            mechanism that makes contextual embeddings possible.
          </p>
          <Link
            href="/visual-guides/self-attention"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "#ef4444" + "20",
              color: "#ef4444",
              border: "1px solid " + "#ef4444" + "40",
            }}
          >
            Explore Self-Attention
            <span aria-hidden>→</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
