"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import type { RegMode, LambdaBucket } from "./types";
import {
  DEGREE,
  N_POINTS,
  LAMBDA_MAX_STEP,
  generateData,
  buildDesign,
  fitModel,
  computeErrorCurve,
  lambdaFromStep,
  bucketFromStep,
  formatLambda,
  predict,
  trueFunction,
} from "./types";
import PolyFitChart from "./PolyFitChart";
import CoefficientBars from "./CoefficientBars";
import ErrorCurveChart from "./ErrorCurveChart";
import GeometryDiagram from "./GeometryDiagram";

// Deterministic dataset: safe at module scope (seeded LCG, no Math.random).
const DATA = generateData();
const DESIGN = buildDesign(DATA);
const N_TRAIN = DATA.filter((p) => p.split === "train").length;
const N_HOLDOUT = DATA.filter((p) => p.split === "holdout").length;

// Error curves are deterministic; compute lazily once per process/tab.
let CURVES_CACHE: { l2: ReturnType<typeof computeErrorCurve>; l1: ReturnType<typeof computeErrorCurve> } | null = null;
function getCurves() {
  if (!CURVES_CACHE) {
    CURVES_CACHE = {
      l2: computeErrorCurve(DATA, DESIGN, "l2"),
      l1: computeErrorCurve(DATA, DESIGN, "l1"),
    };
  }
  return CURVES_CACHE;
}

const SLIDER_TICK_STEPS = [0, 13, 27, LAMBDA_MAX_STEP];

const TRUE_CURVE = Array.from({ length: 161 }, (_, i) => {
  const x = -1 + (2 * i) / 160;
  return { x, y: trueFunction(x) };
});

const MODE_META: Record<
  RegMode,
  { label: string; short: string; color: string; tagline: string }
> = {
  l2: {
    label: "L2 Ridge",
    short: "L2",
    color: "#3bb4a4",
    tagline: "shrinks every weight smoothly toward zero, none reaches it exactly",
  },
  l1: {
    label: "L1 Lasso",
    short: "L1",
    color: "#a855f7",
    tagline: "pushes weak weights to exactly zero, performing feature selection",
  },
};

const BUCKET_LABEL: Record<LambdaBucket, string> = {
  low: "low λ",
  mid: "mid λ",
  high: "high λ",
};

const GUIDE_SLUG = "regularization-l1-l2";
const NEXT_GUIDE = "/visual-guides/overfitting-underfitting";

