"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

// ── Types & helpers ────────────────────────────────────────────────────────────
interface Pt { x: number; y: number }

function gaussRand() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function generateDataset(n: number): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const x = (i / (n - 1)) * 2 - 1 + gaussRand() * 0.05;
    const y = Math.sin(x * Math.PI) + gaussRand() * 0.25;
    return { x, y };
  }).sort(() => Math.random() - 0.5);
}

// Polynomial fit (degree d)
function polyFit(pts: Pt[], degree: number): number[] {
  const n = pts.length;
  if (n === 0) return [];
  const d = Math.min(degree, n - 1);
  const X = pts.map(p => Array.from({ length: d + 1 }, (_, k) => Math.pow(p.x, k)));
  const y = pts.map(p => p.y);
  const XtX = Array.from({ length: d + 1 }, (_, i) =>
    Array.from({ length: d + 1 }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0))
  );
  const Xty = Array.from({ length: d + 1 }, (_, i) => X.reduce((s, r, ri) => s + r[i] * y[ri], 0));
  const A = XtX.map((row, i) => [...row, Xty[i]]);
  for (let col = 0; col <= d; col++) {
    let mx = col;
    for (let r = col + 1; r <= d; r++) if (Math.abs(A[r][col]) > Math.abs(A[mx][col])) mx = r;
    [A[col], A[mx]] = [A[mx], A[col]];
    if (Math.abs(A[col][col]) < 1e-12) continue;
    const piv = A[col][col];
    for (let j = col; j <= d + 1; j++) A[col][j] /= piv;
    for (let r = 0; r <= d; r++) {
      if (r === col) continue;
      const f = A[r][col];
      for (let j = col; j <= d + 1; j++) A[r][j] -= f * A[col][j];
    }
  }
  return A.map(r => r[d + 1]);
}

function polyEval(coeffs: number[], x: number) {
  return coeffs.reduce((s, c, k) => s + c * Math.pow(x, k), 0);
}

function mse(pts: Pt[], coeffs: number[]) {
  if (pts.length === 0 || coeffs.length === 0) return 0;
  return pts.reduce((s, p) => s + (p.y - polyEval(coeffs, p.x)) ** 2, 0) / pts.length;
}

// ── K-fold cross-validation ────────────────────────────────────────────────────
interface FoldResult { fold: number; trainMSE: number; valMSE: number }

function runKFold(pts: Pt[], k: number, degree: number): FoldResult[] {
  const n = pts.length;
  const results: FoldResult[] = [];
  for (let fold = 0; fold < k; fold++) {
    const val = pts.filter((_, i) => i % k === fold);
    const train = pts.filter((_, i) => i % k !== fold);
    const coeffs = polyFit(train, degree);
    results.push({ fold, trainMSE: mse(train, coeffs), valMSE: mse(val, coeffs) });
  }
  return results;
}

// ── Chart helpers ─────────────────────────────────────────────────────────────
function mean(arr: number[]) { return arr.reduce((s, v) => s + v, 0) / arr.length; }
function std(arr: number[]) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

