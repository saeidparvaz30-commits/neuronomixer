"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuideMotion } from "@/lib/guideMotion";
import {
  AGENT_TOOLS,
  DEFENSES,
  DefenseId,
  EMAILS,
  SCENARIO_RUNS,
  ScenarioStep,
  StepTone,
} from "./types";
import DefenseToggle from "./DefenseToggle";

const TONE_STYLES: Record<StepTone, { border: string; label: string }> = {
  neutral: { border: "#1e293b", label: "#94a3b8" },
  danger: { border: "#ef4444", label: "#ef4444" },
  warning: { border: "var(--color-warning)", label: "var(--color-warning)" },
  success: { border: "var(--color-success)", label: "var(--color-success)" },
};

const ACTOR_LABEL: Record<ScenarioStep["actor"], string> = {
  user: "You",
  agent: "Agent",
  tool: "Tool",
  guard: "System",
};

type Props = {
  defense: DefenseId;
  onDefenseChange: (d: DefenseId) => void;
  completedRuns: ReadonlySet<DefenseId>;
  onRunComplete: (d: DefenseId) => void;
};

function ScenarioExplorerInner({ defense, onDefenseChange, completedRuns, onRunComplete }: Props) {
  const { fadeUp } = useGuideMotion();
  // Steps revealed, tagged with the defense they belong to so a defense switch
  // resets the count synchronously (no stale read crediting an unwatched run).
  const [progress, setProgress] = useState<{ defense: DefenseId; n: number }>({
    defense,
    n: 0,
  });

  const steps = SCENARIO_RUNS[defense];
  const meta = DEFENSES.find((d) => d.id === defense)!;
  const revealed = progress.defense === defense ? progress.n : 0;
  const finished = revealed >= steps.length;

  useEffect(() => {
    if (finished) onRunComplete(defense);
  }, [finished, defense, onRunComplete]);

  function advance() {
    setProgress((p) => {
      const base = p.defense === defense ? p.n : 0;
      return { defense, n: Math.min(steps.length, base + 1) };
    });
  }

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6">
      {/* Header + simulation label */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[13px] font-semibold text-white">
            Email assistant under attack
          </p>
          <p className="text-[11px] text-[#475569] mt-0.5 max-w-[520px]">
            An assistant with three tools processes an inbox where one message hides an
            embedded instruction. Toggle defenses and replay the outcome.
          </p>
        </div>
        <span
          className="text-[10px] font-semibold uppercase tracking-[1.5px] px-3 py-1 rounded-full border"
          style={{
            color: "var(--color-warning)",
            borderColor: "var(--color-warning)",
            background: "#f9731610",
          }}
        >
          Simulated scenario
        </span>
      </div>
      <p className="text-[11px] text-[#475569] mb-5">
        Every transcript below is an authored simulation for defensive education. No live
        model is called, and outcomes are illustrative of typical behavior, not measurements.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* LEFT: inbox + tools */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-2">
              Simulated inbox
            </p>
            <div className="space-y-2">
              {EMAILS.map((em) => (
                <div key={em.id} className="rounded-xl border border-[#1e293b] bg-[#162032] p-3">
                  <p className="text-[11px] font-semibold text-white truncate">{em.subject}</p>
                  <p className="text-[10px] text-[#475569] mb-1.5 truncate">{em.from}</p>
                  <p className="text-[11px] text-[#94a3b8] leading-relaxed">{em.body}</p>
                  {em.injectedLine && (
                    <div className="mt-2 rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 p-2">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-[#ef4444] mb-1">
                        Hidden in the message body
                      </p>
                      <p className="text-[11px] font-mono text-[#ef4444] leading-relaxed break-words">
                        {em.injectedLine}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-2">
              Agent tools
            </p>
            <div className="space-y-1.5">
              {AGENT_TOOLS.map((t) => (
                <div
                  key={t.name}
                  className="flex items-center justify-between rounded-lg border border-[#1e293b] px-3 py-2"
                >
                  <span className="text-[11px] font-mono text-[#93c5fd]">{t.name}</span>
                  <span
                    className="text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                    style={
                      t.consequential
                        ? { color: "#ef4444", background: "#ef444418" }
                        : { color: "#94a3b8", background: "#1e293b" }
                    }
                  >
                    {t.consequential ? "Consequential" : "Read-only"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: defenses + transcript */}
        <div className="lg:col-span-3 space-y-4">
          <div>
            <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-2">
              Defense configuration
            </p>
            <DefenseToggle active={defense} completedRuns={completedRuns} onChange={onDefenseChange} />
            <p className="text-[11px] text-[#94a3b8] mt-2">{meta.short}</p>
          </div>

          {/* Illustrative risk meter */}
          <div className="rounded-xl border border-[#1e293b] p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#475569]">
                Residual risk (illustrative)
              </p>
              <p className="text-[10px] text-[#475569]">{meta.riskLabel}</p>
            </div>
            <div className="flex gap-1" role="img" aria-label={`Illustrative residual risk with ${meta.label}: ${meta.riskLabel}`}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-1.5 flex-1 rounded-full transition-colors"
                  style={{
                    background:
                      i < meta.riskLevel + 1
                        ? meta.riskLevel >= 2
                          ? "#ef4444"
                          : meta.riskLevel === 1
                            ? "var(--color-warning)"
                            : "var(--color-success)"
                        : "#1e293b",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Transcript */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide">
                Replay transcript
              </p>
              <p className="text-[10px] text-[#475569]" aria-live="polite">
                Step {revealed} of {steps.length}
              </p>
            </div>

            <div className="space-y-2 min-h-[120px]">
              {revealed === 0 && (
                <div className="rounded-xl border border-[#334155] border-dashed p-4 text-center">
                  <p className="text-[11px] text-[#475569]">
                    Press &quot;Run scenario&quot; to step through what the simulated agent does
                    with the current defenses.
                  </p>
                </div>
              )}
              <AnimatePresence initial={false}>
                {steps.slice(0, revealed).map((step, i) => {
                  const tone = TONE_STYLES[step.tone];
                  return (
                    <motion.div
                      key={`${defense}-${i}`}
                      variants={fadeUp}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      className="rounded-xl border bg-[#162032] p-3"
                      style={{ borderColor: tone.border }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#1e293b] text-[#94a3b8]">
                          {ACTOR_LABEL[step.actor]}
                        </span>
                        <p className="text-[11px] font-semibold" style={{ color: tone.label }}>
                          {step.title}
                        </p>
                      </div>
                      <p className="text-[11px] text-[#94a3b8] leading-relaxed">{step.text}</p>
                      {step.showsInjection && (
                        <p className="mt-2 text-[11px] font-mono text-[#ef4444] leading-relaxed break-words rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 p-2">
                          {EMAILS[1].injectedLine}
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {!finished ? (
                <button
                  onClick={advance}
                  className="px-4 py-2 rounded-xl text-[12px] font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
                >
                  {revealed === 0 ? "Run scenario" : "Next step"}
                </button>
              ) : (
                <button
                  onClick={() => setProgress({ defense, n: 0 })}
                  className="px-4 py-2 rounded-xl text-[12px] font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
                >
                  Replay this configuration
                </button>
              )}
              {finished && (
                <p className="text-[11px]" style={{ color: TONE_STYLES[steps[steps.length - 1].tone].label }}>
                  {meta.honestNote}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const ScenarioExplorer = React.memo(ScenarioExplorerInner);
export default ScenarioExplorer;
