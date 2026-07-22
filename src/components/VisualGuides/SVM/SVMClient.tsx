"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Types ─────────────────────────────────────────────────────────────────────
interface DataPt { id: number; x: number; y: number; cls: -1 | 1 }

// ── SVM Math (simplified linear SVM via gradient descent) ─────────────────────
function dot(a: number[], b: number[]) { return a[0] * b[0] + a[1] * b[1]; }

interface SVMResult {
  w: [number, number];
  b: number;
  margin: number;
  supportVectors: number[];
  converged: boolean;
}

function trainSVM(pts: DataPt[], C: number, iterations = 2000): SVMResult {
  const w: [number, number] = [0, 0];
  let b = 0;
  const lr = 0.01;
  const n = pts.length;

  for (let iter = 0; iter < iterations; iter++) {
    const eta = lr / (1 + iter * 0.001);
    for (const pt of pts) {
      const xi = [pt.x / 50 - 1, pt.y / 50 - 1];
      const margin = pt.cls * (dot(w, xi) + b);
      if (margin < 1) {
        w[0] = w[0] - eta * (w[0] - C * pt.cls * xi[0]);
        w[1] = w[1] - eta * (w[1] - C * pt.cls * xi[1]);
        b = b + eta * C * pt.cls;
      } else {
        w[0] = w[0] * (1 - eta);
        w[1] = w[1] * (1 - eta);
      }
    }
  }

  const wNorm = Math.sqrt(w[0] ** 2 + w[1] ** 2);
  const margin = wNorm > 0.001 ? 2 / wNorm : 0;

  // Find support vectors (points within margin)
  const svIds: number[] = [];
  for (const pt of pts) {
    const xi = [pt.x / 50 - 1, pt.y / 50 - 1];
    const funcVal = pt.cls * (dot(w, xi) + b);
    if (funcVal < 1.2) svIds.push(pt.id);
  }

  return { w, b, margin, supportVectors: svIds, converged: wNorm > 0.01 };
}

function predict(x: number, y: number, w: [number, number], b: number): number {
  const xi = [x / 50 - 1, y / 50 - 1];
  return dot(w, xi) + b;
}

// ── Dataset generators ─────────────────────────────────────────────────────────
function genLinearlySeparable(): DataPt[] {
  const pts: DataPt[] = [];
  for (let i = 0; i < 25; i++) {
    pts.push({ id: i, x: 10 + Math.random() * 30, y: 15 + Math.random() * 35, cls: -1 });
  }
  for (let i = 0; i < 25; i++) {
    pts.push({ id: 25 + i, x: 60 + Math.random() * 30, y: 50 + Math.random() * 35, cls: 1 });
  }
  return pts;
}

function genHardMargin(): DataPt[] {
  const pts: DataPt[] = [];
  for (let i = 0; i < 20; i++) {
    pts.push({ id: i, x: 10 + Math.random() * 25, y: 20 + Math.random() * 60, cls: -1 });
  }
  for (let i = 0; i < 20; i++) {
    pts.push({ id: 20 + i, x: 65 + Math.random() * 25, y: 20 + Math.random() * 60, cls: 1 });
  }
  return pts;
}

function genWithOutliers(): DataPt[] {
  const base = genLinearlySeparable();
  // Add 4 outliers in wrong territory
  base.push({ id: 100, x: 55 + Math.random() * 15, y: 20 + Math.random() * 20, cls: -1 });
  base.push({ id: 101, x: 60 + Math.random() * 10, y: 15 + Math.random() * 15, cls: -1 });
  base.push({ id: 102, x: 15 + Math.random() * 15, y: 60 + Math.random() * 20, cls: 1 });
  base.push({ id: 103, x: 20 + Math.random() * 10, y: 65 + Math.random() * 15, cls: 1 });
  return base;
}

