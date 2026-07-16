"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion } from "@/lib/guideMotion";

import type {
  ScenarioType,
  ScenarioConfig,
  GridSquare,
  GridFilter,
  State,
} from "./types";
import ScenarioSelector from "./ScenarioSelector";
import TreeBuilder from "./TreeBuilder";
import SampleSpaceAnimator from "./SampleSpaceAnimator";
import ConditionalProbabilityCalculator from "./ConditionalProbabilityCalculator";
import IndependenceChecker from "./IndependenceChecker";
import ExplanationPanel from "./ExplanationPanel";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

// ── Scenario data ─────────────────────────────────────────────────────────────

const MEDICAL_TREE = {
  nodes: [
    { id: "root", label: "Start", level: 0, siblingIndex: 0, siblingCount: 1, color: "#1e293b" },
    { id: "disease", label: "Disease", sublabel: "0.01", level: 1, siblingIndex: 0, siblingCount: 2, color: "#3b82f6" },
    { id: "no_disease", label: "No Disease", sublabel: "0.99", level: 1, siblingIndex: 1, siblingCount: 2, color: "#475569" },
    { id: "d_pos", label: "Test+", sublabel: "0.95", level: 2, siblingIndex: 0, siblingCount: 4, color: "#3b82f6", isLeaf: true, jointProbability: "0.0095" },
    { id: "d_neg", label: "Test−", sublabel: "0.05", level: 2, siblingIndex: 1, siblingCount: 4, color: "#1e40af", isLeaf: true, jointProbability: "0.0005" },
    { id: "nd_pos", label: "Test+", sublabel: "0.10", level: 2, siblingIndex: 2, siblingCount: 4, color: "var(--color-accent)", isLeaf: true, jointProbability: "0.099" },
    { id: "nd_neg", label: "Test−", sublabel: "0.90", level: 2, siblingIndex: 3, siblingCount: 4, color: "#334155", isLeaf: true, jointProbability: "0.891" },
  ],
  branches: [
    { id: "b_root_d", fromNodeId: "root", toNodeId: "disease", probability: "0.01" },
    { id: "b_root_nd", fromNodeId: "root", toNodeId: "no_disease", probability: "0.99" },
    { id: "b_d_pos", fromNodeId: "disease", toNodeId: "d_pos", probability: "0.95" },
    { id: "b_d_neg", fromNodeId: "disease", toNodeId: "d_neg", probability: "0.05" },
    { id: "b_nd_pos", fromNodeId: "no_disease", toNodeId: "nd_pos", probability: "0.10" },
    { id: "b_nd_neg", fromNodeId: "no_disease", toNodeId: "nd_neg", probability: "0.90" },
  ],
};

const MARBLE_TREE = {
  nodes: [
    { id: "root", label: "Start", level: 0, siblingIndex: 0, siblingCount: 1, color: "#1e293b" },
    { id: "r1", label: "Red", sublabel: "5/8", level: 1, siblingIndex: 0, siblingCount: 2, color: "#ef4444" },
    { id: "b1", label: "Blue", sublabel: "3/8", level: 1, siblingIndex: 1, siblingCount: 2, color: "#3b82f6" },
    { id: "rr", label: "Red", sublabel: "4/7", level: 2, siblingIndex: 0, siblingCount: 4, color: "#ef4444", isLeaf: true, jointProbability: "20/56" },
    { id: "rb", label: "Blue", sublabel: "3/7", level: 2, siblingIndex: 1, siblingCount: 4, color: "#3b82f6", isLeaf: true, jointProbability: "15/56" },
    { id: "br", label: "Red", sublabel: "5/7", level: 2, siblingIndex: 2, siblingCount: 4, color: "#ef4444", isLeaf: true, jointProbability: "15/56" },
    { id: "bb", label: "Blue", sublabel: "2/7", level: 2, siblingIndex: 3, siblingCount: 4, color: "#3b82f6", isLeaf: true, jointProbability: "6/56" },
  ],
  branches: [
    { id: "b_root_r", fromNodeId: "root", toNodeId: "r1", probability: "5/8", fractionLabel: "5/8" },
    { id: "b_root_b", fromNodeId: "root", toNodeId: "b1", probability: "3/8", fractionLabel: "3/8" },
    { id: "b_r_rr", fromNodeId: "r1", toNodeId: "rr", probability: "4/7", fractionLabel: "4/7" },
    { id: "b_r_rb", fromNodeId: "r1", toNodeId: "rb", probability: "3/7", fractionLabel: "3/7" },
    { id: "b_b_br", fromNodeId: "b1", toNodeId: "br", probability: "5/7", fractionLabel: "5/7" },
    { id: "b_b_bb", fromNodeId: "b1", toNodeId: "bb", probability: "2/7", fractionLabel: "2/7" },
  ],
};

