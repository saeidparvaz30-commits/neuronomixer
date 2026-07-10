"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useGuideMotion, GUIDE_VIEWPORT } from "@/lib/guideMotion";
import GuideCompletion from "@/components/VisualGuides/GuideCompletion";
import {
  GRID,
  EMBED_DIM,
  PATCH_SIZES,
  DEFAULT_PATCH_SIZE,
  PROMPT_TOKENS,
  PRESETS,
  PresetId,
  presetPixels,
  projectionMatrix,
  extractPatches,
  projectPatch,
  textEmbedding,
} from "./vitMath";
import PixelCanvas from "./PixelCanvas";
import TokenSequence from "./TokenSequence";
import PatchInspector from "./PatchInspector";
import CostChart from "./CostChart";
import SharedSpaceScatter, { ScatterPoint } from "./SharedSpaceScatter";

const GUIDE_TITLE = "How LLMs See";
const GUIDE_SLUG = "multimodal-llms";
const NEXT_GUIDE_SLUG = "ai-model-decision-guide";
const INITIAL_PRESET: PresetId = "circle";

type Tool = "draw" | "erase";

export default function MultimodalLLMsClient() {
  const { data: session } = useSession();
  const { fadeUp, card } = useGuideMotion();

  // ── Interaction state ──────────────────────────────────────────────────────
  const [pixels, setPixels] = useState<number[]>(() =>
    presetPixels(INITIAL_PRESET)
  );
  const [activePreset, setActivePreset] = useState<PresetId | "custom">(
    INITIAL_PRESET
  );
  const [tool, setTool] = useState<Tool>("draw");
  const [patchSize, setPatchSize] = useState<number>(DEFAULT_PATCH_SIZE);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Ref mirror so rapid pointer strokes within one frame accumulate correctly.
  const pixelsRef = useRef(pixels);

  // ── Gates ──────────────────────────────────────────────────────────────────
  const [imageChanged, setImageChanged] = useState(false);
  const [patchSizeChanged, setPatchSizeChanged] = useState(false);
  const [patchInspected, setPatchInspected] = useState(false);
  const isComplete = imageChanged && patchSizeChanged && patchInspected;

  // ── Derived (all real math over current pixels) ────────────────────────────
  const w = useMemo(() => projectionMatrix(patchSize), [patchSize]);
  const patches = useMemo(
    () => extractPatches(pixels, patchSize),
    [pixels, patchSize]
  );
  const patchEmbeddings = useMemo(
    () => patches.map((p) => projectPatch(p.pixels, w)),
    [patches, w]
  );
  const textTokens = useMemo(
    () =>
      PROMPT_TOKENS.map((t) => ({ token: t, embedding: textEmbedding(t) })),
    []
  );

  const seqLen = textTokens.length + patches.length;
  const selectedPatch =
    selectedIndex !== null && selectedIndex < patches.length
      ? patches[selectedIndex]
      : null;
  const selectedEmbedding =
    selectedIndex !== null && selectedIndex < patchEmbeddings.length
      ? patchEmbeddings[selectedIndex]
      : null;

  const scatterPoints = useMemo<ScatterPoint[]>(
    () => [
      ...textTokens.map((t) => ({
        x: t.embedding[0],
        y: t.embedding[1],
        kind: "text" as const,
        label: `text token ${t.token}`,
      })),
      ...patches.map((p) => ({
        x: patchEmbeddings[p.index][0],
        y: patchEmbeddings[p.index][1],
        kind: "patch" as const,
        label: `patch r${p.row + 1}c${p.col + 1}`,
      })),
    ],
    [textTokens, patches, patchEmbeddings]
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handlePaintCell = useCallback(
    (x: number, y: number) => {
      const v = tool === "draw" ? 1 : 0;
      const idx = y * GRID + x;
      if (pixelsRef.current[idx] === v) return; // no real change, no gate
      const next = pixelsRef.current.slice();
      next[idx] = v;
      pixelsRef.current = next;
      setPixels(next);
      setActivePreset("custom");
      setImageChanged(true);
    },
    [tool]
  );

  function handlePreset(id: PresetId) {
    if (id === activePreset) return; // same image, no gate
    const next = presetPixels(id);
    pixelsRef.current = next;
    setPixels(next);
    setActivePreset(id);
    setImageChanged(true);
  }

  function handlePatchSizeInput(sliderIndex: number) {
    const size = PATCH_SIZES[Math.max(0, Math.min(PATCH_SIZES.length - 1, sliderIndex))];
    if (size === patchSize) return;
    setPatchSize(size);
    setSelectedIndex(null); // patch indices change meaning at a new size
    setPatchSizeChanged(true);
  }

  function handleSelectPatch(i: number) {
    setSelectedIndex(i);
    setPatchInspected(true);
  }

  function handleReset() {
    const initial = presetPixels(INITIAL_PRESET);
    pixelsRef.current = initial;
    setPixels(initial);
    setActivePreset(INITIAL_PRESET);
    setTool("draw");
    setPatchSize(DEFAULT_PATCH_SIZE);
    setSelectedIndex(null);
    setImageChanged(false);
    setPatchSizeChanged(false);
    setPatchInspected(false);
  }

  const sliderIndex = PATCH_SIZES.indexOf(
    patchSize as (typeof PATCH_SIZES)[number]
  );

  const progressItems = [
    { id: "image", label: "Draw or switch the image", done: imageChanged },
    { id: "patch-size", label: "Change the patch size", done: patchSizeChanged },
    { id: "inspect", label: "Inspect a patch token", done: patchInspected },
  ];

  return (
    <div className="min-h-screen pb-20">
      <GuideCompletion isComplete={isComplete} guideSlug={GUIDE_SLUG} score={100} />
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
              LLMs
            </span>
            <span className="w-6 h-px bg-[var(--color-accent)]" />
          </div>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3"
          >
            How LLMs <span className="text-[var(--color-accent)]">See</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[580px]"
          >
            Multimodal models do not grow a separate vision brain. They slice
            the image into patches, linearly project each patch into the same
            embedding space as text tokens, and hand the transformer one mixed
            sequence. Draw below and watch it happen with real matrix math.
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Step 1: the image */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-1">
            Step 1: The image is just numbers
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            This {GRID} x {GRID} grayscale image is a grid of brightness values
            between 0 and 1, nothing more. Draw on it with the pointer or pick
            a preset (the keyboard route). Everything runs in your browser; no
            pixel ever leaves this page.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-start">
            <PixelCanvas
              pixels={pixels}
              patchSize={patchSize}
              selectedIndex={selectedIndex}
              onPaintCell={handlePaintCell}
            />
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-2">
                  Brush
                </p>
                <div className="flex gap-2">
                  {(["draw", "erase"] as Tool[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTool(t)}
                      aria-pressed={tool === t}
                      className={`px-4 py-2 rounded-xl text-[12px] font-semibold border transition-colors ${
                        tool === t
                          ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[#1e293b]"
                          : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white"
                      }`}
                    >
                      {t === "draw" ? "Draw (white)" : "Erase (black)"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-2">
                  Presets
                </p>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePreset(p.id)}
                      aria-pressed={activePreset === p.id}
                      className={`px-4 py-2 rounded-xl text-[12px] font-semibold border transition-colors ${
                        activePreset === p.id
                          ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[#1e293b]"
                          : "border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {activePreset === "custom" && (
                  <p className="text-[11px] text-[#475569] mt-2">
                    Custom drawing active. Pick a preset to replace it.
                  </p>
                )}
              </div>
              <p className="text-[11px] text-[#475569] leading-relaxed max-w-[420px]">
                The gold lines are the patch boundaries at the current patch
                size. Each cell inside a boundary becomes one entry of that
                patch&apos;s input vector.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Step 2: patches to tokens */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-1">
            Step 2: Patches become tokens in one sequence
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            The image is cut into non-overlapping patches. Each patch is
            flattened to a vector and multiplied by a projection matrix W to
            produce an {EMBED_DIM}-dim embedding, the exact operation a vision
            transformer performs. Here W is a fixed seeded random matrix, not
            learned weights; the flattening and the matrix multiplication are
            computed for real from your pixels. The patch tokens then join the
            text prompt tokens in a single sequence.
          </p>

          <div className="mb-5 max-w-[420px]">
            <label
              htmlFor="patch-size-slider"
              className="block text-[11px] font-semibold text-[#475569] uppercase tracking-wide mb-2"
            >
              Patch size: {patchSize} x {patchSize} px
            </label>
            <input
              id="patch-size-slider"
              type="range"
              min={0}
              max={PATCH_SIZES.length - 1}
              step={1}
              value={sliderIndex}
              onChange={(e) => handlePatchSizeInput(Number(e.target.value))}
              aria-valuetext={`${patchSize} by ${patchSize} pixels`}
              className="w-full accent-[#d4af37]"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#475569] mt-1">
              {PATCH_SIZES.map((p) => (
                <span key={p}>{p}px</span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Image patches", value: `${patches.length}` },
              {
                label: "Values per patch",
                value: `${patchSize * patchSize}`,
              },
              {
                label: "Projection W",
                value: `${patchSize * patchSize} x ${EMBED_DIM}`,
              },
              { label: "Sequence length", value: `${seqLen} tokens` },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-[#1e293b] p-3">
                <p className="text-[10px] text-[#475569] mb-1">{s.label}</p>
                <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          <TokenSequence
            textTokens={textTokens}
            patches={patches}
            patchEmbeddings={patchEmbeddings}
            patchSize={patchSize}
            selectedIndex={selectedIndex}
            onSelect={handleSelectPatch}
          />
          <p className="text-[11px] text-[#475569] leading-relaxed mt-3 max-w-[720px]">
            Purple strips: text token embeddings from a fixed seeded lookup
            table (standing in for a learned embedding table, with this
            simplified word-level tokenization). Teal and purple strip cells
            encode each embedding value: teal positive, purple negative,
            opacity by magnitude. Click any patch token for the exact numbers.
          </p>
        </motion.section>

        {/* Step 3: inspector */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-1">
            Step 3: Inspect one patch, number by number
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Flatten, multiply, done. There is no convolution stack and no
            feature detector in the projection step: a single linear map takes
            raw pixels into the token embedding space.
          </p>
          <PatchInspector
            patch={selectedPatch}
            embedding={selectedEmbedding}
            w={w}
            patchSize={patchSize}
          />
        </motion.section>

        {/* Cost */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-1">
            What patch size costs
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            Patch size is the resolution-versus-cost dial. Smaller patches keep
            more spatial detail per token but multiply the sequence length that
            attention must process. These bars are computed for the {GRID} x{" "}
            {GRID} image above plus its {textTokens.length}-token prompt.
          </p>
          <CostChart currentPatchSize={patchSize} />
        </motion.section>

        {/* Shared space */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
          className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-5 sm:p-6 mb-6"
        >
          <p className="text-[13px] font-semibold text-white mb-1">
            One shared space
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mb-4 max-w-[720px]">
            After projection, a patch token and a text token are the same kind
            of object: a vector of {EMBED_DIM} numbers. Attention layers never
            check where a token came from; cross-modal understanding is just
            attention over one mixed sequence.
          </p>
          <SharedSpaceScatter points={scatterPoints} />
        </motion.section>

        {/* Concept cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            {
              title: "Why linear projection is enough",
              body: "The projection only needs to lift pixels into the model's vector space. All the heavy lifting, edges, shapes, objects, happens later inside the transformer's attention and MLP layers, trained end to end.",
              color: "#3bb4a4",
            },
            {
              title: "Position must be added back",
              body: "Flattening patches destroys their layout. Real models add a positional embedding to every patch token so the transformer knows which patch came from where. This demo omits that step to keep the projection visible.",
              color: "var(--color-accent)",
            },
            {
              title: "The same trick everywhere",
              body: "Audio spectrograms, video frames, even protein structures ride the same rails: chop the input into pieces, project each piece into the token embedding space, concatenate with text, run the transformer.",
              color: "#a855f7",
            },
          ].map(({ title, body, color }) => (
            <div key={title} className="rounded-xl border border-[#1e293b] p-4">
              <p className="text-[11px] font-semibold mb-2" style={{ color }}>
                {title}
              </p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">{body}</p>
            </div>
          ))}
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
                  You Watched an Image Become Tokens
                </h2>
                <p className="text-sm text-[#94a3b8] mt-1">
                  Your pixels were flattened, projected through a real matrix
                  multiplication, and lined up next to text in one sequence.
                </p>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    {
                      label: `Image tokens at ${patchSize}x${patchSize}px`,
                      value: `${patches.length}`,
                    },
                    {
                      label: "Values fed into W per patch",
                      value: `${patchSize * patchSize}`,
                    },
                    {
                      label: "Final sequence length",
                      value: `${seqLen} tokens`,
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-[#1e293b] p-3">
                      <p className="text-[10px] text-[#475569] mb-1">{item.label}</p>
                      <p className="text-[14px] font-mono font-bold text-[var(--color-accent)]">
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
                    &quot;To a multimodal LLM, seeing is reading: an image is
                    sliced into patches, each patch is linearly projected into
                    the same embedding space as words, and attention treats the
                    mixed sequence as one text. Halve the patch size and you
                    quadruple what the image costs in tokens.&quot;
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
