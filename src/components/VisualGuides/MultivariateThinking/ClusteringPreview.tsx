"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";

// 20 pre-generated points in 3 natural clusters (deterministic)
const FIXED_POINTS = [
  // Cluster A: bottom-left
  { x: 0.12, y: 0.15 }, { x: 0.18, y: 0.22 }, { x: 0.09, y: 0.28 },
  { x: 0.22, y: 0.12 }, { x: 0.15, y: 0.08 }, { x: 0.25, y: 0.20 }, { x: 0.08, y: 0.18 },
  // Cluster B: top-middle
  { x: 0.45, y: 0.75 }, { x: 0.52, y: 0.82 }, { x: 0.58, y: 0.70 },
  { x: 0.48, y: 0.88 }, { x: 0.55, y: 0.65 }, { x: 0.42, y: 0.80 },
  // Cluster C: right
  { x: 0.80, y: 0.45 }, { x: 0.88, y: 0.52 }, { x: 0.75, y: 0.38 },
  { x: 0.92, y: 0.42 }, { x: 0.83, y: 0.60 }, { x: 0.70, y: 0.48 }, { x: 0.87, y: 0.35 },
];

const CLUSTER_COLORS = ["#3bb4a4", "#d4af37", "#ef4444", "#a855f7"];

// Fixed initial centroids for each K
const INIT_CENTROIDS: Record<number, { x: number; y: number }[]> = {
  2: [{ x: 0.2, y: 0.3 }, { x: 0.7, y: 0.6 }],
  3: [{ x: 0.15, y: 0.18 }, { x: 0.5, y: 0.78 }, { x: 0.82, y: 0.46 }],
  4: [{ x: 0.12, y: 0.16 }, { x: 0.5, y: 0.80 }, { x: 0.82, y: 0.46 }, { x: 0.55, y: 0.25 }],
};

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function runKMeans(k: number): { assignments: number[]; centroids: { x: number; y: number }[] } {
  const centroids = INIT_CENTROIDS[k].map((c) => ({ ...c }));
  const assignments = new Array(FIXED_POINTS.length).fill(0);

  for (let iter = 0; iter < 20; iter++) {
    // Assign
    for (let i = 0; i < FIXED_POINTS.length; i++) {
      let minD = Infinity;
      let best = 0;
      for (let j = 0; j < k; j++) {
        const d = dist(FIXED_POINTS[i], centroids[j]);
        if (d < minD) { minD = d; best = j; }
      }
      assignments[i] = best;
    }

    // Update centroids
    const newCentroids = Array.from({ length: k }, () => ({ x: 0, y: 0, count: 0 }));
    for (let i = 0; i < FIXED_POINTS.length; i++) {
      const c = assignments[i];
      newCentroids[c].x += FIXED_POINTS[i].x;
      newCentroids[c].y += FIXED_POINTS[i].y;
      newCentroids[c].count += 1;
    }
    let converged = true;
    for (let j = 0; j < k; j++) {
      const cnt = newCentroids[j].count || 1;
      const nx = newCentroids[j].x / cnt;
      const ny = newCentroids[j].y / cnt;
      if (Math.abs(nx - centroids[j].x) > 1e-6 || Math.abs(ny - centroids[j].y) > 1e-6) {
        converged = false;
      }
      centroids[j] = { x: nx, y: ny };
    }
    if (converged) break;
  }

  return { assignments, centroids };
}

const W = 400;
const H = 320;
const PAD = { l: 28, r: 20, t: 20, b: 28 };

function sx(v: number) { return PAD.l + v * (W - PAD.l - PAD.r); }
function sy(v: number) { return PAD.t + (1 - v) * (H - PAD.t - PAD.b); }

// Diamond / star shape for centroids
function centroidPath(cx: number, cy: number, r = 8): string {
  return `M ${cx} ${cy - r} L ${cx + r * 0.6} ${cy} L ${cx} ${cy + r} L ${cx - r * 0.6} ${cy} Z`;
}

