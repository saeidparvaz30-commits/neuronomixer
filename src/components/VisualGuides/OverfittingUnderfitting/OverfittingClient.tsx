"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";

// ── Polynomial regression ─────────────────────────────────────────────────────
interface Pt { x: number; y: number }

// Vandermonde matrix approach for polynomial regression
function polyFit(pts: Pt[], degree: number): number[] {
  const n = pts.length;
  if (n === 0 || degree < 0) return [];
  const d = Math.min(degree, n - 1);
  // Build Vandermonde matrix X (n x (d+1))
  const X: number[][] = pts.map(p => Array.from({ length: d + 1 }, (_, k) => Math.pow(p.x, k)));
  const y = pts.map(p => p.y);
  // Normal equations: (X'X) w = X'y
  const XtX: number[][] = Array.from({ length: d + 1 }, (_, i) =>
    Array.from({ length: d + 1 }, (_, j) => X.reduce((s, row) => s + row[i] * row[j], 0))
  );
  const Xty: number[] = Array.from({ length: d + 1 }, (_, i) =>
    X.reduce((s, row, ri) => s + row[i] * y[ri], 0)
  );
  // Solve via Gaussian elimination
  const A = XtX.map((row, i) => [...row, Xty[i]]);
  for (let col = 0; col <= d; col++) {
    // Pivot
    let maxRow = col;
    for (let row = col + 1; row <= d; row++) {
      if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) maxRow = row;
    }
    [A[col], A[maxRow]] = [A[maxRow], A[col]];
    if (Math.abs(A[col][col]) < 1e-12) continue;
    const pivot = A[col][col];
    for (let j = col; j <= d + 1; j++) A[col][j] /= pivot;
    for (let row = 0; row <= d; row++) {
      if (row === col) continue;
      const factor = A[row][col];
      for (let j = col; j <= d + 1; j++) A[row][j] -= factor * A[col][j];
    }
  }
  return A.map(row => row[d + 1]);
}

function polyEval(coeffs: number[], x: number): number {
  return coeffs.reduce((sum, c, k) => sum + c * Math.pow(x, k), 0);
}

function mse(pts: Pt[], coeffs: number[]): number {
  if (pts.length === 0 || coeffs.length === 0) return 0;
  return pts.reduce((s, p) => s + (p.y - polyEval(coeffs, p.x)) ** 2, 0) / pts.length;
}

// ── Data generation ───────────────────────────────────────────────────────────
function gaussRand() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

type DatasetType = "linear" | "quadratic" | "sine" | "noise";
const DATASETS: Record<DatasetType, { label: string; fn: (x: number) => number }> = {
  linear: { label: "Linear (degree 1)", fn: x => 0.7 * x + 0.1 },
  quadratic: { label: "Quadratic (degree 2)", fn: x => x * x - 0.5 },
  sine: { label: "Sine wave (degree ~5)", fn: x => Math.sin(x * Math.PI * 1.5) },
  noise: { label: "Pure noise", fn: () => 0 },
};

function generateData(type: DatasetType, n: number, noise: number): { train: Pt[]; test: Pt[] } {
  const fn = DATASETS[type].fn;
  const allX = Array.from({ length: n + 20 }, () => Math.random() * 2 - 1);
  const allPts = allX.map(x => ({ x, y: fn(x) + gaussRand() * noise }));
  allPts.sort(() => Math.random() - 0.5);
  return { train: allPts.slice(0, n), test: allPts.slice(n, n + 20) };
}

// ── SVG constants ─────────────────────────────────────────────────────────────
const W = 500; const H = 320; const PAD = 30;
const X_MIN = -1.1; const X_MAX = 1.1;
const Y_MIN = -1.8; const Y_MAX = 1.8;

function sx(x: number) { return PAD + ((x - X_MIN) / (X_MAX - X_MIN)) * (W - 2 * PAD); }
function sy(y: number) { return H - PAD - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * (H - 2 * PAD); }

function curvePoints(coeffs: number[], steps = 200): string {
  if (coeffs.length === 0) return "";
  return Array.from({ length: steps }, (_, i) => {
    const x = X_MIN + (i / (steps - 1)) * (X_MAX - X_MIN);
    const y = polyEval(coeffs, x);
    return `${sx(x)},${sy(Math.max(Y_MIN, Math.min(Y_MAX, y)))}`;
  }).join(" ");
}

