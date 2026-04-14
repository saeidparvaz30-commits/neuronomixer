"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface RepeatedMeasuresToggleProps {
  isRepeated: boolean;
  onToggle: (value: boolean) => void;
  onToggled: () => void;
}

export default function RepeatedMeasuresToggle({
  isRepeated,
  onToggle,
  onToggled,
}: RepeatedMeasuresToggleProps) {
  const [hasToggled, setHasToggled] = React.useState(false);

  function handleToggle() {
    const next = !isRepeated;
    onToggle(next);
    if (!hasToggled) {
      setHasToggled(true);
      onToggled();
    }
  }

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[13px] font-semibold text-white uppercase tracking-wider">
          Repeated-Measures ANOVA
        </h2>
        <button
          role="switch"
          aria-checked={isRepeated}
          onClick={handleToggle}
          className="relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:ring-offset-2 focus:ring-offset-[#0f172a]"
          style={{ background: isRepeated ? "#d4af37" : "#334155" }}
        >
          <motion.span
            animate={{ x: isRepeated ? 20 : 2 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
            style={{ display: "block" }}
          />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!isRepeated ? (
          <motion.div
            key="off"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
              Currently showing <strong className="text-white">between-subjects</strong> ANOVA —
              each participant is in exactly one group. Toggle to see how the
              design changes with repeated measures.
            </p>
            <div className="rounded-xl bg-[#1e293b] p-4">
              <div className="text-[11px] text-[#94a3b8] font-mono mb-2">Between-subjects design:</div>
              <div className="text-[12px] font-mono text-white">
                SS<sub>Total</sub> = SS<sub>Between</sub> + SS<sub>Within</sub>
              </div>
              <div className="mt-2 text-[10px] text-[#475569]">
                80 participants × 1 group each = 80 independent observations
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="on"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4">
              <strong className="text-white">Repeated-measures</strong> ANOVA: the same 20 subjects
              are measured across all 4 conditions. Subject-level variance is
              separated out, increasing power.
            </p>

            <div className="rounded-xl bg-[#1e293b] p-4 mb-3">
              <div className="text-[11px] text-[#94a3b8] font-mono mb-2">Repeated-measures design:</div>
              <div className="text-[12px] font-mono text-white">
                SS<sub>Total</sub> = SS<sub>Condition</sub> + SS<sub>Subject</sub> + SS<sub>Error</sub>
              </div>
              <div className="mt-2 text-[10px] text-[#475569]">
                20 subjects × 4 conditions = 80 observations (not independent)
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#3bb4a4] mt-1.5 flex-shrink-0" />
                <p className="text-[11px] text-[#94a3b8]">
                  <strong className="text-white">SS_Subject</strong> captures individual baseline differences —
                  removing them from the error term boosts sensitivity.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37] mt-1.5 flex-shrink-0" />
                <p className="text-[11px] text-[#94a3b8]">
                  <strong className="text-white">Sphericity assumption</strong> (Mauchly's test):
                  variances of pairwise differences should be equal. If violated,
                  use Greenhouse-Geisser correction.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ec4899] mt-1.5 flex-shrink-0" />
                <p className="text-[11px] text-[#94a3b8]">
                  <strong className="text-white">F-ratio</strong> = MS_Condition / MS_Error
                  (not MS_Within as in between-subjects ANOVA).
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5">
              <p className="text-[11px] text-[#d4af37]">
                This is an informational toggle. The box plots and decomposition above
                remain in between-subjects mode for clarity.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
