"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import type { ScenarioId } from "./types";
import { SCENARIOS } from "./scenarios";
import ScenarioToggle from "./ScenarioToggle";
import TraceExplorer from "./TraceExplorer";
import ToolSchemaCard from "./ToolSchemaCard";
import ComparisonPanel from "./ComparisonPanel";
import FailureModesPanel from "./FailureModesPanel";

const GUIDE_TITLE = "Tool Use & Function Calling";

const WHY_TOOLS = [
  {
    title: "Frozen knowledge",
    color: "#3bb4a4",
    body: "An LLM's knowledge stops at its training cutoff. It cannot know today's weather, prices, or news. A tool call fetches the current fact and puts it in the context.",
  },
  {
    title: "Unreliable arithmetic",
    color: "#a855f7",
    body: "LLMs predict tokens, they do not compute. Long multiplications and precise sums come out wrong often enough to matter. A calculator tool returns the exact answer every time.",
  },
  {
    title: "No hands",
    color: "#1e5d8a",
    body: "Text generation cannot send an email, query a database, or book a meeting. Tools are how a model's decision becomes an action your code performs on its behalf.",
  },
] as const;

const AGENT_LOOP_PSEUDO = `messages = [user_request]
loop:
  response = model(messages, tools)
  if response.tool_calls:
    results = execute(response.tool_calls)   # your code runs here
    messages += response.tool_calls + results
  else:
    return response.text                     # final answer`;

export default function ToolUseFunctionCallingClient() {
  const { fadeUp, card } = useGuideMotion();

  const [scenarioId, setScenarioId] = useState<ScenarioId>("weather");
  const [step, setStep] = useState(0);
  const [viewed, setViewed] = useState<Set<ScenarioId>>(new Set(["weather"]));
  const [fullTraceDone, setFullTraceDone] = useState(false);
  const [failuresRead, setFailuresRead] = useState(false);

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
  const secondScenarioViewed = viewed.size >= 2;
  const isComplete = fullTraceDone && secondScenarioViewed && failuresRead;

  function handleScenarioChange(id: ScenarioId) {
    setScenarioId(id);
    setStep(0);
    setViewed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  function handleAdvance() {
    setStep((s) => {
      const next = Math.min(s + 1, scenario.steps.length - 1);
      if (next === scenario.steps.length - 1) setFullTraceDone(true);
      return next;
    });
  }

  function handleReset() {
    setScenarioId("weather");
    setStep(0);
    setViewed(new Set(["weather"]));
    setFullTraceDone(false);
    setFailuresRead(false);
  }

  const progressItems = [
    { id: "trace", label: "Step through a full trace", done: fullTraceDone },
    {
      id: "scenarios",
      label: `View a second scenario (${Math.min(viewed.size, 2)}/2)`,
      done: secondScenarioViewed,
    },
    { id: "failures", label: "Open failure modes", done: failuresRead },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion
        isComplete={isComplete}
        guideSlug="tool-use-function-calling"
        score={5}
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
              LLMs
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Tool Use &amp;{" "}
            <span className="text-[var(--color-accent)]">Function Calling</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
            The model never executes anything. It emits a structured request, your code runs
            it, and the result flows back into the conversation. Step through the loop and see
            exactly who does what.
          </p>
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
        </div>

        <div className="space-y-6">
          {/* Why tools */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
          >
            <p className="text-[13px] font-semibold text-white mb-1">
              Why a language model needs tools
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[640px]">
              A{" "}
              <Link
                href="/visual-guides/what-is-llm"
                className="underline underline-offset-2 text-[#93c5fd] hover:text-white transition-colors"
              >
                large language model
              </Link>{" "}
              is a next-token predictor. Three gaps follow from that, and tools close all
              three.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {WHY_TOOLS.map(({ title, color, body }) => (
                <div key={title} className="rounded-xl border border-[#1e293b] p-4">
                  <p className="text-[11px] font-semibold mb-2" style={{ color }}>
                    {title}
                  </p>
                  <p className="text-[11.5px] text-[#94a3b8] leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Tool contract */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
          >
            <ToolSchemaCard />
          </motion.section>

          {/* Trace explorer */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
          >
            <div className="mb-3">
              <p className="text-[13px] font-semibold text-white mb-1">
                Trace explorer: watch one tool call happen
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed max-w-[640px]">
                Pick a scenario, then advance one message at a time. Each trace is a fixed,
                hand-authored example (labeled as simulated), showing the four messages every
                major native function-calling API exchanges.
              </p>
            </div>
            <div className="mb-4">
              <ScenarioToggle
                scenarios={SCENARIOS}
                active={scenarioId}
                onChange={handleScenarioChange}
              />
            </div>
            <TraceExplorer
              scenario={scenario}
              currentStep={step}
              onAdvance={handleAdvance}
              onRestart={() => setStep(0)}
            />
          </motion.section>

          {/* Comparison */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
          >
            <ComparisonPanel />
          </motion.section>

          {/* Agent loop */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6"
          >
            <p className="text-[13px] font-semibold text-white mb-1">
              From one call to an agent: the loop
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[640px]">
              Everything you stepped through above was one iteration. Put it in a while-loop
              and you have an agent: the model keeps requesting tools until it can answer, and
              the conversation itself is the agent&apos;s state. That is the whole trick behind{" "}
              <Link
                href="/visual-guides/ai-agents"
                className="underline underline-offset-2 text-[#93c5fd] hover:text-white transition-colors"
              >
                AI agents
              </Link>
              .
            </p>
            <pre className="rounded-xl bg-[#1e293b]/60 font-mono text-[11.5px] text-[#93c5fd] p-4 overflow-x-auto mb-4">
              {AGENT_LOOP_PSEUDO}
            </pre>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed max-w-[640px]">
              Modern APIs also support parallel tool calls: the model can request several
              independent calls in a single turn, such as the weather for three cities at
              once, and the runtime executes them concurrently and returns all results
              together.
            </p>
          </motion.section>

          {/* Failure modes */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
          >
            <FailureModesPanel
              opened={failuresRead}
              onOpened={() => setFailuresRead(true)}
            />
          </motion.section>
        </div>

        {/* Completion card */}
        {isComplete && (
          <motion.div
            variants={card}
            initial="hidden"
            animate="visible"
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
                You closed the loop
              </h2>
              <p className="text-sm text-[#94a3b8] mt-1">
                You stepped through the full request, call, result, answer cycle and read what
                it takes to run it safely.
              </p>
            </div>

            <div className="px-6 py-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {[
                  {
                    label: "Scenarios viewed",
                    value: `${viewed.size} / ${SCENARIOS.length}`,
                    color: "#3bb4a4",
                  },
                  { label: "Full trace", value: "Stepped through", color: "#a855f7" },
                  {
                    label: "Safeguards",
                    value: "Read",
                    color: "var(--color-accent)",
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">{item.label}</p>
                    <p
                      className="text-[14px] font-mono font-bold"
                      style={{ color: item.color }}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                  Key Takeaway
                </p>
                <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                  &quot;The model never runs anything. It only asks. Your runtime validates,
                  executes, and reports back, and that separation is where all the safety
                  lives.&quot;
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
                  href="/visual-guides/ai-agents"
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity"
                >
                  Next Guide →
                </Link>
              </div>
            </div>
          </motion.div>
        )}

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
              href="/visual-guides/ai-agents"
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
