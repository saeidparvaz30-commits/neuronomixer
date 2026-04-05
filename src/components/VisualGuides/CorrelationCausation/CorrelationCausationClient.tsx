"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import ConfoundReveal            from "./ConfoundReveal";
import CausalExplainer           from "./CausalExplainer";
import BuildYourOwn              from "./BuildYourOwn";
import SpuriousCorrelationSandbox from "./SpuriousCorrelationSandbox";
import ExampleGallery            from "./ExampleGallery";

export default function CorrelationCausationClient() {
  const { data: session } = useSession();
  const [revealed,       setRevealed]       = useState(false);
  const [spuriousCount,  setSpuriousCount]  = useState(0);
  const [diagramSelected, setDiagramSelected] = useState(false);
  const completionFired = useRef(false);

  const allComplete = revealed && spuriousCount >= 2 && diagramSelected;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "correlation-causation", score: 5 }),
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
            Ice cream sales and shark attacks are strongly correlated — but ice cream doesn&apos;t cause sharks.
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
          <ConfoundReveal onReveal={() => setRevealed(true)} />
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
            <BuildYourOwn onSelect={() => setDiagramSelected(true)} />
          </div>
        </section>

        {/* Section 4: Spurious correlations */}
        <section className="mb-12">
          <h2 className="text-[20px] font-bold text-white mb-2">Generate Spurious Correlations</h2>
          <p className="text-[13px] text-[#94a3b8] mb-4">
            Real data, zero causal meaning — and a generator to find your own &quot;surprising&quot; correlations.
          </p>
          <SpuriousCorrelationSandbox onGenerate={setSpuriousCount} />
        </section>

        {/* Section 5: Real examples */}
        <section className="mb-12">
          <h2 className="text-[20px] font-bold text-white mb-2">Real Correlations That Don&apos;t Imply Causation</h2>
          <p className="text-[13px] text-[#94a3b8] mb-4">Click each card to expand and see the hidden confounding variable.</p>
          <ExampleGallery />
        </section>

        {/* Footer nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link href="/visual-guides/outlier-detection"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">
            ← Previous Guide
          </Link>
          <Link href="/visual-guides"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">
            All Guides →
          </Link>
        </div>
      </div>
    </div>
  );
}
