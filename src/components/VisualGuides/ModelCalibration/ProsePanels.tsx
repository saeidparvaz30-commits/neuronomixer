"use client";

import React, { useState } from "react";
import Link from "next/link";

interface Props {
  aucRaw: number;
  aucCalibrated: number;
  onWhenItMattersOpened: () => void;
  whenItMattersRead: boolean;
}

interface PanelDef {
  id: string;
  title: string;
  body: React.ReactNode;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ProsePanelsInner({
  aucRaw,
  aucCalibrated,
  onWhenItMattersOpened,
  whenItMattersRead,
}: Props) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (id === "matters") onWhenItMattersOpened();
      }
      return next;
    });
  }

  const panels: PanelDef[] = [
    {
      id: "overconfident",
      title: "Why modern neural nets tend to be overconfident",
      body: (
        <p className="text-[12px] text-[#94a3b8] leading-relaxed">
          Guo et al. (2017) reported that modern deep networks are often markedly less
          calibrated than the smaller models of the 1990s, even as their accuracy improved.
          In their experiments, factors such as increased model capacity, batch normalization,
          and reduced weight regularization were associated with overconfidence: the network
          keeps pushing its logits to extremes to shave the training loss long after its
          accuracy has stopped improving. The pattern is common but not universal, and it can
          vary by architecture and training recipe. Their proposed remedy is the one you are
          using in this guide: temperature scaling, a single scalar T fitted on a validation
          set, which they found surprisingly effective. A related failure shows up in language
          models, where fluent wording can signal far more certainty than the model actually
          has; see the{" "}
          <Link
            href="/visual-guides/hallucination"
            className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
          >
            hallucination guide
          </Link>{" "}
          for that story.
        </p>
      ),
    },
    {
      id: "matters",
      title: "When calibration matters (open this to complete the guide)",
      body: (
        <div className="flex flex-col gap-2.5 text-[12px] text-[#94a3b8] leading-relaxed">
          <p>
            <strong className="text-white">Thresholded decisions.</strong> If a triage system
            escalates every case above 90 percent predicted risk, a miscalibrated model
            escalates the wrong volume of cases: an overconfident model floods the queue, an
            underconfident one silently drops true positives. The threshold only means what
            you think it means when the probabilities are calibrated. The{" "}
            <Link
              href="/visual-guides/confusion-matrix"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              confusion matrix guide
            </Link>{" "}
            shows how those threshold choices play out.
          </p>
          <p>
            <strong className="text-white">Risk estimates shown to humans.</strong> A doctor,
            underwriter, or engineer reading &quot;80 percent&quot; will act on it as a
            frequency. If predictions at 80 percent confidence are only right 60 percent of
            the time, every downstream judgment inherits that distortion.
          </p>
          <p>
            <strong className="text-white">Systems that consume probabilities.</strong>{" "}
            Expected-value calculations, bet sizing, ranking with costs, and ensembling all
            multiply or compare raw probabilities. Feed them miscalibrated inputs and the math
            is wrong even when the model&apos;s ranking is perfect.
          </p>
        </div>
      ),
    },
    {
      id: "discrimination",
      title: "Calibration is not discrimination",
      body: (
        <div className="flex flex-col gap-2.5 text-[12px] text-[#94a3b8] leading-relaxed">
          <p>
            Discrimination asks: does the model rank positives above negatives? Calibration
            asks: do the probability values mean what they say? Temperature scaling is a
            strictly monotone transformation, so it never reorders predictions. It can fix
            calibration while leaving AUC, and every{" "}
            <Link
              href="/visual-guides/roc-curves"
              className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80"
            >
              ROC curve
            </Link>{" "}
            point, exactly where it was.
          </p>
          <p className="font-mono text-[11px] text-[#93c5fd] bg-[#1e293b]/60 rounded-lg px-3 py-2">
            Computed on this data: AUC (raw model) = {aucRaw.toFixed(4)} · AUC (after your
            temperature) = {aucCalibrated.toFixed(4)}
          </p>
          <p>
            The two numbers above are recomputed live from the on-screen predictions and stay
            identical no matter where you drag either slider. That is the whole point: a model
            can be excellent at ranking and terrible at probabilities, or the reverse. You
            need both diagnostics.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {panels.map((p) => {
        const isOpen = open.has(p.id);
        const isGatePanel = p.id === "matters";
        return (
          <div key={p.id} className="rounded-2xl border border-[#1e293b] bg-[#0f172a] overflow-hidden">
            <button
              onClick={() => toggle(p.id)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-[#162032] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
            >
              <span className="text-[13px] font-semibold text-white flex items-center gap-2">
                {p.title}
                {isGatePanel && whenItMattersRead && (
                  <span className="text-[10px] font-semibold text-[var(--color-success)] flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Read
                  </span>
                )}
              </span>
              <span className="text-[#94a3b8]">
                <Chevron open={isOpen} />
              </span>
            </button>
            {isOpen && <div className="px-5 pb-5">{p.body}</div>}
          </div>
        );
      })}
    </div>
  );
}

const ProsePanels = React.memo(ProsePanelsInner);
export default ProsePanels;
