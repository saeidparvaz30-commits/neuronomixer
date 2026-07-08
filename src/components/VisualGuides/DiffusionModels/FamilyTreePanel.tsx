"use client";

import React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useGuideMotion } from "@/lib/guideMotion";

interface Props {
  open: boolean;
  onToggle: () => void;
}

const DIFFUSION_FAMILY = [
  { name: "DALL-E 2 / 3", note: "OpenAI, diffusion-based image generation" },
  { name: "Stable Diffusion", note: "Stability AI, latent diffusion" },
  { name: "Imagen", note: "Google, cascaded diffusion" },
  { name: "Midjourney", note: "Midjourney, widely believed to be diffusion-based (architecture unpublished)" },
];

const GAN_FAMILY = [
  { name: "StyleGAN 1 / 2 / 3", note: "NVIDIA, adversarial generator vs discriminator" },
];

export default function FamilyTreePanel({ open, onToggle }: Props) {
  const { fadeIn } = useGuideMotion();

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-5 sm:px-6 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
      >
        <span>
          <span className="block text-[13px] font-semibold text-white">
            The Generative Family Tree: Diffusion vs GANs
          </span>
          <span className="block text-[11px] text-[#475569] mt-0.5">
            Which famous models belong to which family (open to explore)
          </span>
        </span>
        <span
          className={`text-[#94a3b8] transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="px-5 sm:px-6 pb-6"
          >
            <div
              className="rounded-xl border p-4 mb-4"
              style={{
                borderColor: "color-mix(in srgb, var(--color-warning) 35%, transparent)",
                background: "color-mix(in srgb, var(--color-warning) 6%, transparent)",
              }}
            >
              <p
                className="text-[11px] font-semibold uppercase tracking-wide mb-1.5"
                style={{ color: "var(--color-warning)" }}
              >
                Common mix-up
              </p>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                DALL-E and Stable Diffusion are often grouped with GANs, but
                they are not built on adversarial training: both are diffusion
                models. GANs are a separate family (see the{" "}
                <Link
                  href="/visual-guides/gans"
                  className="underline underline-offset-2 text-[var(--color-accent)] hover:opacity-80"
                >
                  GANs guide
                </Link>
                ). This panel shows where each system actually belongs.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-[#1e293b] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#3bb4a4] mb-3">
                  Diffusion Family
                </p>
                <ul className="space-y-2.5">
                  {DIFFUSION_FAMILY.map((m) => (
                    <li key={m.name} className="flex items-start gap-2">
                      <span
                        className="w-2 h-2 rounded-full mt-1 flex-shrink-0 bg-[#3bb4a4]"
                        aria-hidden="true"
                      />
                      <span className="text-[12px]">
                        <span className="font-semibold text-white">{m.name}</span>{" "}
                        <span className="text-[#94a3b8]">({m.note})</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-[#475569] leading-relaxed mt-3">
                  Trained as denoisers with a regression loss. Generation is
                  iterative denoising from pure noise.
                </p>
              </div>

              <div className="rounded-xl border border-[#1e293b] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#ec4899] mb-3">
                  GAN Family
                </p>
                <ul className="space-y-2.5">
                  {GAN_FAMILY.map((m) => (
                    <li key={m.name} className="flex items-start gap-2">
                      <span
                        className="w-2 h-2 rounded-full mt-1 flex-shrink-0 bg-[#ec4899]"
                        aria-hidden="true"
                      />
                      <span className="text-[12px]">
                        <span className="font-semibold text-white">{m.name}</span>{" "}
                        <span className="text-[#94a3b8]">({m.note})</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-[#475569] leading-relaxed mt-3">
                  Trained as a minimax game: a generator tries to fool a
                  discriminator in a single forward pass. No noising, no
                  denoising loop.
                </p>
              </div>
            </div>

            <p className="text-[12px] text-[#94a3b8] leading-relaxed mt-4">
              The two families are distinct lineages, not one building on the
              other. Diffusion models optimize a stable denoising objective;
              GANs optimize an adversarial one. The famous text-to-image
              systems of the 2020s (DALL-E 2 and 3, Stable Diffusion, Imagen,
              Midjourney) are all diffusion-based.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
