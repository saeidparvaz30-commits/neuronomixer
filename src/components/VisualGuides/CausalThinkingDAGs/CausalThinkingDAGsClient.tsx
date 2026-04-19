"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import ScenarioSection from "./ScenarioSection";
import CustomDAGBuilder from "./CustomDAGBuilder";
import { ScenarioId } from "./types";

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
    conceptColor: "#d4af37",
    description: "A hidden variable that causes both treatment and outcome — the most common source of spurious correlation.",
  },
  {
    id: "mediator",
    label: "Mediators",
    shortLabel: "Mediators",
    icon: "→M→",
    conceptColor: "#a855f7",
    description: "A variable on the causal path between treatment and outcome — controls the indirect effect.",
  },
  {
    id: "collider",
    label: "Colliders",
    shortLabel: "Colliders",
    icon: "⟨⟩",
    conceptColor: "#ef4444",
    description: "A variable caused by two others — conditioning on it OPENS a spurious path (collider bias).",
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
      "A Directed Acyclic Graph (DAG) is a causal diagram where nodes represent variables and directed edges (arrows) represent causal relationships. 'Acyclic' means no variable can cause itself — no feedback loops.",
  },
  {
    title: "Why DAGs Matter",
    color: "#3bb4a4",
    content:
      "DAGs make your causal assumptions explicit and testable. They tell you exactly which variables to control for (and which to avoid) to get an unbiased estimate of a causal effect.",
  },
  {
    title: "The Causal Hierarchy",
    color: "#d4af37",
    content:
      "Judea Pearl's causal hierarchy: (1) Association — seeing patterns in data; (2) Intervention — changing variables; (3) Counterfactuals — reasoning about 'what if'. DAGs operate at levels 2 and 3.",
  },
  {
    title: "d-separation",
    color: "#a855f7",
    content:
      "Two variables are d-separated (conditionally independent) if every path between them is blocked by the conditioning set. Confounders block by being conditioned on; colliders block by NOT being conditioned on.",
  },
];

// ── Back-door criterion explainer ─────────────────────────────────────────────

