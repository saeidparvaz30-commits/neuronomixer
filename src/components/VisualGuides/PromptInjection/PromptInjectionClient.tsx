"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import { DefenseId } from "./types";
import ThreatAnatomy from "./ThreatAnatomy";
import ScenarioExplorer from "./ScenarioExplorer";
import BuilderChecklist from "./BuilderChecklist";

const DEFENSE_IDS_WITH_MITIGATION: DefenseId[] = ["spotlighting", "gating", "combined"];

export default function PromptInjectionClient() {
  const { data: session } = useSession();
  const { fadeUp, card, stagger } = useGuideMotion();

  const [defense, setDefense] = useState<DefenseId>("none");
  const [completedRuns, setCompletedRuns] = useState<Set<DefenseId>>(new Set());
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistOpened, setChecklistOpened] = useState(false);

  const handleRunComplete = useCallback((d: DefenseId) => {
    setCompletedRuns((prev) => {
      if (prev.has(d)) return prev;
      const next = new Set(prev);
      next.add(d);
      return next;
    });
  }, []);

  function handleChecklistToggle() {
    setChecklistOpen((o) => !o);
    setChecklistOpened(true);
  }

  const ranUndefended = completedRuns.has("none");
  const defensesTried = DEFENSE_IDS_WITH_MITIGATION.filter((d) => completedRuns.has(d)).length;
  const isComplete = ranUndefended && defensesTried >= 2 && checklistOpened;

  function handleReset() {
    setDefense("none");
    setCompletedRuns(new Set());
    setChecklistOpen(false);
    setChecklistOpened(false);
  }

  const progressItems = [
    { id: "undefended", label: "Run the undefended scenario", done: ranUndefended },
    { id: "defenses", label: `Try defenses (${Math.min(defensesTried, 2)}/2)`, done: defensesTried >= 2 },
    { id: "checklist", label: "Open the builder checklist", done: checklistOpened },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="prompt-injection" score={4} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">Prompt Injection</span>
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
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Prompt <span className="text-[var(--color-accent)]">Injection</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
            The threat model every agent inherits: anything your model reads can try to steer
            it. Watch a simulated email assistant get tricked, then layer defenses and see
            what actually holds.
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
        </div>

        <div className="space-y-6">
          {/* Sections 1 + 2: root cause, direct vs indirect */}
          <ThreatAnatomy />

          {/* Section 3: centerpiece scenario explorer */}
          <motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={GUIDE_VIEWPORT}>
            <ScenarioExplorer
              defense={defense}
              onDefenseChange={setDefense}
              completedRuns={completedRuns}
              onRunComplete={handleRunComplete}
            />
          </motion.section>

          {/* Section 4: prose panels */}
          <motion.section
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <motion.div variants={fadeUp} className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[13px] font-semibold text-white mb-2">Why filtering alone fails</p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                It is tempting to scan incoming content for phrases like &quot;ignore previous
                instructions&quot; and strip them. But natural language is infinitely
                paraphrasable: the same request can arrive as a polite suggestion, a fake
                system notice, a translation task, or a riddle. A filter matches patterns,
                and an attacker only needs one phrasing the filter has never seen. That is
                why filters belong at best in the outer layers, never as the load-bearing
                defense.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[13px] font-semibold text-white mb-2">What is at stake for agent products</p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                For a chatbot, a successful injection means an embarrassing reply. For an
                agent with tools, it means real consequences: data exfiltration through any
                channel that can send, unwanted actions like deleting files or emailing on
                the user&apos;s behalf, and the reputational damage of explaining to a
                customer why the assistant did it. Unlike a{" "}
                <Link
                  href="/visual-guides/hallucination"
                  className="underline underline-offset-2 text-[#94a3b8] hover:text-white transition-colors"
                >
                  hallucination
                </Link>
                , the model is not confused: it is confidently following instructions,
                just not yours.
              </p>
            </motion.div>
          </motion.section>

          {/* Section 5: builder checklist */}
          <motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={GUIDE_VIEWPORT}>
            <BuilderChecklist open={checklistOpen} onToggle={handleChecklistToggle} />
          </motion.section>

          {/* Research frontier note */}
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="text-[11px] text-[#475569] leading-relaxed max-w-[720px]"
          >
            Research frontier: better instruction-data separation is an active area of work
            across the field, and progress is real, but as of today no technique reliably
            solves prompt injection at the model layer. Build as if some injections will get
            through, and continue with{" "}
            <Link
              href="/visual-guides/ai-safety"
              className="underline underline-offset-2 hover:text-[#94a3b8] transition-colors"
            >
              AI safety
            </Link>{" "}
            for the wider alignment picture.
          </motion.p>
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
                  Threat model acquired
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You watched an undefended agent follow a smuggled instruction, then layered
                  defenses and saw which ones actually hold.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Undefended run", value: "Breached", color: "#ef4444" },
                    { label: "Defense configs tried", value: `${defensesTried} / 3`, color: "#3bb4a4" },
                    { label: "Reliable layer", value: "Action gating", color: "#a855f7" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-[#1e293b] p-3">
                      <p className="text-[10px] text-[#475569] mb-1">{item.label}</p>
                      <p className="text-[14px] font-mono font-bold" style={{ color: item.color }}>
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
                    &quot;You cannot guarantee the model will never be fooled, so build the
                    system so that a fooled model cannot do harm: treat all content as
                    untrusted, and gate every consequential action outside the model.&quot;
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
                    href="/visual-guides/ai-safety"
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
              href="/visual-guides/ai-safety"
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
