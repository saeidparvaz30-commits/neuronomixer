"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import { useGuideMotion } from "@/lib/guideMotion";

// ── Data ────────────────────────────────────────────────────────────────────

type DocCategory = "ml" | "history" | "food" | "tech";

interface Doc {
  id: string;
  text: string;
  x: number;
  y: number;
  category: DocCategory;
}

const DOCUMENTS: Doc[] = [
  { id: "d1",  text: "Machine learning basics",    x:  0.8,  y:  0.7,  category: "ml" },
  { id: "d2",  text: "Deep neural networks",        x:  0.7,  y:  0.8,  category: "ml" },
  { id: "d3",  text: "Python for data science",     x:  0.5,  y:  0.6,  category: "ml" },
  { id: "d4",  text: "History of Rome",             x: -0.7,  y:  0.6,  category: "history" },
  { id: "d5",  text: "Ancient civilizations",       x: -0.8,  y:  0.7,  category: "history" },
  { id: "d6",  text: "Mediterranean culture",       x: -0.6,  y:  0.5,  category: "history" },
  { id: "d7",  text: "Cooking Italian pasta",       x: -0.3,  y: -0.7,  category: "food" },
  { id: "d8",  text: "French cuisine recipes",      x: -0.2,  y: -0.8,  category: "food" },
  { id: "d9",  text: "Baking sourdough bread",      x: -0.4,  y: -0.6,  category: "food" },
  { id: "d10", text: "Quantum computing intro",     x:  0.6,  y: -0.5,  category: "tech" },
  { id: "d11", text: "Cryptocurrency explained",    x:  0.7,  y: -0.6,  category: "tech" },
  { id: "d12", text: "Blockchain technology",       x:  0.8,  y: -0.5,  category: "tech" },
];

interface Query {
  text: string;
  x: number;
  y: number;
}

const QUERIES: Query[] = [
  { text: "How do neural networks learn?", x:  0.75, y:  0.75 },
  { text: "What did Romans eat?",          x: -0.65, y:  0.55 },
  { text: "How to make pizza?",            x: -0.3,  y: -0.65 },
  { text: "What is blockchain?",           x:  0.75, y: -0.55 },
];

const CAT_COLORS: Record<DocCategory, string> = {
  ml:      "#3bb4a4",
  history: "#d4af37",
  food:    "#ec4899",
  tech:    "#1e5d8a",
};

const CAT_LABELS: Record<DocCategory, string> = {
  ml:      "Machine Learning",
  history: "History",
  food:    "Food",
  tech:    "Technology",
};

// Cluster ellipses: [cx, cy, rx, ry, category]
const CLUSTER_ELLIPSES: [number, number, number, number, DocCategory][] = [
  [ 0.67,  0.7,  0.22, 0.18, "ml"      ],
  [-0.7,   0.6,  0.2,  0.18, "history" ],
  [-0.3,  -0.7,  0.2,  0.18, "food"    ],
  [ 0.7,  -0.55, 0.2,  0.15, "tech"    ],
];

const SVG_W = 500;
const SVG_H = 400;
const PAD = 44;

function toSvgX(x: number) {
  return PAD + ((x + 1) / 2) * (SVG_W - PAD * 2);
}
function toSvgY(y: number) {
  return PAD + ((1 - (y + 1) / 2)) * (SVG_H - PAD * 2);
}

