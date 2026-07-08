"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Point { id: number; x: number; y: number; cluster: number | null }
interface Centroid { id: number; x: number; y: number; cluster: number }

const CLUSTER_COLORS = ["#3b82f6", "#f97316", "#22c55e", "#a855f7", "#ef4444", "#06b6d4"];

// ── Dataset generation ────────────────────────────────────────────────────────
function generatePoints(): Point[] {
  const clusters = [
    { cx: 25, cy: 25, n: 65 },
    { cx: 75, cy: 25, n: 70 },
    { cx: 50, cy: 75, n: 65 },
  ];
  const pts: Point[] = [];
  clusters.forEach(({ cx, cy, n }) => {
    for (let i = 0; i < n; i++) {
      pts.push({
        id: pts.length,
        x: Math.max(5, Math.min(95, cx + (Math.random() - 0.5) * 30)),
        y: Math.max(5, Math.min(95, cy + (Math.random() - 0.5) * 30)),
        cluster: null,
      });
    }
  });
  return pts;
}

function euclidean(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function assignClusters(pts: Point[], centroids: Centroid[]): Point[] {
  return pts.map(p => ({
    ...p,
    cluster: centroids.reduce((best, c) =>
      euclidean(p, c) < euclidean(p, centroids[best]) ? c.cluster : best, 0),
  }));
}

function updateCentroids(pts: Point[], centroids: Centroid[]): Centroid[] {
  return centroids.map(c => {
    const members = pts.filter(p => p.cluster === c.cluster);
    if (members.length === 0) return c;
    return {
      ...c,
      x: members.reduce((a, p) => a + p.x, 0) / members.length,
      y: members.reduce((a, p) => a + p.y, 0) / members.length,
    };
  });
}

function computeInertia(pts: Point[], centroids: Centroid[]): number {
  return pts.reduce((sum, p) => {
    const c = centroids.find(c => c.cluster === p.cluster);
    return sum + (c ? euclidean(p, c) ** 2 : 0);
  }, 0);
}

function hasConverged(prev: Centroid[], next: Centroid[]): boolean {
  return prev.every((c, i) => euclidean(c, next[i]) < 0.3);
}

// ── Scatter plot ──────────────────────────────────────────────────────────────
function Scatter({
  points, centroids, placingMode, k, onCanvasClick,
}: {
  points: Point[]; centroids: Centroid[]; placingMode: boolean; k: number;
  onCanvasClick: (x: number, y: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 500, H = 400, PAD = 24;
  const IW = W - 2 * PAD, IH = H - 2 * PAD;
  const tx = (v: number) => PAD + (v / 100) * IW;
  const ty = (v: number) => PAD + (v / 100) * IH;

  function getCoords(e: React.MouseEvent) {
    const svg = svgRef.current;
    if (!svg) return { x: 50, y: 50 };
    const r = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    };
  }

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%"
      onClick={e => { if (placingMode) { const c = getCoords(e); onCanvasClick(c.x, c.y); } }}
      style={{ cursor: placingMode && centroids.length < k ? "crosshair" : "default" }}>
      {/* Grid */}
      {[0, 25, 50, 75, 100].map(t => (
        <g key={t}>
          <line x1={tx(t)} y1={PAD} x2={tx(t)} y2={PAD + IH} stroke="#1e293b" strokeWidth="1" />
          <line x1={PAD} y1={ty(t)} x2={PAD + IW} y2={ty(t)} stroke="#1e293b" strokeWidth="1" />
        </g>
      ))}

      {/* Points */}
      {points.map(p => (
        <motion.circle key={p.id} cx={tx(p.x)} cy={ty(p.y)} r="5"
          fill={p.cluster !== null ? CLUSTER_COLORS[p.cluster] : "#475569"}
          opacity="0.75" stroke="#0f172a" strokeWidth="1"
          animate={{ fill: p.cluster !== null ? CLUSTER_COLORS[p.cluster] : "#475569" }}
          transition={{ duration: 0.3 }}
        />
      ))}

      {/* Centroids */}
      {centroids.map(c => (
        <motion.g key={c.id}
          animate={{ x: tx(c.x) - 10, y: ty(c.y) - 10 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 120, damping: 14 }}>
          <polygon points="10,0 12.5,7 20,7 14,11.5 16.5,18.5 10,14 3.5,18.5 6,11.5 0,7 7.5,7"
            fill={CLUSTER_COLORS[c.cluster]} stroke="white" strokeWidth="1.5"
            transform={`translate(${tx(c.x) - 10}, ${ty(c.y) - 10})`}
          />
        </motion.g>
      ))}

      {/* Placement hint */}
      {placingMode && centroids.length < k && (
        <text x={W / 2} y={H - 6} textAnchor="middle" fill="#475569" fontSize="11">
          Click to place centroid {centroids.length + 1} of {k}
        </text>
      )}

      {/* Axis labels */}
      <text x={PAD + IW / 2} y={H - 4} textAnchor="middle" fill="#475569" fontSize="10">Feature 1</text>
      <text x={8} y={PAD + IH / 2} textAnchor="middle" fill="#475569" fontSize="10"
        transform={`rotate(-90, 8, ${PAD + IH / 2})`}>Feature 2</text>
    </svg>
  );
}

// ── Elbow chart ───────────────────────────────────────────────────────────────
function ElbowChart({ elbowData, currentK }: { elbowData: { k: number; inertia: number }[]; currentK: number }) {
  if (elbowData.length === 0) return (
    <div className="text-center py-6 text-[#334155] text-[11px]">
      Run the algorithm with different K values to build the elbow curve
    </div>
  );

  const W = 300, H = 140, PAD = { l: 36, r: 12, t: 8, b: 24 };
  const IW = W - PAD.l - PAD.r, IH = H - PAD.t - PAD.b;
  const maxI = Math.max(...elbowData.map(d => d.inertia), 1);
  const tx = (k: number) => PAD.l + ((k - 2) / 4) * IW;
  const ty = (v: number) => PAD.t + IH - (v / maxI) * IH;

  const path = elbowData.map((d, i) => `${i === 0 ? "M" : "L"} ${tx(d.k).toFixed(1)} ${ty(d.inertia).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      <line x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
      {[2, 3, 4, 5, 6].map(k => (
        <text key={k} x={tx(k)} y={PAD.t + IH + 14} textAnchor="middle" fill={k === currentK ? "var(--color-accent)" : "#475569"} fontSize="9">{k}</text>
      ))}
      {elbowData.length > 1 && <path d={path} fill="none" stroke="#3bb4a4" strokeWidth="2" />}
      {elbowData.map(d => (
        <motion.circle key={d.k} cx={tx(d.k)} cy={ty(d.inertia)} r={d.k === currentK ? 6 : 4}
          fill={d.k === currentK ? "var(--color-accent)" : "#3bb4a4"}
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
        />
      ))}
      <text x={PAD.l + IW / 2} y={H - 2} textAnchor="middle" fill="#475569" fontSize="9">K</text>
    </svg>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function KMeansClient() {
  const { data: session } = useSession();
  const [k, setK] = useState(3);
  const [points, setPoints] = useState<Point[]>(() => generatePoints());
  const [centroids, setCentroids] = useState<Centroid[]>([]);
  const [phase, setPhase] = useState<"setup" | "running" | "converged">("setup");
  const [stepPhase, setStepPhase] = useState<"assign" | "update">("assign");
  const [iteration, setIteration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [inertia, setInertia] = useState(0);
  const [elbowData, setElbowData] = useState<{ k: number; inertia: number }[]>([]);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextCentroidId = useRef(0);

  // Progress
  const [iterationsRun, setIterationsRun] = useState(0);
  const [viewedBadInit, setViewedBadInit] = useState(false);
  const completionFired = useRef(false);
  const allComplete = iterationsRun >= 5 && viewedBadInit;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "k-means", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  function handleCanvasClick(x: number, y: number) {
    if (phase !== "setup" || centroids.length >= k) return;
    const id = nextCentroidId.current++;
    setCentroids(prev => [...prev, { id, x, y, cluster: prev.length }]);
  }

  function resetAll() {
    setPoints(generatePoints());
    setCentroids([]);
    setPhase("setup");
    setStepPhase("assign");
    setIteration(0);
    setIsPlaying(false);
    setInertia(0);
    if (playRef.current) clearInterval(playRef.current);
  }

  function resetCentroids() {
    setPoints(prev => prev.map(p => ({ ...p, cluster: null })));
    setCentroids([]);
    setPhase("setup");
    setStepPhase("assign");
    setIteration(0);
    setIsPlaying(false);
    if (playRef.current) clearInterval(playRef.current);
  }

  function badInit() {
    setViewedBadInit(true);
    setPoints(prev => prev.map(p => ({ ...p, cluster: null })));
    // Place all centroids in the same corner
    const newCentroids = Array.from({ length: k }, (_, i) => ({
      id: nextCentroidId.current++,
      x: 10 + i * 3,
      y: 10 + i * 3,
      cluster: i,
    }));
    setCentroids(newCentroids);
    setPhase("running");
    setStepPhase("assign");
    setIteration(0);
    setIsPlaying(false);
  }

  // One call = one half of the k-means loop, so the two phases genuinely alternate:
  // "assign" colors points by nearest centroid, "update" moves centroids to the mean.
  const runStep = useCallback(() => {
    if (stepPhase === "assign") {
      const assigned = assignClusters(points, centroids);
      setPoints(assigned);
      setInertia(computeInertia(assigned, centroids));
      setStepPhase("update");
      return;
    }

    const newCentroids = updateCentroids(points, centroids);
    const converged = hasConverged(centroids, newCentroids);
    const i = computeInertia(points, newCentroids);

    setCentroids(newCentroids);
    setInertia(i);
    setIteration(n => n + 1);
    setIterationsRun(n => n + 1);
    setStepPhase("assign");

    if (converged) {
      setPhase("converged");
      setIsPlaying(false);
      if (playRef.current) clearInterval(playRef.current);
      setElbowData(prev2 => {
        const filtered = prev2.filter(d => d.k !== k);
        return [...filtered, { k, inertia: i }].sort((a, b) => a.k - b.k);
      });
    }
  }, [points, centroids, k, stepPhase]);

  useEffect(() => {
    if (isPlaying) {
      playRef.current = setInterval(runStep, 900);
    } else {
      if (playRef.current) clearInterval(playRef.current);
    }
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, [isPlaying, runStep]);

  function startAlgorithm() {
    if (centroids.length < k) return;
    setPhase("running");
    setStepPhase("assign");
    setIteration(0);
  }

  const clusterStats = useMemo(() => {
    const stats: Record<number, { count: number; inertia: number }> = {};
    centroids.forEach(c => { stats[c.cluster] = { count: 0, inertia: 0 }; });
    points.forEach(p => {
      if (p.cluster === null) return;
      const c = centroids.find(c => c.cluster === p.cluster);
      if (!c) return;
      stats[p.cluster].count++;
      stats[p.cluster].inertia += euclidean(p, c) ** 2;
    });
    return stats;
  }, [points, centroids]);

  const progress = [
    { label: `Iterations run: ${Math.min(iterationsRun, 5)}/5`, done: iterationsRun >= 5 },
    { label: "Observed bad init", done: viewedBadInit },
  ];

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">K-Means Clustering</span>
        </nav>

        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">Machine Learning</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            K-Means Clustering <span className="text-[var(--color-accent)]">Step by Step</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            Click to place K centroids on the canvas, then step through iterations watching
            assignment and centroid update alternate until convergence.
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

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Left: scatter */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
                  {phase === "setup"
                    ? `Place ${k} centroids (click canvas)`
                    : phase === "converged"
                    ? `Iteration ${iteration}`
                    : `Iteration ${iteration}: ${stepPhase === "update" ? "points assigned" : "awaiting assignment"}`}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-[#475569]">
                  <span>⭐ = centroid</span>
                  {inertia > 0 && <span className="font-mono text-[var(--color-accent)]">Inertia: {inertia.toFixed(0)}</span>}
                </div>
              </div>

              <Scatter points={points} centroids={centroids} placingMode={phase === "setup"} k={k} onCanvasClick={handleCanvasClick} />

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1.5">
                  {centroids.map(c => (
                    <div key={c.cluster} className="w-3 h-3 rounded-full" style={{ background: CLUSTER_COLORS[c.cluster] }} />
                  ))}
                  {centroids.length > 0 && <span className="text-[10px] text-[#475569]">{centroids.length}/{k} centroids placed</span>}
                </div>
                {phase === "converged" && (
                  <span className="text-[11px] font-semibold text-[#3bb4a4]">✓ Converged in {iteration} iterations</span>
                )}
              </div>
            </div>

            {/* Cluster stats */}
            {Object.keys(clusterStats).length > 0 && (
              <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">Cluster Statistics</p>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(clusterStats).map(([ci, stats]) => (
                    <div key={ci} className="rounded-xl border border-[#1e293b] p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: CLUSTER_COLORS[Number(ci)] }} />
                        <p className="text-[10px] font-semibold text-white">Cluster {Number(ci) + 1}</p>
                      </div>
                      <p className="text-[13px] font-bold text-white">{stats.count} pts</p>
                      <p className="text-[9px] text-[#475569]">Inertia: {stats.inertia.toFixed(1)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: controls */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-4">Algorithm Setup</p>

              {/* K selector */}
              <div className="mb-4">
                <div className="flex justify-between mb-1">
                  <span className="text-[11px] text-white">Number of clusters (K)</span>
                  <span className="text-[11px] font-mono text-[var(--color-accent)]">{k}</span>
                </div>
                <input type="range" min={2} max={6} step={1} value={k} aria-label="Number of clusters (K)"
                  onChange={e => { setK(Number(e.target.value)); resetCentroids(); }}
                  className="w-full" style={{ accentColor: "var(--color-accent)" }} />
                <div className="flex justify-between text-[9px] text-[#334155] mt-0.5">
                  {[2,3,4,5,6].map(v => <span key={v}>{v}</span>)}
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-2">
                {phase === "setup" && centroids.length === k && (
                  <motion.button onClick={startAlgorithm}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="w-full py-2 rounded-xl text-[12px] font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
                    Start Algorithm
                  </motion.button>
                )}
                {phase === "running" && (
                  <div className="flex gap-2">
                    <button onClick={runStep} disabled={isPlaying}
                      className="flex-1 py-2 rounded-xl text-[12px] font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors disabled:opacity-40">
                      Step
                    </button>
                    <button onClick={() => setIsPlaying(!isPlaying)}
                      className={`flex-1 py-2 rounded-xl text-[12px] font-semibold border transition-colors ${isPlaying ? "border-[#3bb4a4] text-[#3bb4a4]" : "border-[#1e293b] text-white hover:border-[#3bb4a4] hover:text-[#3bb4a4]"}`}>
                      {isPlaying ? "Pause" : "Play"}
                    </button>
                  </div>
                )}
                <button onClick={badInit}
                  className="w-full py-2 rounded-xl text-[12px] font-semibold border border-[#ef4444]/40 text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors">
                  Bad Init (suboptimal start)
                </button>
                <button onClick={resetAll}
                  className="w-full py-2 rounded-xl text-[11px] border border-[#1e293b] text-[#475569] hover:text-white transition-colors">
                  Reset Everything
                </button>
              </div>
            </div>

            {/* Algorithm explanation */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">What's Happening</p>
              <AnimatePresence mode="wait">
                <motion.p key={phase + stepPhase + iteration} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="text-[11px] text-[#94a3b8] leading-relaxed">
                  {phase === "setup"
                    ? `Click on the scatter plot to place ${k} starting centroids. These are the initial cluster centers.`
                    : phase === "converged"
                    ? `Converged after ${iteration} iterations. Centroids no longer move. Inertia: ${inertia.toFixed(0)}.`
                    : stepPhase === "assign"
                    ? "Next step is Assignment: each point gets colored by its nearest centroid (Euclidean distance)."
                    : "Assignment done. Next step is Update: each centroid moves to the mean of its assigned points."}
                </motion.p>
              </AnimatePresence>
              {viewedBadInit && (
                <p className="text-[10px] text-[#ef4444]/80 mt-2 leading-relaxed">
                  Bad initialization can trap the algorithm in a local optimum. K-means++ and random restarts help.
                </p>
              )}
            </div>

            {/* Elbow chart */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">Elbow Curve</p>
              <ElbowChart elbowData={elbowData} currentK={k} />
              <p className="text-[10px] text-[#475569] mt-2 leading-relaxed">
                Run with K=2..6 to build the curve. The "elbow" suggests the optimal number of clusters.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link href="/visual-guides/decision-trees"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors">
            ← Previous Guide
          </Link>
          <Link href="/visual-guides/knn"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
            Next Guide →
          </Link>
        </div>

        <GuideCompletion isComplete={allComplete} guideSlug="k-means" score={100} />
      </div>
    </div>
  );
}
