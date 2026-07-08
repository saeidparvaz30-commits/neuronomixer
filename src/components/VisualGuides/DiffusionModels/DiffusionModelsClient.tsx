"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import type { ScheduleId } from "./types";
import { T } from "./types";
import ForwardDiffusionPanel from "./ForwardDiffusionPanel";
import ReverseDiffusionPanel from "./ReverseDiffusionPanel";
import NoiseSchedulePanel from "./NoiseSchedulePanel";
import FamilyTreePanel from "./FamilyTreePanel";

const GUIDE_SLUG = "diffusion-models";
const NEXT_GUIDE_SLUG = "gans";
const REVERSE_STEP_MS = 70;

export default function DiffusionModelsClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // Forward process state
  const [t, setT] = useState(0);
  const [schedule, setSchedule] = useState<ScheduleId>("cosine");
  const [reachedMax, setReachedMax] = useState(false);
  const [returnedToZero, setReturnedToZero] = useState(false);

  // Reverse process state
  const [reverseT, setReverseT] = useState(T);
  const [reverseRunning, setReverseRunning] = useState(false);
  const [reverseDone, setReverseDone] = useState(false);

  // Family tree state
  const [familyOpen, setFamilyOpen] = useState(false);
  const [familyOpened, setFamilyOpened] = useState(false);

  const isComplete =
    reachedMax && returnedToZero && reverseDone && familyOpened;

  // Reverse animation: step t down until it reaches 0
  useEffect(() => {
    if (!reverseRunning) return;
    if (reverseT === 0) {
      setReverseRunning(false);
      setReverseDone(true);
      return;
    }
    const id = window.setTimeout(
      () => setReverseT((prev) => Math.max(0, prev - 1)),
      REVERSE_STEP_MS
    );
    return () => window.clearTimeout(id);
  }, [reverseRunning, reverseT]);

  function handleTChange(value: number) {
    setT(value);
    if (value === T) setReachedMax(true);
    if (value === 0 && reachedMax) setReturnedToZero(true);
  }

  function handleRunReverse() {
    if (reverseRunning) return;
    setReverseT(T);
    setReverseRunning(true);
  }

  function handleFamilyToggle() {
    setFamilyOpen((prev) => !prev);
    setFamilyOpened(true);
  }

  function handleReset() {
    setT(0);
    setSchedule("cosine");
    setReachedMax(false);
    setReturnedToZero(false);
    setReverseT(T);
    setReverseRunning(false);
    setReverseDone(false);
    setFamilyOpen(false);
    setFamilyOpened(false);
  }

  const progressItems = [
    { id: "noise", label: `Reach full noise (t = ${T})`, done: reachedMax },
    { id: "back", label: "Sweep back to t = 0", done: returnedToZero },
    { id: "reverse", label: "Run the reverse process", done: reverseDone },
    { id: "family", label: "Open the family tree", done: familyOpened },
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
          <span className="text-[#94a3b8]">Diffusion Models</span>
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
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Diffusion Models{" "}
            <span className="text-[var(--color-accent)]">Learn by Denoising</span>
          </h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]">
            A diffusion model never learns to draw. It learns to remove a
            little noise, and generation is denoising repeated from pure
            static. Destroy a spiral with real math, then watch it come back.
          </p>
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
                className="ml-auto text-[11px] font-semibold flex items-center gap-1"
                style={{ color: "var(--color-success)" }}
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

        <div className="space-y-6">
          {/* Core idea */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6"
          >
            <p className="text-[13px] font-semibold text-white mb-2">
              The Core Idea: Generate by Learning to Denoise
            </p>
            <p className="text-[12px] text-[#94a3b8] leading-relaxed max-w-[860px]">
              The forward process destroys structure: over T = {T} steps it
              mixes the data with Gaussian noise until nothing recognizable
              remains. A neural network then learns the reverse: given a noisy
              sample and the timestep, undo a little of the damage. Chain those
              small denoising steps together, starting from pure noise, and you
              have a generator. The slider below runs the exact closed-form
              forward process on a real point cloud, so every number you see is
              computed live.
            </p>
          </motion.section>

          {/* Centerpiece: forward process */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
          >
            <ForwardDiffusionPanel
              t={t}
              schedule={schedule}
              onTChange={handleTChange}
              onScheduleChange={setSchedule}
            />
          </motion.section>

          {/* Noise schedule intuition */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
          >
            <NoiseSchedulePanel schedule={schedule} t={t} />
          </motion.section>

          {/* Reverse process */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
          >
            <ReverseDiffusionPanel
              reverseT={reverseT}
              running={reverseRunning}
              done={reverseDone}
              schedule={schedule}
              onRun={handleRunReverse}
            />
          </motion.section>

          {/* Family tree */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
          >
            <FamilyTreePanel open={familyOpen} onToggle={handleFamilyToggle} />
          </motion.section>

          {/* Prose panels */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          >
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#3bb4a4] mb-2">
                Why Diffusion Beat GANs for Images
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Three qualitative reasons. Training is stable: the loss is a
                plain regression on noise, not the fragile minimax game{" "}
                <Link
                  href="/visual-guides/gans"
                  className="underline underline-offset-2 text-[var(--color-accent)] hover:opacity-80"
                >
                  GANs
                </Link>{" "}
                play. There is no mode collapse: the objective covers every
                training example, so the model cannot win by producing only a
                few crowd-pleasers. And the objective is likelihood-adjacent:
                it optimizes a bound related to how probable the data is under
                the model, which gives a smoother, more predictable training
                signal.
              </p>
            </div>

            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a855f7] mb-2">
                Latent Diffusion
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Stable Diffusion does not denoise pixels directly. An
                autoencoder first compresses the image into a much smaller
                latent space, the diffusion process runs there, and a decoder
                maps the result back to pixels. Working in a compressed
                representation makes each denoising step far cheaper. Those
                learned compressed representations are close cousins of{" "}
                <Link
                  href="/visual-guides/embeddings"
                  className="underline underline-offset-2 text-[var(--color-accent)] hover:opacity-80"
                >
                  embeddings
                </Link>
                .
              </p>
            </div>

            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-accent)] mb-2">
                Text Conditioning
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                In one line: guidance steers denoising toward the prompt. A
                text encoder turns your words into vectors, and every reverse
                step is nudged toward samples that match them. For how models
                represent text in the first place, see{" "}
                <Link
                  href="/visual-guides/what-is-llm"
                  className="underline underline-offset-2 text-[var(--color-accent)] hover:opacity-80"
                >
                  What is an LLM
                </Link>
                .
              </p>
            </div>
          </motion.section>
        </div>

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
                  Diffusion Decoded!
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  You destroyed a spiral with the closed-form forward process,
                  watched a perfect denoiser bring it back, and sorted the
                  generative family tree.
                </p>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    {
                      label: "Forward process",
                      value: `Swept t: 0 to ${T} and back`,
                      color: "#3bb4a4",
                    },
                    {
                      label: "Reverse process",
                      value: "Noise back to data",
                      color: "var(--color-accent)",
                    },
                    {
                      label: "Family tree",
                      value: "Diffusion vs GANs",
                      color: "#a855f7",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-[#1e293b] p-3"
                    >
                      <p className="text-[10px] text-[#475569] mb-1">{item.label}</p>
                      <p
                        className="text-[13px] font-mono font-bold"
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
                    &quot;A diffusion model never learns to draw in one step. It
                    learns to predict the noise, and generation is just that
                    small correction applied over and over, starting from pure
                    static.&quot;
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
