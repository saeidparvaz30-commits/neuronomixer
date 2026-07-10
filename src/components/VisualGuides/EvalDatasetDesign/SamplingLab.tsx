"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuideMotion } from "@/lib/guideMotion";
import { CategoryId, EvalTask, SLICES, sliceById } from "./types";
import { BinomialCI, pct } from "./stats";

export interface WidthSnapshot {
  n: number;
  width: number;
}

type Props = {
  tasks: readonly EvalTask[];
  passes: number;
  ci: BinomialCI;
  snapshots: readonly WidthSnapshot[];
  selectedCat: CategoryId;
  onSelectCat: (c: CategoryId) => void;
  onAddRandom: (count: number) => void;
  onAddCategory: (count: number) => void;
  remainingRandom: number;
  remainingSelected: number;
  targetWidth: number;
  minSetSize: number;
  gateHit: boolean;
};

const BTN =
  "px-3.5 py-2 rounded-xl text-[12px] font-semibold border border-[#334155] text-white hover:border-[var(--cat-accent)] hover:text-[var(--cat-accent)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cat-accent)] disabled:opacity-40 disabled:pointer-events-none";

function CIIntervalBar({
  ci,
  n,
  estimate,
}: {
  ci: BinomialCI;
  n: number;
  estimate: number;
}) {
  const x = (frac: number) => 40 + frac * 560;
  return (
    <svg
      viewBox="0 0 640 92"
      className="w-full h-auto"
      role="img"
      aria-label={
        n === 0
          ? "Confidence interval chart, empty until tasks are added"
          : `Measured pass rate ${pct(estimate)}, 95 percent confidence interval from ${pct(
              ci.lo
            )} to ${pct(ci.hi)}`
      }
    >
      {/* axis */}
      <line x1={40} y1={46} x2={600} y2={46} stroke="#334155" strokeWidth={2} />
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={x(t)} y1={42} x2={x(t)} y2={50} stroke="#334155" strokeWidth={2} />
          <text
            x={x(t)}
            y={68}
            textAnchor="middle"
            fill="#475569"
            fontSize={11}
            fontFamily="monospace"
          >
            {Math.round(t * 100)}%
          </text>
        </g>
      ))}
      {n > 0 && (
        <>
          <rect
            x={x(ci.lo)}
            y={38}
            width={Math.max(2, x(ci.hi) - x(ci.lo))}
            height={16}
            rx={4}
            fill="var(--cat-accent)"
            opacity={0.35}
          />
          <line
            x1={x(ci.lo)}
            y1={34}
            x2={x(ci.lo)}
            y2={58}
            stroke="var(--cat-accent)"
            strokeWidth={2.5}
          />
          <line
            x1={x(ci.hi)}
            y1={34}
            x2={x(ci.hi)}
            y2={58}
            stroke="var(--cat-accent)"
            strokeWidth={2.5}
          />
        </>
      )}
      {n > 0 && (
        <>
          <line
            x1={x(estimate)}
            y1={30}
            x2={x(estimate)}
            y2={62}
            stroke="var(--color-accent)"
            strokeWidth={3}
          />
          <text
            x={x(estimate)}
            y={24}
            textAnchor="middle"
            fill="var(--color-accent)"
            fontSize={11}
            fontFamily="monospace"
          >
            {pct(estimate)}
          </text>
        </>
      )}
      <text x={40} y={16} fill="#94a3b8" fontSize={11}>
        Measured pass rate with exact 95% CI (Clopper-Pearson)
      </text>
    </svg>
  );
}