const MANUFACTURING_TREE = {
  nodes: [
    { id: "root", label: "Item", level: 0, siblingIndex: 0, siblingCount: 1, color: "#1e293b" },
    { id: "fa", label: "Factory A", sublabel: "0.4", level: 1, siblingIndex: 0, siblingCount: 2, color: "var(--color-accent)" },
    { id: "fb", label: "Factory B", sublabel: "0.6", level: 1, siblingIndex: 1, siblingCount: 2, color: "#3bb4a4" },
    { id: "fa_d", label: "Defect", sublabel: "0.05", level: 2, siblingIndex: 0, siblingCount: 4, color: "var(--color-accent)", isLeaf: true, jointProbability: "0.020" },
    { id: "fa_ok", label: "OK", sublabel: "0.95", level: 2, siblingIndex: 1, siblingCount: 4, color: "#b8860b", isLeaf: true, jointProbability: "0.380" },
    { id: "fb_d", label: "Defect", sublabel: "0.03", level: 2, siblingIndex: 2, siblingCount: 4, color: "#3bb4a4", isLeaf: true, jointProbability: "0.018" },
    { id: "fb_ok", label: "OK", sublabel: "0.97", level: 2, siblingIndex: 3, siblingCount: 4, color: "#1e5d8a", isLeaf: true, jointProbability: "0.582" },
  ],
  branches: [
    { id: "b_root_fa", fromNodeId: "root", toNodeId: "fa", probability: "0.4" },
    { id: "b_root_fb", fromNodeId: "root", toNodeId: "fb", probability: "0.6" },
    { id: "b_fa_d", fromNodeId: "fa", toNodeId: "fa_d", probability: "0.05" },
    { id: "b_fa_ok", fromNodeId: "fa", toNodeId: "fa_ok", probability: "0.95" },
    { id: "b_fb_d", fromNodeId: "fb", toNodeId: "fb_d", probability: "0.03" },
    { id: "b_fb_ok", fromNodeId: "fb", toNodeId: "fb_ok", probability: "0.97" },
  ],
};

// ── Grid builders ─────────────────────────────────────────────────────────────

function buildMedicalGrid(): GridSquare[] {
  // 10×10 = 100 squares representing 1000 people at 1:10 scale
  // ~1 disease_positive, ~0 disease_negative (round to 1 for visibility)
  // ~10 healthy_positive, ~88 healthy_negative (total test+ = ~11, disease = ~1)
  const squares: GridSquare[] = [];
  const categories: Array<{ cat: GridSquare["category"]; count: number; color: string }> = [
    { cat: "disease_positive", count: 1, color: "#3b82f6" },
    { cat: "disease_negative", count: 0, color: "#1e40af" },
    { cat: "healthy_positive", count: 10, color: "var(--color-accent)" },
    { cat: "healthy_negative", count: 89, color: "#334155" },
  ];
  let id = 0;
  for (const { cat, count, color } of categories) {
    for (let i = 0; i < count; i++) {
      squares.push({ id: id++, category: cat, color });
    }
  }
  return squares;
}

function buildMarbleGrid(): GridSquare[] {
  // 8×8 = 64 squares — 5/8 red, 3/8 blue
  const squares: GridSquare[] = [];
  const red = Math.round((5 / 8) * 64); // 40
  const blue = 64 - red; // 24
  for (let i = 0; i < red; i++) squares.push({ id: i, category: "red", color: "#ef4444" });
  for (let i = 0; i < blue; i++) squares.push({ id: red + i, category: "blue", color: "#3b82f6" });
  return squares;
}

function buildManufacturingGrid(): GridSquare[] {
  // 10×10 = 100 squares
  // Factory A: 40 squares — 2 defective, 38 ok
  // Factory B: 60 squares — 2 defective (rounded from 1.8), 58 ok
  const squares: GridSquare[] = [];
  const items: Array<{ cat: GridSquare["category"]; count: number; color: string; label: string }> = [
    { cat: "factory_a_defect", count: 2, color: "var(--color-accent)", label: "A!" },
    { cat: "factory_a_ok", count: 38, color: "#b8860b", label: "A" },
    { cat: "factory_b_defect", count: 2, color: "#3bb4a4", label: "B!" },
    { cat: "factory_b_ok", count: 58, color: "#1e5d8a", label: "B" },
  ];
  let id = 0;
  for (const { cat, count, color, label } of items) {
    for (let i = 0; i < count; i++) {
      squares.push({ id: id++, category: cat, color, innerLabel: label });
    }
  }
  return squares;
}

