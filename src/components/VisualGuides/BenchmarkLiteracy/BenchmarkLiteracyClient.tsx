"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  BenchmarkMix,
  DEFAULT_LAB_SKILL,
  RERUN_SKILL,
  leaderboardRows,
  rerunSummary,
  saturationSpread,
} from "./benchmarkMath";
import { GUIDE_TITLE, PUBLIC_SERIES } from "./types";
import ContaminationLab from "./ContaminationLab";
import LeaderboardAudit from "./LeaderboardAudit";
import SaturationPanel from "./SaturationPanel";

const NEXT_GUIDE_SLUG = "model-evaluation";

const DEFAULT_SKILL_PCT = Math.round(DEFAULT_LAB_SKILL * 100);
const CONTAMINATION_GATE_PCT = 40;

const FAILURE_MODES = [
  {
    id: "saturation",
    title: "Saturation",
    body: "When items are too easy for the current model generation, every model scores near the ceiling. The remaining differences are noise, not capability.",
  },
  {
    id: "contamination",
    title: "Contamination",
    body: "Test items that leak into training data get memorized. The model repeats answers it has seen, and the score measures recall of the test set, not skill.",
  },
  {
    id: "selection",
    title: "Selection effects",
    body: "Best run of many, friendliest benchmark of many, most flattering prompt of many. Every selection step adds points that vanish on a neutral re-test.",
  },
];

