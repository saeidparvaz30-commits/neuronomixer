"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { TypeAnimation } from "react-type-animation";
import { heroSentences } from "@/data/heroText";
import HeroBackground from "./HeroBackground";

export default function Hero() {
  return (
    <section className="relative w-full min-h-screen overflow-hidden">
      {/* ===== Background Image ===== */}
      <HeroBackground />

      {/* ===== Hero Content ===== */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between min-h-screen px-0 md:px-0 gap-8">
        {/* ===== Left Column: Text & Buttons ===== */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="
            self-end md:self-center
            backdrop-blur-md 
            bg-white/10 
            border-t border-r border-b 
            border-[var(--color-accent)]/40 
            rounded-tr-3xl rounded-br-3xl
            p-8 md:p-14
            max-w-3xl 
            w-full 
            text-left
          "
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-3xl md:text-5xl font-bold text-white mb-4"
          >
            A <span className="text-[var(--color-accent)]">Crystal Box</span>
            <br /> Where Data Speaks Clearly.
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-lg text-gray-300 mb-8 h-[2.5rem] md:h-[3rem] overflow-hidden"
          >
            <TypeAnimation
              sequence={heroSentences.flatMap((sentence) => [
                sentence,
                2000,
                "",
              ])}
              wrapper="span"
              speed={50}
              deletionSpeed={40}
              repeat={Infinity}
              style={{ display: "inline-block", whiteSpace: "pre-line" }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="flex flex-wrap justify-start gap-4 mt-6"
          >
            {/* Primary button — gradient glow */}
            <Link
              href="/contact"
              className="
                btn-link 
                relative px-8 py-3 
                font-semibold 
                rounded-lg
                bg-gradient-to-r from-[var(--color-background)] to-[var(--color-primary)]
                shadow-[0_0_15px_rgba(59,180,164,0.3)]
                hover:shadow-[0_0_25px_var(--color-accent)]
                hover:scale-[1.03]
                transition-all duration-300 ease-out
              "
            >
              Contact
            </Link>

            {/* Secondary button — glass outline */}
            <Link
              href="/blog"
              className="
                btn-link 
                relative px-8 py-3 font-semibold
                border border-[var(--color-accent)]/60
                rounded-lg
                backdrop-blur-sm bg-[var(--color-text-muted)]/10
                hover:bg-[var(--color-background)] 
                hover:shadow-[0_0_20px_var(--color-accent)]
                transition-all duration-300 ease-out
              "
            >
              Look Through Crystal
            </Link>
          </motion.div>
        </motion.div>

        {/* ===== Right Column: Placeholder for Portrait / Image ===== */}
        {/* <motion.div>
        empty for now
        </motion.div> */}
      </div>
    </section>
  );
}
