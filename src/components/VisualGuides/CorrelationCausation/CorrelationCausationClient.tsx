"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";
import ConfoundReveal            from "./ConfoundReveal";
import CausalExplainer           from "./CausalExplainer";
import BuildYourOwn              from "./BuildYourOwn";
import SpuriousCorrelationSandbox from "./SpuriousCorrelationSandbox";
import ExampleGallery            from "./ExampleGallery";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

const NEXT_GUIDE_SLUG = "dimensionality-reduction";

export default function CorrelationCausationClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const [revealed,       setRevealed]       = useState(false);
  const [spuriousCount,  setSpuriousCount]  = useState(0);
  const [diagramSelected, setDiagramSelected] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const completionFired = useRef(false);

  const allComplete = revealed && spuriousCount >= 2 && diagramSelected;

  // Subcomponents latch their own state (reveal, selection, generated pairs);
  // bumping resetKey remounts them so their internals reset too.
  function handleReset() {
    setRevealed(false);
    setSpuriousCount(0);
    setDiagramSelected(false);
    setResetKey((k) => k + 1);
  }

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "correlation-causation", score: 100 }),
      }).catch(() => {});
    }
  }, [allComplete, session?.user]);

  const progress = [
    { label: "Confound revealed",                   done: revealed },
    { label: `Spurious pairs: ${spuriousCount}/2`, done: spuriousCount >= 2 },
    { label: "Causal diagram selected",             done: diagramSelected },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={allComplete} guideSlug="correlation-causation" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Correlation vs Causation</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">Data &amp; Analysis</span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Correlation vs Causation:{" "}
            <span className="text-[var(--color-accent)]">The Visual Guide</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[600px]">
            Ice cream sales and shark attacks are strongly correlated, but ice cream doesn&apos;t cause sharks.
            Explore confounding variables, generate spurious correlations, and learn when correlation hints at causation.
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

        {/* Section 1: Ice cream paradox */}
        <section className="mb-12">
          <h2 className="text-[20px] font-bold text-white mb-4">The Ice Cream Paradox</h2>
          <ConfoundReveal key={resetKey} onReveal={() => setRevealed(true)} />
        </section>

        {/* Section 2: Explainer */}
        <section className="mb-12">
          <h2 className="text-[20px] font-bold text-white mb-4">Correlation ≠ Causation</h2>
          <CausalExplainer />
        </section>

        {/* Section 3: Causal diagrams */}
        <section className="mb-12">
          <h2 className="text-[20px] font-bold text-white mb-2">Causal Diagrams</h2>
          <p className="text-[13px] text-[#94a3b8] mb-4">Which causal structure best explains the ice cream / shark correlation?</p>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
            <BuildYourOwn key={resetKey} onSelect={() => setDiagramSelected(true)} />
          </div>
        </section>

        {/* Section 4: Spurious correlations */}
        <section className="mb-12">
          <h2 className="text-[20px] font-bold text-white mb-2">Generate Spurious Correlations</h2>
          <p className="text-[13px] text-[#94a3b8] mb-4">
            Real data, zero causal meaning, and a generator to find your own &quot;surprising&quot; correlations.
          </p>
          <SpuriousCorrelationSandbox key={resetKey} onGenerate={setSpuriousCount} />
        </section>

        {/* Section 5: Real examples */}
        <section className="mb-12">
          <h2 className="text-[20px] font-bold text-white mb-2">Real Correlations That Don&apos;t Imply Causation</h2>
          <p className="text-[13px] text-[#94a3b8] mb-4">Click each card to expand and see the hidden confounding variable.</p>
          <ExampleGallery key={resetKey} />
        </section>

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
                  You Found the Hidden Variable
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You exposed the confounder behind the ice cream paradox, generated
                  spurious correlations on demand, and picked the causal structure that
                  actually explains the data.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Ice cream paradox</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {revealed ? "Confound revealed" : "Hidden"}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      heat drives both trends
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Spurious pairs generated
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {spuriousCount}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      correlated, causally empty
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Causal diagram</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {diagramSelected ? "Selected" : "Pending"}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      structure over story
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;A strong correlation is an invitation to ask why, not a license
                    to conclude because. Until you rule out the lurking third variable,
                    the arrow you draw between two trends is a guess.&quot;
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
            <Link href="/visual-guides/outlier-detection"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors">
              ← Previous Guide
            </Link>
            <Link href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
              Next: Dimensionality Reduction: PCA, t-SNE & UMAP →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
