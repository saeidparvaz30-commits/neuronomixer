"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  SCHEDULE_LABELS,
  PEAK_CHOICES,
  DEFAULT_PEAK,
  CLIFF_PEAK,
  TOTAL_STEPS,
  WARMUP_STEPS,
  BATCH_SIZE,
  HIDDEN,
  GRID_RES,
  INIT_SEED,
  CONVERGED_LOSS,
  netParamCount,
  scheduleCurve,
  initRun,
  trainChunk,
  isRunDone,
  summarizeRun,
  type ScheduleKind,
  type RunState,
  type RunSummary,
} from "./scheduleMath";
import SchedulePicker from "./SchedulePicker";
import RunDualChart, { type ChartRun } from "./RunDualChart";
import FitHeatmaps from "./FitHeatmaps";

const GUIDE_TITLE = "Learning-Rate Schedules";
const NEXT_GUIDE_SLUG = "optimizers-race";

/** Steps advanced per setTimeout tick; keeps each tick well under 100ms. */
const TRAIN_CHUNK = 60;
/** Distinct (schedule, peak) configs kept in the comparison, oldest dropped. */
const MAX_RUNS = 6;

/** Run line colors from the guide token table (labels always accompany them). */
const RUN_COLORS = [
  "#1e5d8a",
  "#3bb4a4",
  "#a855f7",
  "#ec4899",
  "#ef4444",
  "#94a3b8",
] as const;

const DEFAULT_PEAK_INDEX = PEAK_CHOICES.indexOf(DEFAULT_PEAK);
const CLIFF_PEAK_INDEX = PEAK_CHOICES.indexOf(CLIFF_PEAK);

interface RunRecord {
  key: string;
  label: string;
  color: string;
  summary: RunSummary;
  durationMs: number;
}

function runKey(kind: ScheduleKind, peak: number): string {
  return `${kind}@${peak}`;
}

function runLabel(kind: ScheduleKind, peak: number): string {
  return `${SCHEDULE_LABELS[kind]} @ ${peak}`;
}

const STATUS_STYLES: Record<
  RunSummary["status"],
  { text: string; color: string }
> = {
  converged: { text: "converged", color: "var(--color-success)" },
  partial: { text: "still above threshold", color: "var(--color-warning)" },
  diverged: { text: "diverged", color: "#ef4444" },
};

