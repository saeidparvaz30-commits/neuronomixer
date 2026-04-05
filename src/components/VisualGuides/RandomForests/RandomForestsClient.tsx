"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

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

function buildTree(pts: DataPt[], depth: number, maxDepth: number, featureSubset: number[]): TreeNode {
  if (depth >= maxDepth || pts.length < 4 || gini(pts) < 0.05) {
    return { isLeaf: true, label: majorityClass(pts) };
  }
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
    left: buildTree(left, depth + 1, maxDepth, featureSubset),
    right: buildTree(right, depth + 1, maxDepth, featureSubset),
  };
}

function treePredict(tree: TreeNode, x: number, y: number): 0 | 1 {
  if (tree.isLeaf) return tree.label!;
  const val = tree.feature === 0 ? x : y;
  return val <= tree.threshold! ? treePredict(tree.left!, x, y) : treePredict(tree.right!, x, y);
}

// Bootstrap sample + random feature subset
function bootstrapSample(pts: DataPt[]): DataPt[] {
  return Array.from({ length: pts.length }, () => pts[Math.floor(Math.random() * pts.length)]);
}

function randomFeatures(): number[] {
  return Math.random() < 0.5 ? [0, 1] : (Math.random() < 0.5 ? [0] : [1]);
}

function buildForest(pts: DataPt[], nTrees: number, maxDepth: number): TreeNode[] {
  return Array.from({ length: nTrees }, () => {
    const sample = bootstrapSample(pts);
    const feats = randomFeatures();
    return buildTree(sample, 0, maxDepth, feats);
  });
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
          body: JSON.stringify({ guideSlug: "random-forests", score: 7 }),
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

  const cellW = (W - 2 * PAD) / GRID_N;
  const cellH = (H - 2 * PAD) / GRID_N;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <div className="max-w-[1300px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span>/</span>
          <span className="text-white">Random Forests: Wisdom of the Crowd</span>
        </nav>

        {/* Hero */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-[#1e5d8a]/20 border border-[#1e5d8a]/40 rounded-full px-3 py-1 mb-4">
            <span className="text-xs font-semibold text-[#3bb4a4] uppercase tracking-wider">Machine Learning</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Random Forests: Wisdom of the Crowd
          </h1>
          <p className="text-[#94a3b8] text-base max-w-2xl">
            Combine many imperfect decision trees into one powerful ensemble. Watch how accuracy and smoothness
            improve as you add more trees, and compare any single tree to the full forest.
          </p>
        </div>

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

          {/* Main visualization */}
          <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl overflow-hidden">
            {/* View toggle */}
            <div className="p-4 border-b border-[#1e293b] flex items-center gap-3 flex-wrap">
              <div className="flex rounded-lg overflow-hidden border border-[#334155]">
                {(["forest", "single"] as const).map(mode => (
                  <button
                    key={mode}
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
                    onChange={e => setSelectedTree(parseInt(e.target.value))}
                    className="bg-[#0f172a] border border-[#334155] rounded px-2 py-1 text-xs text-white"
                  >
                    {forest.map((_, i) => <option key={i} value={i}>#{i + 1}</option>)}
                  </select>
                </div>
              )}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-[#94a3b8]">Accuracy:</span>
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
                    fill={cell.cls === 1 ? "#3bb4a4" : "#d4af37"}
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
                    fill={cls === 1 ? "#3bb4a4" : "#d4af37"}
                    opacity={0.15}
                  />
                ))
              )}

              {/* Data points */}
              {pts.map((p, i) => (
                <circle
                  key={i}
                  cx={sx(p.x)} cy={sy(p.y)} r={4}
                  fill={p.cls === 1 ? "#3bb4a4" : "#d4af37"}
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
              <div className="flex flex-col gap-2">
                {Object.entries(DATASETS).map(([key, ds]) => (
                  <button
                    key={key}
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
                <span className="text-sm font-bold text-[#d4af37]">{nTrees}</span>
              </div>
              <input
                type="range" min="1" max="50" step="1" value={nTrees}
                onChange={e => setNTrees(parseInt(e.target.value))}
                className="w-full accent-[#d4af37]"
              />
              <div className="flex justify-between text-[10px] text-[#94a3b8] mt-1">
                <span>1 (single tree)</span><span>50</span>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {[1, 5, 20, 50].map(n => (
                  <button
                    key={n}
                    onClick={() => setNTrees(n)}
                    className={`px-2.5 py-1 rounded text-xs border transition-all ${nTrees === n ? "bg-[#d4af37]/20 border-[#d4af37]/60 text-[#d4af37]" : "border-[#334155] text-[#94a3b8] hover:border-[#475569]"}`}
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
                  { label: "Accuracy", value: `${(acc * 100).toFixed(1)}%` },
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
              <h3 className="text-xs font-semibold text-[#d4af37] uppercase tracking-wide mb-2">Key Insight</h3>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Each tree sees a random <span className="text-white">bootstrap sample</span> and random
                feature subset — so they make different errors. When their votes are combined,
                individual errors cancel out, leaving a smoother, more accurate boundary.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-[#1e293b]">
          <Link href="/visual-guides/svm" className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors">
            <span>←</span><span>SVM</span>
          </Link>
          <Link href="/visual-guides" className="text-sm text-[#94a3b8] hover:text-white transition-colors">All Guides</Link>
          <Link href="/visual-guides/gradient-descent" className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors">
            <span>Gradient Descent</span><span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