export default function BenchmarkLiteracyClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // Interaction state (mount defaults; Try Again restores exactly these)
  const [skillPct, setSkillPct] = useState(DEFAULT_SKILL_PCT);
  const [contaminationPct, setContaminationPct] = useState(0);
  const [maxContaminationPct, setMaxContaminationPct] = useState(0);
  const [audited, setAudited] = useState<ReadonlySet<string>>(() => new Set());
  const [mix, setMix] = useState<BenchmarkMix>("legacy");
  const [viewedMixes, setViewedMixes] = useState<ReadonlySet<BenchmarkMix>>(
    () => new Set<BenchmarkMix>(["legacy"])
  );

  // Derived gates
  const gateContamination = maxContaminationPct >= CONTAMINATION_GATE_PCT;
  const gateAudit = audited.size >= 2;
  const gateMixes = viewedMixes.size === 2;
  const isComplete = gateContamination && gateAudit && gateMixes;

  // Computed facts for the completion card (all from the math module)
  const rows = useMemo(() => leaderboardRows(), []);
  const publicTop = rows.find((r) => r.publicRank === 1);
  const privateTop = rows.find((r) => r.privateRank === 1);
  const reruns = useMemo(() => rerunSummary(), []);
  const legacySpread = useMemo(() => saturationSpread("legacy"), []);
  const frontierSpread = useMemo(() => saturationSpread("frontier"), []);

  // Handlers
  const handleContaminationChange = useCallback((pct: number) => {
    setContaminationPct(pct);
    setMaxContaminationPct((prev) => Math.max(prev, pct));
  }, []);

  const handleAudit = useCallback((modelId: string) => {
    setAudited((prev) => {
      if (prev.has(modelId)) return prev;
      const next = new Set(prev);
      next.add(modelId);
      return next;
    });
  }, []);

  const handleMixChange = useCallback((m: BenchmarkMix) => {
    setMix(m);
    setViewedMixes((prev) => {
      if (prev.has(m)) return prev;
      const next = new Set(prev);
      next.add(m);
      return next;
    });
  }, []);

  function handleReset() {
    setSkillPct(DEFAULT_SKILL_PCT);
    setContaminationPct(0);
    setMaxContaminationPct(0);
    setAudited(new Set());
    setMix("legacy");
    setViewedMixes(new Set<BenchmarkMix>(["legacy"]));
  }

  const progressItems = [
    {
      id: "contamination",
      label: `Leak ${CONTAMINATION_GATE_PCT}%+ of the test set`,
      done: gateContamination,
    },
    {
      id: "audit",
      label: `Audit two models (${Math.min(audited.size, 2)}/2)`,
      done: gateAudit,
    },
    { id: "mixes", label: "Try both item mixes", done: gateMixes },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion
        isComplete={isComplete}
        guideSlug="benchmark-literacy"
        score={100}
      />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-[12px] text-[#475569] mb-6"
        >
          <Link
            href="/visual-guides"
            className="hover:text-[var(--color-accent)] transition-colors"
          >
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">{GUIDE_TITLE}</span>
        </nav>

        {/* Hero */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Applied AI
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3"
          >
            Reading Benchmarks{" "}
            <span className="text-[var(--color-accent)]">Critically</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            A leaderboard number is not a capability measurement. Leak test items
            into a simulated model&apos;s training set, watch its public score
            inflate while a private held-out set stays put, and learn the three ways
            a benchmark lies.
          </motion.p>
        </section>

        {/* Progress */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          {progressItems.map((item) => (
            <div key={item.id} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors"
                style={{ background: item.done ? "var(--color-accent)" : "#1e293b" }}
              />
              <span
                className={`text-[11px] ${item.done ? "text-white" : "text-[#475569]"}`}
              >
                {item.label}
              </span>
            </div>
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link
                href="/auth/sign-in"
                className="underline underline-offset-2 hover:text-[#94a3b8]"
              >
                Sign in
              </Link>{" "}
              to save progress
            </p>
          )}
          <AnimatePresence>
            {isComplete && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-auto text-[11px] font-semibold text-[var(--color-success)] flex items-center gap-1"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* What a score is + the three failure modes */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-3">
            What a benchmark score actually is
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
            A fraction: items answered correctly over items asked, on one dataset,
            at one moment, under someone&apos;s reporting choices. Everything on this
            page is simulated so the ground truth is visible: we define each
            model&apos;s true skill, generate item by item outcomes with a seeded
            random draw, and compute every displayed number from those outcomes.
            Three effects can pull the measured number away from the true skill.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FAILURE_MODES.map((f) => (
              <div key={f.id} className="rounded-xl border border-[#1e293b] p-4">
                <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                  {f.title}
                </p>
                <p className="text-[12px] text-[#94a3b8] leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Contamination lab */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            The contamination lab
          </p>
          <ContaminationLab
            skillPct={skillPct}
            contaminationPct={contaminationPct}
            onSkillChange={setSkillPct}
            onContaminationChange={handleContaminationChange}
          />
        </motion.section>

        {/* Leaderboard audit */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Audit the leaderboard: public vs held-out
          </p>
          <LeaderboardAudit audited={audited} onAudit={handleAudit} />
        </motion.section>

        {/* Saturation */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Saturation: when a benchmark stops measuring
          </p>
          <SaturationPanel mix={mix} onMixChange={handleMixChange} />
        </motion.section>

        {/* Selection effects */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Selection effects: free points from noise
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
            Below are eight clean evaluations of one simulated model with identical
            true skill ({Math.round(RERUN_SKILL * 100)}%), differing only in the
            random draw. Report the best run instead of the
            mean and you gain points without the model changing at all. The same
            selection logic applies to picking the friendliest benchmark, the best
            prompt template, or the best checkpoint.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {reruns.runsPct.map((pct, i) => (
              <span
                key={i}
                className={`px-3 py-1.5 rounded-lg border font-mono text-[12px] ${
                  pct === reruns.bestPct
                    ? "border-[var(--color-warning)]/60 text-[var(--color-warning)]"
                    : "border-[#1e293b] text-[#94a3b8]"
                }`}
              >
                run {i + 1}: {pct}%
              </span>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                Honest number (mean of 8)
              </p>
              <p className="text-2xl font-black font-mono text-[#f1f5f9]">
                {reruns.meanPct}%
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                Press-release number (best of 8)
              </p>
              <p className="text-2xl font-black font-mono text-[var(--color-warning)]">
                {reruns.bestPct}%
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
                Free points from selection
              </p>
              <p className="text-2xl font-black font-mono text-[var(--color-warning)]">
                +{reruns.liftPts} pts
              </p>
            </div>
          </div>
        </motion.section>

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
                  Score Skeptic Certified!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You inflated a leaderboard score with leaked test items, caught a
                  rank flip on a private held-out set, and watched an easy benchmark
                  hide a real skill difference.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Peak leak you tested
                    </p>
                    <p
                      className="text-[14px] font-mono font-bold"
                      style={{ color: PUBLIC_SERIES }}
                    >
                      {maxContaminationPct}% of items
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Public #1 vs private #1
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {publicTop ? publicTop.model.name : "?"} vs{" "}
                      {privateTop ? privateTop.model.name : "?"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Spread: easy vs hard mix
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {legacySpread} vs {frontierSpread} pts
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;A leaderboard number is one model on one dataset at one
                    moment, filtered through someone&apos;s reporting choices.
                    Saturation compresses it, contamination inflates it, and
                    selection effects cherry-pick it. When the stakes are real,
                    trust the held-out score.&quot;
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
              href="/visual-guides"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
            >
              ← All Guides
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
