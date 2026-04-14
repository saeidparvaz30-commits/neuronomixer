"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { Columns2 } from "lucide-react";
import {
  DistributionType,
  DISTRIBUTIONS,
  DIST_ORDER,
} from "./types";
import DistributionGallery from "./DistributionGallery";
import DistributionPanel from "./DistributionPanel";
import ComparisonMode from "./ComparisonMode";

// ── Build initial params from defaults ────────────────────────────────────────
function buildInitialParams(): Record<DistributionType, Record<string, number>> {
  return Object.fromEntries(
    DIST_ORDER.map(id => [id, { ...DISTRIBUTIONS[id].defaultParams }])
  ) as Record<DistributionType, Record<string, number>>;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProbabilityDistributionsClient() {
  const { data: session } = useSession();
  const completionFired = useRef(false);

  // Per-distribution parameter state
  const [params, setParams] = useState<Record<DistributionType, Record<string, number>>>(
    buildInitialParams
  );

  // Which card is currently expanded
  const [selectedType, setSelectedType] = useState<DistributionType | null>(null);

  // Set of distribution types the user has opened
  const [distributionsOpened, setDistributionsOpened] = useState<Set<DistributionType>>(
    new Set()
  );

  // Total number of slider adjustments made
  const [adjustmentsCount, setAdjustmentsCount] = useState(0);

  // Comparison mode
  const [comparisonMode, setComparisonMode] = useState(false);
  const [compDistA, setCompDistA] = useState<DistributionType>("normal");
  const [compDistB, setCompDistB] = useState<DistributionType>("poisson");

  // ── Completion tracking ────────────────────────────────────────────────────
  const tasksCompleted = distributionsOpened.size >= 4 && adjustmentsCount >= 8;

  useEffect(() => {
    if (tasksCompleted && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "probability-distributions", score: 8 }),
      }).catch(() => {});
    }
  }, [tasksCompleted, session?.user]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleSelectType(type: DistributionType) {
    setSelectedType(prev => (prev === type ? null : type));
    setDistributionsOpened(prev => new Set([...prev, type]));
  }

  function handleParamChange(type: DistributionType, key: string, value: number) {
    setParams(prev => ({
      ...prev,
      [type]: { ...prev[type], [key]: value },
    }));
    setAdjustmentsCount(prev => prev + 1);
  }

  function handleClosePanel() {
    setSelectedType(null);
  }

  // ── Progress indicators ────────────────────────────────────────────────────
  const progress = [
    {
      label: `Distributions explored: ${distributionsOpened.size}/4`,
      done: distributionsOpened.size >= 4,
    },
    {
      label: `Parameters adjusted: ${adjustmentsCount}/8`,
      done: adjustmentsCount >= 8,
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Probability Distributions Gallery</span>
        </nav>

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#d4af37]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#d4af37]">
              Statistics
            </span>
            <span className="w-6 h-px bg-[#d4af37]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Probability Distributions{" "}
            <span className="text-[#d4af37]">Gallery</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[660px]">
            Explore 8 probability distributions interactively. Click any card to
            adjust parameters, view the PDF/PMF, analytic statistics, and
            real-world use cases.
          </p>
        </motion.section>

        {/* Progress + controls row */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progress.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors"
                style={{ background: done ? "#3bb4a4" : "#1e293b" }}
              />
              <span className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}>
                {label}
              </span>
            </div>
          ))}

          {!session?.user && (
            <p className="text-[11px] text-[#475569]">
              <Link
                href="/auth/sign-in"
                className="underline underline-offset-2 hover:text-[#94a3b8]"
              >
                Sign in
              </Link>{" "}
              to track progress
            </p>
          )}

          <AnimatePresence>
            {tasksCompleted && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>

          {/* Compare mode toggle */}
          <button
            onClick={() => {
              setComparisonMode(prev => !prev);
              setSelectedType(null);
            }}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-colors"
            style={
              comparisonMode
                ? { borderColor: "#d4af37", color: "#d4af37", background: "#d4af3718" }
                : { borderColor: "#1e293b", color: "#94a3b8" }
            }
            aria-pressed={comparisonMode}
          >
            <Columns2 size={13} />
            Compare Mode
          </button>
        </div>

        {/* Main content */}
        {comparisonMode ? (
          <AnimatePresence>
            <ComparisonMode
              params={params}
              distA={compDistA}
              distB={compDistB}
              onChangeA={setCompDistA}
              onChangeB={setCompDistB}
            />
          </AnimatePresence>
        ) : (
          <>
            {/* Gallery grid */}
            <DistributionGallery
              selectedType={selectedType}
              params={params}
              openedTypes={distributionsOpened}
              onSelect={handleSelectType}
            />

            {/* Detail panel (slides in below gallery) */}
            <AnimatePresence mode="wait">
              {selectedType && (
                <div className="mt-4">
                  <DistributionPanel
                    key={selectedType}
                    type={selectedType}
                    params={params[selectedType]}
                    onParamChange={(key, value) =>
                      handleParamChange(selectedType, key, value)
                    }
                    onClose={handleClosePanel}
                  />
                </div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Footer navigation */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link
            href="/visual-guides/bayes-theorem"
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors"
          >
            ← Bayes&apos; Theorem
          </Link>
          <Link
            href="/visual-guides"
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#d4af37] text-[#0a0e1a] hover:opacity-90 transition-opacity"
          >
            All Guides →
          </Link>
        </div>
      </div>
    </div>
  );
}