// ── Colors for folds ──────────────────────────────────────────────────────────
const FOLD_COLORS = ["#3bb4a4", "#d4af37", "#1e5d8a", "#a78bfa", "#f97316", "#ec4899", "#22d3ee", "#4ade80", "#fb923c", "#818cf8"];

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CrossValidationClient() {
  const { data: session } = useSession();
  const [k, setK] = useState(5);
  const [degree, setDegree] = useState(3);
  const [activeFold, setActiveFold] = useState<number | null>(null);
  const [pts, setPts] = useState<Pt[]>(() => generateDataset(40));
  const [foldResults, setFoldResults] = useState<FoldResult[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const [kTried, setKTried] = useState<Set<number>>(new Set());
  const [runCount, setRunCount] = useState(0);
  const completionFired = useRef(false);

  // Run CV
  function runCV() {
    const results = runKFold(pts, k, degree);
    setFoldResults(results);
    setHasRun(true);
    setActiveFold(null);
    setKTried(prev => new Set([...prev, k]));
    setRunCount(prev => prev + 1);
  }

  // Completion: tried k=5 AND k=10 AND 3+ runs
  const isComplete = kTried.has(5) && (kTried.has(10) || kTried.has(9) || kTried.has(8)) && runCount >= 3;

  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "cross-validation", score: 7 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  const meanVal = foldResults.length > 0 ? mean(foldResults.map(r => r.valMSE)) : 0;
  const stdVal = foldResults.length > 0 ? std(foldResults.map(r => r.valMSE)) : 0;
  const meanTrain = foldResults.length > 0 ? mean(foldResults.map(r => r.trainMSE)) : 0;

  // Scatter SVG layout
  const SW = 380; const SH = 260; const SP = 25;
  const XMN = -1.1; const XMX = 1.1; const YMN = -1.8; const YMX = 1.8;
  function scx(x: number) { return SP + ((x - XMN) / (XMX - XMN)) * (SW - 2 * SP); }
  function scy(y: number) { return SH - SP - ((y - YMN) / (YMX - YMN)) * (SH - 2 * SP); }

  // Which fold does each point belong to?
  function foldOf(i: number) { return i % k; }

  // Fitted curve for active fold
  const activeCurveCoeffs = useMemo(() => {
    if (activeFold === null || !hasRun) return null;
    const train = pts.filter((_, i) => foldOf(i) !== activeFold);
    return polyFit(train, degree);
  }, [activeFold, hasRun, pts, degree, k]);

  function curvePts(coeffs: number[]) {
    return Array.from({ length: 100 }, (_, i) => {
      const x = XMN + (i / 99) * (XMX - XMN);
      const y = polyEval(coeffs, x);
      return `${scx(x)},${scy(Math.max(YMN, Math.min(YMX, y)))}`;
    }).join(" ");
  }

  // Bar chart layout
  const BW = 380; const BH = 160; const BP = 30;
  const maxValMSE = foldResults.length > 0 ? Math.max(...foldResults.map(r => r.valMSE), meanVal * 1.5) : 1;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <div className="max-w-[1300px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span>/</span>
          <span className="text-white">Cross-Validation: Why One Split Isn't Enough</span>
        </nav>

        {/* Hero */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-[#1e5d8a]/20 border border-[#1e5d8a]/40 rounded-full px-3 py-1 mb-4">
            <span className="text-xs font-semibold text-[#3bb4a4] uppercase tracking-wider">Machine Learning</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Cross-Validation: Why One Split Isn't Enough
          </h1>
          <p className="text-[#94a3b8] text-base max-w-2xl">
            A single train/test split gives you one estimate of performance — which might be lucky or unlucky.
            K-fold CV rotates through all possible splits to get a robust estimate with a confidence interval.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8 bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#94a3b8]">Exploration Progress</span>
            <span className="text-sm font-semibold text-white">
              Runs: {runCount}/3 · K values tried: {[...kTried].join(", ") || "—"}
            </span>
          </div>
          <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#1e5d8a] to-[#3bb4a4] rounded-full"
              animate={{ width: `${Math.min(runCount, 3) / 3 * 50 + (kTried.size >= 2 ? 50 : 0)}%` }}
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
          <div className="flex flex-col gap-5">
            {/* Fold strip */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Data Split — {k} Folds (click a fold to inspect)</h3>
              <div className="flex gap-1.5 rounded-xl overflow-hidden mb-3">
                {Array.from({ length: k }, (_, fi) => (
                  <motion.button
                    key={fi}
                    onClick={() => setActiveFold(activeFold === fi ? null : fi)}
                    className="flex-1 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all"
                    style={{
                      backgroundColor: `${FOLD_COLORS[fi % FOLD_COLORS.length]}${activeFold === fi ? "50" : "20"}`,
                      borderWidth: 1.5,
                      borderStyle: "solid",
                      borderColor: `${FOLD_COLORS[fi % FOLD_COLORS.length]}${activeFold === fi ? "ff" : "40"}`,
                      color: activeFold === fi ? FOLD_COLORS[fi % FOLD_COLORS.length] : "#94a3b8",
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {fi + 1}
                    {hasRun && foldResults[fi] && (
                      <span className="ml-1 text-[10px] opacity-70">
                        {(foldResults[fi].valMSE).toFixed(2)}
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
              {activeFold !== null && (
                <p className="text-xs text-[#94a3b8]">
                  <span style={{ color: FOLD_COLORS[activeFold % FOLD_COLORS.length] }}>Fold {activeFold + 1}</span>
                  {" "}= validation set ({Math.round(pts.length / k)} points).
                  Remaining {k - 1} folds used for training.
                </p>
              )}
            </div>

            {/* Scatter + curve */}
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl overflow-hidden">
              <div className="p-3 border-b border-[#1e293b] text-xs text-[#94a3b8]">
                <span className="text-white font-semibold">Data & Fit</span>
                {activeFold !== null && <span> — showing fold {activeFold + 1} as validation</span>}
              </div>
              <svg viewBox={`0 0 ${SW} ${SH}`} className="w-full">
                {/* Grid */}
                {[-1, -0.5, 0, 0.5, 1].map(v => (
                  <React.Fragment key={v}>
                    <line x1={scx(v)} y1={scy(YMN)} x2={scx(v)} y2={scy(YMX)} stroke="#1e293b" strokeWidth="1" />
                    <line x1={scx(XMN)} y1={scy(v)} x2={scx(XMX)} y2={scy(v)} stroke="#1e293b" strokeWidth="1" />
                  </React.Fragment>
                ))}
                {/* Fitted curve */}
                {activeCurveCoeffs && (
                  <polyline points={curvePts(activeCurveCoeffs)} fill="none" stroke="white" strokeWidth="2" />
                )}
                {/* Points colored by fold */}
                {pts.map((p, i) => {
                  const fi = foldOf(i);
                  const isVal = activeFold !== null && fi === activeFold;
                  return (
                    <circle key={i} cx={scx(p.x)} cy={scy(p.y)} r={isVal ? 5 : 3.5}
                      fill={FOLD_COLORS[fi % FOLD_COLORS.length]}
                      opacity={activeFold === null ? 0.8 : isVal ? 1 : 0.25}
                      stroke={isVal ? "white" : "none"} strokeWidth="1"
                    />
                  );
                })}
              </svg>
            </div>

            {/* Bar chart of per-fold errors */}
            {hasRun && (
              <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl overflow-hidden">
                <div className="p-3 border-b border-[#1e293b] text-xs">
                  <span className="text-white font-semibold">Validation MSE per Fold</span>
                  <span className="ml-3 text-[#94a3b8]">mean ± std: </span>
                  <span className="text-[#3bb4a4] font-mono">{meanVal.toFixed(3)} ± {stdVal.toFixed(3)}</span>
                </div>
                <svg viewBox={`0 0 ${BW} ${BH}`} className="w-full">
                  {foldResults.map((r, fi) => {
                    const barH = ((r.valMSE) / (maxValMSE + 0.001)) * (BH - 2 * BP);
                    const barW = (BW - 2 * BP) / foldResults.length - 4;
                    const bx = BP + fi * ((BW - 2 * BP) / foldResults.length) + 2;
                    return (
                      <g key={fi} onClick={() => setActiveFold(activeFold === fi ? null : fi)} className="cursor-pointer">
                        <rect
                          x={bx} y={BH - BP - barH} width={barW} height={barH}
                          fill={FOLD_COLORS[fi % FOLD_COLORS.length]}
                          opacity={activeFold === null || activeFold === fi ? 0.8 : 0.3}
                          rx="3"
                        />
                        <text x={bx + barW / 2} y={BH - BP + 12} fill="#94a3b8" fontSize="9" textAnchor="middle">
                          {fi + 1}
                        </text>
                        <text x={bx + barW / 2} y={BH - BP - barH - 3} fill="white" fontSize="8" textAnchor="middle">
                          {r.valMSE.toFixed(3)}
                        </text>
                      </g>
                    );
                  })}
                  {/* Mean line */}
                  {(() => {
                    const meanY = BH - BP - (meanVal / (maxValMSE + 0.001)) * (BH - 2 * BP);
                    return (
                      <>
                        <line x1={BP} y1={meanY} x2={BW - BP} y2={meanY} stroke="#3bb4a4" strokeWidth="1.5" strokeDasharray="4 3" />
                        <text x={BW - BP - 2} y={meanY - 3} fill="#3bb4a4" fontSize="9" textAnchor="end">mean</text>
                      </>
                    );
                  })()}
                </svg>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-4">
            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-white">K (number of folds)</h3>
                <span className="text-sm font-bold text-[#d4af37]">{k}</span>
              </div>
              <input type="range" min="2" max="10" step="1" value={k}
                onChange={e => setK(parseInt(e.target.value))}
                className="w-full accent-[#d4af37]"
              />
              <div className="flex gap-2 mt-3 flex-wrap">
                {[3, 5, 10].map(kv => (
                  <button key={kv} onClick={() => setK(kv)}
                    className={`px-2.5 py-1 rounded text-xs border transition-all ${k === kv ? "bg-[#d4af37]/20 border-[#d4af37]/60 text-[#d4af37]" : "border-[#334155] text-[#94a3b8]"}`}
                  >
                    {kv}-fold
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-white">Polynomial Degree</h3>
                <span className="text-sm font-bold text-[#3bb4a4]">{degree}</span>
              </div>
              <input type="range" min="1" max="10" step="1" value={degree}
                onChange={e => setDegree(parseInt(e.target.value))}
                className="w-full accent-[#3bb4a4]"
              />
            </div>

            <button onClick={runCV}
              className="px-4 py-3 rounded-xl text-sm font-semibold bg-[#1e5d8a] hover:bg-[#1e5d8a]/80 transition-colors"
            >
              Run {k}-Fold Cross-Validation
            </button>

            <button onClick={() => { setPts(generateDataset(40)); setHasRun(false); setFoldResults([]); }}
              className="px-4 py-2 rounded-xl text-sm border border-[#334155] text-[#94a3b8] hover:border-[#475569] transition-colors"
            >
              New Dataset
            </button>

            {hasRun && (
              <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Summary</h3>
                <div className="space-y-2 text-xs">
                  {[
                    { label: "Mean Val MSE", value: meanVal.toFixed(4), color: "#3bb4a4" },
                    { label: "Std Dev", value: `±${stdVal.toFixed(4)}`, color: "#94a3b8" },
                    { label: "Mean Train MSE", value: meanTrain.toFixed(4), color: "#d4af37" },
                    { label: "Folds", value: k, color: "white" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-[#94a3b8]">{label}</span>
                      <span className="font-mono" style={{ color }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-[#1e293b]/60 border border-[#d4af37]/20 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-[#d4af37] uppercase tracking-wide mb-2">Key Insight</h3>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Every point gets to be in the validation set exactly once. The mean across folds is a
                much more reliable estimate than any single split, and the std tells you how stable your model is.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-[#1e293b]">
          <Link href="/visual-guides/overfitting-underfitting" className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors">
            <span>←</span><span>Overfitting Playground</span>
          </Link>
          <Link href="/visual-guides" className="text-sm text-[#94a3b8] hover:text-white transition-colors">All Guides</Link>
          <Link href="/visual-guides/confusion-matrix" className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white transition-colors">
            <span>Confusion Matrix</span><span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