const DATASETS: Record<string, { label: string; gen: () => DataPt[] }> = {
  separable: { label: "Linearly Separable", gen: genLinearlySeparable },
  hard: { label: "Wide Margin", gen: genHardMargin },
  outliers: { label: "With Outliers", gen: genWithOutliers },
};

// ── SVG helpers ───────────────────────────────────────────────────────────────
const W = 500;
const H = 400;
const PAD = 30;

function toSVG(val: number, domainMax: number, svgSize: number, pad: number) {
  return pad + (val / domainMax) * (svgSize - 2 * pad);
}
function fromSVG(svgVal: number, domainMax: number, svgSize: number, pad: number) {
  return ((svgVal - pad) / (svgSize - 2 * pad)) * domainMax;
}

function sx(x: number) { return toSVG(x, 100, W, PAD); }
function sy(y: number) { return H - toSVG(y, 100, H, PAD); }

// Decision boundary line: w[0]*x' + w[1]*y' + b = 0  where x'=x/50-1, y'=y/50-1
// Solve for y given x: y' = -(w[0]*x' + b)/w[1]  →  y = (y' + 1)*50
function boundaryY(x: number, w: [number, number], b: number): number {
  const xp = x / 50 - 1;
  if (Math.abs(w[1]) < 0.0001) return 50;
  const yp = -(w[0] * xp + b) / w[1];
  return (yp + 1) * 50;
}

function marginY(x: number, w: [number, number], b: number, offset: number): number {
  const xp = x / 50 - 1;
  const wNorm = Math.sqrt(w[0] ** 2 + w[1] ** 2);
  if (Math.abs(w[1]) < 0.0001 || wNorm < 0.001) return 50;
  const yp = -(w[0] * xp + b - offset) / w[1];
  return (yp + 1) * 50;
}

