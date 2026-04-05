"use client";

import { motion } from "framer-motion";
import type { TrainingStep } from "./types";

interface Props {
  step: TrainingStep;
}

export default function GeneratorOutput({ step }: Props) {
  const qualityPct = Math.round(step.generatorQuality * 100);
  const fakeRealPct = Math.round((1 - step.dAccuracy + 0.08) * 100);

  return (
    <div className="bg-[#1e293b]/60 border border-[#1e293b] rounded-2xl p-5">
      <h2 className="text-base font-semibold text-white mb-1">
        Generator Output
      </h2>
      <p className="text-xs text-[#475569] mb-4">Epoch {step.epoch} / 30</p>

      {/* 8x8 pixel grid */}
      <div className="flex justify-center mb-4">
        <div
          className="grid gap-0.5"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(8, 1fr)",
            width: 128,
            height: 128,
          }}
        >
          {step.fakeImage.map((row, ri) =>
            row.map((val, ci) => (
              <motion.div
                key={`${ri}-${ci}`}
                initial={{ opacity: 0 }}
                animate={{ backgroundColor: `rgb(${val},${val},${val})`, opacity: 1 }}
                transition={{ duration: 0.25, delay: (ri * 8 + ci) * 0.003 }}
                style={{ width: 14, height: 14 }}
              />
            ))
          )}
        </div>
      </div>

      {/* Quality score */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[#94a3b8]">Quality Score</span>
          <span className="text-xs font-semibold text-[#a855f7]">{qualityPct}%</span>
        </div>
        <div className="h-2 bg-[#0f172a] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #7e22ce, #a855f7)" }}
            animate={{ width: `${qualityPct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Discriminator verdict */}
      <div className="flex items-center justify-between bg-[#0f172a]/60 rounded-lg px-3 py-2 border border-[#1e293b]">
        <span className="text-xs text-[#94a3b8]">Discriminator says:</span>
        <span className="text-xs font-semibold text-[#60a5fa]">
          {fakeRealPct}% real
        </span>
      </div>

      {step.epoch === 0 && (
        <p className="text-[10px] text-[#475569] mt-2 text-center italic">
          Pure noise — G hasn&apos;t learned anything yet
        </p>
      )}
      {step.epoch >= 28 && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] text-[#a855f7] mt-2 text-center font-semibold"
        >
          G is generating convincing images!
        </motion.p>
      )}
    </div>
  );
}