export default function LearningRateSchedulesClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  const [kind, setKind] = useState<ScheduleKind>("constant");
  const [peakIndex, setPeakIndex] = useState(DEFAULT_PEAK_INDEX);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [training, setTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liveCurves, setLiveCurves] = useState<{
    lrs: number[];
    losses: number[];
  } | null>(null);

  const runStateRef = useRef<RunState | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const colorMapRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const colorFor = useCallback((key: string): string => {
    const map = colorMapRef.current;
    const existing = map.get(key);
    if (existing) return existing;
    const color = RUN_COLORS[map.size % RUN_COLORS.length];
    map.set(key, color);
    return color;
  }, []);

  const startRun = useCallback(
    (runKind: ScheduleKind, peak: number) => {
      if (training) return;
      setKind(runKind);
      const pi = PEAK_CHOICES.indexOf(peak);
      if (pi >= 0) setPeakIndex(pi);
      setTraining(true);
      setProgress(0);
      setLiveCurves(null);
      runStateRef.current = initRun(runKind, peak);
      startTimeRef.current = performance.now();

      const tick = () => {
        const st = runStateRef.current;
        if (!st) return;
        trainChunk(st, TRAIN_CHUNK);
        setProgress(isRunDone(st) ? 1 : st.step / TOTAL_STEPS);
        setLiveCurves({ lrs: [...st.lrs], losses: [...st.losses] });
        if (isRunDone(st)) {
          const durationMs = performance.now() - startTimeRef.current;
          const summary = summarizeRun(st);
          const key = runKey(summary.kind, summary.peak);
          const record: RunRecord = {
            key,
            label: runLabel(summary.kind, summary.peak),
            color: colorFor(key),
            summary,
            durationMs,
          };
          setRuns((prev) => {
            const rest = prev.filter((r) => r.key !== key);
            return [...rest, record].slice(-MAX_RUNS);
          });
          setLiveCurves(null);
          setTraining(false);
          runStateRef.current = null;
        } else {
          timerRef.current = window.setTimeout(tick, 0);
        }
      };
      timerRef.current = window.setTimeout(tick, 0);
    },
    [training, colorFor]
  );

  const handleReset = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    runStateRef.current = null;
    colorMapRef.current = new Map();
    setKind("constant");
    setPeakIndex(DEFAULT_PEAK_INDEX);
    setRuns([]);
    setTraining(false);
    setProgress(0);
    setLiveCurves(null);
  }, []);

  // ── Gates: every one flips only when a REAL training run finishes ─────────
  const gateCompare = useMemo(
    () => new Set(runs.map((r) => r.summary.kind)).size >= 2,
    [runs]
  );
  const gateDiverge = useMemo(
    () => runs.some((r) => r.summary.status === "diverged"),
    [runs]
  );
  const gateRescue = useMemo(
    () =>
      runs.some(
        (r) =>
          r.summary.kind === "warmup-cosine" &&
          r.summary.status === "converged" &&
          r.summary.peak >= CLIFF_PEAK
      ),
    [runs]
  );
  const isComplete = gateCompare && gateDiverge && gateRescue;

  const plannedLrs = useMemo(
    () => scheduleCurve(kind, TOTAL_STEPS, PEAK_CHOICES[peakIndex]),
    [kind, peakIndex]
  );

  const chartRuns: ChartRun[] = runs.map((r) => ({
    key: r.key,
    label: r.label,
    color: r.color,
    summary: r.summary,
  }));

  const lastRun = runs.length > 0 ? runs[runs.length - 1] : null;
  const bestRun = useMemo(() => {
    let best: RunRecord | null = null;
    for (const r of runs) {
      if (!Number.isFinite(r.summary.finalLoss)) continue;
      if (r.summary.status === "diverged") continue;
      if (best === null || r.summary.finalLoss < best.summary.finalLoss)
        best = r;
    }
    return best;
  }, [runs]);
  const divergedRun = useMemo(
    () => runs.find((r) => r.summary.status === "diverged") ?? null,
    [runs]
  );
  const rescueRun = useMemo(
    () =>
      runs.find(
        (r) =>
          r.summary.kind === "warmup-cosine" &&
          r.summary.status === "converged" &&
          r.summary.peak >= CLIFF_PEAK
      ) ?? null,
    [runs]
  );

  const progressItems = [
    { id: "compare", label: "Finish 2 different schedules", done: gateCompare },
    { id: "diverge", label: "Watch a run diverge", done: gateDiverge },
    { id: "rescue", label: "Rescue the cliff with warmup", done: gateRescue },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion
        isComplete={isComplete}
        guideSlug="learning-rate-schedules"
        score={100}
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
              Deep Learning
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3"
          >
            Learning-Rate{" "}
            <span className="text-[var(--color-accent)]">Schedules</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            The step size is a curve over time, not a constant, and its shape
            decides convergence. Train a real {netParamCount()}-parameter net
            in your browser under four schedules, push the peak until training
            explodes, then watch warmup walk the same peak back from the
            cliff.
          </motion.p>
        </section>

        {/* Progress */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          {progressItems.map((item) => (
            <div key={item.id} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors"
                style={{
                  background: item.done ? "var(--color-accent)" : "#1e293b",
                }}
              />
              <span
                className={`text-[11px] ${item.done ? "text-white" : "text-[#475569]"}`}
              >
                {item.label}
              </span>
            </div>
          ))}
          {!session?.user && (
            <p className="text-[11px] text-[#475569] ml-auto">
              <Link
                href="/auth/sign-in"
                className="underline underline-offset-2 hover:text-[#94a3b8]"
              >
                Sign in
              </Link>{" "}
              to save progress
            </p>
          )}
          <AnimatePresence>
            {isComplete && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-auto text-[11px] font-semibold text-[var(--color-success)] flex items-center gap-1"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Concept */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            One knob, but it is a knob you turn over time
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Every SGD step moves the weights by learning rate times gradient.
            Treating that rate as a single constant forces one compromise on
            the whole run. A schedule lets the rate be large while the model
            is far from a solution and small while it settles, and the same
            peak value can be fatal or fine depending purely on the curve
            around it. You will produce both outcomes below, from real runs.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Too low: the budget runs out
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Small steps are safe but slow. With a fixed budget of{" "}
                {TOTAL_STEPS} steps, a tiny rate leaves the loss stranded far
                above what the same net reaches with a bolder curve. Try peak
                0.02 below and compare.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Too high: the loss explodes
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Past a stability threshold each step overshoots the minimum by
                more than the last, and the loss grows exponentially instead
                of shrinking. This is divergence, and you can trigger it on
                demand with the cliff preset.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                The shape is the fix
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Warmup keeps early steps small while the weights are in their
                most fragile state; decay shrinks late steps so minibatch
                noise stops rattling the loss. Same peak, different curve,
                different fate.
              </p>
            </div>
          </div>
          <div className="rounded-xl border-l-4 border-[#3bb4a4] bg-[#162032] p-4">
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              <span className="font-semibold text-[#3bb4a4]">
                One dimension at a time:
              </span>{" "}
              this lab trains with plain SGD on purpose. Momentum, RMSProp,
              and Adam change the update rule, and that dimension has its own
              guide,{" "}
              <Link
                href="/visual-guides/optimizers-race"
                className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
              >
                the Optimizers Race
              </Link>
              . Here the only thing that differs between runs is lr(t).
            </p>
          </div>
        </motion.section>

        {/* Step 1: pick and train */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 1: pick a curve, then train for real
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            The net is a 2 &rarr; {HIDDEN} (tanh) &rarr; 1 MLP with{" "}
            {netParamCount()} parameters, trained by real minibatch SGD (batch{" "}
            {BATCH_SIZE}) to regress the {GRID_RES}x{GRID_RES}-point target
            surface shown at the bottom of the page. Every run starts from the
            exact same weights (seed {INIT_SEED}) and sees the exact same
            batch order, so curves are directly comparable and re-running a
            config reproduces it to the last digit. The dashed gold line
            previews the schedule you selected; solid lines are finished runs.
          </p>

          <SchedulePicker
            kind={kind}
            peakIndex={peakIndex}
            disabled={training}
            onKind={setKind}
            onPeakIndex={setPeakIndex}
          />

          <div className="flex flex-wrap items-center gap-4 mt-4 mb-4">
            <button
              onClick={() => startRun(kind, PEAK_CHOICES[peakIndex])}
              disabled={training}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity ${
                training
                  ? "bg-[#1e293b] text-[#475569] cursor-not-allowed"
                  : "bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90"
              }`}
            >
              {training
                ? "Training..."
                : `Train: ${SCHEDULE_LABELS[kind]} @ ${PEAK_CHOICES[peakIndex]}`}
            </button>
            {training && (
              <div className="flex-1 min-w-[160px] max-w-[320px]">
                <div
                  className="h-2 rounded-full bg-[#1e293b] overflow-hidden"
                  role="progressbar"
                  aria-label="Training progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress * 100)}
                >
                  <div
                    className="h-full bg-[var(--color-accent)] transition-all"
                    style={{ width: `${(progress * 100).toFixed(2)}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#475569] mt-1">
                  step {Math.round(progress * TOTAL_STEPS)} of {TOTAL_STEPS}
                </p>
              </div>
            )}
            {liveCurves && liveCurves.losses.length > 0 && (
              <p className="text-[11px] font-mono text-[#475569]">
                grid MSE{" "}
                <span className="text-[var(--color-accent)]">
                  {Number.isFinite(
                    liveCurves.losses[liveCurves.losses.length - 1]
                  )
                    ? liveCurves.losses[liveCurves.losses.length - 1].toExponential(2)
                    : "non-finite"}
                </span>
              </p>
            )}
          </div>

          <RunDualChart
            plannedLrs={plannedLrs}
            runs={chartRuns}
            live={liveCurves}
          />

          {runs.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table
                className="w-full text-[11px]"
                style={{ borderCollapse: "collapse" }}
              >
                <caption className="sr-only">
                  Finished training runs with measured losses
                </caption>
                <thead>
                  <tr className="bg-[#1e293b] text-[#94a3b8]">
                    <th className="text-left px-3 py-2 font-semibold">Run</th>
                    <th className="text-right px-3 py-2 font-semibold">
                      Final grid MSE
                    </th>
                    <th className="text-right px-3 py-2 font-semibold">
                      Best grid MSE
                    </th>
                    <th className="text-right px-3 py-2 font-semibold">
                      Steps
                    </th>
                    <th className="text-left px-3 py-2 font-semibold">
                      Outcome
                    </th>
                    <th className="text-right px-3 py-2 font-semibold">
                      Wall time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r, i) => {
                    const st = STATUS_STYLES[r.summary.status];
                    return (
                      <tr
                        key={r.key}
                        style={{
                          background: i % 2 === 0 ? "#0f172a" : "#162032",
                        }}
                        className="text-[#94a3b8]"
                      >
                        <td className="px-3 py-1.5">
                          <span className="flex items-center gap-2">
                            <svg width="18" height="8" aria-hidden="true">
                              <line
                                x1="0"
                                y1="4"
                                x2="18"
                                y2="4"
                                stroke={r.color}
                                strokeWidth="2.5"
                              />
                            </svg>
                            <span className="text-white">{r.label}</span>
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono">
                          {Number.isFinite(r.summary.finalLoss)
                            ? r.summary.finalLoss.toExponential(3)
                            : "non-finite"}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono">
                          {r.summary.bestLoss.toExponential(3)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono">
                          {r.summary.steps}
                          {r.summary.divergedAt !== null
                            ? ` (stopped @ ${r.summary.divergedAt})`
                            : ""}
                        </td>
                        <td
                          className="px-3 py-1.5 font-semibold"
                          style={{ color: st.color }}
                        >
                          {st.text}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono">
                          {r.durationMs.toFixed(0)} ms
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-[10px] text-[#475569] mt-2">
                Converged means final grid MSE at or below {CONVERGED_LOSS};
                diverged means the loss went non-finite or finished worse than
                predicting the grid mean. Wall time is measured in your
                browser with performance.now().
              </p>
            </div>
          )}
        </motion.section>

        {/* Step 2: cliff and rescue */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 2: break it, then rescue it
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            At peak {CLIFF_PEAK} this net sits past its stability threshold: a
            constant schedule feeds the full rate to the freshly initialized
            weights and the loss blows up within a handful of steps. The
            rescue run uses the identical peak but climbs to it linearly over{" "}
            {WARMUP_STEPS} steps and glides back down with cosine, spending
            only a brief window near the danger zone. Same peak, same net,
            same data, opposite outcome. Both are real runs; check the table
            above afterwards.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => startRun("constant", CLIFF_PEAK)}
              disabled={training}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                training
                  ? "border-[#1e293b] text-[#475569] cursor-not-allowed"
                  : "border-[#ef4444] text-[#ef4444] hover:bg-[#ef4444]/10"
              }`}
            >
              Run the cliff: constant @ {CLIFF_PEAK}
            </button>
            <button
              onClick={() => startRun("warmup-cosine", CLIFF_PEAK)}
              disabled={training}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                training
                  ? "border-[#1e293b] text-[#475569] cursor-not-allowed"
                  : "border-[var(--color-success)] text-[var(--color-success)] hover:bg-[#22c55e]/10"
              }`}
            >
              Run the rescue: warmup + cosine @ {CLIFF_PEAK}
            </button>
          </div>
          {(divergedRun || rescueRun) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {divergedRun && (
                <div className="rounded-xl border border-[#ef4444]/40 p-3">
                  <p className="text-[10px] text-[#475569] mb-1">
                    Your diverged run (measured)
                  </p>
                  <p className="text-[13px] font-mono font-bold text-[#ef4444]">
                    {divergedRun.label}:{" "}
                    {divergedRun.summary.divergedAt !== null
                      ? `loss passed 1e6 at step ${divergedRun.summary.divergedAt}`
                      : `finished at ${divergedRun.summary.finalLoss.toExponential(2)}, worse than the baseline`}
                  </p>
                </div>
              )}
              {rescueRun && (
                <div className="rounded-xl border border-[#22c55e]/40 p-3">
                  <p className="text-[10px] text-[#475569] mb-1">
                    Your rescue run (measured)
                  </p>
                  <p className="text-[13px] font-mono font-bold text-[var(--color-success)]">
                    {rescueRun.label}: converged at{" "}
                    {rescueRun.summary.finalLoss.toExponential(3)}
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.section>

        {/* Learned surface */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            What the net actually learned
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Proof the training is real: the right panel is the net&apos;s own
            output surface after your most recent finished run, recomputed
            from its final weights. A converged run reproduces the hill and
            the pit; a diverged run leaves saturated garbage.
          </p>
          <FitHeatmaps
            learned={lastRun ? lastRun.summary.heatmap : null}
            learnedCaption={
              lastRun
                ? `${lastRun.label}, final grid MSE ${
                    Number.isFinite(lastRun.summary.finalLoss)
                      ? lastRun.summary.finalLoss.toExponential(3)
                      : "non-finite"
                  }`
                : "no finished run yet"
            }
          />
        </motion.section>

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
                  Curve Bender
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You compared schedule shapes on identical runs, pushed the
                  learning rate off the cliff, and rescued the same peak with
                  warmup.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Your best run
                    </p>
                    <p className="text-[13px] font-mono font-bold text-[var(--color-accent)]">
                      {bestRun
                        ? `${bestRun.label}: ${bestRun.summary.finalLoss.toExponential(3)}`
                        : "n/a"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Your divergence
                    </p>
                    <p className="text-[13px] font-mono font-bold text-[#ef4444]">
                      {divergedRun
                        ? `${divergedRun.label}${
                            divergedRun.summary.divergedAt !== null
                              ? `, dead by step ${divergedRun.summary.divergedAt}`
                              : ""
                          }`
                        : "n/a"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Your rescue
                    </p>
                    <p className="text-[13px] font-mono font-bold text-[var(--color-success)]">
                      {rescueRun
                        ? `same peak, ${rescueRun.summary.finalLoss.toExponential(3)}`
                        : "n/a"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;The learning rate is not a number, it is a curve.
                    The peak decides whether training survives, the warmup
                    decides whether that peak is reachable at all, and the
                    decay decides how quietly the loss lands.&quot;
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
                    href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
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
              href={`/visual-guides/${NEXT_GUIDE_SLUG}`}
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
