"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";
import { generateStudents, mean, Student } from "./types";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

const NEXT_GUIDE_SLUG = "bias-variance";

// ── Scatter plot ──────────────────────────────────────────────────────────────
function ScatterPlot({
  students,
  selected,
  threshold,
  showRegression,
  onHover,
  hoveredId,
}: {
  students: Student[];
  selected: "top" | "bottom" | "all";
  threshold: number;
  showRegression: boolean;
  onHover: (id: number | null) => void;
  hoveredId: number | null;
}) {
  const W = 480, H = 380, PAD = { l: 54, r: 16, t: 16, b: 48 };
  const IW = W - PAD.l - PAD.r, IH = H - PAD.t - PAD.b;

  const tx = (v: number) => PAD.l + (v / 100) * IW;
  const ty = (v: number) => PAD.t + IH - (v / 100) * IH;

  // Regression line
  const regLine = useMemo(() => {
    const n = students.length;
    if (n < 2) return null;
    const mx = mean(students.map(s => s.test1));
    const my = mean(students.map(s => s.test2));
    const covXY = students.reduce((a, s) => a + (s.test1 - mx) * (s.test2 - my), 0) / n;
    const varX = students.reduce((a, s) => a + (s.test1 - mx) ** 2, 0) / n;
    const slope = varX === 0 ? 1 : covXY / varX;
    const intercept = my - slope * mx;
    return { slope, intercept };
  }, [students]);

  function getColor(s: Student) {
    const isTop = s.test1 >= threshold;
    const isBottom = s.test1 < (100 - threshold);
    if (selected === "top" && !isTop) return "#1e293b";
    if (selected === "bottom" && !isBottom) return "#1e293b";
    if (isTop) return "var(--color-accent)";
    if (isBottom) return "#ef4444";
    return "#475569";
  }

  function getOpacity(s: Student) {
    const isTop = s.test1 >= threshold;
    const isBottom = s.test1 < (100 - threshold);
    if (selected === "top" && !isTop) return 0.15;
    if (selected === "bottom" && !isBottom) return 0.15;
    return 1;
  }

  const ticks = [0, 25, 50, 75, 100];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%"
      onMouseLeave={() => onHover(null)}>
      {/* Grid */}
      {ticks.map(t => (
        <g key={t}>
          <line x1={tx(t)} y1={PAD.t} x2={tx(t)} y2={PAD.t + IH} stroke="#1e293b" strokeWidth="1" />
          <line x1={PAD.l} y1={ty(t)} x2={PAD.l + IW} y2={ty(t)} stroke="#1e293b" strokeWidth="1" />
          <text x={tx(t)} y={PAD.t + IH + 18} textAnchor="middle" fill="#475569" fontSize="15">{t}</text>
          <text x={PAD.l - 6} y={ty(t) + 5} textAnchor="end" fill="#475569" fontSize="15">{t}</text>
        </g>
      ))}

      {/* Identity line (y=x) */}
      <line x1={tx(0)} y1={ty(0)} x2={tx(100)} y2={ty(100)}
        stroke="#3bb4a4" strokeWidth="1" strokeDasharray="4,3" opacity="0.4" />
      <text x={tx(90)} y={ty(93)} fill="#3bb4a4" fontSize="15" opacity="0.6">y = x</text>

      {/* Regression line */}
      {showRegression && regLine && (() => {
        const x0 = 0, x1 = 100;
        const y0 = regLine.slope * x0 + regLine.intercept;
        const y1 = regLine.slope * x1 + regLine.intercept;
        return (
          <motion.line
            x1={tx(x0)} y1={ty(y0)} x2={tx(x1)} y2={ty(y1)}
            stroke="var(--color-accent)" strokeWidth="2"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 0.6 }}
          />
        );
      })()}

      {/* Threshold region */}
      {selected === "top" && (
        <rect x={tx(threshold)} y={PAD.t} width={tx(100) - tx(threshold)} height={IH}
          fill="var(--color-accent)" opacity="0.05" />
      )}
      {selected === "bottom" && (
        <rect x={PAD.l} y={PAD.t} width={tx(100 - threshold) - PAD.l} height={IH}
          fill="#ef4444" opacity="0.05" />
      )}

      {/* Dots. Position animates via a group transform: framer-motion's SVG
          attribute animation writes cx/cy as "undefined" for a frame when the
          animate target changes (first regenerate), spamming console errors. */}
      {students.map(s => (
        <motion.g
          key={s.id}
          initial={false}
          animate={{ x: tx(s.test1), y: ty(s.test2) }}
          transition={{ duration: 0.5 }}
        >
          <circle
            r={hoveredId === s.id ? 7 : 5}
            fill={getColor(s)}
            opacity={getOpacity(s)}
            onMouseEnter={() => onHover(s.id)}
            style={{ cursor: "pointer" }}
          />
        </motion.g>
      ))}

      {/* Hover label */}
      {hoveredId !== null && (() => {
        const s = students.find(st => st.id === hoveredId);
        if (!s) return null;
        const lx = tx(s.test1) + 10, ly = ty(s.test2) - 10;
        return (
          <g>
            <rect x={lx - 2} y={ly - 14} width={116} height={42} rx="4" fill="#0f172a" stroke="#334155" />
            <text x={lx + 4} y={ly + 2} fill="white" fontSize="15" fontWeight="bold">{s.name}</text>
            <text x={lx + 4} y={ly + 22} fill="#94a3b8" fontSize="15">T1:{s.test1} T2:{s.test2}</text>
          </g>
        );
      })()}

      {/* Axes labels */}
      <text x={PAD.l + IW / 2} y={H - 4} textAnchor="middle" fill="#475569" fontSize="16">Test 1 Score</text>
      <text x={13} y={PAD.t + IH / 2} textAnchor="middle" fill="#475569" fontSize="16"
        transform={`rotate(-90, 13, ${PAD.t + IH / 2})`}>Test 2 Score</text>
    </svg>
  );
}

