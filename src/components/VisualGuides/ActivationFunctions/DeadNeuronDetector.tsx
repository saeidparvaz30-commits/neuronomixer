"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FunctionId, NeuronState } from "./types";

// Simulated activation counts — some neurons have low counts ("dead")
const INITIAL_NEURONS: NeuronState[] = [
  { id: 0, activationCount: 48 },
  { id: 1, activationCount: 3 },  // dead
  { id: 2, activationCount: 52 },
  { id: 3, activationCount: 1 },  // dead
  { id: 4, activationCount: 44 },
  { id: 5, activationCount: 39 },
  { id: 6, activationCount: 2 },  // dead
  { id: 7, activationCount: 31 },
];

const DEAD_THRESHOLD = 5;

interface DeadNeuronDetectorProps {
  functionId: FunctionId;
}

export default function DeadNeuronDetector({
  functionId,
}: DeadNeuronDetectorProps) {
  const [neurons, setNeurons] = useState<NeuronState[]>(INITIAL_NEURONS);
  const [isSimulating, setIsSimulating] = useState(false);
  const [step, setStep] = useState(0);

  // Reset when function changes
  useEffect(() => {
    setNeurons(INITIAL_NEURONS);
    setIsSimulating(false);
    setStep(0);
  }, [functionId]);

  function runSimulation() {
    setIsSimulating(true);
    setStep(0);
    setNeurons(
      INITIAL_NEURONS.map((n) => ({
        ...n,
        activationCount: n.activationCount < DEAD_THRESHOLD ? 0 : n.activationCount,
      }))
    );

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      setStep(currentStep);
      setNeurons((prev) =>
        prev.map((n) => {
          if (n.activationCount < DEAD_THRESHOLD) return n; // stays dead
          const bump = Math.floor(Math.random() * 4);
          return { ...n, activationCount: n.activationCount + bump };
        })
      );
      if (currentStep >= 20) {
        clearInterval(interval);
        setIsSimulating(false);
      }
    }, 150);
  }

  const deadCount = neurons.filter(
    (n) => n.activationCount < DEAD_THRESHOLD
  ).length;
  const aliveCount = neurons.length - deadCount;

  function getInsight(): string {
    if (deadCount === 0) return "No dead neurons detected. The network is healthy.";
    if (deadCount === 1) return `${deadCount} neuron is permanently inactive. It contributes nothing to learning.`;
    return `${deadCount} out of ${neurons.length} neurons are dead — never activating regardless of input. This wastes ${Math.round((deadCount / neurons.length) * 100)}% of network capacity.`;
  }

  if (functionId !== "relu") {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.35 }}
        className="bg-[#0f172a] rounded-xl border border-[#1e293b] p-4 overflow-hidden"
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Dead Neuron Detector
            </h3>
            <p className="text-[11px] text-[#64748b] mt-0.5">
              ReLU-only — neurons receiving always-negative inputs never fire
            </p>
          </div>
          <button
            onClick={runSimulation}
            disabled={isSimulating}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#3bb4a4]/20 border border-[#3bb4a4]/40 text-[#3bb4a4] hover:bg-[#3bb4a4]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSimulating ? `Step ${step}/20` : "Simulate"}
          </button>
        </div>

        {/* Stats row */}
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#3bb4a4]" />
            <span className="text-[11px] text-[#94a3b8]">
              Active:{" "}
              <span className="text-[#3bb4a4] font-semibold">{aliveCount}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ef4444]/60" />
            <span className="text-[11px] text-[#94a3b8]">
              Dead:{" "}
              <span className="text-[#ef4444] font-semibold">{deadCount}</span>
            </span>
          </div>
        </div>

        {/* Neuron grid — 2 rows × 4 cols */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {neurons.map((neuron) => {
            const isDead = neuron.activationCount < DEAD_THRESHOLD;
            return (
              <div key={neuron.id} className="flex flex-col items-center gap-1">
                <motion.div
                  animate={{
                    scale: isDead ? 1 : isSimulating ? [1, 1.08, 1] : 1,
                    boxShadow: isDead
                      ? "none"
                      : isSimulating
                      ? [
                          "0 0 0px #3bb4a4",
                          "0 0 10px #3bb4a4",
                          "0 0 0px #3bb4a4",
                        ]
                      : `0 0 8px ${neuron.activationCount > 30 ? "#3bb4a4" : "#1e5d8a"}`,
                  }}
                  transition={{ duration: 0.3, repeat: isSimulating ? Infinity : 0 }}
                  className="relative w-11 h-11 rounded-full flex items-center justify-center border-2 text-[9px] font-mono font-bold"
                  style={{
                    backgroundColor: isDead
                      ? "rgba(239,68,68,0.12)"
                      : "rgba(59,180,164,0.18)",
                    borderColor: isDead ? "rgba(239,68,68,0.4)" : "#3bb4a4",
                    color: isDead ? "#ef4444" : "#3bb4a4",
                  }}
                >
                  {neuron.activationCount}
                </motion.div>
                {isDead && (
                  <span className="text-[9px] text-[#ef4444] font-semibold">
                    Dead
                  </span>
                )}
                {!isDead && (
                  <span className="text-[9px] text-[#475569]">N{neuron.id}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Insight */}
        <div className="rounded-lg bg-[#ef4444]/8 border border-[#ef4444]/20 px-3 py-2">
          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
            {getInsight()}{" "}
            <span className="text-white">
              Consider Leaky ReLU to prevent this.
            </span>
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