export default function RegularizationL1L2Client() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  const [mode, setMode] = useState<RegMode>("l2");
  const [step, setStep] = useState(0);
  const [explored, setExplored] = useState<Set<string>>(new Set());
  const [beatBaseline, setBeatBaseline] = useState(false);
  const [bestHoldoutSeen, setBestHoldoutSeen] = useState<number | null>(null);

  const lambda = lambdaFromStep(step);
  const meta = MODE_META[mode];

  const fit = useMemo(() => fitModel(DATA, DESIGN, mode, lambda), [mode, lambda]);
  const olsFit = useMemo(() => fitModel(DATA, DESIGN, "l2", 0), []);
  const baselineHoldout = olsFit.holdoutMse;

  const curves = useMemo(() => getCurves(), []);

  const fittedCurve = useMemo(
    () =>
      Array.from({ length: 161 }, (_, i) => {
        const x = -1 + (2 * i) / 160;
        return { x, y: predict(x, fit.weights, DESIGN.scaler) };
      }),
    [fit]
  );

  // Gate (a): visit low/mid/high lambda in both modes
  useEffect(() => {
    const bucket = bucketFromStep(step);
    if (!bucket) return;
    const key = `${mode}-${bucket}`;
    setExplored((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }, [mode, step]);

  // Gate (b): find a lambda where holdout error beats the lambda = 0 baseline
  useEffect(() => {
    if (step === 0) return;
    if (fit.holdoutMse < baselineHoldout) setBeatBaseline(true);
    setBestHoldoutSeen((prev) =>
      prev === null ? fit.holdoutMse : Math.min(prev, fit.holdoutMse)
    );
  }, [step, fit, baselineHoldout]);

  const isComplete = explored.size >= 6 && beatBaseline;

  const bucketCount = (m: RegMode) =>
    (["low", "mid", "high"] as LambdaBucket[]).filter((b) => explored.has(`${m}-${b}`))
      .length;

  function handleReset() {
    setMode("l2");
    setStep(0);
    setExplored(new Set());
    setBeatBaseline(false);
    setBestHoldoutSeen(null);
  }

  const holdoutDelta = fit.holdoutMse - baselineHoldout;

  const progressItems = [
    { id: "l2", label: `L2: λ regions (${bucketCount("l2")}/3)`, done: bucketCount("l2") === 3 },
    { id: "l1", label: `L1: λ regions (${bucketCount("l1")}/3)`, done: bucketCount("l1") === 3 },
    { id: "beat", label: "Beat λ = 0 on holdout", done: beatBaseline },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug={GUIDE_SLUG} score={4} />
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
          <span className="text-[#94a3b8]">Regularization: L1 &amp; L2</span>
        </nav>

        {/* Hero */}
        <motion.section variants={fadeUp} initial="hidden" animate="visible" className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Machine Learning
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Regularization{" "}
            <span className="text-[var(--color-accent)]">L1 &amp; L2</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
            Overfit models buy their perfect training fit with huge weights. Add a
            penalty on weight size, tune one knob λ, and watch a wild degree-8
            polynomial calm down, or thin itself out.
          </p>
        </motion.section>

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
                variants={card}
                initial="hidden"
                animate="visible"
                className="ml-auto text-[11px] font-semibold text-[#3bb4a4] flex items-center gap-1"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Section 1: why overfit models have large weights */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-8 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Why overfitting means large weights
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-3 max-w-[860px]">
            A degree-8 polynomial has enough freedom to pass close to every training
            point. To wiggle between nearby points it needs steep slopes, and steep
            slopes require coefficients with large magnitudes that nearly cancel each
            other. That cancellation act is exactly what fails on new data. You saw the
            symptom in{" "}
            <Link
              href="/visual-guides/overfitting-underfitting"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              Overfitting vs Underfitting
            </Link>
            ; regularization attacks the cause by charging the model for weight size,
            trading a little bias for a lot less variance (the{" "}
            <Link
              href="/visual-guides/bias-variance"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              Bias-Variance Tradeoff
            </Link>{" "}
            in action).
          </p>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Unregularized max |w|", value: olsFit.maxAbsWeight.toFixed(2) },
              { label: "Train MSE at λ = 0", value: olsFit.trainMse.toFixed(4) },
              { label: "Holdout MSE at λ = 0", value: olsFit.holdoutMse.toFixed(4) },
            ].map((chip) => (
              <div
                key={chip.label}
                className="rounded-xl border border-[#1e293b] bg-[#162032] px-3 py-2"
              >
                <p className="text-[10px] text-[#475569]">{chip.label}</p>
                <p className="text-[14px] font-mono font-bold text-white">{chip.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-[#475569]">
            Computed live from the least-squares fit to the {N_POINTS}-point dataset
            below ({N_TRAIN} train, {N_HOLDOUT} holdout). Weights are standardized
            coefficients.
          </p>
        </motion.section>

        {/* Section 2: centerpiece playground */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-8"
        >
          <div className="mb-3">
            <p className="text-[13px] font-semibold text-white mb-1">
              The λ playground: degree-8 polynomial regression
            </p>
            <p className="text-[12px] text-[#475569] max-w-[860px]">
              Pick a penalty type, then drag λ from 0 to 10 (log scale). Explore the
              low, mid, and high regions in BOTH modes, and find a λ where the holdout
              error drops below the λ = 0 baseline. Features are standardized before
              fitting so the penalty treats every power of x equally; that is the same
              reason scaling matters in{" "}
              <Link
                href="/visual-guides/feature-scaling"
                className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
              >
                Feature Scaling
              </Link>
              .
            </p>
          </div>

          {/* Mode toggle */}
          <div
            className="inline-flex rounded-xl border border-[#1e293b] bg-[#0f172a] p-1 gap-1 mb-4"
            role="radiogroup"
            aria-label="Regularization type"
          >
            {(["l2", "l1"] as RegMode[]).map((m) => {
              const mMeta = MODE_META[m];
              const active = mode === m;
              return (
                <button
                  key={m}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setMode(m)}
                  className={`relative px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] ${
                    active ? "text-[#0a0e1a]" : "text-[#94a3b8] hover:text-white"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="reg-mode-pill"
                      className="absolute inset-0 rounded-lg"
                      style={{ background: mMeta.color }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <span className="relative z-10">{mMeta.label}</span>
                </button>
              );
            })}
          </div>

          <div
            className="mb-5 px-4 py-2 rounded-xl border text-[12px] font-medium"
            style={{
              borderColor: meta.color + "44",
              background: meta.color + "0d",
              color: meta.color,
            }}
          >
            <strong>{meta.label}</strong>: {meta.tagline}.
          </div>

          {/* Lambda slider */}
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 mb-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <label htmlFor="lambda-slider" className="text-[13px] font-semibold text-white">
                Regularization strength λ ={" "}
                <span className="font-mono" style={{ color: meta.color }}>
                  {formatLambda(lambda)}
                </span>
              </label>
              <span className="text-[11px] text-[#475569]">
                log scale from 1e-6 to 10, leftmost position is λ = 0
              </span>
            </div>
            <input
              id="lambda-slider"
              type="range"
              min={0}
              max={LAMBDA_MAX_STEP}
              step={1}
              value={step}
              onChange={(e) => setStep(Number(e.target.value))}
              aria-valuetext={`lambda = ${formatLambda(lambda)}`}
              className="w-full accent-[var(--color-accent)] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#475569] mt-1 font-mono">
              {SLIDER_TICK_STEPS.map((s) => (
                <span key={s}>{formatLambda(lambdaFromStep(s))}</span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-[10px] text-[#475569] uppercase tracking-wide">
                {meta.short} regions visited:
              </span>
              {(["low", "mid", "high"] as LambdaBucket[]).map((b) => {
                const done = explored.has(`${mode}-${b}`);
                return (
                  <span
                    key={b}
                    className={`px-2 py-0.5 rounded-full text-[10px] border ${
                      done ? "text-white" : "text-[#475569] border-[#1e293b]"
                    }`}
                    style={done ? { borderColor: meta.color, color: meta.color } : undefined}
                  >
                    {BUCKET_LABEL[b]} {done ? "✓" : ""}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Fit + coefficients grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5">
              <p className="text-[12px] font-semibold text-white mb-2">
                Fitted curve at λ = {formatLambda(lambda)}
              </p>
              <PolyFitChart
                points={DATA}
                fittedCurve={fittedCurve}
                trueCurve={TRUE_CURVE}
                color={meta.color}
                summary={`Scatter plot of ${N_POINTS} noisy points sampled around sin(2.5x), with the degree-8 polynomial fitted by ${meta.label} at lambda ${formatLambda(lambda)}. Train MSE ${fit.trainMse.toFixed(4)}, holdout MSE ${fit.holdoutMse.toFixed(4)}.`}
              />
            </div>

            <div className="lg:col-span-2 flex flex-col gap-4">
              {/* Readouts */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3">
                  <p className="text-[10px] text-[#475569] mb-1">Train MSE</p>
                  <p className="text-[16px] font-mono font-bold text-[#94a3b8]">
                    {fit.trainMse.toFixed(4)}
                  </p>
                </div>
                <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3">
                  <p className="text-[10px] text-[#475569] mb-1">Holdout MSE</p>
                  <p
                    className="text-[16px] font-mono font-bold"
                    style={{
                      color:
                        step > 0 && holdoutDelta < 0
                          ? "var(--color-success)"
                          : "var(--color-warning)",
                    }}
                  >
                    {fit.holdoutMse.toFixed(4)}
                  </p>
                  <p className="text-[10px] text-[#475569] mt-0.5">
                    {step === 0
                      ? "this is the λ = 0 baseline"
                      : `${holdoutDelta < 0 ? "" : "+"}${holdoutDelta.toFixed(4)} vs baseline ${baselineHoldout.toFixed(4)}`}
                  </p>
                </div>
                <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3">
                  <p className="text-[10px] text-[#475569] mb-1">Zero coefficients</p>
                  <p
                    className="text-[16px] font-mono font-bold"
                    style={{
                      color: fit.zeroCount > 0 ? "var(--color-success)" : undefined,
                    }}
                  >
                    <span className={fit.zeroCount > 0 ? "" : "text-white"}>
                      {fit.zeroCount} / {DEGREE}
                    </span>
                  </p>
                </div>
                <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3">
                  <p className="text-[10px] text-[#475569] mb-1">Max |w|</p>
                  <p className="text-[16px] font-mono font-bold text-white">
                    {fit.maxAbsWeight.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Coefficient bars */}
              <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 flex-1">
                <p className="text-[12px] font-semibold text-white mb-2">
                  Coefficients w1..w{DEGREE}
                </p>
                <CoefficientBars
                  weights={fit.weights}
                  color={meta.color}
                  zeroCount={fit.zeroCount}
                  modeLabel={meta.label}
                />
              </div>
            </div>
          </div>

          {/* Formula block */}
          <div className="mt-6 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
            <p className="text-[12px] font-semibold text-white mb-2">
              The math running in your browser
            </p>
            {mode === "l2" ? (
              <>
                <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[12px] rounded-xl p-4 overflow-x-auto leading-relaxed">
{`objective   minimize (1/2n) ||yc - Zw||^2 + (lambda/2) ||w||^2
solution    w = (Z^T Z / n + lambda I)^-1 (Z^T yc / n)`}
                </pre>
                <p className="text-[11px] text-[#475569] mt-2 leading-relaxed">
                  Ridge has a closed form: adding λ to the diagonal of Z^T Z / n makes
                  the system well conditioned, then one pass of Gaussian elimination
                  (with partial pivoting) solves the 8x8 system exactly. Every number
                  above comes from that solve.
                </p>
              </>
            ) : (
              <>
                <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[12px] rounded-xl p-4 overflow-x-auto leading-relaxed">
{`objective   minimize (1/2n) ||y - Zw||^2 + lambda sum_j |w_j|
update      w_j <- S(rho_j, lambda) / nu_j     (cyclic coordinate descent)
            rho_j = (1/n) sum_i z_ij (r_i + z_ij w_j)
            nu_j  = (1/n) sum_i z_ij^2
soft-threshold  S(z, lambda) = sign(z) * max(|z| - lambda, 0)`}
                </pre>
                <p className="text-[11px] text-[#475569] mt-2 leading-relaxed">
                  The L1 penalty has no closed form, so lasso runs cyclic coordinate
                  descent: optimize one weight at a time, holding the rest fixed. The
                  soft-threshold S snaps any weight whose signal is weaker than λ to
                  exactly zero. That is not rounding; zero is the true optimum for that
                  coordinate, which is why lasso performs feature selection.
                </p>
              </>
            )}
          </div>
        </motion.section>

        {/* Section 3: error curves */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-8 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6"
        >
          <p className="text-[13px] font-semibold text-white mb-1">
            The U-shape: train vs holdout error across all λ
          </p>
          <p className="text-[12px] text-[#475569] leading-relaxed mb-4 max-w-[860px]">
            Both curves below are computed by refitting the {meta.label} model at every
            slider position on the real train/holdout split. Training error only gets
            worse as λ grows, but holdout error dips first: a little regularization
            removes variance faster than it adds bias.
          </p>
          <ErrorCurveChart
            curve={curves[mode]}
            currentStep={step}
            color={meta.color}
            modeLabel={meta.label}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div className="rounded-xl border border-[#1e293b] bg-[#162032] p-3">
              <p className="text-[10px] text-[#475569] mb-1">Holdout MSE at λ = 0</p>
              <p className="text-[14px] font-mono font-bold text-[#94a3b8]">
                {baselineHoldout.toFixed(4)}
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] bg-[#162032] p-3">
              <p className="text-[10px] text-[#475569] mb-1">Current holdout MSE</p>
              <p
                className="text-[14px] font-mono font-bold"
                style={{
                  color:
                    step > 0 && holdoutDelta < 0
                      ? "var(--color-success)"
                      : "var(--color-warning)",
                }}
              >
                {fit.holdoutMse.toFixed(4)}
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] bg-[#162032] p-3">
              <p className="text-[10px] text-[#475569] mb-1">
                Best holdout on this curve ({meta.short})
              </p>
              <p
                className="text-[14px] font-mono font-bold"
                style={{ color: "var(--color-success)" }}
              >
                {Math.min(...curves[mode].slice(1).map((c) => c.holdoutMse)).toFixed(4)}
              </p>
            </div>
          </div>
        </motion.section>

        {/* Section 4: geometry */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-8"
        >
          <p className="text-[13px] font-semibold text-white mb-1">
            Why L1 creates zeros and L2 does not
          </p>
          <p className="text-[12px] text-[#475569] leading-relaxed mb-4 max-w-[860px]">
            Penalized regression is equivalent to minimizing the loss inside a
            constraint region around the origin. The penalty type sets the region&apos;s
            shape, and the shape decides where the loss contours first touch it.
          </p>
          <GeometryDiagram />
        </motion.section>

        {/* Section 5: regularization beyond L1/L2 */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
            <p className="text-[12px] font-semibold text-[#3bb4a4] mb-2">
              Early stopping is implicit regularization
            </p>
            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              Gradient descent usually starts from small random weights and grows them
              over training. Halting when validation loss stops improving caps how
              large the weights ever get, so the number of training steps acts like a
              regularization knob. For linear models with squared loss, stopping
              gradient descent early has an effect closely related to ridge&apos;s
              shrinkage: directions the data supports weakly are the slowest to grow
              and get cut off first. You get much of L2&apos;s benefit without ever
              writing a penalty term.
            </p>
          </div>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
            <p className="text-[12px] font-semibold text-[#a855f7] mb-2">
              Weight decay in deep networks
            </p>
            <p className="text-[11px] text-[#94a3b8] leading-relaxed">
              Deep learning frameworks expose L2-style regularization as weight decay:
              every update multiplies weights by a factor slightly below one. For plain
              SGD, weight decay and the L2 penalty produce identical updates. For
              adaptive optimizers like Adam they quietly diverge, which is why AdamW
              decouples the decay from the gradient step. In practice weight decay is
              combined with other regularizers such as{" "}
              <Link
                href="/visual-guides/dropout"
                className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
              >
                Dropout
              </Link>{" "}
              and early stopping rather than used alone.
            </p>
          </div>
        </motion.section>

        {/* Completion card */}
        <AnimatePresence>
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
                  Regularization Tamed!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You explored both penalties across the full λ range and beat the
                  unregularized baseline on held-out data.
                </p>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    {
                      label: "λ regions explored",
                      value: `${explored.size} / 6`,
                      color: "#3bb4a4",
                    },
                    {
                      label: "Holdout MSE at λ = 0",
                      value: baselineHoldout.toFixed(4),
                      color: "var(--color-accent)",
                    },
                    {
                      label: "Your best holdout MSE",
                      value: bestHoldoutSeen !== null ? bestHoldoutSeen.toFixed(4) : "n/a",
                      color: "#a855f7",
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
                    &quot;Regularization deliberately makes training error worse to make
                    generalization better. L2 shrinks every weight smoothly; L1 drives
                    weak ones to exactly zero and hands you feature selection for
                    free.&quot;
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
                    href={NEXT_GUIDE}
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
              href={NEXT_GUIDE}
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