// ── Arrow plot: mean shift ────────────────────────────────────────────────────
function MeanArrow({ group, label, color, overallMean }: { group: Student[]; label: string; color: string; overallMean: number }) {
  if (group.length === 0) return null;
  const m1 = mean(group.map(s => s.test1));
  const m2 = mean(group.map(s => s.test2));
  const diff = m2 - m1;
  const pct = diff.toFixed(1);
  const towardMean = (m1 > overallMean && diff < 0) || (m1 < overallMean && diff > 0);
  const arrow = diff < 0 ? "↓" : "↑";
  const shiftLabel =
    Math.abs(diff) < 0.5
      ? "No change"
      : towardMean
        ? `Regressed toward mean ${arrow}`
        : `Moved away from mean ${arrow} (sampling noise)`;

  return (
    <div className="rounded-xl border border-[#1e293b] p-4">
      <p className="text-[11px] font-semibold mb-3" style={{ color }}>{label}</p>
      <div className="flex items-center gap-3 mb-2">
        <div className="text-center">
          <p className="text-[10px] text-[#475569]">Test 1 mean</p>
          <p className="text-[18px] font-bold font-mono text-white">{m1.toFixed(1)}</p>
        </div>
        <div className="flex-1 flex items-center gap-1">
          <div className="flex-1 h-px" style={{ background: color, opacity: 0.4 }} />
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="text-[11px] font-mono px-2 py-0.5 rounded-md"
            style={{ background: color + "20", color }}
          >
            {diff > 0 ? "+" : ""}{pct}
          </motion.div>
          <div className="flex-1 h-px" style={{ background: color, opacity: 0.4 }} />
        </div>
        <div className="text-center">
          <p className="text-[10px] text-[#475569]">Test 2 mean</p>
          <p className="text-[18px] font-bold font-mono text-white">{m2.toFixed(1)}</p>
        </div>
      </div>
      <p className="text-[10px] text-[#475569] text-center">
        {shiftLabel}
      </p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function RegressionToMeanClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const [correlation, setCorrelation] = useState(0.6);
  const [n, setN] = useState(30);
  const [threshold, setThreshold] = useState(75);
  const [selected, setSelected] = useState<"top" | "bottom" | "all">("all");
  const [showRegression, setShowRegression] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // Progress
  const [selections, setSelections] = useState(0);
  const [regens, setRegens] = useState(0);
  const completionFired = useRef(false);
  const allComplete = selections >= 3 && regens >= 2;

  useEffect(() => {
    setStudents(generateStudents(n, correlation));
  }, [n, correlation]);

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "regression-to-mean", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  function regen() {
    setStudents(generateStudents(n, correlation));
    setRegens(prev => prev + 1);
  }

  function handleSelectGroup(g: "top" | "bottom" | "all") {
    setSelected(g);
    if (g !== "all") setSelections(prev => prev + 1);
  }

  function handleReset() {
    setCorrelation(0.6);
    setN(30);
    setThreshold(75);
    setSelected("all");
    setShowRegression(false);
    setStudents(generateStudents(30, 0.6));
    setHoveredId(null);
    setSelections(0);
    setRegens(0);
  }

  const topStudents = students.filter(s => s.test1 >= threshold);
  const bottomStudents = students.filter(s => s.test1 < (100 - threshold));
  const displayGroup = selected === "top" ? topStudents : selected === "bottom" ? bottomStudents : students;

  const overallMean = students.length > 0 ? mean(students.map(s => s.test1)) : 50;

  const progress = [
    { label: `Groups explored: ${Math.min(selections, 3)}/3`, done: selections >= 3 },
    { label: `Datasets regenerated: ${Math.min(regens, 2)}/2`, done: regens >= 2 },
  ];

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Regression to the Mean</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">Statistics</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Regression to <span className="text-[var(--color-accent)]">the Mean</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            Select the top performers after Test 1 and watch their Test 2 scores drift back toward
            the group average, even with no intervention. This is regression to the mean, not improvement or deterioration.
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

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* Controls */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-4">Parameters</p>

              {[
                { label: "Number of students", value: n, min: 15, max: 60, step: 5, set: (v: number) => setN(v), fmt: (v: number) => String(v) },
                { label: "Test-retest correlation (r)", value: correlation, min: 0.1, max: 0.99, step: 0.05, set: (v: number) => setCorrelation(v), fmt: (v: number) => v.toFixed(2) },
                { label: "Selection threshold", value: threshold, min: 60, max: 90, step: 5, set: (v: number) => setThreshold(v), fmt: (v: number) => `≥ ${v}` },
              ].map(({ label, value, min, max, step, set, fmt }) => (
                <div key={label} className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px] text-white">{label}</span>
                    <span className="text-[11px] font-mono text-[var(--color-accent)]">{fmt(value)}</span>
                  </div>
                  <input type="range" min={min} max={max} step={step} value={value}
                    aria-label={label}
                    onChange={e => set(Number(e.target.value))}
                    className="w-full" style={{ accentColor: "var(--color-accent)" }} />
                </div>
              ))}

              <motion.button onClick={regen}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                className="w-full mt-1 py-2 rounded-lg text-[12px] font-semibold bg-[#1e293b] text-white hover:bg-[#334155] transition-colors">
                Regenerate Class
              </motion.button>

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => setShowRegression(!showRegression)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                    showRegression ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[#d4af37]/10" : "border-[#1e293b] text-[#475569]"
                  }`}
                >
                  {showRegression ? "Hide" : "Show"} regression line
                </button>
              </div>
            </div>

            {/* Group selector */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">Select Group</p>
              <div className="space-y-2" role="radiogroup" aria-label="Select group">
                {[
                  { id: "top" as const, label: `Top performers (≥ ${threshold})`, color: "#d4af37", count: topStudents.length },
                  { id: "bottom" as const, label: `Low performers (< ${100 - threshold})`, color: "#ef4444", count: bottomStudents.length },
                  { id: "all" as const, label: "Everyone", color: "#475569", count: students.length },
                ].map(({ id, label, color, count }) => (
                  <button
                    key={id}
                    role="radio"
                    aria-checked={selected === id}
                    onClick={() => handleSelectGroup(id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors text-left"
                    style={{
                      borderColor: selected === id ? color : "#1e293b",
                      background: selected === id ? color + "10" : "transparent",
                    }}
                  >
                    <span className="text-[12px]" style={{ color: selected === id ? color : "#94a3b8" }}>{label}</span>
                    <span className="text-[11px] font-mono" style={{ color }}>{count} students</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-3">Group Statistics</p>
              {displayGroup.length > 0 ? (
                <div className="space-y-2">
                  {[
                    { label: "Overall mean", value: overallMean.toFixed(1), color: "#475569" },
                    { label: "Group T1 mean", value: mean(displayGroup.map(s => s.test1)).toFixed(1), color: "#3bb4a4" },
                    { label: "Group T2 mean", value: mean(displayGroup.map(s => s.test2)).toFixed(1), color: "var(--color-accent)" },
                    { label: "Mean shift", value: (mean(displayGroup.map(s => s.test2)) - mean(displayGroup.map(s => s.test1))).toFixed(1), color: "#a855f7" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-[11px] text-[#475569]">{label}</span>
                      <span className="text-[11px] font-mono" style={{ color }}>{value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-[#334155]">No students in this group</p>
              )}
            </div>
          </div>

          {/* Main content */}
          <div className="space-y-5">
            {/* Scatter */}
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#475569]">Test 1 vs Test 2 Scores</p>
                <div className="flex items-center gap-3 text-[10px] text-[#475569]">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-6 border-t border-dashed border-[#3bb4a4]/60" /> y = x
                  </span>
                  {showRegression && (
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-6 border-t-2 border-[var(--color-accent)]" /> regression
                    </span>
                  )}
                </div>
              </div>
              <ScatterPlot
                students={students}
                selected={selected}
                threshold={threshold}
                showRegression={showRegression}
                onHover={setHoveredId}
                hoveredId={hoveredId}
              />
            </div>

            {/* Mean shift arrows */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MeanArrow group={topStudents} label={`Top performers (T1 ≥ ${threshold})`} color="#d4af37" overallMean={overallMean} />
              <MeanArrow group={bottomStudents} label={`Low performers (T1 < ${100 - threshold})`} color="#ef4444" overallMean={overallMean} />
            </div>

            {/* Insight box */}
            <div className="rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-5">
              <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-2">Why does this happen?</p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Extreme scores on Test 1 include a component of luck. Top scorers were lucky;
                bottom scorers were unlucky. On Test 2, luck averages out, so both groups drift
                back toward the overall mean. <strong className="text-white">No intervention is needed for this effect to occur.</strong>
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed mt-2">
                Lower test-retest correlation (r) → stronger regression. At r = 1 all points
                fall on the identity line; at r = 0 there is no relationship at all.
              </p>
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
                  You Caught the Drift
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You selected extreme groups, re-tested them across fresh
                  classes, and watched scores slide back toward the average
                  with no intervention at all.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Extreme groups selected
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {selections}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      top and bottom performers
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Classes regenerated
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {regens}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      at r = {correlation.toFixed(2)}, n = {n}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Top group mean shift
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {topStudents.length > 0
                        ? `${
                            mean(topStudents.map(s => s.test2)) -
                              mean(topStudents.map(s => s.test1)) > 0
                              ? "+"
                              : ""
                          }${(
                            mean(topStudents.map(s => s.test2)) -
                            mean(topStudents.map(s => s.test1))
                          ).toFixed(1)}`
                        : "n/a"}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      Test 1 to Test 2, current class
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;When you select on an extreme score you also select on
                    luck, and luck does not repeat: the drift back toward the
                    average on the next measurement is arithmetic, not
                    improvement or decline.&quot;
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

        {/* Nav (pre-completion) */}
        {!allComplete && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link href="/visual-guides/hypothesis-testing"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
              ← Previous Guide
            </Link>
            <Link href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
              Next Guide →
            </Link>
          </div>
        )}

        <GuideCompletion isComplete={allComplete} guideSlug="regression-to-mean" score={100} />
      </div>
    </div>
  );
}
