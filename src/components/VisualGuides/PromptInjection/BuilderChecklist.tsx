"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGuideMotion } from "@/lib/guideMotion";
import { CHECKLIST_ITEMS } from "./types";

type Props = {
  open: boolean;
  onToggle: () => void;
};

function BuilderChecklistInner({ open, onToggle }: Props) {
  const { fadeUp, stagger } = useGuideMotion();

  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="pi-builder-checklist"
        className="w-full flex items-center justify-between px-5 sm:px-6 py-4 text-left hover:bg-[#162032] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
      >
        <div>
          <p className="text-[13px] font-semibold text-white">Builder checklist</p>
          <p className="text-[11px] text-[#475569] mt-0.5">
            Five habits that keep an injected instruction from becoming an incident.
          </p>
        </div>
        <span
          className="text-[18px] text-[var(--color-accent)] transition-transform"
          style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
          aria-hidden="true"
        >
          +
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="pi-builder-checklist"
            variants={stagger}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="px-5 sm:px-6 pb-5 space-y-2"
          >
            {CHECKLIST_ITEMS.map((item, i) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                className="flex items-start gap-3 rounded-xl border border-[#1e293b] bg-[#162032] p-3"
              >
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                  style={{ color: "var(--color-success)", background: "#22c55e18" }}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-[12px] font-semibold text-white">{item.title}</p>
                  <p className="text-[11px] text-[#94a3b8] leading-relaxed mt-0.5">{item.detail}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const BuilderChecklist = React.memo(BuilderChecklistInner);
export default BuilderChecklist;
