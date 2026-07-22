"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Data: a hand-built toy vocabulary ──────────────────────────────────────
//
// Every word is a 16-dimensional vector we wrote by hand: named features
// (weight 1.0) plus two small "noise" dimensions so words are not perfectly
// aligned. Every similarity number rendered on this page is computed at
// runtime from these vectors; nothing is hardcoded. The vectors are
// constructed so the classic analogies genuinely work:
//   king - man + woman  ≈ queen   (gender direction)
//   paris - france + germany ≈ berlin   (capital-of direction)
//   boy - man + woman ≈ girl   (same gender direction, reused)

type Category = "royalty" | "person" | "city" | "country" | "animal" | "vehicle";

const DIMS = [
  "human", "royal", "female", "young",
  "place", "capital", "france", "germany", "japan",
  "animal", "canine", "domestic",
  "vehicle", "size",
  "noise-1", "noise-2",
] as const;

type Dim = (typeof DIMS)[number];

function v(features: Partial<Record<Dim, number>>): number[] {
  return DIMS.map((d) => features[d] ?? 0);
}

interface WordDef {
  vec: number[];
  category: Category;
}

const WORDS: Record<string, WordDef> = {
  king:    { category: "royalty", vec: v({ human: 1, royal: 1, "noise-1": -0.05, "noise-2": -0.05 }) },
  queen:   { category: "royalty", vec: v({ human: 1, royal: 1, female: 1, "noise-1": 0.03, "noise-2": 0.06 }) },
  man:     { category: "person",  vec: v({ human: 1, "noise-1": 0.06, "noise-2": -0.03 }) },
  woman:   { category: "person",  vec: v({ human: 1, female: 1, "noise-1": -0.04, "noise-2": 0.07 }) },
  boy:     { category: "person",  vec: v({ human: 1, young: 1, "noise-1": 0.08, "noise-2": 0.02 }) },
  girl:    { category: "person",  vec: v({ human: 1, female: 1, young: 1, "noise-1": -0.02, "noise-2": -0.06 }) },
  paris:   { category: "city",    vec: v({ place: 1, capital: 1, france: 1, "noise-1": -0.03, "noise-2": -0.07 }) },
  berlin:  { category: "city",    vec: v({ place: 1, capital: 1, germany: 1, "noise-1": 0.05, "noise-2": 0.03 }) },
  tokyo:   { category: "city",    vec: v({ place: 1, capital: 1, japan: 1, "noise-1": -0.08, "noise-2": 0.01 }) },
  france:  { category: "country", vec: v({ place: 1, france: 1, "noise-1": 0.07, "noise-2": -0.02 }) },
  germany: { category: "country", vec: v({ place: 1, germany: 1, "noise-1": -0.06, "noise-2": 0.04 }) },
  japan:   { category: "country", vec: v({ place: 1, japan: 1, "noise-1": 0.02, "noise-2": 0.08 }) },
  dog:     { category: "animal",  vec: v({ animal: 1, canine: 1, domestic: 1, "noise-1": 0.04, "noise-2": -0.04 }) },
  wolf:    { category: "animal",  vec: v({ animal: 1, canine: 1, "noise-1": -0.07, "noise-2": -0.01 }) },
  cat:     { category: "animal",  vec: v({ animal: 1, domestic: 1, "noise-1": 0.01, "noise-2": 0.05 }) },
  car:     { category: "vehicle", vec: v({ vehicle: 1, size: 0.3, "noise-1": -0.01, "noise-2": -0.08 }) },
  truck:   { category: "vehicle", vec: v({ vehicle: 1, size: 0.9, "noise-1": 0.06, "noise-2": 0.05 }) },
  bus:     { category: "vehicle", vec: v({ vehicle: 1, size: 0.6, "noise-1": -0.05, "noise-2": 0.02 }) },
};

const CAT_COLORS: Record<Category, string> = {
  royalty: "#d4af37",
  person:  "#3bb4a4",
  city:    "#ef4444",
  country: "#f97316",
  animal:  "#a855f7",
  vehicle: "#1e5d8a",
};

const CAT_LABELS: Record<Category, string> = {
  royalty: "Royalty",
  person:  "Person",
  city:    "City",
  country: "Country",
  animal:  "Animal",
  vehicle: "Vehicle",
};

// ── Vector math (all displayed numbers come from these) ───────────────────

