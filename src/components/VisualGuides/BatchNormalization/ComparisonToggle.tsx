"use client";

import { motion } from "framer-motion";

interface Props {
  withBN: boolean;
  onChange: (value: boolean) => void;
}

export default function ComparisonToggle({ withBN, onChange }: Props) {
  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center bg-[#0f172a] border border-white/[0.08] rounded-2xl p-1 gap-1 relative">
        {/* Sliding pill */}
        <motion.div
          className="absolute inset-y-1 rounded-xl"
          style={{
            width: "calc(50% - 4px)",
            background: withBN ? "#3bb4a4" : "#ef4444",
            left: withBN ? "calc(50% + 2px)" : "4px",
          }}
          layout
          layoutId="toggle-pill"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />

        <button
          onClick={() => onChange(false)}
          className={`relative z-10 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors min-w-[148px] text-center ${
            !withBN ? "text-white" : "text-[#94a3b8] hover:text-white"
          }`}
        >
          Without BatchNorm
        </button>

        <button
          onClick={() => onChange(true)}
          className={`relative z-10 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors min-w-[148px] text-center ${
            withBN ? "text-white" : "text-[#94a3b8] hover:text-white"
          }`}
        >
          With BatchNorm
        </button>
      </div>
    </div>
  );
}
