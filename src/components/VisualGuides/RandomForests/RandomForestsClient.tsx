"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import { useGuideMotion } from "@/lib/guideMotion";

const GUIDE_TITLE = "Random Forests: Wisdom of the Crowd";
const NEXT_GUIDE_SLUG = "gradient-descent";
const PREV_GUIDE_SLUG = "svm";

// ── Types ─────────────────────────────────────────────────────────────────────
interface DataPt { x: number; y: number; cls: 0 | 1 }
interface TreeNode {
  isLeaf: boolean;
  label?: 0 | 1;
  feature?: 0 | 1;  // 0=x, 1=y
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

// ── Decision Tree (shallow, max depth 3) ─────────────────────────────────────
function gini(pts: DataPt[]): number {
  if (pts.length === 0) return 0;
  const p1 = pts.filter(p => p.cls === 1).length / pts.length;
  return 1 - p1 * p1 - (1 - p1) * (1 - p1);
}

function majorityClass(pts: DataPt[]): 0 | 1 {
  return pts.filter(p => p.cls === 1).length >= pts.length / 2 ? 1 : 0;
}

function buildTree(pts: DataPt[], depth: number, maxDepth: number): TreeNode {
  if (depth >= maxDepth || pts.length < 4 || gini(pts) < 0.05) {
    return { isLeaf: true, label: majorityClass(pts) };
  }
  // Random forest samples candidate features at EACH SPLIT (mtry), not once per tree.
  // With 2 features and the usual mtry = sqrt(n_features) = 1, each split considers 1 random feature.
  const featureSubset = splitFeatureCandidates();
  let bestGain = -1, bestFeat = 0, bestThresh = 0;
  for (const feat of featureSubset) {
    const vals = pts.map(p => feat === 0 ? p.x : p.y).sort((a, b) => a - b);
    for (let i = 0; i < vals.length - 1; i++) {
      const thresh = (vals[i] + vals[i + 1]) / 2;
      const left = pts.filter(p => (feat === 0 ? p.x : p.y) <= thresh);
      const right = pts.filter(p => (feat === 0 ? p.x : p.y) > thresh);
      if (left.length === 0 || right.length === 0) continue;
      const gain = gini(pts) - (left.length / pts.length) * gini(left) - (right.length / pts.length) * gini(right);
      if (gain > bestGain) { bestGain = gain; bestFeat = feat; bestThresh = thresh; }
    }
  }
  if (bestGain <= 0) return { isLeaf: true, label: majorityClass(pts) };
  const left = pts.filter(p => (bestFeat === 0 ? p.x : p.y) <= bestThresh);
  const right = pts.filter(p => (bestFeat === 0 ? p.x : p.y) > bestThresh);
  return {
    isLeaf: false, feature: bestFeat as 0 | 1, threshold: bestThresh,
    left: buildTree(left, depth + 1, maxDepth),
    right: buildTree(right, depth + 1, maxDepth),
  };
}

function treePredict(tree: TreeNode, x: number, y: number): 0 | 1 {
  if (tree.isLeaf) return tree.label!;
  const val = tree.feature === 0 ? x : y;
  return val <= tree.threshold! ? treePredict(tree.left!, x, y) : treePredict(tree.right!, x, y);
}

// Bootstrap sample per tree + random candidate features per split
function bootstrapSample(pts: DataPt[]): DataPt[] {
  return Array.from({ length: pts.length }, () => pts[Math.floor(Math.random() * pts.length)]);
}

function splitFeatureCandidates(): number[] {
  return Math.random() < 0.5 ? [0] : [1];
}

function buildForest(pts: DataPt[], nTrees: number, maxDepth: number): TreeNode[] {
  return Array.from({ length: nTrees }, () => buildTree(bootstrapSample(pts), 0, maxDepth));
}

function forestPredict(forest: TreeNode[], x: number, y: number): { cls: 0 | 1; confidence: number } {
  const votes = forest.map(t => treePredict(t, x, y));
  const v1 = votes.filter(v => v === 1).length;
  const cls: 0 | 1 = v1 > forest.length / 2 ? 1 : 0;
  return { cls, confidence: cls === 1 ? v1 / forest.length : (forest.length - v1) / forest.length };
}

// ── Dataset generators ─────────────────────────────────────────────────────────
function gaussRand() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function genMoons(): DataPt[] {
  const pts: DataPt[] = [];
  for (let i = 0; i < 60; i++) {
    const angle = Math.PI * (i / 60);
    pts.push({ x: 25 + 30 * Math.cos(angle) + gaussRand() * 5, y: 50 + 20 * Math.sin(angle) + gaussRand() * 5, cls: 0 });
  }
  for (let i = 0; i < 60; i++) {
    const angle = Math.PI * (i / 60) + Math.PI;
    pts.push({ x: 75 + 30 * Math.cos(angle) + gaussRand() * 5, y: 50 + 20 * Math.sin(angle) + gaussRand() * 5, cls: 1 });
  }
  return pts.map(p => ({ ...p, x: Math.max(2, Math.min(98, p.x)), y: Math.max(2, Math.min(98, p.y)) }));
}

function genXOR(): DataPt[] {
  const pts: DataPt[] = [];
  for (let i = 0; i < 30; i++) pts.push({ x: 10 + Math.random() * 35, y: 10 + Math.random() * 35, cls: 0 });
  for (let i = 0; i < 30; i++) pts.push({ x: 55 + Math.random() * 35, y: 55 + Math.random() * 35, cls: 0 });
  for (let i = 0; i < 30; i++) pts.push({ x: 55 + Math.random() * 35, y: 10 + Math.random() * 35, cls: 1 });
  for (let i = 0; i < 30; i++) pts.push({ x: 10 + Math.random() * 35, y: 55 + Math.random() * 35, cls: 1 });
  return pts;
}

function genConcentric(): DataPt[] {
  const pts: DataPt[] = [];
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const r = 15 + Math.random() * 8;
    pts.push({ x: 50 + r * Math.cos(angle), y: 50 + r * Math.sin(angle), cls: 0 });
  }
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const r = 30 + Math.random() * 10;
    pts.push({ x: 50 + r * Math.cos(angle), y: 50 + r * Math.sin(angle), cls: 1 });
  }
  return pts.map(p => ({ ...p, x: Math.max(2, Math.min(98, p.x)), y: Math.max(2, Math.min(98, p.y)) }));
}

