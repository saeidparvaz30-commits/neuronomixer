"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  ClinicId,
  ViewId,
  DenomId,
  CLINIC_TOTAL,
  SHARE_DEFAULT,
  SPU_DEFAULT,
  STORE_A,
  STORE_B,
  clinicOutcomes,
  pooledOutcome,
  rateOf,
  evalParadox,
  storeASessions,
  fmtPct,
  fmtPts,
  fmtGapPts,
} from "./types";
import ClinicParadoxLab from "./ClinicParadoxLab";
import DenominatorLab from "./DenominatorLab";

const GUIDE_TITLE = "When Averages Lie: Aggregation Traps";
const GUIDE_SLUG = "aggregation-pitfalls";
const NEXT_GUIDE_SLUG = "correlation-causation";

interface ReversalSnapshot {
  northShare: number;
  riverShare: number;
  /** Pooled gap in favor of the pooled winner at the moment of the flip. */
  gap: number;
}

export default function AggregationPitfallsClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // Section 1: clinics
  const [northShare, setNorthShare] = useState(SHARE_DEFAULT);
  const [riverShare, setRiverShare] = useState(SHARE_DEFAULT);
  const [view, setView] = useState<ViewId>("pooled");
  const [viewsSeen, setViewsSeen] = useState<ReadonlySet<ViewId>>(new Set(["pooled"]));
  const [reversal, setReversal] = useState<ReversalSnapshot | null>(null);

  // Section 2: denominators
  const [denom, setDenom] = useState<DenomId>("user");
  const [denomsSeen, setDenomsSeen] = useState<ReadonlySet<DenomId>>(new Set(["user"]));
  const [spu, setSpu] = useState(SPU_DEFAULT);

  // ── Live computation ────────────────────────────────────────────────────
  const north = useMemo(() => clinicOutcomes("north", northShare), [northShare]);
  const river = useMemo(() => clinicOutcomes("river", riverShare), [riverShare]);
  const paradox = useMemo(() => evalParadox(north, river), [north, river]);

  useEffect(() => {
    if (paradox.active && reversal === null) {
      const gap = Math.abs(
        rateOf(pooledOutcome(north)) - rateOf(pooledOutcome(river))
      );
      setReversal({ northShare, riverShare, gap });
    }
  }, [paradox.active, reversal, north, river, northShare, riverShare]);

  const perUserA = STORE_A.buyers / STORE_A.users;
  const perSessionA = STORE_A.buyers / storeASessions(spu);
  const perUserB = STORE_B.buyers / STORE_B.users;
  const perSessionB = STORE_B.buyers / STORE_B.sessions;

  // ── Gates ───────────────────────────────────────────────────────────────
  const gateViews = viewsSeen.has("pooled") && viewsSeen.has("grouped");
  const gateReversal = reversal !== null;
  const gateDenoms = denomsSeen.has("user") && denomsSeen.has("session");
  const isComplete = gateViews && gateReversal && gateDenoms;

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleViewChange = useCallback((v: ViewId) => {
    setView(v);
    setViewsSeen((prev) => (prev.has(v) ? prev : new Set(prev).add(v)));
  }, []);

  const handleShareChange = useCallback((id: ClinicId, share: number) => {
    if (id === "north") setNorthShare(share);
    else setRiverShare(share);
  }, []);

  const handleDenomChange = useCallback((d: DenomId) => {
    setDenom(d);
    setDenomsSeen((prev) => (prev.has(d) ? prev : new Set(prev).add(d)));
  }, []);

  function handleReset() {
    setNorthShare(SHARE_DEFAULT);
    setRiverShare(SHARE_DEFAULT);
    setView("pooled");
    setViewsSeen(new Set(["pooled"]));
    setReversal(null);
    setDenom("user");
    setDenomsSeen(new Set(["user"]));
    setSpu(SPU_DEFAULT);
  }

  const progressItems = [
    { id: "views", label: "Compare pooled and by-severity views", done: gateViews },
    { id: "reversal", label: "Find the reversal point", done: gateReversal },
    { id: "denominator", label: "Flip a winner with the denominator", done: gateDenoms },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug={GUIDE_SLUG} score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">
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
              Data &amp; Analysis
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3"
          >
            When Averages Lie:{" "}
            <span className="text-[var(--color-accent)]">Aggregation Traps</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Two of the quietest decisions in any analysis are the level you
            aggregate at and the number you divide by. Neither feels like a
            decision, and either one can flip your conclusion. Flip both, on
            live data, and learn to hear the click.
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
              <span className={`text-[11px] ${item.done ? "text-white" : "text-[#475569]"}`}>
                {item.label}
              </span>
            </div>
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link href="/auth/sign-in" className="underline underline-offset-2 hover:text-[#94a3b8]">
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
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Definition */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            One dataset, many honest summaries
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
            An average is not a fact about the world. It is a fact about the
            world plus two choices: which rows you pool together, and what you
            divide by. Change either choice and the same table can tell the
            opposite story, with no error anywhere. The classic pooled-vs-group
            flip is Simpson&apos;s paradox, and its causal reading, when should
            you trust the grouped view, lives in the{" "}
            <Link
              href="/visual-guides/simpsons-paradox"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              Simpson&apos;s paradox
            </Link>{" "}
            guide. This guide stays on the analyst&apos;s side of the desk:
            aggregation level and denominator as everyday grouping craft, the
            two questions to ask before you believe any average.
          </p>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            How this playground stays honest: both clinics treat {CLINIC_TOTAL}{" "}
            whole patients whose counts follow the fixed recovery odds printed
            on their cards, and the stores keep their full user and session
            ledgers on screen. Every rate, gap, tie point, and winner on this
            page is recomputed from those integer counts on every slider move
            and toggle. Nothing is scripted.
          </p>
        </motion.section>

        {/* Section 1: clinics */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
            1 · The level trap: two clinics, one flip
          </h2>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[720px] mb-4">
            Northside is the better clinic for mild cases and the better clinic
            for severe cases. Referrals send it the harder mix. Drag the case
            mix sliders, toggle between the pooled table and the by-severity
            table, and find the point where the pooled winner flips even
            though Northside never stops winning both groups.
          </p>
          <ClinicParadoxLab
            north={north}
            river={river}
            northShare={northShare}
            riverShare={riverShare}
            onShareChange={handleShareChange}
            view={view}
            onViewChange={handleViewChange}
            paradox={paradox}
            reversalFound={gateReversal}
          />
        </motion.section>

        {/* Section 2: denominators */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-1">
            2 · The denominator trap: per what?
          </h2>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed max-w-[720px] mb-4">
            Two online stores sell the same goods. Store A is a browsing app
            that people open constantly; Store B is an errand people run once.
            The raw ledger is identical either way you read it. Switch the
            denominator and watch the conversion crown change heads.
          </p>
          <DenominatorLab
            denom={denom}
            onDenomChange={handleDenomChange}
            spu={spu}
            onSpuChange={setSpu}
            visitedBoth={gateDenoms}
          />
        </motion.section>

        {/* The craft card */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-3">
            The two questions to ask before trusting any average
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-1.5">
                Aggregated over what?
              </p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                Pooling rows mixes their compositions. If the groups being
                compared carry different mixes, the pooled number rewards the
                easier mix, not the better performer. Always look at both
                levels before picking one.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-1.5">
                Divided by what?
              </p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                A rate is a claim about its denominator. Per user, per session,
                per order, and per dollar are four different questions wearing
                the same percent sign. Say the denominator out loud in every
                headline you write.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] uppercase tracking-wide mb-1.5">
                When the views disagree
              </p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                A pooled-vs-grouped conflict is a signal, not a bug: some mix
                variable differs between the things you are comparing. Whether
                the pooled or the grouped answer is the right one is a causal
                question; the{" "}
                <Link
                  href="/visual-guides/simpsons-paradox"
                  className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
                >
                  Simpson&apos;s paradox
                </Link>{" "}
                guide takes it from here.
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
                  You Caught the Average Lying
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You flipped one verdict with a grouping choice and another
                  with a denominator, without changing a single row of data.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Reversal you found
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {reversal ? `${reversal.northShare}% severe` : "?"}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      {reversal
                        ? `at Northside, pooled gap ${fmtGapPts(reversal.gap)} against the better clinic`
                        : "drag the sliders"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Store A, two honest rates
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {fmtPct(perUserA)} vs {fmtPct(perSessionA)}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      per user vs per session at {spu} sessions per user
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Winner margin by framing
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {fmtPts(perUserA - perUserB)} / {fmtPts(perSessionA - perSessionB)}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      Store A minus Store B, per user / per session
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;An average is the data plus two silent choices: what
                    you pool and what you divide by. Before you believe one, or
                    publish one, make both choices out loud and check whether
                    the verdict survives the alternatives.&quot;
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