// ── Regime label ──────────────────────────────────────────────────────────────
function getRegime(trainMSE: number, testMSE: number, degree: number): { label: string; color: string; desc: string } {
  const ratio = testMSE / (trainMSE + 0.0001);
  if (degree <= 1 && trainMSE > 0.15) return { label: "Underfitting", color: "#d4af37", desc: "Model is too simple — high bias, misses the pattern" };
  if (ratio > 3 && degree > 3) return { label: "Overfitting", color: "#ef4444", desc: "Model memorizes training data — high variance, fails on new data" };
  if (ratio < 2 && trainMSE < 0.15) return { label: "Good Fit", color: "#3bb4a4", desc: "Balanced bias-variance — generalizes well" };
  return { label: "Moderate", color: "#94a3b8", desc: "Reasonable fit — some room for improvement" };
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function OverfittingClient() {
  const { data: session } = useSession();
  const [datasetType, setDatasetType] = useState<DatasetType>("quadratic");
  const [noise, setNoise] = useState(0.2);
  const [nTrain, setNTrain] = useState(15);
  const [degree, setDegree] = useState(2);
  const [data, setData] = useState<{ train: Pt[]; test: Pt[] }>(() => generateData("quadratic", 15, 0.2));
  const [showTest, setShowTest] = useState(true);
  const [regimesObserved, setRegimesObserved] = useState<Set<string>>(new Set());
  const [interactionCount, setInteractionCount] = useState(0);
  const completionFired = useRef(false);

  function regenerate(type = datasetType, n = nTrain, nz = noise) {
    setData(generateData(type, n, nz));
    setInteractionCount(prev => prev + 1);
  }

  const coeffs = useMemo(() => polyFit(data.train, degree), [data.train, degree]);
  const trainMSE = useMemo(() => mse(data.train, coeffs), [data.train, coeffs]);
  const testMSE = useMemo(() => mse(data.test, coeffs), [data.test, coeffs]);

  const regime = useMemo(() => getRegime(trainMSE, testMSE, degree), [trainMSE, testMSE, degree]);

  useEffect(() => {
    setRegimesObserved(prev => new Set([...prev, regime.label]));
  }, [regime.label]);

  const isComplete = regimesObserved.has("Overfitting") && regimesObserved.has("Underfitting") && regimesObserved.has("Good Fit");

  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "overfitting-underfitting", score: 8 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  const pts = curvePoints(coeffs);

  // Bias-variance bar widths (normalized)
  const maxMSE = Math.max(trainMSE, testMSE, 0.01);
  const trainBarW = (trainMSE / maxMSE) * 100;
  const testBarW = (testMSE / maxMSE) * 100;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <div className="max-w-[1300px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span>/</span>
          <span className="text-white">Overfitting vs Underfitting Playground</span>
        </nav>

        {/* Hero */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-[#1e5d8a]/20 border border-[#1e5d8a]/40 rounded-full px-3 py-1 mb-4">
            <span className="text-xs font-semibold text-[#3bb4a4] uppercase tracking-wider">Machine Learning</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Overfitting vs Underfitting Playground
          </h1>
          <p className="text-[#94a3b8] text-base max-w-2xl">
            Fit polynomials of increasing degree to data and watch the model go from too simple to memorizing noise.
            Observe how training error and test error diverge when complexity grows unchecked.
          </p>
        </div>

        {/* Regime badge + progress */}
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-sm`}
            style={{ borderColor: `${regime.color}40`, backgroundColor: `${regime.color}15`, color: regime.color }}>
            {regime.label}
          </div>
          <p className="text-sm text-[#94a3b8] flex-1">{regime.desc}</p>
        </div>

        <div className="mb-6 bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#94a3b8]">Regimes Observed</span>
            <span className="text-sm font-semibold text-white">
              {["Underfitting", "Good Fit", "Overfitting"].map(r => (
                <span key={r} className={`ml-2 text-xs px-2 py-0.5 rounded-full ${regimesObserved.has(r) ? "bg-[#3bb4a4]/20 text-[#3bb4a4]" : "bg-[#1e293b] text-[#94a3b8]"}`}>{r}</span>
              ))}
            </span>
          </div>
          <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#1e5d8a] to-[#3bb4a4] rounded-full"
              animate={{ width: `${(["Underfitting", "Good Fit", "Overfitting"].filter(r => regimesObserved.has(r)).length / 3) * 100}%` }}
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
          {/* Chart */}
          <div className="flex flex-col gap-4">
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl overflow-hidden">
              <div className="p-3 border-b border-[#1e293b] flex items-center gap-4 flex-wrap text-xs">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#3bb4a4]" /> Train</div>
                {showTest && <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#d4af37] opacity-60" /> Test (hidden from model)</div>}
                <button onClick={() => setShowTest(v => !v)} className="ml-auto text-[#94a3b8] hover:text-white transition-colors">
                  {showTest ? "Hide" : "Show"} test
                </button>
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
                {/* Grid */}
                {[-1, -0.5, 0, 0.5, 1].map(v => (
                  <React.Fragment key={v}>
                    <line x1={sx(v)} y1={sy(Y_MIN)} x2={sx(v)} y2={sy(Y_MAX)} stroke="#1e293b" strokeWidth="1" />
                    <line x1={sx(X_MIN)} y1={sy(v)} x2={sx(X_MAX)} y2={sy(v)} stroke="#1e293b" strokeWidth="1" />
                  </React.Fragment>
                ))}
                {/* Zero axes */}
                <line x1={sx(0)} y1={sy(Y_MIN)} x2={sx(0)} y2={sy(Y_MAX)} stroke="#334155" strokeWidth="1" />
                <line x1={sx(X_MIN)} y1={sy(0)} x2={sx(X_MAX)} y2={sy(0)} stroke="#334155" strokeWidth="1" />

                {/* Fitted curve */}
                {pts && (
                  <polyline points={pts} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                )}

                {/* Test points */}
                {showTest && data.test.map((p, i) => (
                  <circle key={`t${i}`} cx={sx(p.x)} cy={sy(p.y)} r={3.5}
                    fill="#d4af37" opacity={0.5} />
                ))}

                {/* Train points */}
                {data.train.map((p, i) => (
                  <circle key={`tr${i}`} cx={sx(p.x)} cy={sy(p.y)} r={4}
                    fill="#3bb4a4" stroke="#1e8a7a" strokeWidth="1" />
                ))}

                {/* Degree label */}
                <text x={W - PAD} y={PAD} fill="white" fontSize="11" textAnchor="end" fontWeight="bold">
                  degree {degree}
                </text>
              </svg>
            </div>

            {/* MSE bars */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Error Comparison</h3>
              <div className="space-y-3">
                {[
                  { label: "Train MSE", value: trainMSE, width: trainBarW, color: "#3bb4a4" },
                  { label: "Test MSE", value: testMSE, width: testBarW, color: "#d4af37" },
                ].map(({ label, value, width, color }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[#94a3b8]">{label}</span>
                      <span className="font-mono" style={{ color }}>{value.toFixed(4)}</span>
                    </div>
                    <div className="h-3 bg-[#0f172a] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                        animate={{ width: `${Math.min(width, 100)}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                ))}
                <div className="pt-1 text-xs text-[#94a3b8]">
                  Test/Train ratio: <span className="text-white font-semibold">{(testMSE / (trainMSE + 0.0001)).toFixed(2)}×</span>
                  {testMSE / (trainMSE + 0.0001) > 3 && <span className="text-[#ef4444] ml-2">← overfitting!</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-4">
            {/* Dataset */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Dataset</h3>
              <div className="flex flex-col gap-2">
                {(Object.entries(DATASETS) as [DatasetType, { label: string }][]).map(([key, ds]) => (
                  <button key={key} onClick={() => { setDatasetType(key); regenerate(key); }}
                    className={`px-3 py-2 rounded-lg text-xs font-medium text-left border transition-all ${datasetType === key ? "bg-[#1e5d8a]/20 border-[#1e5d8a]/60 text-white" : "border-[#334155] text-[#94a3b8] hover:border-[#475569]"}`}
                  >
                    {ds.label}
                  </button>
                ))}
                <button onClick={() => regenerate()}
                  className="px-3 py-2 rounded-lg text-xs font-medium border border-[#334155] text-[#94a3b8] hover:border-[#475569] text-left transition-all">
                  New Sample
                </button>
              </div>
            </div>

            {/* Polynomial degree */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-white">Polynomial Degree</h3>
                <span className="text-sm font-bold text-[#d4af37]">{degree}</span>
              </div>
              <input type="range" min="1" max="12" step="1" value={degree}
                onChange={e => setDegree(parseInt(e.target.value))}
                className="w-full accent-[#d4af37]"
              />
              <div className="flex justify-between text-[10px] text-[#94a3b8] mt-1">
                <span>1 (linear)</span><span>12 (overfit)</span>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {[1, 2, 5, 10].map(d => (
                  <button key={d} onClick={() => setDegree(d)}
                    className={`px-2.5 py-1 rounded text-xs border transition-all ${degree === d ? "bg-[#d4af37]/20 border-[#d4af37]/60 text-[#d4af37]" : "border-[#334155] text-[#94a3b8]"}`}
                  >
                    d={d}
                  </button>
                ))}
              </div>
            </div>

            {/* Sample size + noise */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-white">Training Points</h3>
                <span className="text-sm font-bold text-[#3bb4a4]">{nTrain}</span>
              </div>
              <input type="range" min="5" max="50" step="1" value={nTrain}
                onChange={e => { const n = parseInt(e.target.value); setNTrain(n); regenerate(datasetType, n); }}
                className="w-full accent-[#3bb4a4] mb-4"
              />
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-white">Noise Level</h3>
                <span className="text-sm font-bold text-[#94a3b8]">{noise.toFixed(2)}</span>
              </div>
              <input type="range" min="0" max="0.8" step="0.01" value={noise}
                onChange={e => { const nz = parseFloat(e.target.value); setNoise(nz); regenerate(datasetType, nTrain, nz); }}
                className="w-full accent-[#94a3b8]"
              />
            </div>

            {/* Key insight */}
            <div className="bg-[#1e293b]/60 border border-[#d4af37]/20 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-[#d4af37] uppercase tracking-wide mb-2">Key Insight</h3>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                When test error rises while train error falls, the model is memorizing noise instead of
                learning the pattern. The gap between the two errors measures <span className="text-white">generalization</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-[#1e293b]">
          <Link href="/visual-guides/gradient-descent" className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors">
            <span>←</span><span>Gradient Descent</span>
          </Link>
          <Link href="/visual-guides" className="text-sm text-[#94a3b8] hover:text-white transition-colors">All Guides</Link>
          <Link href="/visual-guides/cross-validation" className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors">
            <span>Cross-Validation</span><span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
