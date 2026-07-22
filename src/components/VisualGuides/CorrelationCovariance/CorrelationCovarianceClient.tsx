"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useId,
} from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  DataPoint,
  CorrelationStats,
  computePearsonR,
  ANSCOMBE_I,
  ANSCOMBE_II,
  ANSCOMBE_III,
  ANSCOMBE_IV,
  CAUSATION_EXAMPLES,
  STRONG_POS,
  MODERATE_POS,
  NO_CORR,
  MODERATE_NEG,
  STRONG_NEG,
} from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

const W = 480, H = 380;
const PAD = { l: 56, r: 16, t: 16, b: 44 };
const IW = W - PAD.l - PAD.r;
const IH = H - PAD.t - PAD.b;

type PresetKey = "strong_pos" | "moderate_pos" | "no_corr" | "moderate_neg" | "strong_neg";

const PRESET_MAP: Record<PresetKey, DataPoint[]> = {
  strong_pos: STRONG_POS,
  moderate_pos: MODERATE_POS,
  no_corr: NO_CORR,
  moderate_neg: MODERATE_NEG,
  strong_neg: STRONG_NEG,
};

const PRESET_LABELS: Record<PresetKey, string> = {
  strong_pos: "Strong Positive",
  moderate_pos: "Moderate Positive",
  no_corr: "No Correlation",
  moderate_neg: "Moderate Negative",
  strong_neg: "Strong Negative",
};

// ── Scatter plot helpers ──────────────────────────────────────────────────────