function WidthChart({
  snapshots,
  targetWidth,
}: {
  snapshots: readonly WidthSnapshot[];
  targetWidth: number;
}) {
  const maxN = Math.max(60, ...snapshots.map((s) => s.n));
  const xMax = Math.ceil(maxN / 10) * 10;
  const x = (n: number) => 48 + (n / xMax) * 552;
  const y = (w: number) => 160 - w * 136;
  const pointsAttr = snapshots.map((s) => `${x(s.n)},${y(s.width)}`).join(" ");
  return (
    <svg
      viewBox="0 0 640 196"
      className="w-full h-auto"
      role="img"
      aria-label={`Chart of confidence interval width against number of tasks. Target width ${pct(
        targetWidth,
        0
      )}. ${
        snapshots.length === 0
          ? "No tasks added yet."
          : `Latest: ${snapshots[snapshots.length - 1].n} tasks, width ${pct(
              snapshots[snapshots.length - 1].width
            )}.`
      }`}
    >
      {/* axes */}
      <line x1={48} y1={24} x2={48} y2={160} stroke="#334155" strokeWidth={1.5} />
      <line x1={48} y1={160} x2={600} y2={160} stroke="#334155" strokeWidth={1.5} />
      {[0, 0.25, 0.5, 0.75, 1].map((w) => (
        <g key={w}>
          <line x1={44} y1={y(w)} x2={48} y2={y(w)} stroke="#334155" strokeWidth={1.5} />
          <text
            x={38}
            y={y(w) + 4}
            textAnchor="end"
            fill="#475569"
            fontSize={10}
            fontFamily="monospace"
          >
            {Math.round(w * 100)}
          </text>
        </g>
      ))}
      {[0, xMax / 2, xMax].map((n) => (
        <text
          key={n}
          x={x(n)}
          y={178}
          textAnchor="middle"
          fill="#475569"
          fontSize={10}
          fontFamily="monospace"
        >
          {n}
        </text>
      ))}
      <text x={52} y={16} fill="#94a3b8" fontSize={11}>
        CI width (points) vs tasks in your set
      </text>
      {/* target line */}
      <line
        x1={48}
        y1={y(targetWidth)}
        x2={600}
        y2={y(targetWidth)}
        stroke="var(--cat-accent)"
        strokeWidth={1.5}
        strokeDasharray="6 4"
        opacity={0.7}
      />
      <text
        x={600}
        y={y(targetWidth) - 6}
        textAnchor="end"
        fill="var(--cat-accent)"
        fontSize={10}
      >
        target {Math.round(targetWidth * 100)} pts
      </text>
      {snapshots.length > 0 && (
        <>
          <polyline
            points={pointsAttr}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2}
          />
          {snapshots.map((s, i) => (
            <circle
              key={`${s.n}-${i}`}
              cx={x(s.n)}
              cy={y(s.width)}
              r={3.5}
              fill={s.width <= targetWidth ? "var(--cat-accent)" : "var(--color-accent)"}
            />
          ))}
        </>
      )}
    </svg>
  );
}

