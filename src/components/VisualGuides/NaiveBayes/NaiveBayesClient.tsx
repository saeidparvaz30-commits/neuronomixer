"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  VOCAB,
  CORPUS,
  corpusPriors,
  corpusLikelihoods,
  bernoulliPosterior,
  fitGaussianNB,
  INITIAL_HAM_POINTS,
  INITIAL_SPAM_POINTS,
  DOMAIN,
  Pt,
  round2,
} from "./nbMath";
import SpamFilterLab from "./SpamFilterLab";
import GaussianNBLab from "./GaussianNBLab";

const GUIDE_TITLE = "Naive Bayes";
const NEXT_GUIDE_SLUG = "knn";

// Everything below is computed from the visible corpus at module scope,
// deterministically (hydration safe).
const PRIORS = corpusPriors(CORPUS);
const CORPUS_LIKE = corpusLikelihoods(CORPUS, VOCAB);
// Sliders live on a 0.01 grid, so their starting values are the corpus
// estimates rounded to 2 decimals (shown next to each slider as "corp").
const INITIAL_LIKE_SPAM = CORPUS_LIKE.spam.map(round2);
const INITIAL_LIKE_HAM = CORPUS_LIKE.ham.map(round2);
const INITIAL_PRESENT = VOCAB.map((w) => w === "free" || w === "winner" || w === "click");

const clampX = (v: number) => Math.min(DOMAIN.x1, Math.max(DOMAIN.x0, v));
const clampY = (v: number) => Math.min(DOMAIN.y1, Math.max(DOMAIN.y0, v));