function getDataRange(points: DataPoint[]) {
  if (points.length === 0) return { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xPad = Math.max((xMax - xMin) * 0.12, 5);
  const yPad = Math.max((yMax - yMin) * 0.12, 5);
  return {
    xMin: xMin - xPad,
    xMax: xMax + xPad,
    yMin: yMin - yPad,
    yMax: yMax + yPad,
  };
}

function toSvgX(
  v: number,
  xMin: number,
  xMax: number
): number {
  return PAD.l + ((v - xMin) / (xMax - xMin)) * IW;
}

function toSvgY(
  v: number,
  yMin: number,
  yMax: number
): number {
  return PAD.t + IH - ((v - yMin) / (yMax - yMin)) * IH;
}

function fromSvgX(
  svgX: number,
  xMin: number,
  xMax: number
): number {
  return xMin + ((svgX - PAD.l) / IW) * (xMax - xMin);
}

function fromSvgY(
  svgY: number,
  yMin: number,
  yMax: number
): number {
  return yMin + (1 - (svgY - PAD.t) / IH) * (yMax - yMin);
}

function makeTicks(min: number, max: number, count = 5): number[] {
  return Array.from({ length: count }, (_, i) => min + ((max - min) / (count - 1)) * i);
}

function fmtTick(v: number): string {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
  if (Math.abs(v) < 10) return v.toFixed(1);
  return v.toFixed(0);
}

function dotColor(r: number): string {
  if (r > 0.3) return "var(--color-success)";
  if (r < -0.3) return "#ef4444";
  return "#94a3b8";
}

function rColor(r: number): string {
  if (r > 0.7) return "var(--color-success)";
  if (r > 0.3) return "#6ee7b7";
  if (r < -0.7) return "#ef4444";
  if (r < -0.3) return "#fca5a5";
  return "#94a3b8";
}

function interpretR(stats: CorrelationStats): string {
  const { pearsonR, rSquared } = stats;
  const abs = Math.abs(pearsonR);
  const pct = (rSquared * 100).toFixed(0);
  const dir = pearsonR >= 0 ? "positive" : "negative";
  if (abs >= 0.9) return `Very strong ${dir} linear association. X explains ${pct}% of variation in Y.`;
  if (abs >= 0.7) return `Strong ${dir} linear association. X explains ${pct}% of variation in Y.`;
  if (abs >= 0.5) return `Moderate ${dir} linear association. X explains ${pct}% of variation in Y.`;
  if (abs >= 0.3) return `Weak ${dir} linear association. X explains ${pct}% of variation in Y.`;
  return `Little to no linear association. X explains only ${pct}% of variation in Y.`;
}

// ── Mini scatter for Anscombe & causation ─────────────────────────────────────

const SW = 220, SH = 175;
const SPAD = { l: 40, r: 8, t: 8, b: 28 };
const SIW = SW - SPAD.l - SPAD.r;
const SIH = SH - SPAD.t - SPAD.b;

function MiniScatter({
  points,
  color = "#3bb4a4",
  showLine = true,
  xLabel,
  yLabel,
}: {
  points: DataPoint[];
  color?: string;
  showLine?: boolean;
  xLabel?: string;
  yLabel?: string;
}) {
  const range = useMemo(() => getDataRange(points), [points]);
  const stats = useMemo(() => computePearsonR(points), [points]);

  function sx(v: number) {
    return SPAD.l + ((v - range.xMin) / (range.xMax - range.xMin)) * SIW;
  }
  function sy(v: number) {
    return SPAD.t + SIH - ((v - range.yMin) / (range.yMax - range.yMin)) * SIH;
  }

  // Regression line endpoints
  const lx1 = range.xMin;
  const lx2 = range.xMax;
  const ly1 = stats.slope * lx1 + stats.intercept;
  const ly2 = stats.slope * lx2 + stats.intercept;

  const xTicks = makeTicks(range.xMin, range.xMax, 3);
  const yTicks = makeTicks(range.yMin, range.yMax, 3);

  return (
    <svg width="100%" viewBox={`0 0 ${SW} ${SH}`} className="block">
      {/* Grid */}
      {xTicks.map((v) => (
        <line key={`gx${v}`} x1={sx(v)} y1={SPAD.t} x2={sx(v)} y2={SPAD.t + SIH} stroke="#1e293b" strokeWidth="1" />
      ))}
      {yTicks.map((v) => (
        <line key={`gy${v}`} x1={SPAD.l} y1={sy(v)} x2={SPAD.l + SIW} y2={sy(v)} stroke="#1e293b" strokeWidth="1" />
      ))}
      {/* Axes */}
      <line x1={SPAD.l} y1={SPAD.t} x2={SPAD.l} y2={SPAD.t + SIH} stroke="#334155" strokeWidth="1.5" />
      <line x1={SPAD.l} y1={SPAD.t + SIH} x2={SPAD.l + SIW} y2={SPAD.t + SIH} stroke="#334155" strokeWidth="1.5" />
      {/* Tick labels */}
      {xTicks.map((v) => (
        <text key={`xt${v}`} x={sx(v)} y={SPAD.t + SIH + 12} textAnchor="middle" fontSize="10" fill="#475569" fontFamily="Inter,sans-serif">
          {fmtTick(v)}
        </text>
      ))}
      {yTicks.map((v) => (
        <text key={`yt${v}`} x={SPAD.l - 3} y={sy(v) + 4} textAnchor="end" fontSize="10" fill="#475569" fontFamily="Inter,sans-serif">
          {fmtTick(v)}
        </text>
      ))}
      {/* Axis labels */}
      {xLabel && (
        <text x={SPAD.l + SIW / 2} y={SH - 2} textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="Inter,sans-serif">
          {xLabel}
        </text>
      )}
      {yLabel && (
        <text
          x={9}
          y={SPAD.t + SIH / 2}
          textAnchor="middle"
          fontSize="10"
          fill="#94a3b8"
          fontFamily="Inter,sans-serif"
          transform={`rotate(-90, 9, ${SPAD.t + SIH / 2})`}
        >
          {yLabel}
        </text>
      )}
      {/* Regression line */}
      {showLine && (
        <line
          x1={sx(lx1)} y1={sy(ly1)}
          x2={sx(lx2)} y2={sy(ly2)}
          stroke="var(--color-accent)"
          strokeWidth="1.5"
          strokeDasharray="4 2"
          opacity="0.85"
        />
      )}
      {/* Points */}
      {points.map((p) => (
        <circle key={p.id} cx={sx(p.x)} cy={sy(p.y)} r="4" fill={color} stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
      ))}
    </svg>
  );
}

// ── Anscombe's Quartet ─────────────────────────────────────────────────────────

const ANSCOMBE_DATASETS = [
  {
    id: "I",
    points: ANSCOMBE_I,
    color: "#3bb4a4",
    description: "Classic linear relationship. The OLS line fits perfectly. This is what we hope our data looks like.",
  },
  {
    id: "II",
    points: ANSCOMBE_II,
    color: "#1e5d8a",
    description: "Curved (quadratic) relationship. A linear model is completely wrong here, even though r is the same.",
  },
  {
    id: "III",
    points: ANSCOMBE_III,
    color: "var(--color-accent)",
    description: "Perfectly linear except for a single outlier. Without that point r would be 1.000; the outlier drags r down to 0.816 and tilts the regression line.",
  },
  {
    id: "IV",
    points: ANSCOMBE_IV,
    color: "#ef4444",
    description: "Vertical cluster of identical x-values plus one extreme point. No real linear relationship exists.",
  },
] as const;

function AnscombeQuartet({ onViewed }: { onViewed: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const viewedRef = useRef(false);

  function handleSelect(id: string) {
    setSelected((prev) => (prev === id ? null : id));
    if (!viewedRef.current) {
      viewedRef.current = true;
      onViewed();
    }
  }

  return (
    <div>
      {/* Summary stats banner */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/40 p-4 mb-5 text-center">
        <p className="text-[13px] text-[#94a3b8]">All four datasets have:</p>
        <div className="flex flex-wrap justify-center gap-4 mt-2">
          {[
            { label: "r", value: "≈ 0.816" },
            { label: "mean(X)", value: "= 9.0" },
            { label: "mean(Y)", value: "≈ 7.5" },
            { label: "Slope", value: "≈ 0.500" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="text-[12px] font-bold text-[var(--color-accent)]">{label}</span>
              <span className="text-[12px] text-white">{value}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[var(--color-accent)] font-semibold mt-3">
          Always visualize your data! Same r, completely different patterns.
        </p>
      </div>

      {/* 2×2 grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ANSCOMBE_DATASETS.map((ds) => {
          const isSelected = selected === ds.id;
          const stats = computePearsonR(ds.points);
          return (
            <motion.div
              key={ds.id}
              className="rounded-2xl border p-3 cursor-pointer transition-colors"
              style={{
                borderColor: isSelected ? "var(--color-accent)" : "#1e293b",
                background: "#0f172a",
              }}
              onClick={() => handleSelect(ds.id)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold text-white">Dataset {ds.id}</span>
                <span className="text-[11px] font-mono" style={{ color: ds.color }}>
                  r = {stats.pearsonR.toFixed(3)}
                </span>
              </div>
              <MiniScatter points={ds.points} color={ds.color} showLine />
              <AnimatePresence>
                {isSelected && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[11px] text-[#94a3b8] mt-2 leading-relaxed overflow-hidden"
                  >
                    {ds.description}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Causation tab ─────────────────────────────────────────────────────────────

function CausationCard({
  example,
  index,
  onExplored,
}: {
  example: typeof CAUSATION_EXAMPLES[number];
  index: number;
  onExplored: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const exploredRef = useRef(false);
  const colors = ["#3bb4a4", "#1e5d8a", "var(--color-accent)"] as const;
  const color = colors[index % colors.length];

  function handleReveal() {
    setRevealed(true);
    if (!exploredRef.current) {
      exploredRef.current = true;
      onExplored();
    }
  }

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
      <h3 className="text-[15px] font-bold text-white mb-1">{example.title}</h3>
      <p className="text-[12px] text-[#94a3b8] mb-3 leading-relaxed">{example.description}</p>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-4 mb-4">
        <MiniScatter
          points={example.points}
          color={color}
          xLabel={example.xLabel}
          yLabel={example.yLabel}
          showLine
        />
        <div className="flex flex-col justify-center gap-3">
          <div className="rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/5 p-3">
            <p className="text-[9px] font-semibold uppercase tracking-[1px] text-[#ef4444] mb-1">
              Naive (wrong) conclusion
            </p>
            <p className="text-[12px] text-[#ef4444]">{example.naiveConclusion}</p>
          </div>
          <div className="rounded-xl border border-[#1e293b] p-2.5">
            <p className="text-[9px] text-[#475569] mb-0.5">Correlation</p>
            <p className="text-[18px] font-black text-[var(--color-accent)]">r ≈ {example.correlationValue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {!revealed ? (
        <button
          onClick={handleReveal}
          className="w-full py-2 rounded-xl text-[12px] font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
        >
          Reveal Lurking Variable
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/8 p-3"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[var(--color-accent)] mb-1">
            Lurking (Confounding) Variable
          </p>
          <p className="text-[12px] text-[#f1f5f9] leading-relaxed">{example.lurkingVariable}</p>
        </motion.div>
      )}
    </div>
  );
}

// ── Tab type ──────────────────────────────────────────────────────────────────

type TabId = "scatter" | "anscombe" | "causation";

const TABS: { id: TabId; label: string }[] = [
  { id: "scatter",   label: "Interactive Scatter" },
  { id: "anscombe",  label: "Anscombe's Quartet" },
  { id: "causation", label: "Correlation ≠ Causation" },
];

// ── Main component ────────────────────────────────────────────────────────────

const NEXT_GUIDE_SLUG = "chi-square-independence";

export default function CorrelationCovarianceClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const completionFired = useRef(false);

  const [activeTab, setActiveTab] = useState<TabId>("scatter");
  const [interactiveScatterUsed, setInteractiveScatterUsed] = useState(false);
  const [anscombeViewed, setAnscombeViewed] = useState(false);
  const [causationExplored, setCausationExplored] = useState(0);
  const [rankToggledOnce, setRankToggledOnce] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // We detect rank toggle via interacted callback — simpler: wrap onInteracted to also track
  const handleScatterInteracted = useCallback(() => {
    setInteractiveScatterUsed(true);
  }, []);

  const handleCausationExplored = useCallback(() => {
    setCausationExplored((n) => n + 1);
  }, []);

  // Completion
  const allComplete =
    interactiveScatterUsed &&
    anscombeViewed &&
    causationExplored >= 2 &&
    rankToggledOnce;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "correlation-covariance", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  const progressDots = [
    { label: "Scatter interaction",          done: interactiveScatterUsed },
    { label: "Anscombe's Quartet viewed",     done: anscombeViewed },
    { label: `Causation explored (${causationExplored}/2)`, done: causationExplored >= 2 },
    { label: "Spearman or Kendall toggled",   done: rankToggledOnce },
  ];

  // Detect rank toggle: wrap the onInteracted; we intercept tab1 toggle via a separate event.
  // The rank toggles are inside InteractiveScatter — we track via a state setter exposed via ref trick.
  // Instead, lift rank toggle state up:
  const [showSpearman, setShowSpearman] = useState(false);
  const [showKendall, setShowKendall] = useState(false);

  function handleSpearmanToggle(v: boolean) {
    setShowSpearman(v);
    if (v) setRankToggledOnce(true);
  }
  function handleKendallToggle(v: boolean) {
    setShowKendall(v);
    if (v) setRankToggledOnce(true);
  }

  // Tab subcomponents latch their own state (dragged points, reveals);
  // bumping resetKey remounts them so their internals reset too.
  function handleReset() {
    setActiveTab("scatter");
    setInteractiveScatterUsed(false);
    setAnscombeViewed(false);
    setCausationExplored(0);
    setRankToggledOnce(false);
    setShowSpearman(false);
    setShowKendall(false);
    setResetKey((k) => k + 1);
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Correlation &amp; Covariance</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              UNIT 9: ASSOCIATION &amp; DEPENDENCE
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Correlation &amp;{" "}
            <span className="text-[var(--color-accent)]">Covariance</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[680px]">
            Explore Pearson r, Spearman ρ, Kendall τ, and covariance through interactive scatter plots.
            Uncover Anscombe&apos;s Quartet, four datasets with identical statistics but wildly different shapes,
            and learn why correlation never implies causation.
          </p>
        </section>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {progressDots.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full transition-colors" style={{ background: done ? "#3bb4a4" : "#1e293b" }} />
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
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-auto text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 mb-6 bg-[#1e293b]/50 rounded-xl p-1 w-fit flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              aria-pressed={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-colors ${
                activeTab === tab.id
                  ? "bg-[var(--color-accent)] text-[#0a0e1a]"
                  : "text-[#94a3b8] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === "scatter" && (
            <motion.div
              key="scatter"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <InteractiveScatterLifted
                key={resetKey}
                onInteracted={handleScatterInteracted}
                showSpearman={showSpearman}
                showKendall={showKendall}
                onSpearmanToggle={handleSpearmanToggle}
                onKendallToggle={handleKendallToggle}
              />
            </motion.div>
          )}
          {activeTab === "anscombe" && (
            <motion.div
              key="anscombe"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <AnscombeQuartet key={resetKey} onViewed={() => setAnscombeViewed(true)} />
            </motion.div>
          )}
          {activeTab === "causation" && (
            <motion.div
              key="causation"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#1e293b] bg-[#1e293b]/30 p-4">
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed">
                    A high correlation between X and Y doesn&apos;t mean X causes Y. It could be that Y causes X,
                    a third variable Z causes both, or it&apos;s pure coincidence. Click{" "}
                    <span className="text-[var(--color-accent)] font-semibold">Reveal Lurking Variable</span> on at least 2 cards below.
                  </p>
                </div>
                {CAUSATION_EXAMPLES.map((ex, i) => (
                  <CausationCard
                    key={`${ex.title}-${resetKey}`}
                    example={ex}
                    index={i}
                    onExplored={handleCausationExplored}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                  You Read Past the Number
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You dragged points to bend r, saw four datasets share identical
                  statistics, toggled the rank-based measures, and unmasked the lurking
                  variables behind famous correlations.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Lurking variables revealed
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {causationExplored}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      causation cards explored
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Anscombe&apos;s Quartet
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {anscombeViewed ? "Viewed" : "Pending"}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      same stats, four shapes
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Rank correlations</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {rankToggledOnce ? "Toggled" : "Pending"}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      Spearman ρ, Kendall τ
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;One number cannot summarize a relationship: Anscombe&apos;s
                    four datasets share the same r yet tell four different stories. Plot
                    the data first, pick the right measure second, and save any talk of
                    causation for evidence beyond correlation.&quot;
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
        {!allComplete && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
            <Link
              href="/visual-guides/nonparametric-tests"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
            >
              ← Nonparametric Tests
            </Link>
            <Link
              href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
            >
              Chi-Square Test →
            </Link>
          </div>
        )}

        <GuideCompletion isComplete={allComplete} guideSlug="correlation-covariance" score={100} />
      </div>
    </div>
  );
}

// ── Lifted interactive scatter (rank toggle state lives in parent) ─────────────

interface LiftedScatterProps {
  onInteracted: () => void;
  showSpearman: boolean;
  showKendall: boolean;
  onSpearmanToggle: (v: boolean) => void;
  onKendallToggle: (v: boolean) => void;
}

function InteractiveScatterLifted({
  onInteracted,
  showSpearman,
  showKendall,
  onSpearmanToggle,
  onKendallToggle,
}: LiftedScatterProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const interactedRef = useRef(false);

  const [points, setPoints] = useState<DataPoint[]>(MODERATE_POS.map((p) => ({ ...p })));
  const [dragId, setDragId] = useState<string | null>(null);
  const [preset, setPreset] = useState<PresetKey>("moderate_pos");
  const [showCovariance, setShowCovariance] = useState(false);

  const stats = useMemo(() => computePearsonR(points), [points]);
  const range = useMemo(() => getDataRange(points), [points]);

  const markInteracted = useCallback(() => {
    if (!interactedRef.current) {
      interactedRef.current = true;
      onInteracted();
    }
  }, [onInteracted]);

  function getSvgCoords(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    return {
      svgX: (e.clientX - rect.left) * scaleX,
      svgY: (e.clientY - rect.top) * scaleY,
    };
  }

  function handleSvgMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    if ((e.target as SVGElement).dataset.pointId) return;
    const coords = getSvgCoords(e);
    if (!coords) return;
    const { svgX, svgY } = coords;
    if (svgX < PAD.l || svgX > W - PAD.r || svgY < PAD.t || svgY > H - PAD.b) return;
    const x = fromSvgX(svgX, range.xMin, range.xMax);
    const y = fromSvgY(svgY, range.yMin, range.yMax);
    const id = `u-${Date.now()}`;
    setPoints((prev) => [...prev, { x: +x.toFixed(1), y: +y.toFixed(1), id }]);
    markInteracted();
  }

  function handlePointMouseDown(e: React.MouseEvent<SVGCircleElement>, id: string) {
    e.stopPropagation();
    if (e.button === 2) return;
    setDragId(id);
  }

  function handleSvgMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!dragId) return;
    const coords = getSvgCoords(e);
    if (!coords) return;
    const { svgX, svgY } = coords;
    const x = fromSvgX(svgX, range.xMin, range.xMax);
    const y = fromSvgY(svgY, range.yMin, range.yMax);
    setPoints((prev) =>
      prev.map((p) => (p.id === dragId ? { ...p, x: +x.toFixed(1), y: +y.toFixed(1) } : p))
    );
    markInteracted();
  }

  function handleSvgMouseUp() {
    setDragId(null);
  }

  function handlePointContextMenu(e: React.MouseEvent<SVGCircleElement>, id: string) {
    e.preventDefault();
    e.stopPropagation();
    setPoints((prev) => prev.filter((p) => p.id !== id));
    markInteracted();
  }

  function handlePresetChange(p: PresetKey) {
    setPreset(p);
    setPoints(PRESET_MAP[p].map((pt) => ({ ...pt })));
  }

  function handleReset() {
    setPoints(PRESET_MAP[preset].map((p) => ({ ...p })));
  }

  const xTicks = makeTicks(range.xMin, range.xMax, 5);
  const yTicks = makeTicks(range.yMin, range.yMax, 5);
  const lx1 = range.xMin;
  const lx2 = range.xMax;
  const ly1 = stats.slope * lx1 + stats.intercept;
  const ly2 = stats.slope * lx2 + stats.intercept;
  const ptColor = dotColor(stats.pearsonR);

  const uid = useId();
  const clipId = `isc-clip-${uid}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5">
      {/* Plot card */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <select
            value={preset}
            onChange={(e) => handlePresetChange(e.target.value as PresetKey)}
            className="text-[12px] bg-[#1e293b] text-white border border-[#334155] rounded-lg px-2.5 py-1 focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
          >
            {(Object.keys(PRESET_LABELS) as PresetKey[]).map((k) => (
              <option key={k} value={k}>{PRESET_LABELS[k]}</option>
            ))}
          </select>
          <button
            onClick={handleReset}
            className="text-[11px] px-2.5 py-1 rounded-lg border border-[#1e293b] text-[#94a3b8] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
          >
            Reset
          </button>
          <label className="flex items-center gap-1.5 text-[11px] text-[#94a3b8] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showCovariance}
              onChange={(e) => setShowCovariance(e.target.checked)}
              className="accent-[var(--color-accent)] w-3.5 h-3.5"
            />
            Show Covariance Quadrants
          </label>
        </div>
        <p className="text-[10px] text-[#475569] mb-2">
          Click to add · Drag to move · Right-click to remove
        </p>

        <svg
          ref={svgRef}
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          className="block"
          style={{ cursor: dragId ? "grabbing" : "crosshair" }}
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
          onMouseLeave={handleSvgMouseUp}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={PAD.l} y={PAD.t} width={IW} height={IH} />
            </clipPath>
          </defs>

          {/* Covariance quadrant shading */}
          {showCovariance && (
            <g clipPath={`url(#${clipId})`}>
              <rect
                x={toSvgX(stats.meanX, range.xMin, range.xMax)} y={PAD.t}
                width={Math.max(0, PAD.l + IW - toSvgX(stats.meanX, range.xMin, range.xMax))}
                height={Math.max(0, toSvgY(stats.meanY, range.yMin, range.yMax) - PAD.t)}
                fill="var(--color-success)" opacity="0.07"
              />
              <rect
                x={PAD.l} y={toSvgY(stats.meanY, range.yMin, range.yMax)}
                width={Math.max(0, toSvgX(stats.meanX, range.xMin, range.xMax) - PAD.l)}
                height={Math.max(0, PAD.t + IH - toSvgY(stats.meanY, range.yMin, range.yMax))}
                fill="var(--color-success)" opacity="0.07"
              />
              <rect
                x={PAD.l} y={PAD.t}
                width={Math.max(0, toSvgX(stats.meanX, range.xMin, range.xMax) - PAD.l)}
                height={Math.max(0, toSvgY(stats.meanY, range.yMin, range.yMax) - PAD.t)}
                fill="#ef4444" opacity="0.07"
              />
              <rect
                x={toSvgX(stats.meanX, range.xMin, range.xMax)}
                y={toSvgY(stats.meanY, range.yMin, range.yMax)}
                width={Math.max(0, PAD.l + IW - toSvgX(stats.meanX, range.xMin, range.xMax))}
                height={Math.max(0, PAD.t + IH - toSvgY(stats.meanY, range.yMin, range.yMax))}
                fill="#ef4444" opacity="0.07"
              />
            </g>
          )}

          {/* Grid */}
          {xTicks.map((v) => (
            <line key={`gx-${v}`} x1={toSvgX(v, range.xMin, range.xMax)} y1={PAD.t} x2={toSvgX(v, range.xMin, range.xMax)} y2={PAD.t + IH} stroke="#1e293b" strokeWidth="1" />
          ))}
          {yTicks.map((v) => (
            <line key={`gy-${v}`} x1={PAD.l} y1={toSvgY(v, range.yMin, range.yMax)} x2={PAD.l + IW} y2={toSvgY(v, range.yMin, range.yMax)} stroke="#1e293b" strokeWidth="1" />
          ))}

          {/* Mean crosshairs */}
          {showCovariance && (
            <>
              <line x1={toSvgX(stats.meanX, range.xMin, range.xMax)} y1={PAD.t} x2={toSvgX(stats.meanX, range.xMin, range.xMax)} y2={PAD.t + IH} stroke="#94a3b8" strokeWidth="1" strokeDasharray="5 3" opacity="0.5" />
              <line x1={PAD.l} y1={toSvgY(stats.meanY, range.yMin, range.yMax)} x2={PAD.l + IW} y2={toSvgY(stats.meanY, range.yMin, range.yMax)} stroke="#94a3b8" strokeWidth="1" strokeDasharray="5 3" opacity="0.5" />
              <text x={toSvgX(stats.meanX, range.xMin, range.xMax) + 3} y={PAD.t + 10} fontSize="15" fill="#94a3b8" fontFamily="Inter,sans-serif">x̄</text>
              <text x={PAD.l + 3} y={toSvgY(stats.meanY, range.yMin, range.yMax) - 3} fontSize="15" fill="#94a3b8" fontFamily="Inter,sans-serif">ȳ</text>
            </>
          )}

          {/* Axes */}
          <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + IH} stroke="#334155" strokeWidth="1.5" />
          <line x1={PAD.l} y1={PAD.t + IH} x2={PAD.l + IW} y2={PAD.t + IH} stroke="#334155" strokeWidth="1.5" />

          {/* Tick labels */}
          {xTicks.map((v) => (
            <text key={`xl-${v}`} x={toSvgX(v, range.xMin, range.xMax)} y={PAD.t + IH + 16} textAnchor="middle" fontSize="15" fill="#475569" fontFamily="Inter,sans-serif">{fmtTick(v)}</text>
          ))}
          {yTicks.map((v) => (
            <text key={`yl-${v}`} x={PAD.l - 5} y={toSvgY(v, range.yMin, range.yMax) + 5} textAnchor="end" fontSize="15" fill="#475569" fontFamily="Inter,sans-serif">{fmtTick(v)}</text>
          ))}

          {/* Axis labels */}
          <text x={PAD.l + IW / 2} y={H - 4} textAnchor="middle" fontSize="16" fill="#94a3b8" fontFamily="Inter,sans-serif">X</text>
          <text x={12} y={PAD.t + IH / 2} textAnchor="middle" fontSize="16" fill="#94a3b8" fontFamily="Inter,sans-serif" transform={`rotate(-90,12,${PAD.t + IH / 2})`}>Y</text>

          {/* OLS line */}
          {points.length >= 2 && (
            <line
              x1={toSvgX(lx1, range.xMin, range.xMax)} y1={toSvgY(ly1, range.yMin, range.yMax)}
              x2={toSvgX(lx2, range.xMin, range.xMax)} y2={toSvgY(ly2, range.yMin, range.yMax)}
              stroke="var(--color-accent)" strokeWidth="1.8" opacity="0.85"
            />
          )}

          {/* Points */}
          {points.map((p) => {
            const cx = toSvgX(p.x, range.xMin, range.xMax);
            const cy = toSvgY(p.y, range.yMin, range.yMax);
            const isDrag = dragId === p.id;
            return (
              <circle
                key={p.id}
                data-point-id={p.id}
                cx={cx} cy={cy}
                r={isDrag ? 8 : 6}
                fill={ptColor}
                stroke={isDrag ? "#fff" : "rgba(255,255,255,0.25)"}
                strokeWidth={isDrag ? 2 : 1}
                style={{ cursor: isDrag ? "grabbing" : "grab" }}
                onMouseDown={(e) => handlePointMouseDown(e, p.id)}
                onContextMenu={(e) => handlePointContextMenu(e, p.id)}
              />
            );
          })}
        </svg>
      </div>

      {/* Stats panel */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 flex flex-col gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#475569] mb-1">Pearson r</p>
          <p className="text-4xl font-black" style={{ color: rColor(stats.pearsonR) }}>
            {stats.pearsonR.toFixed(3)}
          </p>
          <p className="text-[11px] text-[#94a3b8] mt-1 leading-relaxed">{interpretR(stats)}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#1e293b] p-2.5">
            <p className="text-[9px] uppercase tracking-[1px] text-[#475569] mb-0.5">Covariance (sample, n-1)</p>
            <p className="text-sm font-bold text-white">{stats.covariance.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-[#1e293b] p-2.5">
            <p className="text-[9px] uppercase tracking-[1px] text-[#475569] mb-0.5">R²</p>
            <p className="text-sm font-bold text-white">{stats.rSquared.toFixed(3)}</p>
          </div>
          <div className="rounded-xl border border-[#1e293b] p-2.5">
            <p className="text-[9px] uppercase tracking-[1px] text-[#475569] mb-0.5">p-value</p>
            <p className="text-sm font-bold text-white">{stats.pValue < 0.001 ? "< 0.001" : stats.pValue.toFixed(3)}</p>
          </div>
          <div className="rounded-xl border border-[#1e293b] p-2.5">
            <p className="text-[9px] uppercase tracking-[1px] text-[#475569] mb-0.5">Significance</p>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${stats.pValue < 0.05 ? "bg-[var(--color-success)]/20 text-[var(--color-success)]" : "bg-[#475569]/20 text-[#94a3b8]"}`}>
              {stats.pValue < 0.05 ? "Significant" : "Not sig."}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-[#1e293b] p-2.5">
          <p className="text-[9px] uppercase tracking-[1px] text-[#475569] mb-1">OLS Line</p>
          <p className="text-[11px] font-mono text-[var(--color-accent)]">
            ŷ = {stats.slope.toFixed(3)}x {stats.intercept >= 0 ? "+" : "−"} {Math.abs(stats.intercept).toFixed(3)}
          </p>
        </div>

        <div className="space-y-2 pt-1 border-t border-white/[0.06]">
          <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#475569]">Rank Correlations</p>
          <label className="flex items-center justify-between cursor-pointer select-none">
            <span className="text-[11px] text-[#94a3b8]">Spearman ρ</span>
            <div className="flex items-center gap-2">
              {showSpearman && (
                <span className="text-[12px] font-bold" style={{ color: rColor(stats.spearmanRho) }}>
                  {stats.spearmanRho.toFixed(3)}
                </span>
              )}
              <button
                onClick={() => onSpearmanToggle(!showSpearman)}
                className={`relative w-8 h-4 rounded-full transition-colors ${showSpearman ? "bg-[#3bb4a4]" : "bg-[#334155]"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${showSpearman ? "translate-x-4" : ""}`} />
              </button>
            </div>
          </label>
          <label className="flex items-center justify-between cursor-pointer select-none">
            <span className="text-[11px] text-[#94a3b8]">Kendall τ</span>
            <div className="flex items-center gap-2">
              {showKendall && (
                <span className="text-[12px] font-bold" style={{ color: rColor(stats.kendallTau) }}>
                  {stats.kendallTau.toFixed(3)}
                </span>
              )}
              <button
                onClick={() => onKendallToggle(!showKendall)}
                className={`relative w-8 h-4 rounded-full transition-colors ${showKendall ? "bg-[#3bb4a4]" : "bg-[#334155]"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${showKendall ? "translate-x-4" : ""}`} />
              </button>
            </div>
          </label>
        </div>

        <p className="text-[10px] text-[#475569]">n = {points.length} points</p>
      </div>
    </div>
  );
}
