"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ConfidenceInterval, ConfidenceLevel } from "./types";
import SampleBreakdown from "./SampleBreakdown";

interface Props {
  expandedSampleId: number | null;
  intervals: ConfidenceInterval[];
  confidenceLevel: ConfidenceLevel;
}

export default function IntervalExpander({
  expandedSampleId,
  intervals,
  confidenceLevel,
}: Props) {
  const interval = intervals.find((ci) => ci.sampleId === expandedSampleId) ?? null;

  return (
    <AnimatePresence>
      {interval && (
        <motion.div
          key={interval.sampleId}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          style={{ overflow: "hidden" }}
        >
          <SampleBreakdown interval={interval} confidenceLevel={confidenceLevel} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