export default function NaiveBayesClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Interaction state (mount defaults; Try Again restores exactly these) ──
  const [likeSpam, setLikeSpam] = useState<number[]>(() => [...INITIAL_LIKE_SPAM]);
  const [likeHam, setLikeHam] = useState<number[]>(() => [...INITIAL_LIKE_HAM]);
  const [present, setPresent] = useState<boolean[]>(() => [...INITIAL_PRESENT]);
  const [hamPts, setHamPts] = useState<Pt[]>(() => INITIAL_HAM_POINTS.map((p) => ({ ...p })));
  const [spamPts, setSpamPts] = useState<Pt[]>(() => INITIAL_SPAM_POINTS.map((p) => ({ ...p })));
  const [resetVersion, setResetVersion] = useState(0);

  // ── Gates ──────────────────────────────────────────────────────────────────
  const [gateLikelihood, setGateLikelihood] = useState(false);
  const [gateMessage, setGateMessage] = useState(false);
  const [gatePointMoved, setGatePointMoved] = useState(false);
  const isComplete = gateLikelihood && gateMessage && gatePointMoved;

  // ── Derived (all displayed numbers flow from these) ────────────────────────
  const posterior = useMemo(
    () => bernoulliPosterior(present, likeSpam, likeHam, PRIORS.pSpam, PRIORS.pHam),
    [present, likeSpam, likeHam]
  );
  const fit = useMemo(() => fitGaussianNB(hamPts, spamPts), [hamPts, spamPts]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleLikelihoodChange = useCallback(
    (cls: "spam" | "ham", idx: number, value: number) => {
      const setter = cls === "spam" ? setLikeSpam : setLikeHam;
      const initial = cls === "spam" ? INITIAL_LIKE_SPAM : INITIAL_LIKE_HAM;
      setter((prev) => {
        if (prev[idx] === value) return prev;
        const next = [...prev];
        next[idx] = value;
        return next;
      });
      // Earned only by an actual departure from the corpus estimate.
      if (Math.abs(value - initial[idx]) > 1e-9) setGateLikelihood(true);
    },
    []
  );

  const handleResetLikelihoods = useCallback(() => {
    setLikeSpam([...INITIAL_LIKE_SPAM]);
    setLikeHam([...INITIAL_LIKE_HAM]);
  }, []);

  const handleToggleWord = useCallback((idx: number) => {
    setPresent((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
    // A toggle always flips presence, so this is always a real change.
    setGateMessage(true);
  }, []);

  const handleMovePoint = useCallback(
    (cls: "spam" | "ham", idx: number, x: number, y: number) => {
      const pts = cls === "spam" ? spamPts : hamPts;
      const nx = round2(clampX(x));
      const ny = round2(clampY(y));
      const p = pts[idx];
      if (p.x === nx && p.y === ny) return; // clamped or no-op move earns nothing
      const next = pts.map((q, k) => (k === idx ? { x: nx, y: ny } : q));
      (cls === "spam" ? setSpamPts : setHamPts)(next);
      setGatePointMoved(true);
    },
    [spamPts, hamPts]
  );

  function handleReset() {
    setLikeSpam([...INITIAL_LIKE_SPAM]);
    setLikeHam([...INITIAL_LIKE_HAM]);
    setPresent([...INITIAL_PRESENT]);
    setHamPts(INITIAL_HAM_POINTS.map((p) => ({ ...p })));
    setSpamPts(INITIAL_SPAM_POINTS.map((p) => ({ ...p })));
    setGateLikelihood(false);
    setGateMessage(false);
    setGatePointMoved(false);
    setResetVersion((v) => v + 1);
  }

  const progressItems = [
    { id: "likelihood", label: "Tune a word likelihood", done: gateLikelihood },
    { id: "message", label: "Edit the incoming message", done: gateMessage },
    { id: "point", label: "Move a training point", done: gatePointMoved },
  ];

  const verdictSpam = posterior.pSpam >= 0.5;

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug="naive-bayes" score={100} />
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
              Machine Learning
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3"
          >
            Naive <span className="text-[var(--color-accent)]">Bayes</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Classification as Bayes rule with a bold independence assumption.
            Build a spam filter from a ten-message corpus, tune its word
            likelihoods, then drag points in a 2D Gaussian view and watch the
            decision boundary refit in real time.
          </motion.p>
        </section>

        {/* Progress */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          {progressItems.map((item) => (
            <div key={item.id} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full transition-colors"
                style={{ background: item.done ? "var(--color-accent)" : "#1e293b" }}
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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
            Bayes rule, then one bold shortcut
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Bayes rule says the posterior probability of a class is
            proportional to its prior times the likelihood of the evidence.
            The joint likelihood of many words is hopeless to estimate from a
            small corpus, so naive Bayes assumes every word is conditionally
            independent given the class and multiplies per-word likelihoods
            instead. That single assumption turns classification into
            counting.
          </p>
          <pre className="bg-[#1e293b]/60 font-mono text-[#93c5fd] text-[11px] leading-relaxed rounded-xl p-4 overflow-x-auto mb-4">
{`P(spam | words) ∝ P(spam) * P(w1 | spam) * P(w2 | spam) * ... * P(wn | spam)

naive assumption: words are independent GIVEN the class

log odds = log P(spam)/P(ham) + Σ log P(evidence_i | spam)/P(evidence_i | ham)
posterior = sigmoid(log odds)`}
          </pre>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Why it is fast
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Training is one pass of counting: label frequencies give the
                priors, word frequencies per class give the likelihoods. The
                lab below fits its entire model from ten visible messages, and
                you can audit every count yourself.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Where the assumption bites
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                In this corpus, winner never appears in spam without free, yet
                the model counts each as a fresh, independent clue. Correlated
                features get double counted, which drives posteriors toward 0
                or 1 far more confidently than the evidence justifies.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Why it still works
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                The decision only needs the correct side of 0.5, not a
                calibrated probability. Even with overconfident posteriors the
                argmax is often right, which is why naive Bayes filtered spam
                for decades and remains a strong baseline for text.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Spam filter lab */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Lab 1: a spam filter you can audit
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            The corpus below is the entire training set. Priors are its label
            frequencies; each slider starts at that word&apos;s Laplace-smoothed
            corpus estimate. Drag a slider to overrule the corpus and watch the
            posterior bars recompute through Bayes rule, then toggle words in
            the incoming message to change the evidence itself.
          </p>
          <SpamFilterLab
            priors={PRIORS}
            likeSpam={likeSpam}
            likeHam={likeHam}
            corpusLikeSpam={INITIAL_LIKE_SPAM}
            corpusLikeHam={INITIAL_LIKE_HAM}
            present={present}
            posterior={posterior}
            onLikelihoodChange={handleLikelihoodChange}
            onToggleWord={handleToggleWord}
            onResetLikelihoods={handleResetLikelihoods}
          />
        </motion.section>

        {/* Gaussian NB lab */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Lab 2: the same idea with continuous features
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Swap word counts for two continuous features and the recipe is
            unchanged: fit one Gaussian per feature per class, multiply, apply
            Bayes rule. Independence now means a diagonal covariance, so each
            class-conditional ellipse stays axis aligned no matter how tilted
            your point cloud gets. Drag points (or Tab to one and use the
            arrow keys) and watch means, variances, and the gold P = 0.5
            boundary refit from the actual points. Try dragging one cluster
            into a slanted line: the fitted ellipse cannot tilt to follow it,
            and that gap is exactly what the naive assumption throws away.
          </p>
          <GaussianNBLab
            key={resetVersion}
            hamPts={hamPts}
            spamPts={spamPts}
            fit={fit}
            onMovePoint={handleMovePoint}
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
                  Naively, Correctly Classified
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You tuned likelihoods against a visible corpus, changed the
                  evidence itself, and refit a Gaussian boundary by hand.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Your message right now
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {verdictSpam ? "SPAM" : "HAM"} at{" "}
                      {(100 * Math.max(posterior.pSpam, posterior.pHam)).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Corpus priors (fixed by the labels)
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-success)]">
                      P(spam) = {PRIORS.spamCount}/{PRIORS.total} ={" "}
                      {PRIORS.pSpam.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Gaussian fit, current spam mean
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      ({fit.spam.mean[0].toFixed(2)}, {fit.spam.mean[1].toFixed(2)})
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Naive Bayes bets that features are independent given
                    the class. The bet is usually false and the posteriors come
                    out overconfident, yet the argmax decision is often right,
                    so counting words and fitting per-axis Gaussians can still
                    classify remarkably well.&quot;
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