// ── Scenario configs ──────────────────────────────────────────────────────────

const SCENARIOS: Record<ScenarioType, ScenarioConfig> = {
  medical_testing: {
    id: "medical_testing",
    label: "Medical Testing",
    description:
      "Disease prevalence is 1%. A test has 95% sensitivity and 10% false-positive rate. Despite sounding accurate, a positive result only means ~8.8% chance of actually having the disease.",
    tree: MEDICAL_TREE,
    keyResult: {
      formula: "P(Disease | Test+) = P(Disease ∩ Test+) / P(Test+)",
      numerator: "0.01 × 0.95 = 0.0095",
      denominator: "0.0095 + 0.99 × 0.10 = 0.0095 + 0.099 = 0.1085",
      result: "0.0095 / 0.1085 ≈ 0.088 (8.8%)",
      interpretation:
        "Even when the test catches 95% of true cases (its sensitivity), a positive result has only an 8.8% chance of indicating true disease when the condition is rare. The low base rate (1%) creates many false positives that overwhelm the true positives.",
    },
    independencePrefill: {
      pA: 0.01,
      pB: 0.1085,
      pAGivenB: 0.088,
      pALabel: "P(Disease) = 0.01",
      pBLabel: "P(Test+) = 0.1085",
      pAGivenBLabel: "P(Disease | Test+) ≈ 0.088",
    },
    gridSide: 10,
    buildGrid: buildMedicalGrid,
  },
  marbles: {
    id: "marbles",
    label: "Marble Draw",
    description:
      "Drawing 2 marbles without replacement from a bag of 5 red and 3 blue. After drawing red first, the chance of drawing red again drops from 5/8 to 4/7.",
    tree: MARBLE_TREE,
    keyResult: {
      formula: "P(2nd Red | 1st Red) = P(Red₁ ∩ Red₂) / P(Red₁)",
      numerator: "5/8 × 4/7 = 20/56",
      denominator: "5/8",
      result: "(20/56) / (5/8) = 4/7 ≈ 0.571",
      interpretation:
        "After drawing a red marble (and not replacing it), there are only 4 red marbles left in 7 total. The probability drops from 5/8 ≈ 0.625 to 4/7 ≈ 0.571, demonstrating dependent events.",
    },
    independencePrefill: {
      pA: 0.625,
      pB: 0.625,
      pAGivenB: 0.571,
      pALabel: "P(Red on draw 2) ≈ 0.625",
      pBLabel: "P(Red on draw 1) = 5/8 = 0.625",
      pAGivenBLabel: "P(2nd Red | 1st Red) = 4/7 ≈ 0.571",
    },
    gridSide: 8,
    buildGrid: buildMarbleGrid,
  },
  manufacturing: {
    id: "manufacturing",
    label: "Manufacturing Defects",
    description:
      "Factory A makes 40% of items with 5% defect rate. Factory B makes 60% with 3% defect rate. A defective item is slightly more likely from Factory A (52.6%).",
    tree: MANUFACTURING_TREE,
    keyResult: {
      formula: "P(Factory A | Defective) = P(Factory A ∩ Defective) / P(Defective)",
      numerator: "0.4 × 0.05 = 0.020",
      denominator: "0.020 + 0.6 × 0.03 = 0.020 + 0.018 = 0.038",
      result: "0.020 / 0.038 ≈ 0.526 (52.6%)",
      interpretation:
        "Although Factory B produces more items overall, its lower defect rate means a defective item is slightly more likely (52.6% vs 47.4%) to have come from Factory A. Higher volume partially offsets lower defect rate.",
    },
    independencePrefill: {
      pA: 0.4,
      pB: 0.038,
      pAGivenB: 0.526,
      pALabel: "P(Factory A) = 0.4",
      pBLabel: "P(Defective) = 0.038",
      pAGivenBLabel: "P(Factory A | Defective) = 0.526",
    },
    gridSide: 10,
    buildGrid: buildManufacturingGrid,
  },
};

// ── Node → grid filter map ────────────────────────────────────────────────────