export default function SamplingLab({
  tasks,
  passes,
  ci,
  snapshots,
  selectedCat,
  onSelectCat,
  onAddRandom,
  onAddCategory,
  remainingRandom,
  remainingSelected,
  targetWidth,
  minSetSize,
  gateHit,
}: Props) {
  const { fadeIn } = useGuideMotion();
  const n = tasks.length;
  const recent = tasks.slice(-8);

  const handleCatKeyDown = (e: React.KeyboardEvent) => {
    const idx = SLICES.findIndex((s) => s.id === selectedCat);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      onSelectCat(SLICES[(idx + 1) % SLICES.length].id);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      onSelectCat(SLICES[(idx - 1 + SLICES.length) % SLICES.length].id);
    }
  };

  return (
    <div>
      {/* Sampling controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[11px] font-semibold text-[var(--cat-accent)] uppercase tracking-wide mb-2">
            Sample randomly from production
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
            Draws follow the live traffic mix, so every slice shows up in
            proportion to how often users actually hit it.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className={BTN}
              onClick={() => onAddRandom(5)}
              disabled={remainingRandom < 1}
            >
              + 5 random tasks
            </button>
            <button
              className={BTN}
              onClick={() => onAddRandom(25)}
              disabled={remainingRandom < 1}
            >
              + 25 random tasks
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[11px] font-semibold text-[var(--color-warning)] uppercase tracking-wide mb-2">
            Convenience sampling (skewed on purpose)
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3">
            Pull tasks from one slice only, the way an eval set drifts when you
            keep adding whatever bug report landed this week.
          </p>
          <div
            role="radiogroup"
            aria-label="Category to sample from"
            className="inline-flex flex-wrap rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1 mb-3"
            onKeyDown={handleCatKeyDown}
          >
            {SLICES.map((s) => {
              const active = selectedCat === s.id;
              return (
                <button
                  key={s.id}
                  role="radio"
                  aria-checked={active}
                  tabIndex={active ? 0 : -1}
                  onClick={() => onSelectCat(s.id)}
                  className={`relative px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cat-accent)] ${
                    active ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="eval-cat-pill"
                      className="absolute inset-0 rounded-lg"
                      style={{ background: "var(--cat-accent)" }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <span className="relative z-10 inline-flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: s.color }}
                      aria-hidden="true"
                    />
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div>
            <button
              className={BTN}
              onClick={() => onAddCategory(25)}
              disabled={remainingSelected < 1}
            >
              + 25 from {sliceById(selectedCat).label}
            </button>
          </div>
        </div>
      </div>

      {/* Readout tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Tasks in set
          </p>
          <p className="text-2xl font-black font-mono text-[#f1f5f9]">{n}</p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Model passes
          </p>
          <p className="text-2xl font-black font-mono text-[#f1f5f9]">
            {n === 0 ? "?" : `${passes}/${n}`}
          </p>
        </div>
        <div className="rounded-xl border border-[#1e293b] p-3">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Measured pass rate
          </p>
          <p className="text-2xl font-black font-mono text-[var(--color-accent)]">
            {n === 0 ? "?" : pct(passes / n)}
          </p>
        </div>
        <div
          className="rounded-xl p-3 border"
          style={{
            borderColor: gateHit ? "var(--cat-accent)" : "#1e293b",
          }}
        >
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            95% CI width
          </p>
          <p
            className="text-2xl font-black font-mono"
            style={{ color: n === 0 ? "#f1f5f9" : "var(--cat-accent)" }}
          >
            {n === 0 ? "?" : `${(ci.width * 100).toFixed(1)} pts`}
          </p>
        </div>
      </div>

      {/* Interval bar */}
      <div className="rounded-xl border border-[#1e293b] p-4 mb-4">
        <CIIntervalBar ci={ci} n={n} estimate={n === 0 ? 0 : passes / n} />
        <p className="text-[11px] text-[#475569] leading-relaxed" aria-live="polite">
          {n === 0
            ? "Add tasks to measure anything. With zero tasks the pass rate could be anywhere from 0% to 100%."
            : `With ${n} task${n === 1 ? "" : "s"} and ${passes} pass${
                passes === 1 ? "" : "es"
              }, the exact 95% Clopper-Pearson interval is ${pct(ci.lo)} to ${pct(
                ci.hi
              )}. Computed from the incomplete beta function, not a normal approximation.`}
        </p>
      </div>

      {/* Width trajectory */}
      <div className="rounded-xl border border-[#1e293b] p-4 mb-4">
        <WidthChart snapshots={snapshots} targetWidth={targetWidth} />
        <p className="text-[11px] text-[#475569] leading-relaxed">
          Precision buys itself slower and slower: halving the CI width costs
          roughly four times the tasks. The gate needs at least {minSetSize}{" "}
          tasks AND a width of {Math.round(targetWidth * 100)} points or less.
        </p>
      </div>

      {/* Recent tasks */}
      {recent.length > 0 && (
        <div className="rounded-xl border border-[#1e293b] p-4">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-2">
            Most recently added ({recent.length} of {n})
          </p>
          <ul className="flex flex-col gap-1.5">
            <AnimatePresence initial={false}>
              {recent.map((t) => {
                const slice = sliceById(t.category);
                return (
                  <motion.li
                    key={t.id}
                    variants={fadeIn}
                    initial="hidden"
                    animate="visible"
                    className="flex items-center gap-2 text-[11px]"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: slice.color }}
                      aria-hidden="true"
                    />
                    <span className="text-[#94a3b8] truncate">{t.text}</span>
                    <span
                      className={`ml-auto shrink-0 font-mono font-semibold ${
                        t.passes
                          ? "text-[var(--color-success)]"
                          : "text-[#ef4444]"
                      }`}
                    >
                      {t.passes ? "✓ pass" : "✗ fail"}
                    </span>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>
      )}
    </div>
  );
}
