"use client";

import React, { useState } from "react";
import Link from "next/link";

interface Props {
  onMetricPanelOpen: () => void;
}

interface PanelDef {
  id: string;
  title: string;
  body: React.ReactNode;
}

const linkCls =
  "text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80 transition-opacity";

const PANELS: PanelDef[] = [
  {
    id: "resampling",
    title: "Resampling: undersampling, oversampling, SMOTE",
    body: (
      <>
        <p className="mb-2">
          <span className="font-semibold text-white">Undersampling</span> throws away
          majority-class examples until the classes are closer to balanced. It is cheap
          and often surprisingly effective, but you are literally discarding data, and
          with it some of the signal about where the majority class lives.
        </p>
        <p className="mb-2">
          <span className="font-semibold text-white">Oversampling</span> duplicates
          minority examples. No information is lost, but the model sees the same few
          points many times, which invites overfitting to those exact points.
        </p>
        <p className="mb-2">
          <span className="font-semibold text-white">SMOTE</span> generates synthetic
          minority points by interpolating between a minority example and one of its
          nearest minority neighbors. Be honest about what that is: interpolation. It
          smooths the existing minority region rather than adding new information, and in
          noisy or overlapping regions it can manufacture points that belong to the wrong
          class. It tends to help most with low-dimensional tabular data and weak
          learners, and least when classes genuinely overlap.
        </p>
        <p>
          Whatever you resample, do it inside the training folds only. Resampling before
          the split leaks synthetic copies of validation points into training.
        </p>
      </>
    ),
  },
  {
    id: "class-weights",
    title: "Class weights and cost-sensitive learning",
    body: (
      <>
        <p className="mb-2">
          Instead of changing the data, change the loss: multiply the penalty for
          minority-class mistakes by a weight, so a missed positive costs the model more
          than a missed negative. Most libraries expose this directly, for example{" "}
          <code className="font-mono text-[#93c5fd]">class_weight=&quot;balanced&quot;</code>{" "}
          in scikit-learn or{" "}
          <code className="font-mono text-[#93c5fd]">pos_weight</code> in PyTorch&apos;s
          BCE loss.
        </p>
        <p className="mb-2">
          For many losses this is equivalent in expectation to oversampling at the same
          ratio, without the duplicated data. It shifts the decision boundary toward the
          majority side, trading false negatives for false positives.
        </p>
        <p>
          The principled version is cost-sensitive learning: write down the actual cost
          of a false positive and a false negative (a missed fraud case is rarely worth
          the same as a false alarm), then choose weights and the decision threshold from
          those costs. A well calibrated probability model, like{" "}
          <Link href="/visual-guides/logistic-regression" className={linkCls}>
            logistic regression
          </Link>
          , lets you set the threshold analytically from the cost ratio.
        </p>
      </>
    ),
  },
  {
    id: "which-metric",
    title: "Which metric when",
    body: (
      <>
        <ul className="list-disc pl-5 space-y-1.5 mb-2">
          <li>
            <span className="font-semibold text-white">Accuracy</span>: only when classes
            are roughly balanced and both error types cost about the same. Under
            imbalance it mostly measures the class prior, as the baseline card above
            shows.
          </li>
          <li>
            <span className="font-semibold text-white">Precision</span>: when false
            positives are expensive (spam filters, alert fatigue in monitoring).
          </li>
          <li>
            <span className="font-semibold text-white">Recall</span>: when false
            negatives are expensive (cancer screening, fraud detection).
          </li>
          <li>
            <span className="font-semibold text-white">F1</span>: when you need a single
            number that punishes neglecting either side. Remember it ignores true
            negatives entirely.
          </li>
          <li>
            <span className="font-semibold text-white">PR-AUC / average precision</span>:
            the curve to watch under heavy imbalance when the positive class is what you
            care about. It is sensitive to prevalence by design.
          </li>
          <li>
            <span className="font-semibold text-white">ROC-AUC</span>: a clean measure of
            ranking quality that is insensitive to the class mix. That same insensitivity
            makes it look flattering on imbalanced problems, exactly what the two curves
            above demonstrate.
          </li>
        </ul>
        <p>
          The four counts behind all of these are unpacked in the{" "}
          <Link href="/visual-guides/confusion-matrix" className={linkCls}>
            confusion matrix guide
          </Link>
          , and the ranking view gets its own treatment in the{" "}
          <Link href="/visual-guides/roc-curves" className={linkCls}>
            ROC curves guide
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    id: "base-rates",
    title: "Base rates: why precision collapses",
    body: (
      <>
        <p className="mb-2">
          Precision is a posterior probability: P(actually positive | predicted
          positive). By Bayes&apos; rule that depends on the prevalence of positives, not
          just on how good the classifier is. Hold the true positive rate and false
          positive rate fixed and shrink the prevalence, and precision must fall, because
          the false positives now come from a vastly larger pool.
        </p>
        <p>
          This is the same arithmetic as the classic medical-test paradox, where a 99%
          accurate test for a rare disease still yields mostly false alarms. If that
          feels surprising, work through the{" "}
          <Link href="/visual-guides/bayes-theorem" className={linkCls}>
            Bayes&apos; theorem guide
          </Link>{" "}
          and then come back to the PR curve above.
        </p>
      </>
    ),
  },
];

function ConceptPanelsInner({ onMetricPanelOpen }: Props) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (id === "which-metric") onMetricPanelOpen();
  }

  return (
    <div className="space-y-3">
      {PANELS.map((panel) => {
        const isOpen = open.has(panel.id);
        return (
          <div
            key={panel.id}
            className="rounded-2xl border border-[#1e293b] bg-[#0f172a] overflow-hidden"
          >
            <button
              onClick={() => toggle(panel.id)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-[#162032] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
            >
              <span className="text-[13px] font-semibold text-white">
                {panel.title}
              </span>
              <span
                className={`text-[#94a3b8] text-sm transition-transform ${isOpen ? "rotate-90" : ""}`}
                aria-hidden="true"
              >
                &#8250;
              </span>
            </button>
            {isOpen && (
              <div className="px-5 pb-5 text-[12.5px] text-[#94a3b8] leading-relaxed">
                {panel.body}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const ConceptPanels = React.memo(ConceptPanelsInner);
export default ConceptPanels;