const DATASETS: Record<string, { label: string; gen: () => DataPt[] }> = {
  moons: { label: "Two Moons", gen: genMoons },
  xor: { label: "XOR Pattern", gen: genXOR },
  concentric: { label: "Concentric Rings", gen: genConcentric },
};

// ── SVG constants ─────────────────────────────────────────────────────────────
const W = 420; const H = 380; const PAD = 15;
const GRID_N = 25;

function sx(x: number) { return PAD + (x / 100) * (W - 2 * PAD); }
function sy(y: number) { return H - PAD - (y / 100) * (H - 2 * PAD); }

// ── Forest boundary grid ───────────────────────────────────────────────────────
function computeForestGrid(forest: TreeNode[]): { cls: 0 | 1; confidence: number }[][] {
  return Array.from({ length: GRID_N }, (_, row) =>
    Array.from({ length: GRID_N }, (_, col) => {
      const x = (col + 0.5) * (100 / GRID_N);
      const y = (row + 0.5) * (100 / GRID_N);
      return forestPredict(forest, x, y);
    })
  );
}

function computeSingleGrid(tree: TreeNode): (0 | 1)[][] {
  return Array.from({ length: GRID_N }, (_, row) =>
    Array.from({ length: GRID_N }, (_, col) => {
      const x = (col + 0.5) * (100 / GRID_N);
      const y = (row + 0.5) * (100 / GRID_N);
      return treePredict(tree, x, y);
    })
  );
}

