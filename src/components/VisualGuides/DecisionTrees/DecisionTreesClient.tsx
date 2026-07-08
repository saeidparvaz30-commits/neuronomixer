"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  DataPoint, TreeNode, Split,
  computeGini, predictLabel, splitPoints, computeAccuracy, buildNode, predict,
  generateDataset, DATASETS, mulberry32,
} from "./types";

// ── Scatter with split lines ──────────────────────────────────────────────────
function DecisionScatter({
  points,
  tree,
  pendingSplit,
  onSvgClick,
}: {
  points: DataPoint[];
  tree: TreeNode | null;
  pendingSplit: { axis: "x" | "y"; value: number } | null;
  onSvgClick: (x: number, y: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 480, H = 380, PAD = { l: 32, r: 12, t: 12, b: 32 };
  const IW = W - PAD.l - PAD.r, IH = H - PAD.t - PAD.b;

  const tx = (v: number) => PAD.l + (v / 100) * IW;
  const ty = (v: number) => PAD.t + IH - (v / 100) * IH;

  function svgCoords(e: React.MouseEvent) {
    const svg = svgRef.current;
    if (!svg) return { x: 50, y: 50 };
    const rect = svg.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width * W;
    const py = (e.clientY - rect.top) / rect.height * H;
    const x = Math.max(0, Math.min(100, ((px - PAD.l) / IW) * 100));
    const y = Math.max(0, Math.min(100, (1 - (py - PAD.t) / IH) * 100));
    return { x, y };
  }

  // Render decision region background
  function renderRegions() {
    if (!tree) return null;
    const gridN = 20;
    const cells = [];
    for (let i = 0; i < gridN; i++) {
      for (let j = 0; j < gridN; j++) {
        const cx = (i + 0.5) * (100 / gridN);
        const cy = (j + 0.5) * (100 / gridN);
        const label = predict(tree, { x: cx, y: cy });
        cells.push(
          <rect key={`${i}-${j}`}
            x={tx(cx - 50 / gridN)} y={ty(cy + 50 / gridN)}
            width={IW / gridN} height={IH / gridN}
            fill={label === 1 ? "#3bb4a4" : "var(--color-accent)"}
            opacity="0.12"
          />
        );
      }
    }
    return cells;
  }

  // Render split lines from tree
  function renderSplits(node: TreeNode | null, xMin = 0, xMax = 100, yMin = 0, yMax = 100): React.ReactNode[] {
    if (!node || !node.split || !node.children) return [];
    const { split } = node;
    const lines: React.ReactNode[] = [];

    if (split.axis === "x") {
      lines.push(
        <motion.line key={node.id}
          x1={tx(split.value)} y1={ty(yMax)}
          x2={tx(split.value)} y2={ty(yMin)}
          stroke="#94a3b8" strokeWidth="1.5"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.4 }}
        />
      );
      lines.push(...renderSplits(node.children[0], xMin, split.value, yMin, yMax));
      lines.push(...renderSplits(node.children[1], split.value, xMax, yMin, yMax));
    } else {
      lines.push(
        <motion.line key={node.id}
          x1={tx(xMin)} y1={ty(split.value)}
          x2={tx(xMax)} y2={ty(split.value)}
          stroke="#94a3b8" strokeWidth="1.5"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.4 }}
        />
      );
      lines.push(...renderSplits(node.children[0], xMin, xMax, yMin, split.value));
      lines.push(...renderSplits(node.children[1], xMin, xMax, split.value, yMax));
    }
    return lines;
  }

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%"
      onClick={e => { const c = svgCoords(e); onSvgClick(c.x, c.y); }}
      style={{ cursor: "crosshair" }}>
      {/* Region background */}
      {renderRegions()}

      {/* Axes */}
      <line x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1" />

      {/* Split lines from tree */}
      {tree && renderSplits(tree)}

      {/* Pending split preview */}
      {pendingSplit && (
        <motion.line
          x1={pendingSplit.axis === "x" ? tx(pendingSplit.value) : PAD.l}
          y1={pendingSplit.axis === "x" ? PAD.t : ty(pendingSplit.value)}
          x2={pendingSplit.axis === "x" ? tx(pendingSplit.value) : PAD.l + IW}
          y2={pendingSplit.axis === "x" ? PAD.t + IH : ty(pendingSplit.value)}
          stroke="var(--color-accent)" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.7"
          animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ repeat: Infinity, duration: 1.2 }}
        />
      )}

      {/* Data points */}
      {points.map(p => (
        <motion.circle
          key={p.id}
          cx={tx(p.x)} cy={ty(p.y)}
          r="6"
          fill={p.label === 1 ? "#3bb4a4" : "var(--color-accent)"}
          stroke="#0f172a" strokeWidth="1.5"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25, delay: p.id * 0.01 }}
        />
      ))}

      {/* Axis labels */}
      <text x={PAD.l + IW / 2} y={H - 4} textAnchor="middle" fill="#475569" fontSize="10">Feature 1 (X)</text>
      <text x={10} y={PAD.t + IH / 2} textAnchor="middle" fill="#475569" fontSize="10"
        transform={`rotate(-90, 10, ${PAD.t + IH / 2})`}>Feature 2 (Y)</text>
    </svg>
  );
}