function dist2D(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function cosineSim(ax: number, ay: number, bx: number, by: number) {
  const dot = ax * bx + ay * by;
  const na = Math.sqrt(ax * ax + ay * ay);
  const nb = Math.sqrt(bx * bx + by * by);
  if (na === 0 || nb === 0) return 0;
  return Math.max(-1, Math.min(1, dot / (na * nb)));
}

function getQueryResults(q: Query): { doc: Doc; sim: number }[] {
  return DOCUMENTS.map((doc) => ({
    doc,
    sim: cosineSim(q.x, q.y, doc.x, doc.y),
  }))
    .sort((a, b) => b.sim - a.sim);
}

// ── Subcomponents ────────────────────────────────────────────────────────────

function SectionBadge({ n }: { n: number }) {
  return (
    <span className="w-6 h-6 rounded-md bg-[#ec4899]/20 border border-[#ec4899]/40 flex items-center justify-center text-[#ec4899] text-xs font-bold flex-shrink-0">
      {n}
    </span>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function VectorDatabasesClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const completionFired = useRef(false);

  const [hoveredDoc, setHoveredDoc]           = useState<string | null>(null);
  const [activeQueryIdx, setActiveQueryIdx]   = useState<number | null>(null);
  const [queriesRun, setQueriesRun]           = useState<Set<number>>(new Set());
  const [hasSeenTable, setHasSeenTable]       = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // Intersection observer for completion
  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setHasSeenTable(true); },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const isComplete = queriesRun.size >= 2 && hasSeenTable;

  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "vector-databases", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  const progressPct =
    Math.min(queriesRun.size, 2) * 40 + (hasSeenTable ? 20 : 0);

  const activeQuery = activeQueryIdx !== null ? QUERIES[activeQueryIdx] : null;
  const queryResults = activeQuery ? getQueryResults(activeQuery) : [];
  const top3Ids = new Set(queryResults.slice(0, 3).map((r) => r.doc.id));

  // Max distance for color scaling
  const maxDist = Math.sqrt(8); // max possible in -1..1 space

  function handleQueryClick(idx: number) {
    setActiveQueryIdx(activeQueryIdx === idx ? null : idx);
    setQueriesRun((prev) => new Set([...prev, idx]));
  }

  function handleReset() {
    setHoveredDoc(null);
    setActiveQueryIdx(null);
    setQueriesRun(new Set());
    setHasSeenTable(false);
  }

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="vector-databases" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">Vector Databases: Semantic Search</span>
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
            Vector Databases:{" "}
            <span className="text-[var(--color-accent)]">Semantic Search</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
            Watch documents become vectors in 2D space. Run semantic queries and
            see nearest neighbors retrieved by cosine similarity, no keyword
            matching required.
          </p>
        </section>

        {/* Progress bar */}
        <div className="mb-8 bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <span className="text-sm text-[#94a3b8]">Exploration Progress</span>
            <span className="text-sm font-semibold text-white">
              {queriesRun.size >= 2 ? "2+ queries run ✓" : `Run ${queriesRun.size}/2 queries`}
              &nbsp;&middot;&nbsp;
              {hasSeenTable ? "Compared DBs ✓" : "Scroll to comparison"}
            </span>
          </div>
          <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #ec4899, #3bb4a4)" }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <AnimatePresence>
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-xs text-[var(--color-success)] font-semibold"
              >
                Guide complete! You understand how vector databases enable semantic search.
              </motion.div>
            )}
          </AnimatePresence>
          {!session?.user && (
            <p className="mt-2 text-[11px] text-[#475569]">Sign in to save progress</p>
          )}
        </div>

        {/* ── Section 1: The Vector Space ──────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <SectionBadge n={1} />
            The Vector Space
          </h2>
          <p className="text-sm text-[#475569] mb-4 ml-8">
            Each document is embedded as a point in vector space. Similar topics cluster together.
            Tap or hover a dot to read its text.
          </p>

          <div className="bg-[#1e293b]/50 border border-[#1e293b] rounded-2xl p-5">
            <div className="overflow-x-auto">
              <svg
                width={SVG_W}
                height={SVG_H}
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                className="block mx-auto max-w-full"
              >
                {/* Axes */}
                <line x1={toSvgX(0)} y1={PAD / 2} x2={toSvgX(0)} y2={SVG_H - PAD / 2}
                  stroke="#1e293b" strokeWidth={1} />
                <line x1={PAD / 2} y1={toSvgY(0)} x2={SVG_W - PAD / 2} y2={toSvgY(0)}
                  stroke="#1e293b" strokeWidth={1} />

                {/* Cluster ellipses */}
                {CLUSTER_ELLIPSES.map(([cx, cy, rx, ry, cat]) => (
                  <ellipse
                    key={cat}
                    cx={toSvgX(cx)} cy={toSvgY(cy)}
                    rx={rx * (SVG_W - PAD * 2) / 2}
                    ry={ry * (SVG_H - PAD * 2) / 2}
                    fill={CAT_COLORS[cat] + "12"}
                    stroke={CAT_COLORS[cat] + "35"}
                    strokeWidth={1}
                  />
                ))}

                {/* Query lines (when active) */}
                {activeQuery && DOCUMENTS.map((doc) => {
                  const sim = cosineSim(activeQuery.x, activeQuery.y, doc.x, doc.y);
                  const d = dist2D(activeQuery.x, activeQuery.y, doc.x, doc.y);
                  const opacity = 0.15 + (1 - d / maxDist) * 0.55;
                  const color = sim > 0.8 ? "#3bb4a4" : sim > 0.5 ? "var(--color-accent)" : "#475569";
                  return (
                    <line
                      key={doc.id}
                      x1={toSvgX(activeQuery.x)} y1={toSvgY(activeQuery.y)}
                      x2={toSvgX(doc.x)} y2={toSvgY(doc.y)}
                      stroke={color}
                      strokeWidth={top3Ids.has(doc.id) ? 1.5 : 0.75}
                      strokeOpacity={opacity}
                    />
                  );
                })}

                {/* Documents */}
                {DOCUMENTS.map((doc) => {
                  const cx = toSvgX(doc.x);
                  const cy = toSvgY(doc.y);
                  const color = CAT_COLORS[doc.category];
                  const isHovered = hoveredDoc === doc.id;
                  const isTop3 = top3Ids.has(doc.id);
                  const r = isTop3 ? 8 : isHovered ? 7 : 5;

                  return (
                    <g
                      key={doc.id}
                      onMouseEnter={() => setHoveredDoc(doc.id)}
                      onMouseLeave={() => setHoveredDoc(null)}
                      onClick={() => setHoveredDoc(doc.id)}
                      style={{ cursor: "pointer" }}
                    >
                      {isTop3 && (
                        <circle cx={cx} cy={cy} r={r + 5}
                          fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.4}
                        />
                      )}
                      <circle
                        cx={cx} cy={cy} r={r}
                        fill={color}
                        fillOpacity={isTop3 ? 1 : 0.72}
                        stroke={isTop3 ? color : "transparent"}
                        strokeWidth={isTop3 ? 1.5 : 0}
                      />
                    </g>
                  );
                })}

                {/* Query star */}
                {activeQuery && (() => {
                  const qx = toSvgX(activeQuery.x);
                  const qy = toSvgY(activeQuery.y);
                  return (
                    <g>
                      <circle cx={qx} cy={qy} r={14} fill="#ec4899" fillOpacity={0.15}
                        stroke="#ec4899" strokeWidth={1} strokeOpacity={0.5} />
                      <text x={qx} y={qy + 6} textAnchor="middle" fontSize={16}
                        fill="white" style={{ userSelect: "none" }}>★</text>
                    </g>
                  );
                })()}

                {/* Tooltip for hovered doc */}
                {hoveredDoc && (() => {
                  const doc = DOCUMENTS.find((d) => d.id === hoveredDoc)!;
                  const cx = toSvgX(doc.x);
                  const cy = toSvgY(doc.y);
                  const tipW = 240;
                  const tipX = Math.min(cx - tipW / 2, SVG_W - tipW - 4);
                  const tipY = cy - 40;
                  return (
                    <g>
                      <rect x={Math.max(tipX, 4)} y={Math.max(tipY, 4)}
                        width={tipW} height={28} rx={4}
                        fill="#0f172a" stroke="#1e293b" strokeWidth={1} />
                      <text
                        x={Math.max(tipX, 4) + tipW / 2}
                        y={Math.max(tipY, 4) + 19}
                        textAnchor="middle" fontSize={16}
                        fill="#e2e8f0"
                        style={{ pointerEvents: "none" }}
                      >
                        {doc.text}
                      </text>
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-3">
              {(Object.keys(CAT_COLORS) as DocCategory[]).map((cat) => (
                <div key={cat} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: CAT_COLORS[cat] }} />
                  <span className="text-[11px] text-[#94a3b8]">{CAT_LABELS[cat]}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <span className="text-[#ec4899] text-xs">★</span>
                <span className="text-[11px] text-[#94a3b8]">Query point</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 2: Run a Query ───────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <SectionBadge n={2} />
            Run a Query
          </h2>
          <p className="text-sm text-[#475569] mb-4 ml-8">
            Select a query to see it land in vector space. Lines show similarity to each
            document: the top 3 nearest are highlighted.
          </p>

          <div className="bg-[#1e293b]/50 border border-[#1e293b] rounded-2xl p-5">
            {/* Query buttons */}
            <div className="flex flex-wrap gap-2 mb-5">
              {QUERIES.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleQueryClick(i)}
                  aria-pressed={activeQueryIdx === i}
                  className="px-3 py-2 rounded-xl text-sm font-medium border transition-all text-left"
                  style={{
                    background: activeQueryIdx === i ? "#ec4899" + "20" : "#0f172a",
                    borderColor: activeQueryIdx === i ? "#ec4899" + "70" : "#334155",
                    color: activeQueryIdx === i ? "#ec4899" : "#94a3b8",
                  }}
                >
                  &ldquo;{q.text}&rdquo;
                </button>
              ))}
            </div>

            {/* Results */}
            <AnimatePresence mode="wait">
              {activeQuery ? (
                <motion.div
                  key={activeQueryIdx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-xs text-[#475569] mb-3 font-medium uppercase tracking-wide">
                    Top results by cosine similarity
                  </p>
                  <div className="space-y-2">
                    {queryResults.slice(0, 5).map(({ doc, sim }, rank) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 p-2.5 rounded-xl border"
                        style={{
                          background: rank < 3 ? CAT_COLORS[doc.category] + "10" : "#0f172a",
                          borderColor: rank < 3 ? CAT_COLORS[doc.category] + "40" : "#1e293b",
                        }}
                      >
                        <span className="text-xs font-bold text-[#475569] w-4 text-right flex-shrink-0">
                          {rank + 1}.
                        </span>
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: CAT_COLORS[doc.category] }}
                        />
                        <span
                          className="text-sm flex-1"
                          style={{ color: rank < 3 ? "white" : "#94a3b8" }}
                        >
                          {doc.text}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-16 h-1.5 rounded-full bg-[#1e293b] overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: CAT_COLORS[doc.category] }}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(0, sim) * 100}%` }}
                              transition={{ duration: 0.5, delay: rank * 0.05 }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-[#94a3b8] w-10 text-right">
                            {sim.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#334155] mt-3">
                    Similarity = cosine(A, B) = (A·B) / (|A|·|B|). Score of 1.0 = identical direction.
                  </p>
                </motion.div>
              ) : (
                <p className="text-xs text-[#334155] text-center py-4">
                  Click a query above to see the nearest neighbors retrieved from the vector index.
                </p>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ── Section 3: Keyword vs Semantic Search ───────────────────────── */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <SectionBadge n={3} />
            Keyword vs Semantic Search
          </h2>
          <p className="text-sm text-[#475569] mb-4 ml-8">
            Query: &ldquo;AI and neural nets&rdquo;. See how each approach handles it.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Keyword */}
            <div className="bg-[#1e293b]/50 border border-[#334155] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-[#475569]" />
                <span className="text-sm font-bold text-[#94a3b8]">Keyword Search</span>
                <span className="text-[10px] text-[#334155] ml-auto">SQL LIKE &apos;%neural%&apos;</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-[#0f172a] border border-[#3bb4a4]/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3bb4a4]" />
                  <span className="text-xs text-white">Deep neural networks</span>
                  <span className="text-[10px] text-[#3bb4a4] ml-auto">exact match</span>
                </div>
                <div className="p-2 rounded-lg bg-[#0f172a] border border-[#1e293b]">
                  <span className="text-xs text-[#334155] italic">
                    &ldquo;Machine learning basics&rdquo;: not returned (no &apos;neural&apos;)
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-[#0f172a] border border-[#1e293b]">
                  <span className="text-xs text-[#334155] italic">
                    &ldquo;Python for data science&rdquo;: not returned (no &apos;neural&apos;)
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-[#475569] mt-3">1 result. Misses semantically related docs.</p>
            </div>

            {/* Semantic */}
            <div className="bg-[#1e293b]/50 border border-[#3bb4a4]/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-[#3bb4a4]" />
                <span className="text-sm font-bold text-[#3bb4a4]">Semantic Search</span>
                <span className="text-[10px] text-[#475569] ml-auto">cosine similarity</span>
              </div>
              <div className="space-y-2">
                {[
                  "Machine learning basics",
                  "Deep neural networks",
                  "Python for data science",
                ].map((t, i) => (
                  <div key={t} className="flex items-center gap-2 p-2 rounded-lg bg-[#0f172a] border border-[#3bb4a4]/30">
                    <span className="text-[10px] text-[#475569] w-3">{i + 1}.</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3bb4a4]" />
                    <span className="text-xs text-white">{t}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[#3bb4a4] mt-3">3 results. Understands meaning, not just words.</p>
            </div>
          </div>
        </section>

        {/* ── Section 4: How It Works Under the Hood ───────────────────────── */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <SectionBadge n={4} />
            How It Works Under the Hood
          </h2>
          <p className="text-sm text-[#475569] mb-4 ml-8">
            Three stages from document to retrieval result.
          </p>

          <div className="bg-[#1e293b]/50 border border-[#1e293b] rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              {/* Step 1 */}
              <div className="flex-1 bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-[#ec4899]/20 border border-[#ec4899]/40
                    flex items-center justify-center text-[#ec4899] text-[10px] font-bold">1</span>
                  <span className="text-xs font-bold text-white">Embed</span>
                </div>
                <div className="flex flex-col gap-1 text-[11px]">
                  <span className="text-white font-mono bg-[#1e293b] px-2 py-1 rounded">
                    &ldquo;Machine learning basics&rdquo;
                  </span>
                  <span className="text-[#475569] text-center">↓ Embedding model</span>
                  <span className="text-[#3bb4a4] font-mono bg-[#1e293b] px-2 py-1 rounded">
                    [0.8, 0.7, -0.3, ...]
                  </span>
                  <span className="text-[#334155] mt-1">1536 floats (OpenAI ada-002)</span>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center text-[#334155] text-xl
                rotate-90 sm:rotate-0">→</div>

              {/* Step 2 */}
              <div className="flex-1 bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-[#ec4899]/20 border border-[#ec4899]/40
                    flex items-center justify-center text-[#ec4899] text-[10px] font-bold">2</span>
                  <span className="text-xs font-bold text-white">Index (HNSW)</span>
                </div>
                <svg width="100%" height="80" viewBox="0 0 140 80">
                  {/* HNSW graph nodes */}
                  {[
                    [20, 20], [70, 15], [120, 25],
                    [40, 55], [90, 60], [130, 55],
                  ].map(([x, y], i) => (
                    <g key={i}>
                      <circle cx={x} cy={y} r={7} fill="#1e5d8a" stroke="#3bb4a4" strokeWidth={1} />
                      <text x={x} y={y + 4} textAnchor="middle" fontSize={10} fill="#94a3b8">{i + 1}</text>
                    </g>
                  ))}
                  {/* Edges */}
                  {[
                    [20, 20, 70, 15], [70, 15, 120, 25],
                    [20, 20, 40, 55], [70, 15, 90, 60],
                    [120, 25, 130, 55], [40, 55, 90, 60],
                    [90, 60, 130, 55],
                  ].map(([x1, y1, x2, y2], i) => (
                    <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke="#334155" strokeWidth={1} />
                  ))}
                </svg>
                <p className="text-[11px] text-[#334155] mt-1">
                  Hierarchical Navigable Small World: O(log n) search
                </p>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center text-[#334155] text-xl
                rotate-90 sm:rotate-0">→</div>

              {/* Step 3 */}
              <div className="flex-1 bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-[#ec4899]/20 border border-[#ec4899]/40
                    flex items-center justify-center text-[#ec4899] text-[10px] font-bold">3</span>
                  <span className="text-xs font-bold text-white">ANN Retrieve</span>
                </div>
                <div className="space-y-1 text-[11px]">
                  <span className="text-[#ec4899] font-mono bg-[#1e293b] px-2 py-1 rounded block">
                    query vector
                  </span>
                  <span className="text-[#475569] text-center block">↓ top-k ANN search</span>
                  {["0.97 · doc A", "0.94 · doc B", "0.88 · doc C"].map((r) => (
                    <div key={r} className="flex items-center gap-1 bg-[#1e293b] rounded px-2 py-0.5">
                      <div className="w-1 h-1 rounded-full bg-[#3bb4a4]" />
                      <span className="text-[#3bb4a4]">{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 5: Popular Vector Databases ─────────────────────────── */}
        <section className="mb-10" ref={tableRef}>
          <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <SectionBadge n={5} />
            Popular Vector Databases
          </h2>
          <p className="text-sm text-[#475569] mb-4 ml-8">
            Choose the right tool for your use case.
          </p>

          <div className="bg-[#1e293b]/50 border border-[#1e293b] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e293b]">
                    {["Database", "Open Source", "Managed", "Best For"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold
                        text-[#94a3b8] uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { db: "Pinecone",  oss: false, managed: true,  best: "Production SaaS",    color: "#3bb4a4" },
                    { db: "Weaviate",  oss: true,  managed: true,  best: "Multi-modal",         color: "var(--color-accent)" },
                    { db: "Qdrant",    oss: true,  managed: true,  best: "High performance",    color: "#ec4899" },
                    { db: "pgvector",  oss: true,  managed: false, best: "Existing Postgres",   color: "#1e5d8a" },
                    { db: "Chroma",    oss: true,  managed: false, best: "Local dev",           color: "#a855f7" },
                  ].map(({ db, oss, managed, best, color }, i) => (
                    <tr
                      key={db}
                      className="border-b border-[#1e293b]/60 last:border-0 hover:bg-[#0f172a]/40
                        transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-semibold text-white" style={{ color }}>
                          {db}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={oss
                          ? "text-[#3bb4a4] font-medium"
                          : "text-[#475569]"}>
                          {oss ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={managed
                          ? "text-[#3bb4a4] font-medium"
                          : "text-[#475569]"}>
                          {managed ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#94a3b8] text-xs">{best}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Gold insight box */}
        <div className="mb-10 rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-5">
          <div className="flex items-start gap-3">
            <span className="text-[var(--color-accent)] text-lg mt-0.5" aria-hidden>★</span>
            <div>
              <p className="text-sm font-semibold text-[var(--color-accent)] mb-1">Key Insight</p>
              <p className="text-sm text-[#94a3b8] leading-relaxed">
                At 1M documents with 1536-dim vectors (OpenAI ada-002), you need approximately{" "}
                <strong className="text-white">~6 GB RAM</strong> just to store the index. Vector
                databases use specialized indexing (HNSW) to search millions of vectors in
                milliseconds; traditional SQL would require a full table scan, making it orders
                of magnitude slower.
              </p>
            </div>
          </div>
        </div>

        {/* Summary card */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/50 p-6">
          <p className="text-xs text-[#475569] uppercase tracking-wider mb-2">Up Next</p>
          <h3 className="text-lg font-bold text-white mb-1">Chunking Strategies for RAG</h3>
          <p className="text-sm text-[#94a3b8] mb-4 leading-relaxed">
            Before you can store documents in a vector database, you need to split them into
            meaningful chunks. See fixed-size, recursive, and semantic chunking applied side by side.
          </p>
          <Link
            href="/visual-guides/chunking-strategies"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "#ec4899" + "20",
              color: "#ec4899",
              border: "1px solid " + "#ec4899" + "40",
            }}
          >
            Explore Chunking Strategies
            <span aria-hidden>→</span>
          </Link>
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
                <h2 className="text-2xl font-extrabold tracking-tight text-white">Semantic Search Mastered!</h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You ran queries against a vector space, compared keyword vs semantic retrieval, and surveyed the database landscape.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Queries run", value: `${queriesRun.size} / ${QUERIES.length}`, color: "#ec4899" },
                    { label: "Search paradigms", value: "Keyword + Semantic", color: "#3bb4a4" },
                    { label: "Databases compared", value: "5", color: "var(--color-accent)" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-[#1e293b] p-3">
                      <p className="text-[10px] text-[#475569] mb-1">{item.label}</p>
                      <p className="text-[14px] font-mono font-bold" style={{ color: item.color }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">Key Takeaway</p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;A vector database retrieves by meaning, not by matching words. Embed everything into the same space, and the nearest neighbors of a question are its answers.&quot;
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3">
                <Link href="/visual-guides"
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors">
                  ← All Guides
                </Link>
                <div className="flex items-center gap-3">
                  <button onClick={handleReset}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors">
                    Try Again
                  </button>
                  <Link href="/visual-guides/chunking-strategies"
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
                    Next Guide →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer nav */}
        {!isComplete && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link href="/visual-guides"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors">
              ← All Guides
            </Link>
            <Link href="/visual-guides/chunking-strategies"
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
              Next Guide →
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