function accuracy(pts: DataPt[], forest: TreeNode[]): number {
  const correct = pts.filter(p => forestPredict(forest, p.x, p.y).cls === p.cls).length;
  return pts.length > 0 ? correct / pts.length : 0;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function RandomForestsClient() {
  const { data: session } = useSession();
  const { fadeUp, fadeIn, card } = useGuideMotion();
  const [datasetKey, setDatasetKey] = useState("moons");
  const [pts, setPts] = useState<DataPt[]>(() => genMoons());
  const [nTrees, setNTrees] = useState(1);
  const [maxDepth, setMaxDepth] = useState(3);
  const [forest, setForest] = useState<TreeNode[]>([]);
  const [viewMode, setViewMode] = useState<"forest" | "single">("forest");
  const [selectedTree, setSelectedTree] = useState(0);
  const [datasetsExplored, setDatasetsExplored] = useState<Set<string>>(new Set(["moons"]));
  const [maxTreesReached, setMaxTreesReached] = useState(false);
  const completionFired = useRef(false);

  // (Re)build forest when params change
  useEffect(() => {
    const built = buildForest(pts, nTrees, maxDepth);
    setForest(built);
    if (nTrees >= 20) setMaxTreesReached(true);
  }, [pts, nTrees, maxDepth]);

  const forestGrid = useMemo(() => forest.length > 0 ? computeForestGrid(forest) : null, [forest]);
  const singleGrid = useMemo(() => {
    if (viewMode !== "single" || forest.length === 0) return null;
    return computeSingleGrid(forest[Math.min(selectedTree, forest.length - 1)]);
  }, [forest, viewMode, selectedTree]);

  const acc = useMemo(() => forest.length > 0 ? accuracy(pts, forest) : 0, [pts, forest]);

  const isComplete = datasetsExplored.size >= 2 && maxTreesReached;

  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "random-forests", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  function loadDataset(key: string) {
    const ds = DATASETS[key];
    setPts(ds.gen());
    setDatasetKey(key);
    setDatasetsExplored(prev => new Set([...prev, key]));
  }

  function handleReset() {
    setDatasetKey("moons");
    setPts(genMoons());
    setNTrees(1);
    setMaxDepth(3);
    setViewMode("forest");
    setSelectedTree(0);
    setDatasetsExplored(new Set(["moons"]));
    setMaxTreesReached(false);
    completionFired.current = false;
  }

  const cellW = (W - 2 * PAD) / GRID_N;
  const cellH = (H - 2 * PAD) / GRID_N;

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="random-forests" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">Visual Guides</Link>
          <span>/</span>
          <span className="text-[#94a3b8]">{GUIDE_TITLE}</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">Machine Learning</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3"
          >
            Random Forests: <span className="text-[var(--color-accent)]">Wisdom of the Crowd</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Combine many imperfect decision trees into one powerful ensemble. Watch how accuracy and smoothness
            improve as you add more trees, and compare any single tree to the full forest.
          </motion.p>
        </section>

        {/* Progress */}
        <div className="mb-8 bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#94a3b8]">Exploration Progress</span>
            <span className="text-sm font-semibold text-white">
              {datasetsExplored.size}/2 datasets · {maxTreesReached ? "Reached 20 trees ✓" : `${nTrees}/20 trees`}
            </span>
          </div>
          <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#1e5d8a] to-[#3bb4a4] rounded-full"
              animate={{ width: `${Math.min(datasetsExplored.size, 2) / 2 * 50 + (maxTreesReached ? 50 : 0)}%` }}
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

          {/* Main visualization */}
          <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl overflow-hidden">
            {/* View toggle */}
            <div className="p-4 border-b border-[#1e293b] flex items-center gap-3 flex-wrap">
              <div className="flex rounded-lg overflow-hidden border border-[#334155]" role="radiogroup" aria-label="Boundary view mode">
                {(["forest", "single"] as const).map(mode => (
                  <button
                    key={mode}
                    role="radio"
                    aria-checked={viewMode === mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === mode ? "bg-[#1e5d8a] text-white" : "text-[#94a3b8] hover:text-white"}`}
                  >
                    {mode === "forest" ? `Forest (${nTrees} trees)` : "Single Tree"}
                  </button>
                ))}
              </div>
              {viewMode === "single" && forest.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#94a3b8]">Tree:</span>
                  <select
                    value={selectedTree}
                    aria-label="Select tree to display"
                    onChange={e => setSelectedTree(parseInt(e.target.value))}
                    className="bg-[#0f172a] border border-[#334155] rounded px-2 py-1 text-xs text-white"
                  >
                    {forest.map((_, i) => <option key={i} value={i}>#{i + 1}</option>)}
                  </select>
                </div>
              )}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-[#94a3b8]">Training accuracy:</span>
                <span className="text-sm font-bold text-[#3bb4a4]">{(acc * 100).toFixed(1)}%</span>
              </div>
            </div>

            <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
              {/* Background grid */}
              {viewMode === "forest" && forestGrid && forestGrid.map((row, ri) =>
                row.map((cell, ci) => (
                  <rect
                    key={`${ri}-${ci}`}
                    x={PAD + ci * cellW} y={PAD + (GRID_N - 1 - ri) * cellH}
                    width={cellW} height={cellH}
                    fill={cell.cls === 1 ? "#3bb4a4" : "var(--color-accent)"}
                    opacity={0.08 + (cell.confidence - 0.5) * 0.2}
                  />
                ))
              )}
              {viewMode === "single" && singleGrid && singleGrid.map((row, ri) =>
                row.map((cls, ci) => (
                  <rect
                    key={`${ri}-${ci}`}
                    x={PAD + ci * cellW} y={PAD + (GRID_N - 1 - ri) * cellH}
                    width={cellW} height={cellH}
                    fill={cls === 1 ? "#3bb4a4" : "var(--color-accent)"}
                    opacity={0.15}
                  />
                ))
              )}

              {/* Data points */}
              {pts.map((p, i) => (
                <circle
                  key={i}
                  cx={sx(p.x)} cy={sy(p.y)} r={4}
                  fill={p.cls === 1 ? "#3bb4a4" : "var(--color-accent)"}
                  stroke={p.cls === 1 ? "#1e8a7a" : "#b8960c"}
                  strokeWidth="1"
                  opacity={0.9}
                />
              ))}
            </svg>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-4">
            {/* Dataset */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Dataset</h3>
              <div className="flex flex-col gap-2" role="radiogroup" aria-label="Dataset">
                {Object.entries(DATASETS).map(([key, ds]) => (
                  <button
                    key={key}
                    role="radio"
                    aria-checked={datasetKey === key}
                    onClick={() => loadDataset(key)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium text-left border transition-all ${datasetKey === key ? "bg-[#1e5d8a]/20 border-[#1e5d8a]/60 text-white" : "border-[#334155] text-[#94a3b8] hover:border-[#475569]"}`}
                  >
                    {ds.label}
                  </button>
                ))}
                <button
                  onClick={() => loadDataset(datasetKey)}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-left border border-[#334155] text-[#94a3b8] hover:border-[#475569] transition-all"
                >
                  Reshuffle
                </button>
              </div>
            </div>

            {/* Tree count slider */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-white">Number of Trees</h3>
                <span className="text-sm font-bold text-[var(--color-accent)]">{nTrees}</span>
              </div>
              <input
                type="range" min="1" max="50" step="1" value={nTrees}
                aria-label="Number of trees"
                onChange={e => setNTrees(parseInt(e.target.value))}
                className="w-full accent-[var(--color-accent)]"
              />
              <div className="flex justify-between text-[10px] text-[#94a3b8] mt-1">
                <span>1 (single tree)</span><span>50</span>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {[1, 5, 20, 50].map(n => (
                  <button
                    key={n}
                    aria-pressed={nTrees === n}
                    onClick={() => setNTrees(n)}
                    className={`px-2.5 py-1 rounded text-xs border transition-all ${nTrees === n ? "bg-[#d4af37]/20 border-[#d4af37]/60 text-[var(--color-accent)]" : "border-[#334155] text-[#94a3b8] hover:border-[#475569]"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Max depth */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-white">Max Tree Depth</h3>
                <span className="text-sm font-bold text-[#3bb4a4]">{maxDepth}</span>
              </div>
              <input
                type="range" min="1" max="6" step="1" value={maxDepth}
                aria-label="Maximum tree depth"
                onChange={e => setMaxDepth(parseInt(e.target.value))}
                className="w-full accent-[#3bb4a4]"
              />
              <div className="flex justify-between text-[10px] text-[#94a3b8] mt-1">
                <span>1 (stumps)</span><span>6 (deep)</span>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Forest Stats</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Trees", value: nTrees },
                  { label: "Train Acc.", value: `${(acc * 100).toFixed(1)}%` },
                  { label: "Max Depth", value: maxDepth },
                  { label: "Points", value: pts.length },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#0f172a]/60 rounded-lg p-2">
                    <div className="text-[10px] text-[#94a3b8] uppercase tracking-wide">{label}</div>
                    <div className="text-base font-bold text-white">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key insight */}
            <div className="bg-[#1e293b]/60 border border-[#d4af37]/20 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-2">Key Insight</h3>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Each tree trains on a random <span className="text-white">bootstrap sample</span>, and at
                every split it considers only a random subset of features (the &ldquo;mtry&rdquo; trick), so
                trees make different errors. When their votes are combined, individual errors cancel out,
                leaving a smoother, more accurate boundary.
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
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  Forest Grown!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You scaled a single wobbly tree into a 20-plus tree ensemble and watched the decision boundary smooth out.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Datasets explored", value: `${datasetsExplored.size} / 3`, color: "#3bb4a4" },
                    { label: "Largest forest", value: `${nTrees} trees`, color: "var(--color-accent)" },
                    { label: "Training accuracy", value: `${(acc * 100).toFixed(1)}%`, color: "#a855f7" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-[#1e293b] p-3">
                      <p className="text-[10px] text-[#475569] mb-1">{item.label}</p>
                      <p className="text-[14px] font-mono font-bold" style={{ color: item.color }}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;One tree memorizes, a forest generalizes. Bootstrap samples and random feature subsets make the trees disagree, and their vote averages the errors away.&quot;
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
                    href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
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
              href={`/visual-guides/${PREV_GUIDE_SLUG}`}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            >
              ← Previous Guide
            </Link>
            <Link
              href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
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