function BackDoorCriterion() {
  return (
    <div className="bg-[#0a0e1a] rounded-2xl border border-[#1e293b] p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/40 flex items-center justify-center shrink-0">
          <span className="text-[#d4af37] text-sm font-bold">⊗</span>
        </div>
        <h3 className="text-base font-bold text-white">The Back-Door Criterion</h3>
      </div>
      <p className="text-sm text-[#94a3b8] leading-relaxed">
        To estimate the causal effect of <strong className="text-white">X → Y</strong>, you need to block all{" "}
        <em className="text-[#d4af37]">back-door paths</em> — paths that go from X to Y via arrows entering X.
        A valid adjustment set <strong className="text-white">Z</strong> satisfies:
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          {
            rule: "Rule 1",
            text: "Z blocks all back-door paths from X to Y",
            color: "#10b981",
          },
          {
            rule: "Rule 2",
            text: "Z contains no descendant of X (no mediators or colliders on the causal path)",
            color: "#10b981",
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
  const completionFired = useRef(false);
  const [activeTab, setActiveTab] = useState<TabId>("confounder");
  const [scenariosExplored, setScenariosExplored] = useState<Set<ScenarioId>>(new Set());

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
    <div className="min-h-screen bg-[#0f172a] text-white">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-2 text-sm text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">
            Visual Guides
          </Link>
          <span className="text-[#334155]">/</span>
          <span className="text-white">Causal Thinking: Confounders, Mediators &amp; DAGs</span>
        </nav>

        {/* ── Hero ── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#d4af37]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#d4af37]">
              Unit 12: Experimental Design
            </span>
            <span className="w-6 h-px bg-[#d4af37]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-4">
            Causal Thinking:{" "}
            <span className="text-[#d4af37]">Confounders, Mediators &amp; DAGs</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-2xl mb-6">
            Correlation isn&apos;t causation — but how do you figure out what actually causes what?
            Directed Acyclic Graphs (DAGs) give you a rigorous visual language for causal reasoning.
            Explore the three fundamental variable types and see how controlling the wrong variable
            can introduce — not remove — bias.
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-10"
        >
          <h2 className="text-xl font-bold text-white mb-4">
            From Correlation to Causation
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {CONCEPT_CARDS.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.12 + i * 0.06 }}
                className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 space-y-2"
              >
                <div
                  className="w-1 h-6 rounded-full mb-3"
                  style={{ backgroundColor: card.color }}
                />
                <h3 className="text-sm font-bold text-white">{card.title}</h3>
                <p className="text-xs text-[#94a3b8] leading-relaxed">{card.content}</p>
              </motion.div>
            ))}
          </div>
          <BackDoorCriterion />
        </motion.section>

        {/* ── Scenario tabs ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6"
        >
          <h2 className="text-xl font-bold text-white mb-4">
            Interactive Scenarios
          </h2>

          {/* Tab bar */}
          <div className="flex gap-2 flex-wrap mb-2">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const isExplored =
                tab.id !== "build" && scenariosExplored.has(tab.id as ScenarioId);
              return (
                <button
                  key={tab.id}
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
          <p className="text-xs text-[#64748b] italic mb-5">{activeTabMeta.description}</p>

          {/* Tab content */}
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
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
                  'Controlling for a mediator blocks the indirect causal effect. Your estimate becomes "direct effect only" — which is valid only if that\'s your goal.',
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
                  <span className="text-xs text-[#64748b]">{card.fix}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Key Takeaways ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-[#0a0e1a] rounded-2xl border border-[#d4af37]/20 p-6 space-y-3 mb-8"
        >
          <h2 className="text-lg font-bold text-[#d4af37]">Key Takeaways</h2>
          <ul className="space-y-2.5 text-sm text-[#94a3b8]">
            <li className="flex gap-2">
              <span className="text-[#d4af37] font-bold shrink-0">1.</span>
              A <strong className="text-white">confounder</strong> causes both treatment and outcome — it must be controlled to remove spurious correlations.
            </li>
            <li className="flex gap-2">
              <span className="text-[#d4af37] font-bold shrink-0">2.</span>
              A <strong className="text-white">mediator</strong> lies on the causal path — controlling it gives you the direct effect only (and blocks the indirect effect).
            </li>
            <li className="flex gap-2">
              <span className="text-[#d4af37] font-bold shrink-0">3.</span>
              A <strong className="text-white">collider</strong> is caused by two variables — conditioning on it OPENS a spurious path between its causes.
            </li>
            <li className="flex gap-2">
              <span className="text-[#d4af37] font-bold shrink-0">4.</span>
              Draw the DAG <em>before</em> choosing your adjustment set. Use the{" "}
              <strong className="text-white">back-door criterion</strong> to find the minimal sufficient set.
            </li>
            <li className="flex gap-2">
              <span className="text-[#d4af37] font-bold shrink-0">5.</span>
              Selection bias, publication bias, and survivor bias are all examples of{" "}
              <strong className="text-white">collider conditioning</strong> in disguise.
            </li>
          </ul>
        </motion.section>

        {/* ── Completion banner ── */}
        <AnimatePresence>
          {isComplete && session?.user && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-8 rounded-2xl border border-[#3bb4a4]/40 bg-[#3bb4a4]/5 p-5 flex items-center gap-4"
            >
              <span className="text-2xl">🎯</span>
              <div>
                <p className="text-sm font-bold text-white">Guide Complete!</p>
                <p className="text-xs text-[#94a3b8]">
                  You&apos;ve explored all three causal structures. Progress saved.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
              className="shrink-0 bg-[#d4af37] text-[#0a0e1a] rounded-xl font-semibold hover:opacity-90 px-5 py-2.5 text-sm transition-opacity"
            >
              Sign in
            </Link>
          </div>
        )}

        {/* ── Navigation ── */}
        <div className="flex items-center justify-between pt-6 border-t border-[#1e293b]">
          <Link
            href="/visual-guides/sources-of-bias"
            className="text-sm text-[#94a3b8] hover:text-white transition-colors"
          >
            ← Sources of Bias
          </Link>
          <Link
            href="/visual-guides"
            className="text-sm px-4 py-2 rounded-lg bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/30 hover:bg-[#d4af37]/20 transition-colors"
          >
            All Guides →
          </Link>
        </div>
      </div>
    </div>
  );
}
