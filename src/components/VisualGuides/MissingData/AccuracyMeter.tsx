"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Strategy, STRATEGY_META } from "./types";

type Props = { selected: Strategy };

const STRATEGIES = [
  { id: "drop-rows"       as const },
  { id: "mean-imputation" as const },
  { id: "knn-imputation"  as const },
];

function AccuracyMeterInner({ selected }: Props) {
  // Animated counter for each bar
  const [displayed, setDisplayed] = useState<Record<string, number>>({
    "drop-rows": 0, "mean-imputation": 0, "knn-imputation": 0,
  });

  useEffect(() => {
    // Stagger-animate each bar to its target
    STRATEGIES.forEach(({ id }, i) => {
      const target = STRATEGY_META[id].accuracy;
      const delay  = i * 120;
      const start  = performance.now() + delay;
      const dur    = 900;
      let raf: number;

      function tick(now: number) {
        if (now < start) { raf = requestAnimationFrame(tick); return; }
        const t = Math.min((now - start) / dur, 1);
        const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
        setDisplayed((prev) => ({ ...prev, [id]: Math.round(ease * target) }));
        if (t < 1) raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    });
  }, []); // run once on mount

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#94a3b8] mb-3">Model Performance Comparison</p>
      <div className="flex flex-col gap-3">
        {STRATEGIES.map(({ id }) => {
          const meta      = STRATEGY_META[id];
          const isSelected = selected === id;
          const pct       = meta.accuracy;

          return (
            <div key={id} className={`rounded-xl border p-3 transition-all ${
              isSelected
                ? "border-[var(--color)]"
                : "border-[#1e293b]"
            }`}
              style={isSelected ? { borderColor: meta.color + "80", boxShadow: `0 0 12px ${meta.color}22` } : undefined}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-semibold text-white">{meta.label}</span>
                <span
                  className="text-[13px] font-bold tabular-nums"
                  style={{ color: meta.color }}
                >
                  {displayed[id]}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                className="relative h-2 rounded-full bg-[#1e293b] overflow-hidden"
              >
                <motion.div
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, #ef4444 0%, var(--color-warning) 40%, ${meta.color} 100%)`,
                  }}
                  initial={{ width: "0%" }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.85, delay: 0.1, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-[#475569] mt-3 leading-relaxed">
        Accuracies shown are estimates for a simple logistic regression model trained on the imputed dataset. Real results will vary with your data distribution and model complexity.
      </p>
    </div>
  );
}

const AccuracyMeter = React.memo(AccuracyMeterInner);
export default AccuracyMeter;