function dot(a: number[], b: number[]) {
  return a.reduce((s, x, i) => s + x * b[i], 0);
}
function norm(a: number[]) {
  return Math.sqrt(dot(a, a));
}
function cosineSim(a: number[], b: number[]) {
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) return 0;
  return Math.max(-1, Math.min(1, dot(a, b) / (na * nb)));
}

// Avoid the "-0.00" rendering artifact for near-zero cosines
function fmtSim(sim: number) {
  const s = sim.toFixed(2);
  return s === "-0.00" ? "0.00" : s;
}

function nearestNeighbors(word: string, n = 3): { w: string; sim: number }[] {
  const ref = WORDS[word].vec;
  return Object.entries(WORDS)
    .filter(([w]) => w !== word)
    .map(([w, d]) => ({ w, sim: cosineSim(ref, d.vec) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, n);
}

// Analogy lookup: nearest vocabulary word to (a - b + c), with the three
// input words excluded from the candidates (standard word2vec practice).
function solveAnalogy(a: string, b: string, c: string) {
  const target = WORDS[a].vec.map((x, i) => x - WORDS[b].vec[i] + WORDS[c].vec[i]);
  const ranked = Object.entries(WORDS)
    .filter(([w]) => w !== a && w !== b && w !== c)
    .map(([w, d]) => ({ w, sim: cosineSim(target, d.vec) }))
    .sort((x, y) => y.sim - x.sim);
  return { top: ranked[0], runnerUp: ranked[1] };
}

// ── 2D projection for the plot ─────────────────────────────────────────────
// The scatter plot is a fixed linear projection of the 16-D vectors onto two
// display axes. Plot positions are derived from the vectors, but similarity
// numbers are always computed in the full 16-D space.

const PROJ_X = v({ human: 0.55, royal: 0.15, female: -0.18, young: 0.12, place: -0.35, capital: 0.12, france: 0.20, germany: -0.04, japan: -0.16, animal: -0.72, canine: -0.10, domestic: 0.08, vehicle: -0.16, size: -0.42, "noise-1": 0.10, "noise-2": -0.06 });
const PROJ_Y = v({ human: -0.06, royal: 0.55, female: 0.16, young: -0.32, place: 0.45, capital: 0.20, france: 0.04, germany: -0.06, japan: 0.12, animal: 0.04, canine: -0.14, domestic: 0.10, vehicle: -0.76, size: -0.14, "noise-1": -0.04, "noise-2": 0.09 });

const POSITIONS: Record<string, { x: number; y: number }> = Object.fromEntries(
  Object.entries(WORDS).map(([w, d]) => [w, { x: dot(d.vec, PROJ_X), y: dot(d.vec, PROJ_Y) }])
);

// Cluster ellipses, computed from the projected positions of each category.
const CLUSTER_ELLIPSES: { cat: Category; cx: number; cy: number; rx: number; ry: number }[] =
  (Object.keys(CAT_COLORS) as Category[]).map((cat) => {
    const pts = Object.entries(WORDS)
      .filter(([, d]) => d.category === cat)
      .map(([w]) => POSITIONS[w]);
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const rx = Math.max(...pts.map((p) => Math.abs(p.x - cx))) + 0.08;
    const ry = Math.max(...pts.map((p) => Math.abs(p.y - cy))) + 0.08;
    return { cat, cx, cy, rx, ry };
  });

// Pre-defined arithmetic examples. Only the operands are stored; the result
// word and its cosine similarity are computed at runtime by solveAnalogy.
interface ArithmeticExample {
  label: string;
  a: string;
  minus: string;
  plus: string;
  explanation: string;
}

const ARITHMETIC_EXAMPLES: ArithmeticExample[] = [
  {
    label: "king − man + woman",
    a: "king",
    minus: "man",
    plus: "woman",
    explanation:
      "Subtracting man and adding woman flips the gender features while keeping the royal feature, so the result lands closest to queen.",
  },
  {
    label: "paris − france + germany",
    a: "paris",
    minus: "france",
    plus: "germany",
    explanation:
      "paris minus france isolates a capital-of offset. Adding germany applies that offset to a new country and lands closest to berlin. The same offset also connects japan to tokyo.",
  },
  {
    label: "boy − man + woman",
    a: "boy",
    minus: "man",
    plus: "woman",
    explanation:
      "This is the same gender direction as the first example, applied in a different region of the space: boy plus (woman minus man) lands closest to girl. One direction, reused across the whole space.",
  },
];

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

// ── Bar chart subcomponent ─────────────────────────────────────────────────

function VectorBarChart({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values.map(Math.abs));
  return (
    <div>
      <div className="flex items-end gap-1 h-14">
        {values.map((val, i) => {
          const height = max === 0 ? 0 : Math.abs(val) / max;
          const isPos = val >= 0;
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
      </div>
      <div className="flex gap-1 mt-1">
        {DIMS.map((d) => (
          <span key={d} className="flex-1 text-center text-[7px] leading-tight text-[#475569] break-all">
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function EmbeddingsClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const completionFired = useRef(false);

  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [focusedWord, setFocusedWord] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [activeExample, setActiveExample] = useState<number | null>(null);
  const [hasInteractedPlot, setHasInteractedPlot] = useState(false);
  const [hasUsedArithmetic, setHasUsedArithmetic] = useState(false);

  function handleReset() {
    setHoveredWord(null);
    setSelectedWord(null);
    setActiveExample(null);
    setHasInteractedPlot(false);
    setHasUsedArithmetic(false);
  }

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

  // Solve the active analogy at runtime from the vectors
  const analogy = useMemo(
    () => (activeEx ? solveAnalogy(activeEx.a, activeEx.minus, activeEx.plus) : null),
    [activeEx]
  );

  // Words highlighted in the plot for the active arithmetic example
  const arithmeticWords = activeEx ? [activeEx.a, activeEx.minus, activeEx.plus] : [];
  const resultWord = analogy ? analogy.top.w : null;

  // Arrow for arithmetic: from the start word to the computed result word
  const arrowTarget =
    activeEx && resultWord
      ? {
          x: toSvgX(POSITIONS[resultWord].x),
          y: toSvgY(POSITIONS[resultWord].y),
          ax: toSvgX(POSITIONS[activeEx.a].x),
          ay: toSvgY(POSITIONS[activeEx.a].y),
        }
      : null;

  const neighbors = selectedWord ? nearestNeighbors(selectedWord) : [];
  const neighborWords = neighbors.map((n) => n.w);

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="embeddings" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">Embeddings: Words as Numbers in Space</span>
        </nav>

        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              LLMs
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Embeddings:{" "}
            <span className="text-[var(--color-accent)]">Words as Numbers in Space</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-2xl">
            Explore a hand-built word embedding space. Click words, try arithmetic like
            king − man + woman ≈ queen, and see how meaning emerges from geometry. Every
            similarity number on this page is computed live from the vectors shown.
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
              style={{ background: "linear-gradient(90deg, #ef4444, var(--color-accent))" }}
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
            {/* Toy-vocabulary disclaimer */}
            <p className="text-[11px] text-[#475569] leading-relaxed mb-3">
              This is a hand-built illustration: 18 words with 16-dimensional vectors we
              constructed from named features (plus a little noise), shown through a fixed 2D
              projection. The arithmetic on these vectors is real, and every number below is
              computed from them at runtime. Real embeddings are learned from data instead of
              built by hand, and use hundreds to thousands of dimensions.
            </p>

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

                {/* Cluster ellipses (computed from projected positions) */}
                {CLUSTER_ELLIPSES.map(({ cat, cx, cy, rx, ry }) => (
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
                      stroke="var(--color-accent)"
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
                    <polygon points="0 0, 8 3, 0 6" fill="var(--color-accent)" />
                  </marker>
                </defs>

                {/* Words */}
                {Object.entries(WORDS).map(([word, def]) => {
                  const cx = toSvgX(POSITIONS[word].x);
                  const cy = toSvgY(POSITIONS[word].y);
                  const isHovered = hoveredWord === word;
                  const isSelected = selectedWord === word;
                  const isNeighbor = neighborWords.includes(word);
                  const isArithmetic = arithmeticWords.includes(word);
                  const isResult = resultWord === word;
                  const isFocused = focusedWord === word;
                  const color = CAT_COLORS[def.category];
                  const r = isSelected ? 7 : isResult ? 8 : isNeighbor ? 5.5 : isHovered ? 6 : 5;
                  const toggleWord = () => {
                    if (selectedWord === word) {
                      setSelectedWord(null);
                    } else {
                      setSelectedWord(word);
                      setHasInteractedPlot(true);
                    }
                  };

                  return (
                    <g
                      key={word}
                      role="button"
                      tabIndex={0}
                      aria-label={`Select word ${word}`}
                      aria-pressed={isSelected}
                      onClick={toggleWord}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleWord();
                        }
                      }}
                      onFocus={() => setFocusedWord(word)}
                      onBlur={() => setFocusedWord(null)}
                      onMouseEnter={() => setHoveredWord(word)}
                      onMouseLeave={() => setHoveredWord(null)}
                      style={{ cursor: "pointer", outline: "none" }}
                    >
                      {/* Keyboard focus ring */}
                      {isFocused && (
                        <circle
                          cx={cx} cy={cy}
                          r={r + 8}
                          fill="none"
                          stroke="var(--color-accent)"
                          strokeWidth={1.5}
                          strokeDasharray="2 2"
                        />
                      )}
                      {/* Selection ring */}
                      {(isSelected || isResult) && (
                        <circle
                          cx={cx} cy={cy}
                          r={r + 5}
                          fill="none"
                          stroke={isResult ? "var(--color-accent)" : color}
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
                          stroke="var(--color-accent)"
                          strokeWidth={1.5}
                          strokeOpacity={0.7}
                        />
                      )}
                      <circle
                        cx={cx} cy={cy} r={r}
                        fill={color}
                        fillOpacity={isArithmetic || isSelected || isResult ? 1 : 0.75}
                        stroke={isResult ? "var(--color-accent)" : "transparent"}
                        strokeWidth={isResult ? 2 : 0}
                      />
                      <text
                        x={cx + r + 4}
                        y={cy + 4}
                        fontSize={isSelected || isResult ? 18 : 16}
                        fontWeight={isSelected || isResult || isArithmetic ? "bold" : "normal"}
                        fill={isResult ? "var(--color-accent)" : isSelected || isArithmetic ? "white" : "#94a3b8"}
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
                      2D projection: ({POSITIONS[selectedWord].x.toFixed(2)},{" "}
                      {POSITIONS[selectedWord].y.toFixed(2)})
                    </span>
                  </div>
                  <p className="text-xs text-[#94a3b8] mb-1">
                    Nearest neighbors (cosine similarity in the full 16-D space):
                  </p>
                  <div className="flex gap-2">
                    {neighbors.map((n) => (
                      <span
                        key={n.w}
                        className="px-2 py-0.5 rounded-full text-[11px] font-medium border"
                        style={{
                          color: CAT_COLORS[WORDS[n.w].category],
                          borderColor: CAT_COLORS[WORDS[n.w].category] + "50",
                          background: CAT_COLORS[WORDS[n.w].category] + "15",
                        }}
                      >
                        {n.w} ({fmtSim(n.sim)})
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
            Adding and subtracting word vectors moves you along meaningful directions in the
            space. The result below is found by computing the vector, then searching the
            vocabulary for its nearest neighbor.
          </p>

          <div className="bg-[#1e293b]/50 border border-[#1e293b] rounded-2xl p-5">
            {/* Example buttons */}
            <div className="flex flex-wrap gap-3 mb-3">
              {ARITHMETIC_EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActiveExample(activeExample === i ? null : i);
                    setHasUsedArithmetic(true);
                  }}
                  aria-pressed={activeExample === i}
                  className="px-4 py-2 rounded-xl text-sm font-medium border transition-all"
                  style={{
                    background: activeExample === i ? "#d4af37" + "20" : "#0f172a",
                    borderColor: activeExample === i ? "#d4af37" + "70" : "#1e293b",
                    color: activeExample === i ? "var(--color-accent)" : "#94a3b8",
                  }}
                >
                  {ex.label}
                </button>
              ))}
            </div>

            <p className="text-[11px] text-[#475569] leading-relaxed mb-5">
              As in classic word2vec analogy lookups, the three input words are excluded from
              the candidate list. In real embedding spaces an input word is often the closest
              vector to the raw result, so the standard evaluation drops the inputs; we follow
              the same rule here.
            </p>

            {/* Active example visualization */}
            <AnimatePresence mode="wait">
              {activeEx && analogy && (
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
                      className="px-2.5 py-1 rounded-lg text-sm font-bold bg-[#d4af37]/20 text-[var(--color-accent)]"
                    >
                      {analogy.top.w}
                    </motion.span>
                  </div>

                  {/* Similarity (computed) */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-col gap-1.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#475569]">
                        Cosine similarity to {analogy.top.w}:
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 rounded-full bg-[#1e293b] overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-[var(--color-accent)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(0, analogy.top.sim) * 100}%` }}
                            transition={{ duration: 0.6, delay: 0.5 }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-[var(--color-accent)]">
                          {analogy.top.sim.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-[#475569]">
                      Next closest candidate: {analogy.runnerUp.w} ({fmtSim(analogy.runnerUp.sim)})
                    </span>
                  </motion.div>

                  {/* Explanation */}
                  <p className="text-xs text-[#475569] mt-3 leading-relaxed">
                    {activeEx.explanation}
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

        {/* ── Section 3: Inside the Vectors ───────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-[#ef4444]/20 border border-[#ef4444]/40 flex items-center justify-center text-[#ef4444] text-xs font-bold">
              3
            </span>
            Inside the Vectors
          </h2>
          <p className="text-sm text-[#475569] mb-4 ml-8">
            These are the actual 16-dimensional vectors behind two words in the plot above. Our
            toy dimensions have names only because we built them by hand.
          </p>

          <div className="bg-[#1e293b]/50 border border-[#1e293b] rounded-2xl p-5 space-y-5">
            {(["paris", "berlin"] as const).map((word) => (
              <div key={word}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">{word}</span>
                  <span className="text-[#475569] text-xs">→</span>
                  <code className="text-xs text-[#94a3b8] font-mono break-all">
                    [{WORDS[word].vec.map((val) => val.toFixed(2)).join(", ")}]
                  </code>
                </div>
                <VectorBarChart values={WORDS[word].vec} color={CAT_COLORS[WORDS[word].category]} />
              </div>
            ))}

            <div className="pt-2 border-t border-[#1e293b]">
              <p className="text-xs text-[#475569] leading-relaxed">
                Paris and Berlin share the <span className="text-[#3bb4a4]">place</span> and{" "}
                <span className="text-[#3bb4a4]">capital</span> features, so their bars mostly
                line up; they differ on the country dimensions. That overlap is exactly why
                their cosine similarity is {cosineSim(WORDS.paris.vec, WORDS.berlin.vec).toFixed(2)}.
              </p>
              <p className="text-xs text-[#475569] leading-relaxed mt-2">
                One important difference from real systems: our dimensions are individually
                readable because we chose the features ourselves. Real embedding models learn
                vectors with 768 to 1536 dimensions from data, and those dimensions are
                generally not interpretable one at a time. Meaning lives in directions and in
                the relative geometry of the space as a whole, not in any single coordinate.
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
                color: "var(--color-accent)",
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
            <span className="text-[var(--color-accent)] text-lg mt-0.5" aria-hidden>★</span>
            <div>
              <p className="text-sm font-semibold text-[var(--color-accent)] mb-1">Key Insight</p>
              <p className="text-sm text-[#94a3b8] leading-relaxed">
                Modern LLMs use <strong className="text-white">contextual embeddings</strong>:
                the same word gets a different vector depending on its context, so
                &ldquo;bank&rdquo; in &ldquo;river bank&rdquo; and &ldquo;savings bank&rdquo;
                are represented differently, letting the model handle polysemy. Contextual
                embeddings actually predate transformer language models: ELMo (2018) produced them with
                bidirectional LSTMs. Transformer models like BERT and GPT then made them the
                dominant approach, replacing static embeddings like word2vec, where each word
                has one fixed vector like in our toy space above.
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
                <h2 className="text-2xl font-extrabold tracking-tight text-white">Word Space Explored!</h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You clicked through the embedding space and made vector arithmetic land on real words.
                </p>
              </div>

              <div className="px-6 py-5">
                <p className="text-[13px] text-[#94a3b8] leading-relaxed mb-4">
                  You explored nearest neighbors by cosine similarity, ran classic analogies like
                  king − man + woman ≈ queen, and looked inside the raw 16-dimensional vectors that
                  make it all work.
                </p>
                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">Key Takeaway</p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Meaning lives in geometry: words become vectors, similarity becomes
                    distance, and relationships become directions you can add and subtract.&quot;
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3">
                <Link href="/visual-guides"
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
                  ← All Guides
                </Link>
                <div className="flex items-center gap-3">
                  <button onClick={handleReset}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
                    Try Again
                  </button>
                  <Link href="/visual-guides/self-attention"
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
                    Next Guide →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← All Guides
          </Link>
          <Link
            href="/visual-guides/self-attention"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            Next Guide →
          </Link>
        </div>

      </div>
    </div>
  );
}
