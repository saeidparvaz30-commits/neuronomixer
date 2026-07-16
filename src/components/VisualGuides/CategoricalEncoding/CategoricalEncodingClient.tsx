"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  EncodingMethod,
  HOUSES,
  CATEGORIES,
  computeComparisonFits,
  generateLeakPrices,
  computeLeakCurve,
  CARD_MIN,
  EXPLOSION_THRESHOLD,
  LEAK_K_INITIAL,
  LEAK_SEED,
} from "./types";
import EncodingLab from "./EncodingLab";
import CardinalityExplosion from "./CardinalityExplosion";
import FitComparison from "./FitComparison";
import TargetLeakage from "./TargetLeakage";

// Deterministic module-scope computations: identical on server and client.
const COMPARISON_FITS = computeComparisonFits();
const LEAK_PRICES = generateLeakPrices();
const LEAK_CURVE = computeLeakCurve(LEAK_PRICES);

const GUIDE_TITLE = "Turning Categories into Numbers";
const GUIDE_SLUG = "categorical-encoding";
const NEXT_GUIDE_SLUG = "feature-engineering-craft";

export default function CategoricalEncodingClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  const [method, setMethod] = useState<EncodingMethod>("onehot");
  const [explored, setExplored] = useState<Set<EncodingMethod>>(new Set(["onehot"]));
  const [cardK, setCardK] = useState(CARD_MIN);
  const [maxCardK, setMaxCardK] = useState(CARD_MIN);
  const [ranComparison, setRanComparison] = useState(false);
  const [leakK, setLeakK] = useState(LEAK_K_INITIAL);

  const handleMethod = useCallback((m: EncodingMethod) => {
    setMethod(m);
    setExplored((prev) => {
      const next = new Set(prev);
      next.add(m);
      return next;
    });
  }, []);

  const handleCardK = useCallback((k: number) => {
    setCardK(k);
    setMaxCardK((prev) => Math.max(prev, k));
  }, []);

  const handleRunComparison = useCallback(() => setRanComparison(true), []);

  function handleReset() {
    setMethod("onehot");
    setExplored(new Set(["onehot"]));
    setCardK(CARD_MIN);
    setMaxCardK(CARD_MIN);
    setRanComparison(false);
    setLeakK(LEAK_K_INITIAL);
  }

  // Derived completion gates: purely from what the user actually did.
  const gateEncodings = explored.size === 4;
  const gateExplosion = maxCardK > EXPLOSION_THRESHOLD;
  const gateComparison = ranComparison;
  const isComplete = gateEncodings && gateExplosion && gateComparison;

  const progressItems = [
    { id: "encodings", label: `Try all four encodings (${explored.size}/4)`, done: gateEncodings },
    { id: "explosion", label: "Explode the one-hot columns", done: gateExplosion },
    { id: "comparison", label: "Run the fit comparison", done: gateComparison },
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
            Turning Categories <span className="text-[var(--color-accent)]">into Numbers</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Models and math need numbers, but &quot;Riverside&quot; is not one. Every way of
            fixing that smuggles in an assumption, and the wrong one quietly invents an
            order that does not exist or leaks the answer into the features.
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

        {/* Definition + honesty note */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            An encoding is a modeling assumption in disguise
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
            A linear model cannot multiply a coefficient by &quot;Old Town&quot;, and neither
            can a distance metric or a gradient. So categorical columns must become numeric
            ones. The catch: numbers carry structure that names never had. Numbers have an
            order, magnitudes, and distances, and your model will happily use all three even
            when they are artifacts of the encoding rather than facts about the world.
          </p>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            How this playground stays honest: everything is computed live in your browser
            from the literal {HOUSES.length}-row table below ({CATEGORIES.length}{" "}
            neighborhoods) and, in the last section, a {LEAK_PRICES.length}-value sample
            from a seeded generator (seed {LEAK_SEED}). Both least-squares fits are solved
            exactly with the normal equations. Nothing is precomputed or faked.
          </p>
        </motion.section>

        {/* Section 1: encoding lab */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <p className="text-[13px] font-semibold text-white">The encoding lab</p>
            <span className="text-[11px] text-[#475569]">
              {HOUSES.length} houses · {CATEGORIES.length} neighborhoods · rebuilt live
            </span>
          </div>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
            Same twelve houses, four different numeric matrices. Click through every
            encoding and watch the columns it hands to the model. Each one answers the same
            question, &quot;what number is a neighborhood?&quot;, with a different assumption.
          </p>
          <EncodingLab method={method} explored={explored} onMethodChange={handleMethod} />
        </motion.section>

        {/* Section 2: cardinality explosion */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-1">
            The one-hot column explosion
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
            One-hot is the safest default at low cardinality, but its cost is width: k
            categories means k columns (k minus 1 if you drop a reference level). Drag the
            slider from 4 neighborhoods toward zip-code territory and watch the matrix
            widen while the rows available to estimate each column shrink. Push it past{" "}
            {EXPLOSION_THRESHOLD} columns to see it tip.
          </p>
          <CardinalityExplosion k={cardK} onChange={handleCardK} />
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mt-4">
            This is one face of the curse of dimensionality: parameters grow with k while
            the data does not. High-cardinality columns are exactly where the compact
            encodings, and eventually{" "}
            <Link
              href="/visual-guides/dimensionality-reduction"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              dimensionality reduction
            </Link>
            , earn their keep.
          </p>
        </motion.section>

        {/* Section 3: fit lab */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-1">
            The fit lab: what a fake order costs
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
            Ordinal encoding is perfect when the order is real (small, medium, large). Here
            the order is alphabetical, so a linear model on the code is forced to draw one
            straight line through neighborhoods whose mean prices are not monotone in that
            order. One-hot gives the model a free mean per neighborhood instead.
          </p>
          <FitComparison
            fits={COMPARISON_FITS}
            revealed={ranComparison}
            onRun={handleRunComparison}
          />
          {ranComparison && (
            <p className="text-[12px] text-[#94a3b8] leading-relaxed mt-4">
              The purple line is the best a single slope can do on alphabetical codes: R²
              of {COMPARISON_FITS.ordinal.r2.toFixed(3)}. The one-hot fit lands on each
              category mean and reaches {COMPARISON_FITS.oneHot.r2.toFixed(3)}. The
              information was in the data all along; the ordinal encoding just made it
              unreachable for a linear model. Tree-based models suffer less because they
              can split a code range repeatedly, but the order is still arbitrary.
            </p>
          )}
        </motion.section>

        {/* Section 4: target-encoding leakage preview */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-1">
            When the encoding borrows the answer: target encoding on tiny categories
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
            Target encoding replaces each category with the mean of the label inside it.
            With plenty of rows per category that mean is signal. With one or two rows per
            category the mean IS the label, so the feature memorizes noise. Below, the
            prices are pure noise with zero real category effect: slide k up and watch the
            train fit climb while the held-out slice, split deterministically, gets worse.
          </p>
          <TargetLeakage curve={LEAK_CURVE} k={leakK} onChange={setLeakK} />
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mt-4">
            This gap is a leakage signature: the feature knows things about the training
            labels that no honest feature could know at prediction time. Practitioners
            blunt it with out-of-fold means and smoothing toward the global mean. The full
            story, including nastier variants, lives in the{" "}
            <Link
              href="/visual-guides/data-leakage"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              data leakage guide
            </Link>
            .
          </p>
        </motion.section>

        {/* Choosing guide */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-3">Choosing in practice</p>
          <div className="overflow-x-auto rounded-xl border border-[#1e293b]">
            <table className="w-full text-[12px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="bg-[#1e293b] text-left">
                  <th className="px-3 py-2 font-semibold text-[#94a3b8]">Encoding</th>
                  <th className="px-3 py-2 font-semibold text-[#94a3b8]">Assumption it injects</th>
                  <th className="px-3 py-2 font-semibold text-[#94a3b8]">Reach for it when</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: "#0f172a" }}>
                  <td className="px-3 py-2 text-[#f1f5f9]">One-hot</td>
                  <td className="px-3 py-2 text-[#94a3b8]">None (categories independent)</td>
                  <td className="px-3 py-2 text-[#94a3b8]">Low cardinality, linear models</td>
                </tr>
                <tr style={{ background: "#162032" }}>
                  <td className="px-3 py-2 text-[#f1f5f9]">Ordinal</td>
                  <td className="px-3 py-2 text-[#94a3b8]">A real, meaningful order</td>
                  <td className="px-3 py-2 text-[#94a3b8]">Genuinely ordered levels only</td>
                </tr>
                <tr style={{ background: "#0f172a" }}>
                  <td className="px-3 py-2 text-[#f1f5f9]">Frequency</td>
                  <td className="px-3 py-2 text-[#94a3b8]">Prevalence predicts the target</td>
                  <td className="px-3 py-2 text-[#94a3b8]">High cardinality, quick baseline</td>
                </tr>
                <tr style={{ background: "#162032" }}>
                  <td className="px-3 py-2 text-[#f1f5f9]">Target</td>
                  <td className="px-3 py-2 text-[#94a3b8]">Category means generalize</td>
                  <td className="px-3 py-2 text-[#94a3b8]">
                    High cardinality, with out-of-fold means and smoothing
                  </td>
                </tr>
              </tbody>
            </table>
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
                  Encodings Decoded!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You rebuilt the same table four ways, blew up a one-hot matrix, and
                  measured exactly what a fake alphabetical order costs a linear model.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Encodings explored</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {explored.size} / 4
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Widest one-hot matrix</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {maxCardK} columns
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">R² lost to the fake order</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {(COMPARISON_FITS.oneHot.r2 - COMPARISON_FITS.ordinal.r2).toFixed(3)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;An encoding is a modeling assumption in disguise. One-hot buys
                    neutrality with columns, ordinal invents an order, frequency collapses
                    distinct categories, and target encoding borrows the answer key. Pick
                    the assumption you can defend.&quot;
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
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
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