function nodeToFilter(nodeId: string, scenario: ScenarioType): GridFilter {
  if (scenario === "medical_testing") {
    if (nodeId === "disease") return "disease_people";
    if (nodeId === "no_disease") return "healthy_people";
    if (nodeId === "d_pos") return "disease_and_positive";
    if (nodeId === "d_neg") return "disease_and_negative";
    if (nodeId === "nd_pos") return "healthy_and_positive";
    if (nodeId === "nd_neg") return "healthy_and_negative";
  }
  if (scenario === "marbles") {
    // marbles use MarbleBagView driven by selectedNodeId — filter is unused
    if (nodeId === "r1" || nodeId === "rr" || nodeId === "rb") return "red_first";
    if (nodeId === "b1" || nodeId === "br" || nodeId === "bb") return "blue_first";
  }
  if (scenario === "manufacturing") {
    if (nodeId === "fa") return "factory_a_items";
    if (nodeId === "fb") return "factory_b_items";
    if (nodeId === "fa_d") return "factory_a_defective";
    if (nodeId === "fa_ok") return "factory_a_ok_items";
    if (nodeId === "fb_d") return "factory_b_defective";
    if (nodeId === "fb_ok") return "factory_b_ok_items";
  }
  return "all";
}

// ── Main client component ─────────────────────────────────────────────────────

const NEXT_GUIDE_SLUG = "bayes-theorem";

function makeInitialState(): State {
  return {
    scenario: "medical_testing",
    selectedNodeId: null,
    gridFilter: "all",
    filterApplied: false,
    independenceInputs: { pA: null, pB: null, pAGivenB: null },
    scenariosViewed: new Set<ScenarioType>(["medical_testing"]),
    sampleSpaceFiltered: 0,
    pathsClicked: 0,
    independenceChecked: false,
  };
}

