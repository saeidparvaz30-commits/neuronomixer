"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MethodType, METHOD_META } from "./data";

interface Props {
  method: MethodType;
}

export default function ExplanationPanel({ method }: Props) {
  const meta = METHOD_META[method];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={method}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="rounded-2xl border bg-[#0f172a] p-5 space-y-4"
        style={{ borderColor: meta.color + "30" }}
      >
        {/* Heading */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[2px] mb-1" style={{ color: meta.color }}>
            {meta.label}
          </p>
          <h3 className="text-[16px] font-bold text-white">{meta.heading}</h3>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed mt-2">{meta.desc}</p>
        </div>

        {/* Pros / Cons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-semibold text-[#3bb4a4] uppercase tracking-[1px] mb-2">Strengths</p>
            <ul className="space-y-1">
              {meta.pros.map(p => (
                <li key={p} className="flex items-start gap-1.5">
                  <span className="text-[#3bb4a4] text-[10px] mt-0.5">+</span>
                  <span className="text-[11px] text-[#94a3b8] leading-snug">{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[#ef4444] uppercase tracking-[1px] mb-2">Limitations</p>
            <ul className="space-y-1">
              {meta.cons.map(c => (
                <li key={c} className="flex items-start gap-1.5">
                  <span className="text-[#ef4444] text-[10px] mt-0.5">−</span>
                  <span className="text-[11px] text-[#94a3b8] leading-snug">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Use case */}
        <div className="rounded-lg p-3" style={{ background: meta.color + "10", border: `1px solid ${meta.color}25` }}>
          <p className="text-[10px] font-semibold uppercase tracking-[1px] mb-1" style={{ color: meta.color }}>
            Best For
          </p>
          <p className="text-[11px] text-[#94a3b8]">{meta.useCase}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