// ── Decision region background (coarse grid) ─────────────────────────────────
function DecisionBackground({ w, b }: { w: [number, number]; b: number }) {
  const cells = useMemo(() => {
    const res: { x: number; y: number; cls: number }[] = [];
    const steps = 20;
    for (let row = 0; row < steps; row++) {
      for (let col = 0; col < steps; col++) {
        const x = (col + 0.5) * (100 / steps);
        const y = (row + 0.5) * (100 / steps);
        const cls = predict(x, y, w, b);
        res.push({ x, y, cls });
      }
    }
    return res;
  }, [w, b]);

  return (
    <>
      {cells.map((c, i) => (
        <rect
          key={i}
          x={sx(c.x) - (W - 2 * PAD) / 20 / 2}
          y={sy(c.y) - (H - 2 * PAD) / 20 / 2}
          width={(W - 2 * PAD) / 20}
          height={(H - 2 * PAD) / 20}
          fill={c.cls >= 0 ? "#3bb4a4" : "var(--color-accent)"}
          opacity={0.12}
        />
      ))}
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function SVMClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const [datasetKey, setDatasetKey] = useState("separable");
  const [pts, setPts] = useState<DataPt[]>(() => genLinearlySeparable());
  const [C, setC] = useState(1.0);
  const [showMargin, setShowMargin] = useState(true);
  const [showSVs, setShowSVs] = useState(true);
  const [showRegions, setShowRegions] = useState(true);
  const [addingClass, setAddingClass] = useState<-1 | 1>(1);
  const [datasetsExplored, setDatasetsExplored] = useState<Set<string>>(new Set(["separable"]));
  const [cChanges, setCChanges] = useState(0);
  const completionFired = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const svm = useMemo(() => trainSVM(pts, C), [pts, C]);

  const { w, b, margin, supportVectors } = svm;

  // Completion: explored 2+ datasets AND changed C 3+ times
  const isComplete = datasetsExplored.size >= 2 && cChanges >= 3;

  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "svm", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  const handleSVGClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const svgX = e.clientX - rect.left;
    const svgY = e.clientY - rect.top;
    // Convert from screen coords to SVG coords (accounting for viewBox scaling)
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const vx = svgX * scaleX;
    const vy = svgY * scaleY;
    const x = fromSVG(vx, 100, W, PAD);
    const y = fromSVG(H - vy, 100, H, PAD);
    if (x < 0 || x > 100 || y < 0 || y > 100) return;
    const newId = Date.now();
    setPts(prev => [...prev, { id: newId, x, y, cls: addingClass }]);
  }, [addingClass]);

  function loadDataset(key: string) {
    const ds = DATASETS[key];
    if (!ds) return;
    setPts(ds.gen());
    setDatasetKey(key);
    setDatasetsExplored(prev => new Set([...prev, key]));
  }

  function handleReset() {
    setDatasetKey("separable");
    setPts(genLinearlySeparable());
    setC(1.0);
    setShowMargin(true);
    setShowSVs(true);
    setShowRegions(true);
    setAddingClass(1);
    setDatasetsExplored(new Set(["separable"]));
    setCChanges(0);
  }

  function handleCChange(val: number) {
    setC(val);
    setCChanges(prev => prev + 1);
  }

  // Compute boundary line endpoints
  const x0 = 2, x1 = 98;
  const y0b = boundaryY(x0, w, b);
  const y1b = boundaryY(x1, w, b);
  const y0m1 = marginY(x0, w, b, 1);
  const y1m1 = marginY(x1, w, b, 1);
  const y0m2 = marginY(x0, w, b, -1);
  const y1m2 = marginY(x1, w, b, -1);

  const wNorm = Math.sqrt(w[0] ** 2 + w[1] ** 2);
  const marginWidth = wNorm > 0.001 ? (2 / wNorm) * 50 : 0;

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="svm" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">SVM: Finding the Maximum Margin</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Machine Learning
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            SVM: Finding the <span className="text-[var(--color-accent)]">Maximum Margin</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
            Support Vector Machines find the widest possible gap between two classes. Click the canvas to add points,
            adjust the regularization parameter C, and watch the decision boundary adapt.
          </p>
        </section>

        {/* Progress */}
        <div className="mb-8 bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#94a3b8]">Exploration Progress</span>
            <span className="text-sm font-semibold text-white">
              {datasetsExplored.size}/2 datasets · {Math.min(cChanges, 3)}/3 C adjustments
            </span>
          </div>
          <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#1e5d8a] to-[#3bb4a4] rounded-full"
              animate={{ width: `${(Math.min(datasetsExplored.size, 2) / 2 * 50 + Math.min(cChanges, 3) / 3 * 50)}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-xs text-[var(--color-success)] font-semibold"
            >
              Guide complete!
            </motion.div>
          )}
          {!session?.user && (
            <p className="mt-2 text-xs text-[#94a3b8]">
              <Link href="/auth/sign-in" className="text-[var(--color-accent)] hover:underline">Sign in</Link> to save your progress.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          {/* SVG Canvas */}
          <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-[#1e293b] flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-white" id="svm-add-class-label">Click to add points:</span>
              <div className="flex items-center gap-3" role="radiogroup" aria-labelledby="svm-add-class-label">
                <button
                  role="radio"
                  aria-checked={addingClass === 1}
                  onClick={() => setAddingClass(1)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${addingClass === 1 ? "bg-[#3bb4a4]/20 border-[#3bb4a4]/60 text-[#3bb4a4]" : "border-[#334155] text-[#94a3b8] hover:border-[#3bb4a4]/40"}`}
                >
                  ● Class +1
                </button>
                <button
                  role="radio"
                  aria-checked={addingClass === -1}
                  onClick={() => setAddingClass(-1)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${addingClass === -1 ? "bg-[#d4af37]/20 border-[#d4af37]/60 text-[var(--color-accent)]" : "border-[#334155] text-[#94a3b8] hover:border-[#d4af37]/40"}`}
                >
                  ● Class -1
                </button>
              </div>
              <button
                onClick={() => setPts(DATASETS[datasetKey].gen())}
                className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#334155] text-[#94a3b8] hover:border-[#475569] transition-all"
              >
                Reset Points
              </button>
            </div>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className="w-full cursor-crosshair"
              onClick={handleSVGClick}
            >
              {/* Grid */}
              {[20, 40, 60, 80].map(v => (
                <React.Fragment key={v}>
                  <line x1={sx(v)} y1={sy(0)} x2={sx(v)} y2={sy(100)} stroke="#1e293b" strokeWidth="1" />
                  <line x1={sx(0)} y1={sy(v)} x2={sx(100)} y2={sy(v)} stroke="#1e293b" strokeWidth="1" />
                </React.Fragment>
              ))}

              {/* Decision regions */}
              {showRegions && <DecisionBackground w={w} b={b} />}

              {/* Margin band */}
              {showMargin && wNorm > 0.01 && (
                <polygon
                  points={`${sx(x0)},${sy(y0m1)} ${sx(x1)},${sy(y1m1)} ${sx(x1)},${sy(y1m2)} ${sx(x0)},${sy(y0m2)}`}
                  fill="#f1f5f9"
                  opacity={0.04}
                />
              )}

              {/* Margin lines */}
              {showMargin && wNorm > 0.01 && (
                <>
                  <line
                    x1={sx(x0)} y1={sy(y0m1)} x2={sx(x1)} y2={sy(y1m1)}
                    stroke="#3bb4a4" strokeWidth="1" strokeDasharray="6 4" opacity={0.7}
                  />
                  <line
                    x1={sx(x0)} y1={sy(y0m2)} x2={sx(x1)} y2={sy(y1m2)}
                    stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="6 4" opacity={0.7}
                  />
                </>
              )}

              {/* Decision boundary */}
              {wNorm > 0.01 && (
                <line
                  x1={sx(x0)} y1={sy(y0b)} x2={sx(x1)} y2={sy(y1b)}
                  stroke="white" strokeWidth="2.5" strokeLinecap="round"
                />
              )}

              {/* Data points */}
              {pts.map(pt => {
                const isSV = showSVs && supportVectors.includes(pt.id);
                return (
                  <g key={pt.id}>
                    {isSV && (
                      <circle
                        cx={sx(pt.x)} cy={sy(pt.y)} r={10}
                        fill="none" stroke="white" strokeWidth="1.5" opacity={0.6}
                      />
                    )}
                    <circle
                      cx={sx(pt.x)} cy={sy(pt.y)} r={5}
                      fill={pt.cls === 1 ? "#3bb4a4" : "var(--color-accent)"}
                      stroke={pt.cls === 1 ? "#1e8a7a" : "#b8960c"}
                      strokeWidth="1"
                    />
                  </g>
                );
              })}

              {/* Margin width label */}
              {showMargin && marginWidth > 3 && wNorm > 0.01 && (
                <text
                  x={sx(50)} y={sy(y0b) - 12}
                  fill="white" fontSize="11" textAnchor="middle" opacity={0.7}
                >
                  margin = {marginWidth.toFixed(1)}
                </text>
              )}
            </svg>
          </div>

          {/* Controls panel */}
          <div className="flex flex-col gap-5">
            {/* Dataset selector */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Dataset</h3>
              <div className="flex flex-col gap-2" role="radiogroup" aria-label="Dataset">
                {Object.entries(DATASETS).map(([key, ds]) => (
                  <button
                    key={key}
                    role="radio"
                    aria-checked={datasetKey === key}
                    onClick={() => loadDataset(key)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-all border ${datasetKey === key ? "bg-[#1e5d8a]/20 border-[#1e5d8a]/60 text-white" : "border-[#334155] text-[#94a3b8] hover:border-[#475569]"}`}
                  >
                    {ds.label}
                  </button>
                ))}
              </div>
            </div>

            {/* C parameter */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-white">Regularization C</h3>
                <span className="text-sm font-bold text-[var(--color-accent)]">{C.toFixed(2)}</span>
              </div>
              <p className="text-xs text-[#94a3b8] mb-3">
                Low C → wider margin, more misclassifications allowed.<br />
                High C → narrow margin, fewer violations tolerated.
              </p>
              <input
                type="range" aria-label="Regularization parameter C" min="0.01" max="10" step="0.01" value={C}
                onChange={e => handleCChange(parseFloat(e.target.value))}
                className="w-full accent-[var(--color-accent)]"
              />
              <div className="flex justify-between text-[10px] text-[#94a3b8] mt-1">
                <span>0.01 (soft)</span><span>10 (hard)</span>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {[0.1, 1, 5].map(val => (
                  <button
                    key={val}
                    aria-pressed={Math.abs(C - val) < 0.05}
                    onClick={() => handleCChange(val)}
                    className={`px-2.5 py-1 rounded text-xs border transition-all ${Math.abs(C - val) < 0.05 ? "bg-[#d4af37]/20 border-[#d4af37]/60 text-[var(--color-accent)]" : "border-[#334155] text-[#94a3b8] hover:border-[#475569]"}`}
                  >
                    C={val}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Visualization</h3>
              {[
                { label: "Show margin band", state: showMargin, toggle: () => setShowMargin(v => !v) },
                { label: "Highlight support vectors", state: showSVs, toggle: () => setShowSVs(v => !v) },
                { label: "Decision regions", state: showRegions, toggle: () => setShowRegions(v => !v) },
              ].map(({ label, state, toggle }) => (
                <button
                  key={label}
                  aria-pressed={state}
                  onClick={toggle}
                  className="flex items-center gap-2 w-full py-1.5 text-xs text-[#94a3b8] hover:text-white transition-colors"
                >
                  <div className={`w-8 h-4 rounded-full transition-colors ${state ? "bg-[#3bb4a4]" : "bg-[#334155]"} relative flex-shrink-0`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${state ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                  {label}
                </button>
              ))}
            </div>

            {/* Stats */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Current Hyperplane</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Margin Width", value: marginWidth > 0 ? marginWidth.toFixed(2) : "—" },
                  { label: "Support Vectors", value: supportVectors.length },
                  { label: "Points", value: pts.length },
                  { label: "C value", value: C.toFixed(2) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#0f172a]/60 rounded-lg p-2.5">
                    <div className="text-[10px] text-[#94a3b8] uppercase tracking-wide">{label}</div>
                    <div className="text-lg font-bold text-white">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Concept box */}
            <div className="bg-[#1e293b]/60 border border-[#d4af37]/20 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-2">Key Insight</h3>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                The <span className="text-white">support vectors</span> are the only points that matter
                for defining the boundary: all others could be removed and the hyperplane wouldn&apos;t change.
                This makes SVMs robust to outliers far from the boundary.
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
              className="mt-10 rounded-2xl border border-white/[0.08] bg-[#0f172a] overflow-hidden"
            >
              <div className="px-6 pt-6 pb-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-px bg-[var(--color-accent)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[2px] text-[var(--color-accent)]">
                    Guide Complete
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  Maximum Margin Found!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You explored multiple datasets and tuned C to trade margin width
                  against misclassifications.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">The Boundary</p>
                    <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                      SVMs pick the hyperplane with the widest gap between classes.
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Support Vectors</p>
                    <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                      Only the {supportVectors.length} points on or inside the margin
                      define the current boundary.
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Regularization C</p>
                    <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                      Low C tolerates violations for a wider margin; high C narrows it.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;An SVM does not remember the whole dataset: it remembers the few
                    support vectors on the margin, and C decides how expensive it is to
                    let a point cross the line.&quot;
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
                    href="/visual-guides/random-forests"
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
              href="/visual-guides/knn"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            >
              ← KNN
            </Link>
            <Link
              href="/visual-guides/random-forests"
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
            >
              Random Forests →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