export default function ConditionalProbabilityClient() {
  const { data: session } = useSession();
  const { card } = useGuideMotion();
  const completionFired = useRef(false);

  const [state, setState] = useState<State>(makeInitialState);
  const [resetKey, setResetKey] = useState(0);

  // Completion check
  const isComplete =
    state.scenariosViewed.size === 3 &&
    state.sampleSpaceFiltered >= 2 &&
    state.pathsClicked >= 1 &&
    state.independenceChecked;

  useEffect(() => {
    if (isComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideSlug: "conditional-probability", score: 100 }),
      }).catch(() => {});
    }
  }, [isComplete, session?.user]);

  const currentScenario = SCENARIOS[state.scenario];

  const squares = useMemo<GridSquare[]>(
    () => currentScenario.buildGrid(),
    [currentScenario]
  );

  const handleScenarioChange = useCallback((id: ScenarioType) => {
    setState((prev) => ({
      ...prev,
      scenario: id,
      selectedNodeId: null,
      gridFilter: "all",
      filterApplied: false,
      scenariosViewed: new Set([...prev.scenariosViewed, id]),
    }));
  }, []);

  const handleNodeClick = useCallback((nodeId: string) => {
    setState((prev) => {
      const filter = nodeToFilter(nodeId, prev.scenario);
      const isNewFilter = filter !== "all" && filter !== prev.gridFilter;
      return {
        ...prev,
        selectedNodeId: nodeId,
        gridFilter: filter,
        filterApplied: filter !== "all",
        sampleSpaceFiltered: isNewFilter ? prev.sampleSpaceFiltered + 1 : prev.sampleSpaceFiltered,
        pathsClicked: prev.pathsClicked + 1,
      };
    });
  }, []);

  const handleIndependenceChecked = useCallback(() => {
    setState((prev) => ({ ...prev, independenceChecked: true }));
  }, []);

  // IndependenceChecker latches its own inputs; bumping resetKey remounts it.
  const handleReset = useCallback(() => {
    setState(makeInitialState());
    setResetKey((k) => k + 1);
  }, []);

  const progress = [
    {
      label: `Scenarios explored: ${state.scenariosViewed.size}/3`,
      done: state.scenariosViewed.size === 3,
    },
    {
      label: `Space filtered: ${Math.min(state.sampleSpaceFiltered, 2)}/2`,
      done: state.sampleSpaceFiltered >= 2,
    },
    {
      label: `Path clicked`,
      done: state.pathsClicked >= 1,
    },
    {
      label: `Independence checked`,
      done: state.independenceChecked,
    },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="conditional-probability" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white">Conditional Probability</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              PROBABILITY
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Conditional Probability{" "}
            <span className="text-[var(--color-accent)]">&amp; Independence</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[680px]">
            When you know Event B happened, how does that change the probability of Event A? Build trees,
            see how conditioning shrinks the sample space, and test if events are truly independent.
          </p>
        </section>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {progress.map(({ label, done }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full transition-colors ${
                  done ? "bg-[#3bb4a4]" : "bg-[#1e293b]"
                }`}
              />
              <span className={`text-[11px] ${done ? "text-white" : "text-[#475569]"}`}>
                {label}
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
              to track progress
            </p>
          )}
          <AnimatePresence>
            {isComplete && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-auto text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1"
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
        </div>

        {/* Scenario Selector */}
        <div className="mb-6">
          <ScenarioSelector
            current={state.scenario}
            visited={state.scenariosViewed}
            onChange={handleScenarioChange}
          />
        </div>

        {/* Main two-column layout */}
        <AnimatePresence mode="wait">
          <motion.div
            key={state.scenario}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Left column: Tree + Calculator + Explanation */}
            <div className="space-y-6">
              {/* Scenario description */}
              <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-1.5">
                  Scenario
                </p>
                <p className="text-[13px] text-white leading-relaxed">
                  {currentScenario.description}
                </p>
              </div>

              {/* Tree builder */}
              <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-4">
                  Probability Tree
                </p>
                <TreeBuilder
                  tree={currentScenario.tree}
                  selectedNodeId={state.selectedNodeId}
                  onNodeClick={handleNodeClick}
                />
              </div>

              {/* Conditional probability calculator */}
              <ConditionalProbabilityCalculator
                scenario={currentScenario}
                selectedNodeId={state.selectedNodeId}
              />

              {/* Explanation panel */}
              <ExplanationPanel
                scenario={state.scenario}
                selectedNodeId={state.selectedNodeId}
              />
            </div>

            {/* Right column: Sample space + Independence */}
            <div className="space-y-6">
              {/* Sample space animator */}
              <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-4">
                  Sample Space
                </p>
                <SampleSpaceAnimator
                  squares={squares}
                  gridSide={currentScenario.gridSide}
                  filter={state.gridFilter}
                  scenario={state.scenario}
                  selectedNodeId={state.selectedNodeId}
                />
              </div>

              {/* Independence checker */}
              <IndependenceChecker
                key={resetKey}
                scenario={currentScenario}
                onChecked={handleIndependenceChecked}
              />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Key concepts summary */}
        <div className="mt-8 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#94a3b8] mb-4">
            Core Concepts
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                term: "Conditional Probability",
                symbol: "P(A|B)",
                def: "The probability of A given that B has already occurred. Conditioning on B restricts the sample space to only events where B is true.",
              },
              {
                term: "Multiplication Rule",
                symbol: "P(A ∩ B) = P(B) × P(A|B)",
                def: "Joint probability equals the probability of B times the conditional probability of A given B. This is what each tree path computes.",
              },
              {
                term: "Independence",
                symbol: "P(A|B) = P(A)",
                def: "Events are independent when knowing B happened gives no information about A. Otherwise they are dependent: knowledge of one updates the other.",
              },
            ].map((c) => (
              <div key={c.term} className="p-3 rounded-xl bg-[#1e293b]/60 border border-[#1e293b]">
                <p className="text-[11px] font-bold text-white mb-0.5">{c.term}</p>
                <p className="text-[10px] font-mono text-[var(--color-accent)] mb-1.5">{c.symbol}</p>
                <p className="text-[11px] text-[#94a3b8] leading-relaxed">{c.def}</p>
              </div>
            ))}
          </div>
        </div>

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
                  You Shrank the Sample Space
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You explored all three scenarios, clicked through the probability
                  trees, watched conditioning filter the sample space, and put
                  independence to the numeric test.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Scenarios explored</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {state.scenariosViewed.size} of 3
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      medical, marbles, manufacturing
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Tree paths clicked</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      {state.pathsClicked}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      each path is a multiplication rule
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Sample-space filters applied
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {state.sampleSpaceFiltered}
                    </p>
                    <p className="text-[10px] text-[#475569] mt-0.5">
                      conditioning in action
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Conditioning on B does not change the world, it changes what
                    you count: the sample space shrinks to where B is true. And when
                    P(A|B) equals P(A), knowing B told you nothing, which is the whole
                    meaning of independence.&quot;
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
              href="/visual-guides/probability-fundamentals"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
            >
              ← Previous: Probability Fundamentals
            </Link>
            <Link
              href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
            >
              Next: Bayes Theorem →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
