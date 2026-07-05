"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import ScenarioSection from "./ScenarioSection";
import CustomDAGBuilder from "./CustomDAGBuilder";
import { ScenarioId } from "./types";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";

const GUIDE_TITLE = "Causal Thinking: Confounders, Mediators & DAGs";
const NEXT_GUIDE_SLUG = "time-series-forecasting";

// ── Tab definitions ────────────────────────────────────────────────────────────

type TabId = ScenarioId | "build";

interface Tab {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: string;
  conceptColor: string;
  description: string;
}

const TABS: Tab[] = [
  {
    id: "confounder",
    label: "Confounders",
    shortLabel: "Confounders",
    icon: "⟨C⟩",
    conceptColor: "#d4af37", // raw hex kept: concatenated with alpha suffixes below
    description: "A hidden variable that causes both treatment and outcome: the most common source of spurious correlation.",
  },
  {
    id: "mediator",
    label: "Mediators",
    shortLabel: "Mediators",
    icon: "→M→",
    conceptColor: "#a855f7",
    description: "A variable on the causal path between treatment and outcome: controls the indirect effect.",
  },
  {
    id: "collider",
    label: "Colliders",
    shortLabel: "Colliders",
    icon: "⟨⟩",
    conceptColor: "#ef4444",
    description: "A variable caused by two others: conditioning on it OPENS a spurious path (collider bias).",
  },
  {
    id: "build",
    label: "Build Your Own",
    shortLabel: "Build",
    icon: "✏",
    conceptColor: "#3bb4a4",
    description: "Create your own directed acyclic graph from scratch.",
  },
];

// ── Concept intro cards ────────────────────────────────────────────────────────

const CONCEPT_CARDS = [
  {
    title: "What is a DAG?",
    color: "#1e5d8a",
    content:
      "A Directed Acyclic Graph (DAG) is a causal diagram where nodes represent variables and directed edges (arrows) represent causal relationships. 'Acyclic' means no variable can cause itself: no feedback loops.",
  },
  {
    title: "Why DAGs Matter",
    color: "#3bb4a4",
    content:
      "DAGs make your causal assumptions explicit and testable. They tell you exactly which variables to control for (and which to avoid) to get an unbiased estimate of a causal effect.",
  },
  {
    title: "The Causal Hierarchy",
    color: "var(--color-accent)",
    content:
      "Judea Pearl's causal hierarchy: (1) Association: seeing patterns in data; (2) Intervention: predicting what happens if you change a variable; (3) Counterfactuals: reasoning about 'what would have happened'. A causal DAG plus the right adjustments lets you answer level-2 questions from observational data; level 3 needs stronger assumptions (structural equations).",
  },
  {
    title: "d-separation",
    color: "#a855f7",
    content:
      "Two variables are d-separated by a conditioning set Z if every path between them is blocked. A chain or fork node (like a confounder) blocks its path when it IS in Z; a collider blocks its path when neither it nor any of its descendants is in Z. d-separation implies conditional independence in every distribution compatible with the DAG.",
  },
];

// ── Back-door criterion explainer ─────────────────────────────────────────────

