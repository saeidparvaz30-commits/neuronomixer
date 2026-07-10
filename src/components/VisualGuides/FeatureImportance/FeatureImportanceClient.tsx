"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  DATASET,
  FEATURES,
  NUM_ROWS,
  NUM_TREES,
  MAX_DEPTH,
  EMPTY_SET,
  type TreeNode,
  buildBaggedTree,
  ensembleAccuracy,
  permutationImportance,
  ensembleAttribution,
} from "./featureImportanceMath";
import DatasetTrainPanel from "./DatasetTrainPanel";
import PermutationLab from "./PermutationLab";
import AttributionWaterfall from "./AttributionWaterfall";

const GUIDE_TITLE = "Feature Importance and SHAP Intuition";
const NEXT_GUIDE_SLUG = "k-means";

export default function FeatureImportanceClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Model + interaction state (Try Again restores exactly these) ─────────
  const [trees, setTrees] = useState<TreeNode[]>([]);
  const [training, setTraining] = useState(false);
  const [permuted, setPermuted] = useState<Set<number>>(() => new Set());
  const [everPermuted, setEverPermuted] = useState<Set<number>>(
    () => new Set()
  );
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [gateRow, setGateRow] = useState(false);
  const [quizPick, setQuizPick] = useState<number | null>(null);
  const [quizSolved, setQuizSolved] = useState(false);
  const runId = useRef(0);

  const trained = trees.length === NUM_TREES;

  // ── Derived numbers, all recomputed from the trained forest ──────────────
  const baselineAcc = useMemo(
    () => (trained ? ensembleAccuracy(trees, EMPTY_SET) : null),
    [trees, trained]
  );
  const currentAcc = useMemo(
    () => (trained ? ensembleAccuracy(trees, permuted) : null),
    [trees, trained, permuted]
  );
  const importances = useMemo(
    () =>
      trained ? FEATURES.map((_, f) => permutationImportance(trees, f)) : null,
    [trees, trained]
  );
  const topFeature = useMemo(() => {
    if (importances === null) return null;
    let best = 0;
    for (let f = 1; f < importances.length; f++) {
      if (importances[f] > importances[best]) best = f;
    }
    return best;
  }, [importances]);
  const attribution = useMemo(
    () =>
      trained && selectedRow !== null
        ? ensembleAttribution(trees, DATASET[selectedRow].x)
        : null,
    [trees, trained, selectedRow]
  );

  // ── Gates ─────────────────────────────────────────────────────────────────
  const gateTrain = trained;
  const gatePermute = everPermuted.size >= 2;
  const isComplete = gateTrain && gatePermute && gateRow && quizSolved;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleTrain = useCallback(() => {
    if (training) return;
    const id = ++runId.current;
    setTrees([]);
    setTraining(true);
    const built: TreeNode[] = [];
    const step = () => {
      if (runId.current !== id) return;
      built.push(buildBaggedTree(built.length));
      setTrees([...built]);
      if (built.length < NUM_TREES) {
        setTimeout(step, 55);
      } else {
        setTraining(false);
      }
    };
    setTimeout(step, 40);
  }, [training]);

  const handleTogglePermute = useCallback(
    (f: number) => {
      if (!trained) return;
      const turningOn = !permuted.has(f);
      const next = new Set(permuted);
      if (turningOn) next.add(f);
      else next.delete(f);
      setPermuted(next);
      if (turningOn) {
        setEverPermuted((prev) => {
          const grown = new Set(prev);
          grown.add(f);
          return grown;
        });
      }
    },
    [permuted, trained]
  );

  const handleSelectRow = useCallback(
    (i: number) => {
      setSelectedRow(i);
      if (trained) setGateRow(true);
    },
    [trained]
  );

  const handleQuizPick = useCallback(
    (f: number) => {
      if (!trained || topFeature === null) return;
      setQuizPick(f);
      if (f === topFeature) setQuizSolved(true);
    },
    [trained, topFeature]
  );

  function handleReset() {
    runId.current++;
    setTrees([]);
    setTraining(false);
    setPermuted(new Set());
    setEverPermuted(new Set());
    setSelectedRow(null);
    setGateRow(false);
    setQuizPick(null);
    setQuizSolved(false);
  }

  const progressItems = [
    { id: "train", label: `Train the ${NUM_TREES}-tree forest`, done: gateTrain },
    { id: "permute", label: "Shuffle 2 different columns", done: gatePermute },
    { id: "quiz", label: "Spot the top feature", done: quizSolved },
    { id: "row", label: "Explain one prediction", done: gateRow },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion
        isComplete={isComplete}
        guideSlug="feature-importance"
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
            Feature Importance and{" "}
            <span className="text-[var(--color-accent)]">SHAP Intuition</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            A trained model is a black box until you interrogate it. Train a
            real tree ensemble on {NUM_ROWS} visible rows, break each feature
            with a permutation to measure what mattered globally, then
            decompose one prediction into per-feature pushes that sum exactly
            to the output.
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
            Two different questions, two different tools
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            &quot;Which inputs does my model rely on?&quot; is a global
            question about the whole model. &quot;Why did it predict THIS for
            THIS row?&quot; is a local question about one prediction. Both are
            model inspection: they describe what the trained model uses, which
            is not the same as what causes churn in the world.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Global: permutation importance
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Shuffle one column so its values no longer line up with the
                right rows, then remeasure accuracy. The information channel is
                cut while the column&apos;s distribution stays intact. A big
                drop means the model was leaning on that feature.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                Local: additive attribution
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Start from the model&apos;s base rate and credit each feature
                with a signed push, so that base plus pushes equals the
                prediction exactly. SHAP is the best-known scheme; for trees we
                can read an exact additive decomposition straight off the
                decision paths.
              </p>
            </div>
            <div className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                A property of the model, not the world
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Importance tells you what this particular model uses. Correlated
                features split credit in arbitrary ways, and a feature can
                matter in the world yet score zero because the model found a
                substitute. Never read importance as causality.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Step 1: data + training */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 1: meet the data, then train a real forest on it
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Every row is visible below: a toy churn dataset generated with a
            fixed seed. By construction the label leans hard on usage,
            moderately on tenure, lightly on support calls, and ignores the zip
            digit entirely. The model never sees that recipe; your job is to
            recover it from the trained forest.
          </p>
          <DatasetTrainPanel
            treesBuilt={trees.length}
            training={training}
            trained={trained}
            baselineAcc={baselineAcc}
            permuted={permuted}
            selectedRow={selectedRow}
            onTrain={handleTrain}
            onSelectRow={handleSelectRow}
          />
        </motion.section>

        {/* Step 2: permutation lab */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 2: break features one at a time
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Shuffle a column and the table in Step 1 updates: the values are
            really permuted (a fixed, seeded shuffle) and the accuracy bar is
            recomputed by running all {NUM_ROWS} rows back through the forest.
            Shuffle a column the model relies on and accuracy craters; shuffle
            the noise column and nothing happens.
          </p>
          <PermutationLab
            trained={trained}
            permuted={permuted}
            onToggle={handleTogglePermute}
            baselineAcc={baselineAcc}
            currentAcc={currentAcc}
            importances={importances}
            showImportance={gatePermute}
          />
        </motion.section>

        {/* Step 3: quiz */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 3: which feature does YOUR forest lean on most?
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Answer from the evidence you just generated: the correct option is
            whichever feature has the largest measured accuracy drop for the
            forest you trained, not a hardcoded answer key.
          </p>
          <div
            role="radiogroup"
            aria-label="Most important feature options"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3"
          >
            {FEATURES.map((f, i) => {
              const picked = quizPick === i;
              const correct = topFeature !== null && i === topFeature;
              const showState = picked || (quizSolved && correct);
              return (
                <button
                  key={f.key}
                  role="radio"
                  aria-checked={picked}
                  onClick={() => handleQuizPick(i)}
                  disabled={!trained || quizSolved}
                  className={`rounded-xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:opacity-60 ${
                    showState
                      ? correct
                        ? "border-[var(--color-success)]"
                        : "border-[#ef4444]"
                      : "border-[#1e293b] hover:border-[#334155]"
                  } ${quizSolved && !correct ? "opacity-50" : ""}`}
                >
                  <p className="text-[13px] font-semibold text-[#f1f5f9]">
                    {f.label}
                  </p>
                  <p className="text-[11px] text-[#94a3b8]">{f.blurb}</p>
                  {showState && (
                    <p
                      className={`text-[10px] font-semibold mt-1 ${
                        correct
                          ? "text-[var(--color-success)]"
                          : "text-[#ef4444]"
                      }`}
                    >
                      {correct ? "Correct" : "Not quite"}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
          {!trained && (
            <p className="text-[11px] text-[var(--color-warning)]">
              Train the forest first; the answer is measured from it.
            </p>
          )}
          {quizPick !== null && !quizSolved && (
            <p className="text-[11px] text-[var(--color-warning)] leading-relaxed">
              Check the accuracy drops in Step 2: the biggest drop marks the
              feature the model depends on most. Try again.
            </p>
          )}
          {quizSolved && topFeature !== null && importances !== null && (
            <p className="text-[11px] text-[var(--color-success)] leading-relaxed">
              Right: shuffling {FEATURES[topFeature].label.toLowerCase()} costs
              your forest {(100 * importances[topFeature]).toFixed(1)}{" "}
              percentage points of accuracy, more than any other column. The
              generator&apos;s heaviest ingredient, recovered purely by
              breaking the model.
            </p>
          )}
        </motion.section>

        {/* Step 4: local attribution waterfall */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-2">
            Step 4: explain one prediction, exactly
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Global importance says what the model uses on average. For a single
            customer we can do better: walk each tree&apos;s decision path and
            credit every split to the feature that made it. The result is a
            SHAP-style waterfall whose bars sum exactly to this forest&apos;s
            prediction for that row.
          </p>
          <AttributionWaterfall
            trained={trained}
            selectedRow={selectedRow}
            attribution={attribution}
            onSelectRow={handleSelectRow}
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
                  Model, Interrogated
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You trained a real forest, measured what it relies on by
                  breaking its inputs, and decomposed a single prediction
                  exactly.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Your forest
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {NUM_TREES} trees, depth ≤ {MAX_DEPTH},{" "}
                      {baselineAcc !== null
                        ? `${(100 * baselineAcc).toFixed(1)}%`
                        : ""}{" "}
                      training accuracy
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Biggest permutation hit
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-warning)]">
                      {topFeature !== null && importances !== null
                        ? `${FEATURES[topFeature].label}: -${(100 * importances[topFeature]).toFixed(1)} pp`
                        : ""}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#1e293b] p-3">
                    <p className="text-[10px] text-[#475569] mb-1">
                      Your explained row
                    </p>
                    <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                      {selectedRow !== null && attribution !== null
                        ? `Row ${selectedRow + 1}: ${attribution.base.toFixed(2)} to ${attribution.prediction.toFixed(2)}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border-l-4 border-[var(--color-accent)] bg-[#d4af37]/5 border border-[#d4af37]/20 p-4 mb-2">
                  <p className="text-[12px] font-semibold text-[var(--color-accent)] mb-1.5 uppercase tracking-wide">
                    Key Takeaway
                  </p>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed italic">
                    &quot;Permutation importance breaks a feature&apos;s
                    information channel and measures the damage; additive
                    attribution splits one prediction into per-feature pushes
                    that sum exactly to the output. Both describe what YOUR
                    model uses, never what causes the outcome in the
                    world.&quot;
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