export default function ClusteringPreview() {
  const [k, setK] = useState(3);

  const { assignments, centroids } = useMemo(() => runKMeans(k), [k]);

  // Compute inertia (sum of squared distances to centroid)
  const inertia = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < FIXED_POINTS.length; i++) {
      sum += dist(FIXED_POINTS[i], centroids[assignments[i]]) ** 2;
    }
    return sum;
  }, [assignments, centroids]);

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
      <h2 className="text-xl font-bold text-white mb-1">K-Means Clustering</h2>
      <p className="text-sm text-[#94a3b8] mb-4 leading-relaxed">
        K-means iteratively assigns each point to its nearest centroid, then recalculates centroids.
        Try different values of K to see how cluster boundaries change.
      </p>

      {/* K selector */}
      <div className="flex items-center gap-3 mb-5 flex-wrap" role="radiogroup" aria-label="Number of clusters K">
        <span className="text-sm font-semibold text-[#94a3b8]">K =</span>
        {[2, 3, 4].map((kv) => (
          <button
            key={kv}
            role="radio"
            aria-checked={k === kv}
            onClick={() => setK(kv)}
            className={`w-10 h-10 rounded-xl font-bold text-sm border transition-all ${k === kv
              ? "border-[var(--color-accent)] bg-[#d4af37]/15 text-[var(--color-accent)]"
              : "border-[#1e293b] text-[#94a3b8] hover:border-[#1e293b] hover:text-white"
              }`}
          >
            {kv}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-[#475569] uppercase tracking-wide">Inertia</p>
            <p className="text-base font-bold text-white">{inertia.toFixed(4)}</p>
          </div>
        </div>
      </div>

      {/* SVG */}
      <div className="rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-3 overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 300 }}>
          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}>
              <line x1={sx(v)} y1={PAD.t} x2={sx(v)} y2={H - PAD.b} stroke="#1e293b" strokeWidth={0.8} />
              <line x1={PAD.l} y1={sy(v)} x2={W - PAD.r} y2={sy(v)} stroke="#1e293b" strokeWidth={0.8} />
            </g>
          ))}
          {/* Axes */}
          <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="#334155" strokeWidth={1} />
          <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="#334155" strokeWidth={1} />

          {/* Lines from points to centroids */}
          {FIXED_POINTS.map((pt, i) => (
            <line
              key={i}
              x1={sx(pt.x)}
              y1={sy(pt.y)}
              x2={sx(centroids[assignments[i]].x)}
              y2={sy(centroids[assignments[i]].y)}
              stroke={CLUSTER_COLORS[assignments[i]]}
              strokeWidth={0.6}
              strokeOpacity={0.2}
            />
          ))}

          {/* Data points */}
          {FIXED_POINTS.map((pt, i) => (
            <motion.circle
              key={i}
              cx={sx(pt.x)}
              cy={sy(pt.y)}
              r={5.5}
              fill={CLUSTER_COLORS[assignments[i]]}
              fillOpacity={0.75}
              stroke="#0f172a"
              strokeWidth={1.5}
              animate={{ fill: CLUSTER_COLORS[assignments[i]] }}
              transition={{ duration: 0.3 }}
            />
          ))}

          {/* Centroids as diamonds */}
          {centroids.map((c, j) => (
            <motion.path
              key={j}
              d={centroidPath(sx(c.x), sy(c.y), 9)}
              fill={CLUSTER_COLORS[j]}
              stroke="#0f172a"
              strokeWidth={2}
              animate={{ d: centroidPath(sx(c.x), sy(c.y), 9) }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            />
          ))}

          {/* Centroid labels */}
          {centroids.map((c, j) => (
            <motion.text
              key={j}
              x={sx(c.x) + 12}
              y={sy(c.y) + 4}
              fill={CLUSTER_COLORS[j]}
              fontSize={16}
              fontWeight="bold"
              animate={{ x: sx(c.x) + 12, y: sy(c.y) + 4 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              C{j + 1}
            </motion.text>
          ))}
        </svg>
      </div>

      {/* Cluster stats */}
      <div className="mt-4 flex gap-3 flex-wrap">
        {centroids.map((c, j) => {
          const members = FIXED_POINTS.filter((_, i) => assignments[i] === j);
          return (
            <div
              key={j}
              className="rounded-xl border px-3 py-2 flex-1 min-w-[100px]"
              style={{ borderColor: `${CLUSTER_COLORS[j]}35`, background: `${CLUSTER_COLORS[j]}08` }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: CLUSTER_COLORS[j] }}>
                Cluster {j + 1}
              </p>
              <p className="text-lg font-bold text-white">{members.length}</p>
              <p className="text-[10px] text-[#475569]">
                Centroid: ({c.x.toFixed(2)}, {c.y.toFixed(2)})
              </p>
            </div>
          );
        })}
      </div>

      {/* Elbow method hint */}
      <div className="mt-4 rounded-xl border border-[#1e293b] bg-[#0a0e1a] p-3">
        <p className="text-[11px] font-semibold text-[#94a3b8] mb-2 uppercase tracking-wide">
          Choosing K: The Elbow Method
        </p>
        <div className="flex gap-4">
          {[2, 3, 4].map((kv) => {
            const { assignments: a, centroids: cs } = runKMeans(kv);
            let inr = 0;
            for (let i = 0; i < FIXED_POINTS.length; i++) {
              inr += dist(FIXED_POINTS[i], cs[a[i]]) ** 2;
            }
            return (
              <div key={kv} className="flex-1 text-center">
                <div
                  className="text-[10px] font-bold mb-1"
                  style={{ color: kv === k ? "var(--color-accent)" : "#94a3b8" }}
                >
                  K={kv}
                </div>
                <div
                  className="rounded h-12 flex items-end justify-center pb-1"
                  style={{ background: kv === k ? "color-mix(in srgb, var(--color-accent) 12.5%, transparent)" : "#1e293b20" }}
                >
                  <div
                    className="w-full mx-1 rounded-sm transition-all"
                    style={{
                      height: `${Math.max(4, (inr / 0.5) * 40)}px`,
                      background: kv === k ? "var(--color-accent)" : "#334155",
                      maxHeight: "40px",
                    }}
                  />
                </div>
                <div className="text-[9px] text-[#475569] mt-0.5">{inr.toFixed(3)}</div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-[#475569] mt-2">
          Lower inertia = tighter clusters. The &ldquo;elbow&rdquo; indicates the optimal K.
          Here K=3 matches the natural structure in this dataset.
        </p>
      </div>
    </div>
  );
}
