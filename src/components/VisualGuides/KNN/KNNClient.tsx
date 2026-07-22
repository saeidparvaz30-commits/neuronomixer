"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Types ─────────────────────────────────────────────────────────────────────
interface TrainPt { id: number; x: number; y: number; cls: 0 | 1 }
interface QueryPt { id: number; x: number; y: number; predicted: 0 | 1; votes: [number, number] }

function euclidean(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ── Generate training data ────────────────────────────────────────────────────
// Two OVERLAPPING clusters: with fully separated blobs every K gives the same
// boundary, so overfitting/underfitting would be invisible. The overlap zone in
// the middle is what makes the choice of K matter.
function generateTrainingData(nPerClass = 75): TrainPt[] {
  const gauss = () => (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
  const clamp = (v: number) => Math.max(2, Math.min(98, v));
  const pts: TrainPt[] = [];
  for (let i = 0; i < nPerClass; i++) {
    pts.push({ id: i, x: clamp(40 + gauss() * 66), y: clamp(40 + gauss() * 66), cls: 0 });
  }
  for (let i = 0; i < nPerClass; i++) {
    pts.push({ id: nPerClass + i, x: clamp(60 + gauss() * 66), y: clamp(60 + gauss() * 66), cls: 1 });
  }
  return pts;
}

// Accuracy for every k in 1..maxK, computed from the actual points.
// Each evaluation point sorts the training set by distance once, then majority
// votes over the first k classes. When evalPts IS the training set, k=1 finds
// the point itself at distance 0, so training accuracy at K=1 is 100% by definition.
function accuracyCurve(evalPts: TrainPt[], train: TrainPt[], maxK: number): number[] {
  const correct = new Array(maxK).fill(0);
  for (const q of evalPts) {
    const sortedCls = [...train]
      .sort((a, b) => euclidean(q, a) - euclidean(q, b))
      .map(p => p.cls);
    let v1 = 0;
    for (let k = 1; k <= maxK; k++) {
      v1 += sortedCls[k - 1];
      const predicted = v1 >= k - v1 ? 1 : 0;
      if (predicted === q.cls) correct[k - 1]++;
    }
  }
  return correct.map(c => (c / evalPts.length) * 100);
}

function knnPredict(pt: { x: number; y: number }, train: TrainPt[], k: number): { predicted: 0 | 1; votes: [number, number] } {
  const sorted = [...train].sort((a, b) => euclidean(pt, a) - euclidean(pt, b));
  const nearest = sorted.slice(0, k);
  const v0 = nearest.filter(p => p.cls === 0).length;
  const v1 = nearest.filter(p => p.cls === 1).length;
  return { predicted: v1 >= v0 ? 1 : 0, votes: [v0, v1] };
}

// ── Boundary grid (low resolution for performance) ────────────────────────────
function computeBoundary(train: TrainPt[], k: number, gridN: number): number[][] {
  const grid: number[][] = [];
  for (let row = 0; row < gridN; row++) {
    grid.push([]);
    for (let col = 0; col < gridN; col++) {
      const x = (col + 0.5) * (100 / gridN);
      const y = (row + 0.5) * (100 / gridN);
      const { predicted } = knnPredict({ x, y }, train, k);
      grid[row].push(predicted);
    }
  }
  return grid;
}

// ── Main scatter with boundary ────────────────────────────────────────────────
function KNNPlot({
  train, queryPts, selectedQuery, k, boundary, gridN, onCanvasClick, onQuerySelect,
}: {
  train: TrainPt[]; queryPts: QueryPt[]; selectedQuery: number | null; k: number;
  boundary: number[][];  gridN: number;
  onCanvasClick: (x: number, y: number) => void;
  onQuerySelect: (id: number | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 500, H = 400, PAD = 20;
  const IW = W - 2 * PAD, IH = H - 2 * PAD;
  const tx = (v: number) => PAD + (v / 100) * IW;
  const ty = (v: number) => PAD + (v / 100) * IH;
  const cellW = IW / gridN, cellH = IH / gridN;

  function getCoords(e: React.MouseEvent) {
    const svg = svgRef.current;
    if (!svg) return { x: 50, y: 50 };
    const r = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    };
  }

  // K nearest neighbors for selected query
  const kNeighbors = useMemo(() => {
    if (selectedQuery === null) return [];
    const q = queryPts.find(p => p.id === selectedQuery);
    if (!q) return [];
    return [...train].sort((a, b) => euclidean(q, a) - euclidean(q, b)).slice(0, k);
  }, [selectedQuery, queryPts, train, k]);

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%"
      onClick={e => {
        if ((e.target as SVGElement).dataset.type === "query") return;
        const c = getCoords(e);
        onCanvasClick(c.x, c.y);
        onQuerySelect(null);
      }}
      style={{ cursor: "crosshair" }}>
      {/* Boundary background */}
      {boundary.map((row, ri) =>
        row.map((cls, ci) => (
          <rect key={`${ri}-${ci}`}
            x={PAD + ci * cellW} y={PAD + ri * cellH}
            width={cellW} height={cellH}
            fill={cls === 1 ? "#f97316" : "#3b82f6"} opacity="0.15" />
        ))
      )}

      {/* Training points */}
      {train.map(p => (
        <circle key={p.id} cx={tx(p.x)} cy={ty(p.y)} r="5"
          fill={p.cls === 1 ? "#f97316" : "#3b82f6"} opacity="0.75" stroke="#0f172a" strokeWidth="1" />
      ))}

      {/* K-neighbor circles */}
      {kNeighbors.map((n, i) => {
        const q = queryPts.find(p => p.id === selectedQuery);
        if (!q) return null;
        const dist = euclidean(q, n);
        return (
          <motion.circle key={n.id}
            cx={tx(n.x)} cy={ty(n.y)} r={8 + i * 0.5}
            fill="none" stroke={n.cls === 1 ? "#f97316" : "#3b82f6"} strokeWidth="2" opacity="0.6"
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05, type: "spring" }}
          />
        );
      })}

      {/* Query points */}
      {queryPts.map(q => (
        <motion.g key={q.id} data-type="query"
          onClick={e => { e.stopPropagation(); onQuerySelect(q.id === selectedQuery ? null : q.id); }}>
          <motion.polygon
            points={`${tx(q.x)},${ty(q.y) - 10} ${tx(q.x) + 8},${ty(q.y) + 5} ${tx(q.x) - 8},${ty(q.y) + 5}`}
            fill={q.predicted === 1 ? "#f97316" : "#3b82f6"}
            stroke="white" strokeWidth="2"
            animate={{ scale: q.id === selectedQuery ? 1.3 : 1 }}
            style={{ transformOrigin: `${tx(q.x)}px ${ty(q.y)}px`, cursor: "pointer" }}
            initial={{ scale: 0 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}
          />
        </motion.g>
      ))}

      {/* Axis labels */}
      <text x={PAD + IW / 2} y={H - 2} textAnchor="middle" fill="#475569" fontSize="16">Feature 1</text>
      <text x={10} y={PAD + IH / 2} textAnchor="middle" fill="#475569" fontSize="16"
        transform={`rotate(-90, 10, ${PAD + IH / 2})`}>Feature 2</text>
      <text x={PAD + 4} y={PAD + 18} fill="#475569" fontSize="16">Click to add query point (▲)</text>
    </svg>
  );
}

// ── Accuracy chart ────────────────────────────────────────────────────────────
function AccuracyChart({ trainAcc, validAcc, currentK }: { trainAcc: number[]; validAcc: number[]; currentK: number }) {
  const W = 280, H = 120, PAD = { l: 32, r: 8, t: 8, b: 24 };
  const IW = W - PAD.l - PAD.r, IH = H - PAD.t - PAD.b;

  const maxK = trainAcc.length;
  const yMin = Math.min(60, Math.floor(Math.min(...trainAcc, ...validAcc) / 5) * 5);

  const ks = Array.from({ length: maxK }, (_, i) => i + 1);
  const tx = (k: number) => PAD.l + ((k - 1) / (maxK - 1)) * IW;
  const ty = (v: number) => PAD.t + IH - ((v - yMin) / (100 - yMin)) * IH;

  const yTicks = Array.from(
    { length: Math.floor((100 - yMin) / 10) + 1 },
    (_, i) => yMin + i * 10
  );

  const trainPath = ks.map((k, i) => `${i === 0 ? "M" : "L"} ${tx(k).toFixed(1)} ${ty(trainAcc[k - 1]).toFixed(1)}`).join(" ");
  const validPath = ks.map((k, i) => `${i === 0 ? "M" : "L"} ${tx(k).toFixed(1)} ${ty(validAcc[k - 1]).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      <line x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />

      <path d={trainPath} fill="none" stroke="#3b82f6" strokeWidth="1.5" />
      <path d={validPath} fill="none" stroke="#f97316" strokeWidth="1.5" />

      {/* Current K indicator */}
      <line x1={tx(currentK)} y1={PAD.t} x2={tx(currentK)} y2={PAD.t + IH}
        stroke="var(--color-accent)" strokeWidth="1.5" strokeDasharray="3,2" />

      {yTicks.map(v => (
        <text key={v} x={PAD.l - 3} y={ty(v) + 3} textAnchor="end" fill="#475569" fontSize="10">{v}</text>
      ))}
      {[1, 5, 10, 15, 20].map(k => (
        <text key={k} x={tx(k)} y={PAD.t + IH + 12} textAnchor="middle" fill="#475569" fontSize="10">{k}</text>
      ))}
      <text x={PAD.l + IW / 2} y={H - 2} textAnchor="middle" fill="#475569" fontSize="10">K</text>
      <text x={PAD.l + IW - 2} y={ty(trainAcc[maxK - 1]) - 3} textAnchor="end" fill="#3b82f6" fontSize="10">Train</text>
      <text x={PAD.l + IW - 2} y={ty(validAcc[maxK - 1]) + 10} textAnchor="end" fill="#f97316" fontSize="10">Valid</text>
    </svg>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function KNNClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const [train] = useState<TrainPt[]>(() => generateTrainingData());
  const [validation] = useState<TrainPt[]>(() => generateTrainingData(25));
  const [k, setK] = useState(5);
  const [queryPts, setQueryPts] = useState<QueryPt[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<number | null>(null);
  const nextId = useRef(0);
  const [kMoved, setKMoved] = useState<[number, number]>([5, 5]);
  const completionFired = useRef(false);

  const GRID_N = 30;
  const boundary = useMemo(() => computeBoundary(train, k, GRID_N), [train, k]);
  const accCurves = useMemo(() => ({
    train: accuracyCurve(train, train, 20),
    valid: accuracyCurve(validation, train, 20),
  }), [train, validation]);

  const allComplete = queryPts.length >= 1 && (Math.abs(kMoved[0] - kMoved[1]) >= 10);

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "knn", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  const handleCanvasClick = useCallback((x: number, y: number) => {
    if (queryPts.length >= 10) return;
    const { predicted, votes } = knnPredict({ x, y }, train, k);
    const id = nextId.current++;
    setQueryPts(prev => [...prev, { id, x, y, predicted, votes }]);
    setSelectedQuery(id);
  }, [train, k, queryPts.length]);

  function handleKChange(newK: number) {
    setK(newK);
    setKMoved(prev => {
      const mn = Math.min(prev[0], newK);
      const mx = Math.max(prev[1], newK);
      return [mn, mx];
    });
    // Re-predict all query points
    setQueryPts(prev => prev.map(q => {
      const { predicted, votes } = knnPredict({ x: q.x, y: q.y }, train, newK);
      return { ...q, predicted, votes };
    }));
  }

  function handleReset() {
    setK(5);
    setQueryPts([]);
    setSelectedQuery(null);
    setKMoved([5, 5]);
  }

  // Completion-card recap: where validation accuracy peaks on the live curve.
  const bestValidAcc = Math.max(...accCurves.valid);
  const bestValidK = accCurves.valid.indexOf(bestValidAcc) + 1;

  const selectedQ = queryPts.find(q => q.id === selectedQuery);
  const kNeighbors = selectedQ
    ? [...train].sort((a, b) => euclidean(selectedQ, a) - euclidean(selectedQ, b)).slice(0, k)
    : [];

  const kLabel = k <= 2 ? "⚠ Overfitting: boundary follows noise" : k >= 15 ? "⚠ Large K: smoother boundary; watch the validation curve for where accuracy peaks" : "✓ Balanced boundary";

  const progress = [
    { label: queryPts.length >= 1 ? "Query point added ✓" : "Add a query point", done: queryPts.length >= 1 },
    { label: `K range explored: ${Math.abs(kMoved[0] - kMoved[1])}/10`, done: Math.abs(kMoved[0] - kMoved[1]) >= 10 },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allComplete} guideSlug="knn" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">KNN</span>
        </nav>

        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">Machine Learning</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            KNN: <span className="text-[var(--color-accent)]">How Many Neighbors Matter?</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            Adjust K and watch the decision boundary transform. Click anywhere on the plot to add a test point
            and see its K nearest neighbors highlighted.
          </p>
        </section>

        {/* Progress */}
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

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Main plot */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <div className="flex items-center gap-4 mb-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#3b82f6]" />
                  <span className="text-[10px] text-[#94a3b8]">Class 0</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#f97316]" />
                  <span className="text-[10px] text-[#94a3b8]">Class 1</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-white/60" />
                  <span className="text-[10px] text-[#94a3b8]">Query point</span>
                </div>
                <button onClick={() => { setQueryPts([]); setSelectedQuery(null); }}
                  className="ml-auto text-[10px] text-[#475569] hover:text-white transition-colors">
                  Clear queries
                </button>
              </div>

              <KNNPlot train={train} queryPts={queryPts} selectedQuery={selectedQuery} k={k}
                boundary={boundary} gridN={GRID_N}
                onCanvasClick={handleCanvasClick} onQuerySelect={setSelectedQuery} />

              {/* K slider */}
              <div className="mt-4">
                <div className="flex justify-between mb-1">
                  <span className="text-[11px] text-white">K (number of neighbors)</span>
                  <span className="text-[11px] font-mono text-[var(--color-accent)]">K = {k}</span>
                </div>
                <input type="range" min={1} max={20} step={1} value={k} aria-label="K (number of neighbors)"
                  onChange={e => handleKChange(Number(e.target.value))}
                  className="w-full" style={{ accentColor: "var(--color-accent)" }} />
                <p className={`text-[10px] mt-1 ${k <= 2 || k >= 15 ? "text-[#ef4444]/80" : "text-[#3bb4a4]"}`}>
                  {kLabel}
                </p>
              </div>
            </div>

            {/* Accuracy chart */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">Training vs Validation Accuracy (Computed Live)</p>
              <AccuracyChart trainAcc={accCurves.train} validAcc={accCurves.valid} currentK={k} />
              <div className="flex items-center gap-4 mt-2 text-[10px]">
                <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-[#3b82f6]" /> Training</span>
                <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-[#f97316]" /> Validation</span>
                <span className="text-[var(--color-accent)]">│ current K</span>
              </div>
              <p className="text-[10px] text-[#475569] mt-2 leading-relaxed">
                Both curves are computed from the actual points: training accuracy scores the visible
                points against themselves (at K=1 each point finds itself, so it is always 100%),
                validation accuracy scores 50 held-out points drawn from the same two clusters.
              </p>
            </div>
          </div>

          {/* Right panel */}
          <div className="space-y-5">
            {/* Query details */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">
                {selectedQ ? "Query Point Details" : "Click to Select Query Point"}
              </p>
              <AnimatePresence mode="wait">
                {selectedQ ? (
                  <motion.div key={selectedQ.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#475569]">Position</span>
                        <span className="font-mono text-white">({selectedQ.x.toFixed(1)}, {selectedQ.y.toFixed(1)})</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#475569]">Predicted class</span>
                        <span className="font-semibold" style={{ color: selectedQ.predicted === 1 ? "#f97316" : "#3b82f6" }}>
                          Class {selectedQ.predicted}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#475569]">Vote tally</span>
                        <span className="text-white">Blue {selectedQ.votes[0]} / Orange {selectedQ.votes[1]}</span>
                      </div>
                    </div>
                    <p className="text-[10px] font-semibold text-[#475569] mb-2">Top {Math.min(k, 5)} neighbors</p>
                    <div className="space-y-1.5">
                      {kNeighbors.slice(0, 5).map((n, i) => (
                        <div key={n.id} className="flex items-center gap-2 text-[10px]">
                          <span className="text-[#334155] w-4">#{i + 1}</span>
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: n.cls === 1 ? "#f97316" : "#3b82f6" }} />
                          <span className="text-[#94a3b8]">Class {n.cls}</span>
                          <span className="ml-auto font-mono text-[#475569]">d={euclidean(selectedQ, n).toFixed(1)}</span>
                        </div>
                      ))}
                      {k > 5 && <p className="text-[9px] text-[#334155]">+{k - 5} more neighbors</p>}
                    </div>
                    <button onClick={() => { setQueryPts(prev => prev.filter(q => q.id !== selectedQ.id)); setSelectedQuery(null); }}
                      className="w-full mt-3 py-1.5 rounded-lg text-[10px] border border-[#1e293b] text-[#475569] hover:text-[#ef4444] transition-colors">
                      Remove this point
                    </button>
                  </motion.div>
                ) : (
                  <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-[11px] text-[#334155] leading-relaxed">
                    Click on the scatter plot to add a test point. Its K nearest neighbors will highlight with circles.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Key concepts */}
            <div className="space-y-3">
              {[
                { k: 1, label: "K=1", desc: "Overfitting: each point is its own boundary. Noise has too much influence.", color: "#ef4444" },
                { k: 5, label: "K=5", desc: "Balanced: typically good generalization for most datasets.", color: "#3bb4a4" },
                { k: 20, label: "K=20", desc: "Underfitting: boundaries too smooth, may miss real patterns.", color: "var(--color-accent)" },
              ].map(({ k: pk, label, desc, color }) => (
                <button key={label} onClick={() => handleKChange(pk)}
                  className="w-full text-left rounded-xl border border-[#1e293b] p-3 hover:border-[#334155] transition-colors">
                  <p className="text-[11px] font-semibold mb-1" style={{ color }}>{label}</p>
                  <p className="text-[10px] text-[#475569] leading-snug">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Completion card */}
        <AnimatePresence>
          {allComplete && (
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
                  You Tuned the Neighborhood
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You added query points, watched their neighbors vote, and swept
                  K from jagged overfitting to oversmoothed boundaries.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Query points placed</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {queryPts.length}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      classified by neighbor vote
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">K range explored</p>
                    <p className="text-[14px] font-mono font-bold text-[#3bb4a4]">
                      {kMoved[0]} to {kMoved[1]}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      a span of {Math.abs(kMoved[0] - kMoved[1])} values
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Validation peak</p>
                    <p className="text-[14px] font-mono font-bold text-[#f97316]">
                      {bestValidAcc.toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      at K = {bestValidK} on the live curve
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;KNN has no training step, only a choice: small K
                    memorizes noise, large K blurs real structure, and the
                    validation curve, not the training curve, tells you where the
                    balance lies.&quot;
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
                    href="/visual-guides/svm"
                    className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
                  >
                    Next Guide →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!allComplete && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link href="/visual-guides/k-means"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors">
              ← Previous Guide
            </Link>
            <Link href="/visual-guides/svm"
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
              Next Guide →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