function BackDoorCriterion() {
  return (
    <div className="bg-[#0a0e1a] rounded-2xl border border-[#1e293b] p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/40 flex items-center justify-center shrink-0">
          <span className="text-[var(--color-accent)] text-sm font-bold">⊗</span>
        </div>
        <h3 className="text-base font-bold text-white">The Back-Door Criterion</h3>
      </div>
      <p className="text-sm text-[#94a3b8] leading-relaxed">
        To estimate the causal effect of <strong className="text-white">X → Y</strong>, you need to block all{" "}
        <em className="text-[var(--color-accent)]">back-door paths</em>: paths that go from X to Y via arrows entering X.
        A valid adjustment set <strong className="text-white">Z</strong> satisfies:
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          {
            rule: "Rule 1",
            text: "Z blocks all back-door paths from X to Y",
            color: "var(--color-success)",
          },
          {
            rule: "Rule 2",
            text: "Z contains no descendant of X (no mediators or colliders on the causal path)",
            color: "var(--color-success)",
          },
        ].map((r) => (
          <div
            key={r.rule}
            className="flex items-start gap-2.5 bg-[#1e293b]/60 rounded-xl p-3 border border-[#334155]/50"
          >
            <span
              className="text-xs font-bold shrink-0 mt-0.5"
              style={{ color: r.color }}
            >
              {r.rule}
            </span>
            <span className="text-xs text-[#94a3b8]">{r.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CausalThinkingDAGsClient() {
  const { data: session } = useSession();
  const { fadeUp, fadeIn, stagger, card } = useGuideMotion();
  const completionFired = useRef(false);
  const [activeTab, setActiveTab] = useState<TabId>("confounder");
  const [scenariosExplored, setScenariosExplored] = useState<Set<ScenarioId>>(new Set());

  function handleResetGuide() {
    setActiveTab("confounder");
    setScenariosExplored(new Set<ScenarioId>(["confounder"]));
    completionFired.current = false;
  }

  // Mark a scenario as explored when its tab is first clicked
  function selectTab(id: TabId) {
    setActiveTab(id);
    if (id !== "build") {
      setScenariosExplored((prev) => {
        const next = new Set(prev);
        next.add(id as ScenarioId);
        return next;
      });
    }
  }

  // Also mark the initial tab as explored on mount
  useEffect(() => {
    setScenariosExplored(new Set<ScenarioId>(["confounder"]));
  }, []);

  const isComplete = scenariosExplored.size >= 3;

  useEffect(() => {
    if (isComplete && !completionFired.current) {
      completionFired.current = true;
      if (session?.user) {
        fetch("/api/visual-guides/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guideSlug: "causal-thinking-dags", score: 100 }),
        }).catch(() => {});
      }
    }
  }, [isComplete, session?.user]);

  const activeTabMeta = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="causal-thinking-dags" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* ── Breadcrumb ── */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">{GUIDE_TITLE}</span>
        </nav>

        {/* ── Hero ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Unit 12: Experimental Design
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-4">
            Causal Thinking:{" "}
            <span className="text-[var(--color-accent)]">Confounders, Mediators &amp; DAGs</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px] mb-6">
            Correlation isn&apos;t causation, but how do you figure out what actually causes what?
            Directed Acyclic Graphs (DAGs) give you a rigorous visual language for causal reasoning.
            Explore the three fundamental variable types and see how controlling the wrong variable
            can introduce bias instead of removing it.
          </p>

          {/* Progress tracker */}
          <div className="flex items-center gap-4 flex-wrap">
            {(["confounder", "mediator", "collider"] as ScenarioId[]).map((id) => {
              const tab = TABS.find((t) => t.id === id)!;
              const done = scenariosExplored.has(id);
              return (
                <div key={id} className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full transition-all duration-300"
                    style={{ backgroundColor: done ? tab.conceptColor : "#1e293b" }}
                  />
                  <span
                    className="text-[11px] transition-colors duration-300"
                    style={{ color: done ? "#94a3b8" : "#475569" }}
                  >
                    {tab.label}
                  </span>
                </div>
              );
            })}
            {!session?.user && (
              <p className="text-[11px] text-[#475569] ml-auto">
                <Link href="/auth/sign-in" className="underline underline-offset-2 hover:text-[#94a3b8]">
                  Sign in
                </Link>{" "}
                to track progress
              </p>
            )}
            <AnimatePresence>
              {isComplete && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="ml-auto text-[11px] font-bold text-[#3bb4a4] bg-[#3bb4a4]/10 border border-[#3bb4a4]/30 px-3 py-1 rounded-full"
                >
                  All scenarios explored!
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* ── Intro: Correlation vs Causation ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-10"
        >
          <h2 className="text-xl font-bold text-white mb-4">
            From Correlation to Causation
          </h2>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
          >
            {CONCEPT_CARDS.map((c) => (
              <motion.div
                key={c.title}
                variants={card}
                className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-2"
              >
                <div
                  className="w-1 h-6 rounded-full mb-3"
                  style={{ backgroundColor: c.color }}
                />
                <h3 className="text-sm font-bold text-white">{c.title}</h3>
                <p className="text-xs text-[#94a3b8] leading-relaxed">{c.content}</p>
              </motion.div>
            ))}
          </motion.div>
          <BackDoorCriterion />
        </motion.section>

        {/* ── Scenario tabs ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-6"
        >
          <h2 className="text-xl font-bold text-white mb-4">
            Interactive Scenarios
          </h2>

          {/* Tab bar */}
          <div className="flex gap-2 flex-wrap mb-2" role="radiogroup" aria-label="Causal scenario">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const isExplored =
                tab.id !== "build" && scenariosExplored.has(tab.id as ScenarioId);
              return (
                <button
                  key={tab.id}
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => selectTab(tab.id)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    isActive
                      ? "border-opacity-60 text-white"
                      : "bg-[#0f172a] border-[#1e293b] text-[#94a3b8] hover:text-white hover:border-[#334155]"
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor: tab.conceptColor + "18",
                          borderColor: tab.conceptColor + "66",
                          color: "white",
                        }
                      : undefined
                  }
                >
                  <span className="font-mono text-xs opacity-70">{tab.icon}</span>
                  <span>{tab.shortLabel}</span>
                  {isExplored && !isActive && (
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: tab.conceptColor }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab description */}
          <p className="text-xs text-[#475569] italic mb-5">{activeTabMeta.description}</p>

          {/* Tab content */}
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                {activeTab === "build" ? (
                  <CustomDAGBuilder />
                ) : (
                  <ScenarioSection scenarioId={activeTab as ScenarioId} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.section>

        {/* ── Common Mistakes ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-8"
        >
          <h2 className="text-xl font-bold text-white mb-4">Common Causal Mistakes</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                title: "Over-adjusting",
                icon: "⊘",
                color: "#ef4444",
                description:
                  "Adding too many controls can block causal paths or open collider paths, introducing bias instead of removing it.",
                fix: "Use a DAG to identify the minimal sufficient adjustment set.",
              },
              {
                title: "Adjusting for mediators",
                icon: "→M→",
                color: "#a855f7",
                description:
                  'Controlling for a mediator blocks the indirect causal effect. Your estimate becomes "direct effect only", which is valid only if that\'s your goal.',
                fix: "Explicitly decide: do you want total effect or direct effect?",
              },
              {
                title: "Collider conditioning",
                icon: "✕",
                color: "#ef4444",
                description:
                  "Selecting on a collider (e.g., studying only successful people) creates spurious correlations between its causes, even if they are truly independent.",
                fix: "Never condition on a collider unless you use bias-correction methods.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-[#0a0e1a] rounded-2xl border border-[#1e293b] p-5 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      backgroundColor: card.color + "22",
                      color: card.color,
                      border: `1px solid ${card.color}44`,
                    }}
                  >
                    {card.icon}
                  </div>
                  <h3 className="text-sm font-bold text-white">{card.title}</h3>
                </div>
                <p className="text-xs text-[#94a3b8] leading-relaxed">{card.description}</p>
                <div className="flex items-start gap-1.5 pt-1">
                  <span className="text-[#3bb4a4] text-xs font-bold shrink-0">Fix:</span>
                  <span className="text-xs text-[#475569]">{card.fix}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Key Takeaways ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="bg-[#0a0e1a] rounded-2xl border border-[#d4af37]/20 p-6 space-y-3 mb-8"
        >
          <h2 className="text-lg font-bold text-[var(--color-accent)]">Key Takeaways</h2>
          <ul className="space-y-2.5 text-sm text-[#94a3b8]">
            <li className="flex gap-2">
              <span className="text-[var(--color-accent)] font-bold shrink-0">1.</span>
              A <strong className="text-white">confounder</strong> causes both treatment and outcome; it must be controlled to remove spurious correlations.
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--color-accent)] font-bold shrink-0">2.</span>
              A <strong className="text-white">mediator</strong> lies on the causal path; controlling it gives you the direct effect only (and blocks the indirect effect).
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--color-accent)] font-bold shrink-0">3.</span>
              A <strong className="text-white">collider</strong> is caused by two variables; conditioning on it OPENS a spurious path between its causes.
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--color-accent)] font-bold shrink-0">4.</span>
              Draw the DAG <em>before</em> choosing your adjustment set. Use the{" "}
              <strong className="text-white">back-door criterion</strong> to find the minimal sufficient set.
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--color-accent)] font-bold shrink-0">5.</span>
              Selection bias, publication bias, and survivor bias are all examples of{" "}
              <strong className="text-white">collider conditioning</strong> in disguise.
            </li>
          </ul>
        </motion.section>

        {/* ── Sign-in prompt ── */}
        {!session?.user && (
          <div className="mb-8 rounded-2xl border border-[#1e293b] bg-[#0a0e1a] p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-white">Save your progress</p>
              <p className="text-xs text-[#94a3b8]">
                Sign in to track which visual guides you&apos;ve completed.
              </p>
            </div>
            <Link
              href="/auth/sign-in"
              className="shrink-0 bg-[var(--color-accent)] text-[#0a0e1a] rounded-xl font-semibold hover:opacity-90 px-5 py-2.5 text-sm transition-opacity"
            >
              Sign in
            </Link>
          </div>
        )}

        {/* ── Completion card ── */}
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
                  Causal Structures Explored!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You worked through confounders, mediators, and colliders, and saw what conditioning does to each.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Scenarios explored</p>
                    <p className="text-[14px] font-mono font-bold text-[#3bb4a4]">
                      {scenariosExplored.size} / 3
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Key tool</p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">Back-door criterion</p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">Bonus</p>
                    <p className="text-[14px] font-mono font-bold text-white">Build-your-own DAG</p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Controlling for a variable is not automatically safe. Draw the DAG first: control confounders, leave mediators alone when you want the total effect, and never condition on a collider.&quot;
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
                    onClick={handleResetGuide}
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

        {/* ── Footer nav (pre-completion) ── */}
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
