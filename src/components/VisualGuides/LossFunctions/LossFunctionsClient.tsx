"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import PredictionLossLab from "./PredictionLossLab";
import OutlierBattle from "./OutlierBattle";
import CrossEntropyExplorer from "./CrossEntropyExplorer";
import { fmt } from "./types";

const GUIDE_TITLE = "Loss Functions";

export default function LossFunctionsClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  const [aAdjusted, setAAdjusted] = useState(false);
  const [bOutlierToggled, setBOutlierToggled] = useState(false);
  const [cSweptLow, setCSweptLow] = useState(false);
  const [minP, setMinP] = useState(1);
  const [resetNonce, setResetNonce] = useState(0);

  const isComplete = aAdjusted && bOutlierToggled && cSweptLow;

  const handleAdjust = useCallback(() => setAAdjusted(true), []);
  const handleOutlierOn = useCallback(() => setBOutlierToggled(true), []);
  const handleProbe = useCallback((p: number) => {
    setMinP((m) => Math.min(m, p));
    if (p < 0.1) setCSweptLow(true);
  }, []);

  function handleReset() {
    setAAdjusted(false);
    setBOutlierToggled(false);
    setCSweptLow(false);
    setMinP(1);
    setResetNonce((n) => n + 1);
  }

  const progressItems = [
    { id: "drag", label: "Move the prediction", done: aAdjusted },
    { id: "outlier", label: "Toggle the outlier", done: bOutlierToggled },
    { id: "sweep", label: "Sweep p below 0.1", done: cSweptLow },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="loss-functions" score={100} />
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-10 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[12px] text-[#475569] mb-6">
          <Link href="/visual-guides" className="hover:text-[var(--color-accent)] transition-colors">
            Visual Guides
          </Link>
          <span>/</span>
          <span className="text-[#94a3b8]">{GUIDE_TITLE}</span>
        </nav>

        {/* Hero */}
        <motion.section variants={fadeUp} initial="hidden" animate="visible" className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[var(--color-accent)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[var(--color-accent)]">
              Deep Learning
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Loss Functions{" "}
            <span className="text-[var(--color-accent)]">The Training Signal</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
            A loss function compresses model quality into one differentiable number. Drag,
            toggle, and sweep your way through MSE, MAE, Huber, and cross entropy to see
            what each one actually tells the optimizer.
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
              <Link href="/auth/sign-in" className="underline underline-offset-2 hover:text-[#94a3b8]">
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
                className="ml-auto text-[11px] font-semibold flex items-center gap-1"
                style={{ color: "var(--color-success)" }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-6">
          {/* Intro prose */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6"
          >
            <p className="text-[13px] font-semibold text-white mb-2">
              The loss is the only voice the optimizer hears
            </p>
            <p className="text-[13px] text-[#94a3b8] leading-relaxed mb-3">
              Training a model means turning &quot;how good is this?&quot; into a single
              differentiable number, then pushing that number downhill. Everything{" "}
              <Link href="/visual-guides/gradient-descent" className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80">
                gradient descent
              </Link>{" "}
              does, every weight update{" "}
              <Link href="/visual-guides/backpropagation" className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80">
                backpropagation
              </Link>{" "}
              delivers, starts from the derivative of the loss. Pick a loss that punishes the
              wrong things and the model will diligently learn the wrong things. The three
              experiments below make that concrete: first for regression, then for
              classification.
            </p>
            <p className="text-[13px] text-[#94a3b8] leading-relaxed">
              Two properties matter in practice: what the loss says when the model is slightly
              wrong, and what it says when the model is catastrophically wrong. Different
              losses answer those two questions very differently.
            </p>
          </motion.section>

          {/* Interactive A */}
          <motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={GUIDE_VIEWPORT}>
            <PredictionLossLab key={`a-${resetNonce}`} onAdjust={handleAdjust} />
          </motion.section>

          {/* Interactive B */}
          <motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={GUIDE_VIEWPORT}>
            <OutlierBattle key={`b-${resetNonce}`} onOutlierOn={handleOutlierOn} />
          </motion.section>

          {/* Interactive C */}
          <motion.section variants={fadeUp} initial="hidden" whileInView="visible" viewport={GUIDE_VIEWPORT}>
            <CrossEntropyExplorer key={`c-${resetNonce}`} onProbe={handleProbe} />
          </motion.section>

          {/* Why CE pairs with softmax/sigmoid */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6"
          >
            <p className="text-[13px] font-semibold text-white mb-2">
              Why cross entropy pairs with softmax and sigmoid
            </p>
            <p className="text-[13px] text-[#94a3b8] leading-relaxed mb-3">
              It is gradient behavior, not superstition. A sigmoid or softmax squashes logits
              into probabilities, and its derivative goes to zero at both ends of the squash.
              Chain a squared error through that derivative and the gradient dies exactly when
              the model is confidently wrong, the one moment you need it most. Cross entropy
              contains a log that cancels the squashing function&apos;s derivative, leaving the
              clean logit gradient p - y. This is the same loss you meet in{" "}
              <Link href="/visual-guides/logistic-regression" className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80">
                logistic regression
              </Link>
              , where it goes by the name log loss.
            </p>
            <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[11px] rounded-lg px-3 py-2 overflow-x-auto">
              {"sigmoid + squared error:  dL/dz = 2(p - y) · p(1 - p)   [vanishes near p = 0 or 1]\nsigmoid/softmax + CE:     dL/dz = p - y                 [never vanishes]"}
            </pre>
          </motion.section>

          {/* Concept cards */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {([
              {
                title: "Huber: the compromise",
                body: "Quadratic near zero for a smooth, proportional gradient on small errors; linear beyond delta so outliers cannot dominate a batch. You get MSE's stable convergence and most of MAE's robustness, at the cost of one hyperparameter to tune.",
                color: "var(--color-accent)",
              },
              {
                title: "Loss vs metric",
                body: "You optimize the loss; you report metrics. Accuracy, F1, and AUC are step functions of the predictions, so their gradients are zero almost everywhere and useless for training. Train on cross entropy, then judge the model with the metrics that stakeholders care about.",
                color: "#3bb4a4",
                link: { href: "/visual-guides/model-evaluation", label: "Model evaluation guide" },
              },
              {
                title: "Choosing in practice",
                body: "Regression with trusted data: MSE. Regression with heavy tails or sensor glitches: Huber or MAE. Classification: cross entropy, essentially always. If you find yourself inventing a loss, first check whether the problem is really the data.",
                color: "#a855f7",
              },
            ] as { title: string; body: string; color: string; link?: { href: string; label: string } }[]).map((c) => (
              <div key={c.title} className="rounded-xl border border-[#1e293b] p-4">
                <p className="text-[11px] font-semibold mb-2" style={{ color: c.color }}>
                  {c.title}
                </p>
                <p className="text-[11px] text-[#94a3b8] leading-relaxed">{c.body}</p>
                {c.link && (
                  <Link
                    href={c.link.href}
                    className="inline-block mt-2 text-[11px] text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
                  >
                    {c.link.label}
                  </Link>
                )}
              </div>
            ))}
          </motion.section>
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
                  You Speak Loss Now
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You compared three regression losses point by point, watched an outlier hijack
                  a least-squares fit, and saw why cross entropy keeps the gradient alive.
                </p>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Regression losses compared", value: "MSE + MAE + Huber", color: "#3bb4a4" },
                    { label: "Outlier stress test", value: "Run", color: "var(--color-warning)" },
                    { label: "Lowest p explored", value: fmt(minP), color: "#a855f7" },
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
                    &quot;The loss function is the only voice the optimizer hears. MSE shouts
                    about outliers, MAE stays calm about them, and cross entropy keeps talking
                    precisely when a classifier is confidently wrong.&quot;
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
                    href="/visual-guides/backpropagation"
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
              href="/visual-guides/backpropagation"
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
