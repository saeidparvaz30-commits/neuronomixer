"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScalingMethod, METHOD_META, AGE_MIN, AGE_MAX, SAL_MIN, SAL_MAX, AGE_MEAN, SAL_MEAN, AGE_STD, SAL_STD, AGE_RANGE, SAL_RANGE } from "./types";

type Props = { method: ScalingMethod };

const STATS = {
  raw:          null,
  normalized:   [
    `min(Age) = ${AGE_MIN},  max(Age) = ${AGE_MAX},  range = ${AGE_RANGE}`,
    `min(Salary) = ${(SAL_MIN / 1000).toFixed(0)}k,  max = ${(SAL_MAX / 1000).toFixed(0)}k,  range = ${(SAL_RANGE / 1000).toFixed(0)}k`,
  ],
  meannorm: [
    `mean(Age) = ${AGE_MEAN.toFixed(1)},  range(Age) = ${AGE_RANGE}`,
    `mean(Salary) = ${(SAL_MEAN / 1000).toFixed(1)}k,  range(Salary) = ${(SAL_RANGE / 1000).toFixed(0)}k`,
  ],
  standardized: [
    `mean(Age) = ${AGE_MEAN.toFixed(1)},  std(Age) = ${AGE_STD.toFixed(1)}`,
    `mean(Salary) = ${(SAL_MEAN / 1000).toFixed(1)}k,  std(Salary) = ${(SAL_STD / 1000).toFixed(1)}k`,
  ],
};

function FormulaPanelInner({ method }: Props) {
  const meta  = METHOD_META[method];
  const stats = STATS[method];

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">Applied Formula</p>

      <AnimatePresence mode="wait">
        <motion.div key={method} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
          <pre className="rounded-lg bg-[#1e293b]/60 px-4 py-3 font-mono text-[12px] text-[#93c5fd] leading-relaxed overflow-x-auto whitespace-pre-wrap">
            {meta.formula}
          </pre>
          <p className="mt-2 text-[11px] text-[#94a3b8] leading-relaxed">{meta.tagline}</p>

          {stats && (
            <div className="mt-3 rounded-lg bg-[#1e293b]/40 px-3 py-2 text-[11px] font-mono text-[#475569] space-y-0.5">
              {stats.map((s) => <div key={s}>{s}</div>)}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const FormulaPanel = React.memo(FormulaPanelInner);
export default FormulaPanel;