// ── Tree diagram ──────────────────────────────────────────────────────────────
function TreeDiagram({ root }: { root: TreeNode | null }) {
  if (!root) {
    return (
      <div className="text-center py-10 text-[#334155] text-[13px]">
        Click on the scatter plot to add splits
      </div>
    );
  }

  function NodeBox({ node }: { node: TreeNode }) {
    const pct = (node.accuracy * 100).toFixed(0);
    const ones = node.points.filter(p => p.label === 1).length;
    const zeros = node.points.length - ones;
    const color = node.predictedLabel === 1 ? "#3bb4a4" : "var(--color-accent)";

    return (
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="rounded-xl border p-3 min-w-[120px] text-center"
          style={{ borderColor: `color-mix(in srgb, ${color} 38%, transparent)`, background: `color-mix(in srgb, ${color} 6%, transparent)` }}
        >
          {node.split ? (
            <p className="text-[11px] font-bold font-mono text-white mb-1">
              {node.split.axis.toUpperCase()} ≤ {node.split.value.toFixed(0)}
            </p>
          ) : (
            <p className="text-[11px] font-bold text-white mb-1">Leaf</p>
          )}
          <div className="text-[9px] text-[#94a3b8] space-y-0.5">
            <p>n = {node.points.length}</p>
            <p>◉ {ones} / ◎ {zeros}</p>
            <p>Gini: {node.gini.toFixed(3)}</p>
            <p className="font-semibold" style={{ color }}>Predict: Class {node.predictedLabel}</p>
            <p>Acc: {pct}%</p>
          </div>
        </motion.div>
        {node.children && (
          <div className="flex gap-8 mt-4 pt-4 border-t border-[#1e293b] relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] border-t border-[#334155]" />
            <NodeBox node={node.children[0]} />
            <NodeBox node={node.children[1]} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-fit p-4">
        <NodeBox node={root} />
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DecisionTreesClient() {
  const { data: session } = useSession();
  const [datasetKey, setDatasetKey] = useState<keyof typeof DATASETS>("linearlySeparable");
  // Seeded so server render and client hydration produce the same points;
  // loadDataset (post-hydration) keeps true randomness.
  const [points, setPoints] = useState<DataPoint[]>(() =>
    generateDataset("linearlySeparable", 40, mulberry32(0x5eed0001)));
  const [tree, setTree] = useState<TreeNode | null>(() => null);
  const [splitAxis, setSplitAxis] = useState<"x" | "y">("x");
  const [splitValue, setSplitValue] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<string>("root");
  const nodeMap = useRef<Map<string, TreeNode>>(new Map());

  // Progress
  const [splitsAdded, setSplitsAdded] = useState(0);
  const [datasetsLoaded, setDatasetsLoaded] = useState(0);
  const completionFired = useRef(false);
  const allComplete = splitsAdded >= 3 && datasetsLoaded >= 2;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "decision-trees", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  // Initialize tree when points change
  useEffect(() => {
    const root = buildNode(points, 0, "root");
    setTree(root);
    nodeMap.current = new Map([["root", root]]);
    setSelectedNode("root");
    setSplitValue(null);
  }, [points]);

  function loadDataset(key: keyof typeof DATASETS) {
    setDatasetKey(key);
    setPoints(generateDataset(key));
    setDatasetsLoaded(prev => prev + 1);
  }

  const handleSvgClick = useCallback((x: number, y: number) => {
    const val = splitAxis === "x" ? x : y;
    setSplitValue(val);
  }, [splitAxis]);

  function applySplit() {
    if (splitValue === null || !tree) return;

    const split: Split = { id: selectedNode + "-split", axis: splitAxis, value: splitValue };
    const node = nodeMap.current.get(selectedNode);
    if (!node) return;

    const [leftPts, rightPts] = splitPoints(node.points, split);
    if (leftPts.length === 0 || rightPts.length === 0) return;

    const leftNode = buildNode(leftPts, node.depth + 1, selectedNode + "-L");
    const rightNode = buildNode(rightPts, node.depth + 1, selectedNode + "-R");
    node.split = split;
    node.children = [leftNode, rightNode];
    node.predictedLabel = predictLabel(node.points);
    node.accuracy = computeAccuracy(node.points);

    nodeMap.current.set(selectedNode + "-L", leftNode);
    nodeMap.current.set(selectedNode + "-R", rightNode);

    // Force re-render
    setTree({ ...tree });
    setSplitsAdded(prev => prev + 1);
    setSplitValue(null);
  }

  function resetTree() {
    const root = buildNode(points, 0, "root");
    setTree(root);
    nodeMap.current = new Map([["root", root]]);
    setSelectedNode("root");
    setSplitValue(null);
  }

  // Compute overall accuracy
  function treeAccuracy() {
    if (!tree) return 0;
    const correct = points.filter(p => predict(tree, p) === p.label).length;
    return correct / points.length;
  }

  const accuracy = treeAccuracy();

  const progress = [
    { label: `Splits added: ${Math.min(splitsAdded, 3)}/3`, done: splitsAdded >= 3 },
    { label: `Datasets tried: ${Math.min(datasetsLoaded, 2)}/2`, done: datasetsLoaded >= 2 },
  ];

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Decision Trees</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">Machine Learning</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Decision Trees: <span className="text-[var(--color-accent)]">Build One Yourself</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            Click on the scatter plot to place split lines. Watch the decision tree diagram grow,
            regions color in, and accuracy update after every split.
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

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Controls */}
          <div className="space-y-5">
            {/* Dataset */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">Dataset</p>
              <div className="space-y-2" role="radiogroup" aria-label="Dataset">
                {(Object.entries(DATASETS) as [keyof typeof DATASETS, string][]).map(([key, label]) => (
                  <button key={key}
                    role="radio"
                    aria-checked={datasetKey === key}
                    onClick={() => loadDataset(key)}
                    className={`w-full px-3 py-2 rounded-lg border text-[11px] text-left transition-colors ${
                      datasetKey === key
                        ? "border-[var(--color-accent)]/60 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                        : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-3 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#3bb4a4]" />
                  <span className="text-[#475569]">Class 1</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[var(--color-accent)]" />
                  <span className="text-[#475569]">Class 0</span>
                </div>
              </div>
            </div>

            {/* Split controls */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">Add Split</p>

              <div className="flex gap-2 mb-3" role="radiogroup" aria-label="Split axis">
                {(["x", "y"] as const).map(ax => (
                  <button key={ax}
                    role="radio"
                    aria-checked={splitAxis === ax}
                    onClick={() => { setSplitAxis(ax); setSplitValue(null); }}
                    className={`flex-1 py-2 rounded-lg text-[12px] font-semibold border transition-colors ${
                      splitAxis === ax
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                        : "border-[#1e293b] text-[#475569] hover:text-white"
                    }`}>
                    Split on {ax.toUpperCase()}
                  </button>
                ))}
              </div>

              {splitValue !== null ? (
                <div className="rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-3 mb-3">
                  <p className="text-[10px] text-[var(--color-accent)] mb-1">Preview split</p>
                  <p className="text-[13px] font-mono text-white">
                    {splitAxis.toUpperCase()} ≤ {splitValue.toFixed(1)}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-[#1e293b] p-3 mb-3 text-center">
                  <p className="text-[11px] text-[#475569]">Click on the plot to preview a split</p>
                </div>
              )}

              <motion.button
                onClick={applySplit}
                disabled={splitValue === null}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                className="w-full py-2 rounded-lg text-[12px] font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Apply Split
              </motion.button>

              <button onClick={resetTree}
                className="w-full mt-2 py-2 rounded-lg text-[11px] border border-[#1e293b] text-[#475569] hover:text-white transition-colors">
                Reset Tree
              </button>
            </div>

            {/* Stats */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">Tree Metrics</p>
              <div className="space-y-2">
                {[
                  { label: "Accuracy", value: `${(accuracy * 100).toFixed(1)}%`, color: accuracy > 0.8 ? "#3bb4a4" : accuracy > 0.6 ? "var(--color-accent)" : "#ef4444" },
                  { label: "Splits", value: String(splitsAdded), color: "var(--color-accent)" },
                  { label: "Points", value: String(points.length), color: "#475569" },
                  { label: "Root Gini", value: tree ? tree.gini.toFixed(3) : "—", color: "#a855f7" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-[11px] text-[#475569]">{label}</span>
                    <span className="text-[11px] font-mono font-bold" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
              {/* Accuracy bar */}
              <div className="mt-3 h-2 rounded-full bg-[#1e293b] overflow-hidden">
                <motion.div className="h-full rounded-full bg-[#3bb4a4]"
                  animate={{ width: `${accuracy * 100}%` }} transition={{ duration: 0.4 }} />
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="space-y-5">
            {/* Scatter */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">
                  Feature Space (click to place {splitAxis.toUpperCase()}-split)
                </p>
                <div className="text-[10px] text-[#475569]">
                  Colored regions = decision boundaries
                </div>
              </div>
              <DecisionScatter
                points={points}
                tree={tree}
                pendingSplit={splitValue !== null ? { axis: splitAxis, value: splitValue } : null}
                onSvgClick={handleSvgClick}
              />
            </div>

            {/* Tree diagram */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">Decision Tree Structure</p>
              <TreeDiagram root={tree} />
            </div>

            {/* Concepts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { title: "Gini Impurity", body: "Measures how mixed a node is. Gini = 0 means all one class (pure). The tree minimizes impurity at each split.", color: "#a855f7" },
                { title: "Splitting Criteria", body: "At each node, find the feature and value that most reduces impurity. ID3 uses entropy; CART uses Gini.", color: "#3bb4a4" },
                { title: "Overfitting Risk", body: "Deep trees memorize training data. Pruning, max-depth, and min-samples-per-leaf prevent overfitting.", color: "#ef4444" },
              ].map(({ title, body, color }) => (
                <div key={title} className="rounded-xl border border-[#1e293b] p-4">
                  <p className="text-[11px] font-semibold mb-2" style={{ color }}>{title}</p>
                  <p className="text-[11px] text-[#94a3b8] leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link href="/visual-guides/linear-regression"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors">
            ← Previous Guide
          </Link>
          <Link href="/visual-guides/k-means"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
            Next: K-Means Clustering Step by Step →
          </Link>
        </div>

        <GuideCompletion isComplete={allComplete} guideSlug="decision-trees" score={100} />
      </div>
    </div>
  );
}
