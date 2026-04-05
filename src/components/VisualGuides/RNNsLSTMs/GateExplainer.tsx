"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SequenceStep } from "./types";

interface Props {
  currentStep: number;
  sequenceStep: SequenceStep;
}

const GATES = [
  {
    id: "forget",
    label: "Forget Gate",
    emoji: "🗑",
    desc: "Decides what to forget from the previous cell state. A value of 1 means keep everything; 0 means erase completely. This is how LSTMs avoid blindly accumulating all past information.",
    formula: "f = σ(Wf·[h,x] + bf)",
    color: "#ef4444",
    lightColor: "#fca5a5",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
  },
  {
    id: "input",
    label: "Input Gate",
    emoji: "✍",
    desc: "Controls how much new information to write into the cell state. Works together with the cell candidate (tanh) to add selectively filtered new information.",
    formula: "i = σ(Wi·[h,x] + bi),  C̃ = tanh(Wc·[h,x] + bc)",
    color: "#22c55e",
    lightColor: "#86efac",
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.25)",
  },
  {
    id: "output",
    label: "Output Gate",
    emoji: "📤",
    desc: "Determines what part of the cell state to output as the hidden state. The cell state is filtered through tanh and then gated by this output gate.",
    formula: "o = σ(Wo·[h,x] + bo),  h = o⊙tanh(C)",
    color: "#a855f7",
    lightColor: "#d8b4fe",
    bg: "rgba(168,85,247,0.08)",
    border: "rgba(168,85,247,0.25)",
  },
] as const;

export default function GateExplainer({ currentStep, sequenceStep }: Props) {
  const [openGate, setOpenGate] = useState<string | null>("forget");
  const gates = sequenceStep.gateValues;

  const gateValueMap: Record<string, number> = {
    forget: gates?.forget[0] ?? 0,
    input: gates?.input[0] ?? 0,
    output: gates?.output[0] ?? 0,
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-[#475569] mb-1">
        Step {currentStep + 1} — &quot;{sequenceStep.inputToken}&quot; — gate activations
      </p>
      {GATES.map((gate) => {
        const isOpen = openGate === gate.id;
        const val = gateValueMap[gate.id];

        return (
          <div
            key={gate.id}
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: isOpen ? gate.border : "rgba(51,65,85,0.6)" }}
          >
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
              style={{ background: isOpen ? gate.bg : "transparent" }}
              onClick={() => setOpenGate(isOpen ? null : gate.id)}
            >
              {/* Gate activation fill bar */}
              <div className="relative w-10 h-5 bg-[#1e293b] rounded-md overflow-hidden flex-shrink-0">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-md"
                  style={{ background: gate.color }}
                  animate={{ width: `${val * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
                <span
                  className="absolute inset-0 flex items-center justify-center text-[9px] font-bold"
                  style={{ color: "white", textShadow: "0 0 4px rgba(0,0,0,0.8)" }}
                >
                  {val.toFixed(2)}
                </span>
              </div>

              <span className="font-semibold text-sm text-white flex-1">{gate.label}</span>

              <span className="text-[10px]" style={{ color: gate.lightColor }}>
                {val > 0.7 ? "active" : val > 0.4 ? "moderate" : "low"}
              </span>

              <motion.span
                className="text-[#475569] text-xs"
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                ▼
              </motion.span>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-1 flex flex-col gap-2">
                    <p className="text-xs text-[#94a3b8] leading-relaxed">
                      {gate.desc}
                    </p>
                    {/* Formula box */}
                    <div
                      className="rounded-lg px-3 py-2 border"
                      style={{
                        background: "rgba(212,175,55,0.08)",
                        borderColor: "rgba(212,175,55,0.2)",
                      }}
                    >
                      <code className="text-xs font-mono text-[#d4af37]">{gate.formula}</code>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
