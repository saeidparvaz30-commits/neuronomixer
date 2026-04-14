"use client";

import React from "react";
import { motion } from "framer-motion";
import type { StepType } from "./types";
import { STEP_LABELS } from "./types";

interface StepIndicatorProps {
  currentStep: StepType;
  onStepClick: (step: StepType) => void;
}

const STEPS: StepType[] = [1, 2, 3, 4, 5];

export default function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex flex-col items-center gap-3 mb-6">
      <div className="flex items-center gap-2 sm:gap-3">
        {STEPS.map((step, i) => {
          const isActive = step === currentStep;
          const isCompleted = step < currentStep;
          return (
            <React.Fragment key={step}>
              {/* Step circle */}
              <button
                onClick={() => onStepClick(step)}
                aria-label={`Go to step ${step}: ${STEP_LABELS[step]}`}
                aria-current={isActive ? "step" : undefined}
                className="flex flex-col items-center gap-1 group"
              >
                <motion.div
                  animate={{
                    backgroundColor: isActive
                      ? "#d4af37"
                      : isCompleted
                      ? "#3bb4a4"
                      : "#1e293b",
                    borderColor: isActive
                      ? "#d4af37"
                      : isCompleted
                      ? "#3bb4a4"
                      : "#475569",
                    scale: isActive ? 1.15 : 1,
                  }}
                  transition={{ duration: 0.25 }}
                  className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors"
                  style={{
                    color: isActive ? "#0a0e1a" : isCompleted ? "#0a0e1a" : "#94a3b8",
                  }}
                >
                  {isCompleted ? (
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step
                  )}
                </motion.div>
                <span
                  className={`text-[10px] font-medium hidden sm:block transition-colors ${
                    isActive ? "text-[#d4af37]" : isCompleted ? "text-[#3bb4a4]" : "text-[#475569]"
                  } group-hover:text-white`}
                >
                  {STEP_LABELS[step]}
                </span>
              </button>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <motion.div
                  animate={{ backgroundColor: step < currentStep ? "#3bb4a4" : "#1e293b" }}
                  transition={{ duration: 0.25 }}
                  className="h-px w-8 sm:w-12 rounded-full"
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {/* Mobile label */}
      <p className="text-[11px] text-[#94a3b8] sm:hidden">
        Step {currentStep}: {STEP_LABELS[currentStep]}
      </p>
    </div>
  );
}
