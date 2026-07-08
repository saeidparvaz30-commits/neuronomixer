"use client";

import React from "react";
import { motion } from "framer-motion";

interface ResetButtonProps {
  onClick: () => void;
}

export default function ResetButton({ onClick }: ResetButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      className="px-4 py-1.5 rounded-xl text-[12px] font-semibold border border-[#1e293b] text-[#94a3b8] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
    >
      Reset to Original Data
    </motion.button>
  );
}
